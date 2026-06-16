require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

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

// VERCEL WARNING: Vercel file systems are read-only and ephemeral (except /tmp). 
// If users are uploading files at runtime, this static folder will NOT persist across requests.
// You should use cloud storage (like AWS S3, Cloudinary, or Vercel Blob) for uploads instead.
app.use('/uploads/theft-reports', express.static(path.join(__dirname, 'uploads', 'theft-reports')));

const MONGODB_URI = process.env.MONGODB_URI;

// VERCEL FIX: Serverless functions can spawn concurrently. 
// Use a cached connection approach if possible in the future, but this works for now.
if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing in .env file");
} else {
  mongoose.connect(MONGODB_URI).then(() => {
    console.log("Connected to MongoDB.");
  }).catch(err => {
    console.error("Failed to connect to MongoDB", err);
  });
}

let embedder;

// VERCEL FIX: @xenova/transformers needs to download models to a cache. 
// Vercel's root directory is read-only. We must point the cache to the writable /tmp directory.
process.env.TRANSFORMERS_CACHE = '/tmp';

async function loadEmbedder() {
  try {
    const { pipeline } = await import('@xenova/transformers');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
    console.log("AI Embedder ready.");
  } catch (err) {
    console.error("Failed to load AI Embedder:", err);
  }
}

// Start loading embedder in background
loadEmbedder().catch(console.error);

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required." });
    }

    if (!embedder) {
      return res.status(503).json({ error: "AI Model is still loading, please try again in a few seconds." });
    }

    // Embed the search query
    const output = await embedder(q, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);

    // Perform Vector Search on MongoDB Atlas
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

    if (results.length === 0) {
      throw new Error("Vector search returned 0 results, index might be missing or building.");
    }

    res.json({ results });
  } catch (error) {
    console.error("Vector search failed:", error);
    
    // Fallback to basic text search
    try {
        const { q } = req.query;
        const HSCode = require('./models/HSCode');
        
        const synonyms = {
          'laptop': 'computer',
          'phone': 'telephone',
          'smartphone': 'telephone',
          'car': 'vehicle',
          'shoes': 'footwear',
          'clothes': 'apparel',
          'tv': 'television',
        };
        const mappedQ = synonyms[q.toLowerCase().trim()] || q;
        
        const words = mappedQ.split(' ').filter(w => w.length > 2);
        const searchRegexes = words.length > 0 ? words.map(w => new RegExp(w, 'i')) : [new RegExp(mappedQ, 'i')];
        
        const fallbackResults = await HSCode.find({
            productName: { $in: searchRegexes }
        }).limit(10).lean();
        
        const cleanedResults = fallbackResults.map(r => {
            delete r.embedding;
            delete r._id;
            delete r.__v;
            delete r.createdAt;
            delete r.updatedAt;
            return r;
        });
        
        return res.json({ results: cleanedResults, fallback: true });
    } catch(err) {
        console.error("Search fallback error:", err);
        res.status(500).json({ error: "Internal server error.", details: err.message, stack: err.stack });
    }
  }
});

// --- TRADE INTELLIGENCE PLATFORM ENDPOINTS ---

const { CountryTax, ComplianceRule, DocumentRule } = require('./models/TradeIntelligence');
const { calculateFreightCost } = require('./services/freightEngine');
const { startFuelIntelligenceCron } = require('./services/fuelIntelligence');
const { optimizeRoute } = require('./services/routeOptimization');

// VERCEL WARNING: Background jobs (setInterval, node-cron) DO NOT work on Vercel. 
// Serverless functions shut down immediately after returning a response. 
// To run crons, you must create an endpoint (e.g., /api/cron/fuel) and trigger it using Vercel Cron Jobs.
if (process.env.NODE_ENV !== 'production') {
  startFuelIntelligenceCron(); 
}

