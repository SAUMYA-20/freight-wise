require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// --- SECURITY & MIDDLEWARE ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://freight-wise-kappa.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Note: Local file uploads will NOT persist on Vercel. 
// For production, you must eventually migrate this to AWS S3, Cloudinary, or Vercel Blob.
app.use('/uploads/theft-reports', express.static(path.join(__dirname, 'uploads', 'theft-reports')));

// --- SERVERLESS MONGODB CONNECTION ---
const MONGODB_URI = process.env.MONGODB_URI;

let cachedDb = global.mongoose;
if (!cachedDb) {
  cachedDb = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cachedDb.conn) return cachedDb.conn;
  if (!MONGODB_URI) throw new Error("MONGODB_URI is missing in .env file");
  
  if (!cachedDb.promise) {
    cachedDb.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((mongoose) => mongoose);
  }
  cachedDb.conn = await cachedDb.promise;
  console.log("Connected to MongoDB via Serverless Cache.");
  return cachedDb.conn;
}

// Initialize DB on boot, but don't block the thread
connectToDatabase().catch(console.error);

// --- LAZY-LOADED AI EMBEDDER ---
process.env.TRANSFORMERS_CACHE = '/tmp'; // Required for Vercel read-only filesystem
let embedderPromise = null;

async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      return await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
      });
    })();
  }
  return embedderPromise;
}

// --- CORE SEARCH ROUTE ---
app.get('/api/search', async (req, res) => {
  try {
    await connectToDatabase();
    const { q } = req.query;
    
    if (!q) return res.status(400).json({ error: "Query parameter 'q' is required." });

    const embedder = await getEmbedder();
    const output = await embedder(q, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);

    const results = await mongoose.connection.collection('hscodes').aggregate([
      {
        "$vectorSearch": {
          "index": "vector_index",
          "path": "embedding",
          "queryVector": queryEmbedding,
          "numCandidates": 100,
          "limit": 10
        }
      },
      {
        "$project": {
          "_id": 0,
          "hsn4Digit": 1,
          "hsn8Digit": 1,
          "productName": 1,
          "gstRate": 1,
          "score": { "$meta": "vectorSearchScore" }
        }
      }
    ]).toArray();

    if (results.length === 0) throw new Error("Vector search returned 0 results.");

    res.json({ results });
  } catch (error) {
    console.error("Vector search failed, falling back to text:", error.message);
    
    try {
        const { q } = req.query;
        const HSCode = require('./models/HSCode');
        
        const synonyms = {
          'laptop': 'computer', 'phone': 'telephone', 'smartphone': 'telephone',
          'car': 'vehicle', 'shoes': 'footwear', 'clothes': 'apparel', 'tv': 'television',
        };
        const mappedQ = synonyms[q.toLowerCase().trim()] || q;
        const words = mappedQ.split(' ').filter(w => w.length > 2);
        const searchRegexes = words.length > 0 ? words.map(w => new RegExp(w, 'i')) : [new RegExp(mappedQ, 'i')];
        
        const fallbackResults = await HSCode.find({ productName: { $in: searchRegexes } }).limit(10).lean();
        
        const cleanedResults = fallbackResults.map(r => {
            delete r.embedding; delete r._id; delete r.__v; delete r.createdAt; delete r.updatedAt;
            return r;
        });
        
        return res.json({ results: cleanedResults, fallback: true });
    } catch(err) {
        res.status(500).json({ error: "Internal server error.", details: err.message });
    }
  }
});

// --- TRADE INTELLIGENCE & CRON ROUTES ---
const { CountryTax, ComplianceRule, DocumentRule } = require('./models/TradeIntelligence');
const { calculateFreightCost } = require('./services/freightEngine');
const { optimizeRoute } = require('./services/routeOptimization');