app.get('/api/product/:hsCode/intelligence', async (req, res) => {
  try {
    const { hsCode } = req.params;
    const { destination, weight = 100 } = req.query;

    const HSCode = require('./models/HSCode');
    const product = await HSCode.findOne({ hsn8Digit: hsCode }).lean();
    
    if (!product) {
      return res.status(404).json({ error: "Product HS Code not found" });
    }

    delete product.embedding;

    if (!destination) {
      return res.json({ product });
    }

    let countryTax = await CountryTax.findOne({ hsnCode: hsCode, destinationCountry: destination }).lean();
    let compRule = await ComplianceRule.findOne({ hsnCode: hsCode, destinationCountry: destination }).lean();
    let docRule = await DocumentRule.findOne({ hsnCode: hsCode, destinationCountry: destination }).lean();

    if (!countryTax) {
      const hash = hsCode.charCodeAt(0) + destination.charCodeAt(0);
      
      countryTax = {
        importDuty: (hash % 15) + 5,
        vatGst: destination === 'India' ? 18 : (destination === 'UAE' ? 5 : 20)
      };
      
      compRule = {
        isDangerousGood: hash % 10 === 0,
        restrictions: hash % 3 === 0 ? ['Import License Required'] : [],
        dgWarnings: hash % 10 === 0 ? ['Class 9 Miscellaneous Dangerous Goods'] : []
      };
      
      docRule = {
        requiredDocuments: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin']
      };
      if (hash % 2 === 0) docRule.requiredDocuments.push('Phytosanitary Certificate');
    }

    const origin = 'United States';
    const freightCost = await calculateFreightCost({
      origin,
      destination,
      weightKg: parseFloat(weight)
    });

    res.json({
      product,
      taxes: countryTax,
      compliance: compRule,
      documents: docRule,
      freight: freightCost
    });

  } catch (error) {
    console.error("Intelligence endpoint error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// --- AI ASSISTANT PARSING ENDPOINT ---

const SUPPORTED_COUNTRIES = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Japan',
  'China', 'India', 'UAE', 'Saudi Arabia', 'Australia', 'Canada',
  'Brazil', 'South Korea', 'Singapore', 'Netherlands', 'Italy',
  'Spain', 'Mexico', 'Indonesia', 'South Africa'
];

function fallbackLocalParse(query) {
  // ... [Keep existing fallbackLocalParse logic unchanged] ...
  const lowercaseQuery = query.toLowerCase();
  
  let destination = null;
  let origin = null;
  
  for (const country of SUPPORTED_COUNTRIES) {
    const countryLower = country.toLowerCase();
    
    const fromIndex = lowercaseQuery.indexOf(`from ${countryLower}`);
    if (fromIndex !== -1) {
      origin = country;
    }
    
    const toIndex = lowercaseQuery.indexOf(`to ${countryLower}`);
    if (toIndex !== -1) {
      destination = country;
    }
    
    if (lowercaseQuery.includes(countryLower)) {
      if (!destination && origin !== country) {
        destination = country;
      } else if (!origin && destination !== country) {
        origin = country;
      }
    }
  }

  let quantity = 1;
  let quantityParsed = false;
  
  const qtyWeightRegex = /(\d+)\s*(?:x|\*|\s+)\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kilo?s?)\b/i;
  const qtyWeightMatch = lowercaseQuery.match(qtyWeightRegex);
  if (qtyWeightMatch) {
    quantity = parseInt(qtyWeightMatch[1], 10);
    quantityParsed = true;
  } else {
    const qtyRegex = /(\d+)\s*(?:units|pcs|pieces|items|qty|quantity)\b/i;
    const qtyMatch = lowercaseQuery.match(qtyRegex);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
      quantityParsed = true;
    } else {
      const leadingQtyRegex = /\b(?:export|import|ship|send)\s+(\d+)\b/i;
      const leadingQtyMatch = lowercaseQuery.match(leadingQtyRegex);
      if (leadingQtyMatch) {
        quantity = parseInt(leadingQtyMatch[1], 10);
        quantityParsed = true;
      } else if (/\b(?:a|an|single|one)\b/i.test(lowercaseQuery)) {
        quantity = 1;
      }
    }
  }

  let unitWeight = null;
  let totalWeight = null;
  if (qtyWeightMatch) {
    unitWeight = parseFloat(qtyWeightMatch[2]);
  } else {
    const weightRegex = /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kilo?s?)\b/i;
    const weightMatch = lowercaseQuery.match(weightRegex);
    if (weightMatch) {
      const isTotalWeight = /\btotal\s*(?:weight)?\b/i.test(lowercaseQuery);
      if (isTotalWeight) {
        totalWeight = parseFloat(weightMatch[1]);
      } else {
        unitWeight = parseFloat(weightMatch[1]);
      }
    }
  }

  let weight = totalWeight;
  if (!weight && unitWeight) {
    weight = quantity * unitWeight;
  }

  let mode = null;
  if (/\b(?:air|plane|flight)\b/i.test(lowercaseQuery)) {
    mode = 'air';
  } else if (/\b(?:sea|ocean|ship|boat)\b/i.test(lowercaseQuery)) {
    mode = 'sea';
  } else if (/\b(?:road|truck|land|car)\b/i.test(lowercaseQuery)) {
    mode = 'road';
  }

  let unitPrice = null;
  let totalPrice = null;
  const unitPriceRegex = /(?:each\s*(?:costing|cost|at|value|price)?\s*(?:of)?\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|usd)?\b)|(?:\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|usd)?\s*each\b)/i;
  const unitPriceMatch = lowercaseQuery.match(unitPriceRegex);
  if (unitPriceMatch) {
    unitPrice = parseFloat(unitPriceMatch[1] || unitPriceMatch[2]);
  } else {
    const totalValueRegex = /(?:total\s*(?:value|cost|price)?\s*(?:of)?\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|usd)?\b)|(?:(?:costing|cost|value|price)\s*(?:of)?\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars?|usd)?\b)/i;
    const totalMatch = lowercaseQuery.match(totalValueRegex);
    if (totalMatch) {
      totalPrice = parseFloat(totalMatch[1] || totalMatch[2]);
    }
  }

  let productValue = totalPrice;
  if (!productValue && unitPrice) {
    productValue = quantity * unitPrice;
  }
  
  let product = query;
  
  for (const country of SUPPORTED_COUNTRIES) {
    const reg = new RegExp(`\\b${country}\\b`, 'gi');
    product = product.replace(reg, '');
  }
  
  const noisePhrases = [
    /i want to export/gi, /i want to import/gi, /i want to ship/gi, /i want to send/gi,
    /please export/gi, /please ship/gi, /please send/gi, /how to export/gi,
    /exporting/gi, /importing/gi, /export/gi, /import/gi, /shipment/gi, /shipping/gi,
    /ship/gi, /send/gi, /\bto\b/gi, /\bfrom\b/gi, /\bof\b/gi, /\ba\b/gi, /\ban\b/gi,
    /\bthe\b/gi, /\bwith\b/gi, /\bweighing\b/gi, /\bweight\b/gi,
    /\b(?:going\s+)?by\s+(?:air|sea|road|ocean|truck|plane|ship|flight)\b/gi,
    /\b(?:air|sea|road)\s+freight\b/gi,
    /(?:each\s*(?:costing|cost|at|value|price)?\s*(?:of)?\s*\$?\s*\d+(?:\.\d+)?\s*(?:dollars?|usd)?\b)|(?:\$?\s*\d+(?:\.\d+)?\s*(?:dollars?|usd)?\s*each\b)/gi,
    /(?:total\s*(?:value|cost|price)?\s*(?:of)?\s*\$?\s*\d+(?:\.\d+)?\s*(?:dollars?|usd)?\b)|(?:(?:costing|cost|value|price)\s*(?:of)?\s*\$?\s*\d+(?:\.\d+)?\s*(?:dollars?|usd)?\b)/gi,
    /(?:\b\d+\s*(?:x|\*|\s+))?\b\d+(?:\.\d+)?\s*(?:kg|kilograms?|kilo?s?)\b/gi,
    /\b\d+\s*(?:units|pcs|pieces|items|qty|quantity)\b/gi,
    /\b\d+\b/gi
  ];
  
  for (const phrase of noisePhrases) {
    product = product.replace(phrase, '');
  }
  
  product = product.replace(/\s+/g, ' ').trim();
  
  if (!product) {
    product = query;
    for (const country of SUPPORTED_COUNTRIES) {
      const reg = new RegExp(`\\b${country}\\b`, 'gi');
      product = product.replace(reg, '');
    }
    product = product.trim();
  }
  
  return {
    product: product || "goods",
    destination,
    origin,
    weight,
    quantity,
    productValue,
    mode,
    isFallback: true
  };
}