// IMPORTANT: Replaced background setInterval with an API endpoint for Vercel Cron
app.get('/api/cron/fuel', async (req, res) => {
  try {
    // Optional: Secure this route using an environment variable
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    await connectToDatabase();
    const { fetchLatestFuelPrices } = require('./services/fuelIntelligence'); // Adjust path as needed
    await fetchLatestFuelPrices();
    res.json({ success: true, message: "Fuel prices updated." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/product/:hsCode/intelligence', async (req, res) => {
  try {
    await connectToDatabase();
    const { hsCode } = req.params;
    const { destination, weight = 100 } = req.query;

    const HSCode = require('./models/HSCode');
    const product = await HSCode.findOne({ hsn8Digit: hsCode }).lean();
    if (!product) return res.status(404).json({ error: "Product HS Code not found" });
    delete product.embedding;

    if (!destination) return res.json({ product });

    let countryTax = await CountryTax.findOne({ hsnCode: hsCode, destinationCountry: destination }).lean();
    let compRule = await ComplianceRule.findOne({ hsnCode: hsCode, destinationCountry: destination }).lean();
    let docRule = await DocumentRule.findOne({ hsnCode: hsCode, destinationCountry: destination }).lean();

    if (!countryTax) {
      const hash = hsCode.charCodeAt(0) + destination.charCodeAt(0);
      countryTax = { importDuty: (hash % 15) + 5, vatGst: destination === 'India' ? 18 : (destination === 'UAE' ? 5 : 20) };
      compRule = { isDangerousGood: hash % 10 === 0, restrictions: hash % 3 === 0 ? ['Import License Required'] : [], dgWarnings: hash % 10 === 0 ? ['Class 9 Miscellaneous Dangerous Goods'] : [] };
      docRule = { requiredDocuments: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin'] };
      if (hash % 2 === 0) docRule.requiredDocuments.push('Phytosanitary Certificate');
    }

    const freightCost = await calculateFreightCost({ origin: 'United States', destination, weightKg: parseFloat(weight) });

    res.json({ product, taxes: countryTax, compliance: compRule, documents: docRule, freight: freightCost });
  } catch (error) {
    console.error("Intelligence endpoint error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// --- AI ASSISTANT ROUTES ---
const SUPPORTED_COUNTRIES = ['United States', 'United Kingdom', 'Germany', 'France', 'Japan', 'China', 'India', 'UAE', 'Saudi Arabia', 'Australia', 'Canada', 'Brazil', 'South Korea', 'Singapore', 'Netherlands', 'Italy', 'Spain', 'Mexico', 'Indonesia', 'South Africa'];

// Keeping fallback parser clean and collapsed for readability
function fallbackLocalParse(query) {
    const lowercaseQuery = query.toLowerCase();
    let destination = null, origin = null;
    for (const country of SUPPORTED_COUNTRIES) {
      if (lowercaseQuery.includes(`from ${country.toLowerCase()}`)) origin = country;
      if (lowercaseQuery.includes(`to ${country.toLowerCase()}`)) destination = country;
    }
    // Simplistic fallback returns for production brevity
    return { product: query.replace(/(export|import|to|from|ship|the|a|an)/gi, '').trim() || "goods", destination, origin, weight: null, quantity: 1, productValue: null, mode: null, isFallback: true };
}

app.get('/api/assistant/status', (req, res) => res.json({ ok: true, geminiAvailable: !!process.env.GEMINI_API_KEY }));

app.post('/api/assistant/parse', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query required." });

    if (!process.env.GEMINI_API_KEY) return res.json(fallbackLocalParse(query));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Extract logistics entities (product, destination, origin, quantity, unitWeight, totalWeight, unitPrice, totalPrice, mode) from: "${query}". Supported countries: ${SUPPORTED_COUNTRIES.join(', ')}.` }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: { type: "object", properties: { product: { type: "string" }, destination: { type: "string" }, origin: { type: "string" }, quantity: { type: "number" }, unitWeight: { type: "number" }, totalWeight: { type: "number" }, unitPrice: { type: "number" }, totalPrice: { type: "number" }, mode: { type: "string" } }, required: ["product"] } }
      })
    });

    if (!response.ok) throw new Error("Gemini API failed");
    const data = await response.json();
    const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
    
    res.json({
      product: parsed.product || "goods",
      destination: SUPPORTED_COUNTRIES.includes(parsed.destination) ? parsed.destination : null,
      origin: SUPPORTED_COUNTRIES.includes(parsed.origin) ? parsed.origin : null,
      weight: parsed.totalWeight || (parsed.quantity && parsed.unitWeight ? parsed.quantity * parsed.unitWeight : null),
      quantity: parsed.quantity || 1,
      productValue: parsed.totalPrice || (parsed.quantity && parsed.unitPrice ? parsed.quantity * parsed.unitPrice : null),
      mode: parsed.mode || null,
      isFallback: false
    });
  } catch (err) {
    res.json(fallbackLocalParse(req.body.query));
  }
});

// --- ROUTE OPTIMIZATION & ADDITIONAL ROUTES ---
app.get('/api/routes/optimize', async (req, res) => {
  try {
    const result = await optimizeRoute({ origin: req.query.origin, destination: req.query.destination, modes: req.query.modes || 'road,port,air,border' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/routes/optimize', async (req, res) => {
  try {
    const result = await optimizeRoute({ origin: req.body.origin, destination: req.body.destination, modes: req.body.modes || ['road', 'port', 'air', 'border'] });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const theftReportsRouter = require('./routes/theftReports');
app.use('/api/theft-reports', theftReportsRouter);

const warehouseCongestionRouter = require('./routes/warehouseCongestion');
app.use('/api/warehouse-congestion', warehouseCongestionRouter);

const hsScanRouter = require('./features/hs-scan/hsScanRoute');
app.use('/api/hs-scan', hsScanRouter);

// --- EXPORT FOR VERCEL ---
module.exports = app;