app.get('/api/assistant/status', (req, res) => {
  res.json({
    geminiAvailable: !!process.env.GEMINI_API_KEY
  });
});

app.post('/api/assistant/parse', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'query' is required." });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.log("[Assistant] GEMINI_API_KEY is missing. Using local fallback parser.");
      const parsed = fallbackLocalParse(query);
      return res.json(parsed);
    }

    try {
      console.log("[Assistant] Calling Gemini API...");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze the user's shipping query and extract raw logistics entities. Match countries to our supported list.
Supported Countries: United States, United Kingdom, Germany, France, Japan, China, India, UAE, Saudi Arabia, Australia, Canada, Brazil, South Korea, Singapore, Netherlands, Italy, Spain, Mexico, Indonesia, South Africa.

Identify quantity, unit weight, total weight, unit price, total price, and transportation mode from the query. Do NOT guess or hallucinate any fields if they are not specified.

User Query: "${query}"`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "object",
                properties: {
                  product: { type: "string", description: "The primary product/commodity name" },
                  destination: { type: "string", description: "The destination country name" },
                  origin: { type: "string", description: "The origin country name" },
                  quantity: { type: "number", description: "The number of units" },
                  unitWeight: { type: "number", description: "Weight of a single unit" },
                  totalWeight: { type: "number", description: "Total gross weight" },
                  unitPrice: { type: "number", description: "Price of a single unit in USD" },
                  totalPrice: { type: "number", description: "Total cost in USD" },
                  mode: { type: "string", description: "Transport mode: air, sea, road" }
                },
                required: ["product"]
              }
            }
          })
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textContent) {
        throw new Error("Empty response from Gemini API");
      }

      const parsedResult = JSON.parse(textContent);
      console.log("[Assistant] Gemini Raw Output:", parsedResult);
      
      if (parsedResult.destination && !SUPPORTED_COUNTRIES.includes(parsedResult.destination)) {
        parsedResult.destination = null;
      }
      if (parsedResult.origin && !SUPPORTED_COUNTRIES.includes(parsedResult.origin)) {
        parsedResult.origin = null;
      }

      const quantity = parsedResult.quantity || 1;
      let weight = parsedResult.totalWeight || null;
      if (!weight && parsedResult.unitWeight) {
        weight = quantity * parsedResult.unitWeight;
      }

      let productValue = parsedResult.totalPrice || null;
      if (!productValue && parsedResult.unitPrice) {
        productValue = quantity * parsedResult.unitPrice;
      }

      const finalResponse = {
        product: parsedResult.product || "goods",
        destination: parsedResult.destination || null,
        origin: parsedResult.origin || null,
        weight,
        quantity,
        productValue,
        mode: parsedResult.mode || null,
        isFallback: false
      };

      console.log("[Assistant] Processed Response:", finalResponse);
      res.json(finalResponse);

    } catch (apiError) {
      console.error("[Assistant] Gemini API call failed, running local fallback parser:", apiError);
      const parsed = fallbackLocalParse(query);
      res.json(parsed);
    }

  } catch (error) {
    console.error("[Assistant] Handler error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// --- ROUTE OPTIMIZATION & CONGESTION ---

app.get('/api/routes/optimize', async (req, res) => {
  try {
    const { origin, destination, modes = 'road,port,air,border' } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: "Query parameters 'origin' and 'destination' are required." });
    }

    const result = await optimizeRoute({ origin, destination, modes });
    res.json(result);
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ error: error.message || 'Route optimization failed.' });
  }
});

app.post('/api/routes/optimize', async (req, res) => {
  try {
    const { origin, destination, modes = ['road', 'port', 'air', 'border'] } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: "Body fields 'origin' and 'destination' are required." });
    }

    const result = await optimizeRoute({ origin, destination, modes });
    res.json(result);
  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ error: error.message || 'Route optimization failed.' });
  }
});

// --- THEFT REPORTS ---
const theftReportsRouter = require('./routes/theftReports');
app.use('/api/theft-reports', theftReportsRouter);

// --- WAREHOUSE CONGESTION PREDICTOR ---
const warehouseCongestionRouter = require('./routes/warehouseCongestion');
app.use('/api/warehouse-congestion', warehouseCongestionRouter);

// --- HS CODE IMAGE SCAN (AI Vision Feature) ---
const hsScanRouter = require('./features/hs-scan/hsScanRoute');
app.use('/api/hs-scan', hsScanRouter);

app.get('/', (req, res) => {
  res.json({
    status: 'Backend is running',
    success: true
  });
});

// VERCEL FIX: Do not call app.listen() in production on Vercel. 
// Vercel handles the server listening process automatically. We just need to export the app.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Backend server running locally on port ${PORT}`);
  });
}

// VERCEL FIX: You MUST export the express app for Vercel Serverless Functions to pick it up.
module.exports = app;