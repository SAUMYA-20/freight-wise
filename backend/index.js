require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve uploaded evidence files
app.use('/uploads/theft-reports', express.static(path.join(__dirname, 'uploads', 'theft-reports')));

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing in .env file");
  // We don't exit in development, but you should add it!
} else {
  mongoose.connect(MONGODB_URI).then(() => {
    console.log("Connected to MongoDB.");
  }).catch(err => {
    console.error("Failed to connect to MongoDB", err);
  });
}

let embedder;

async function loadEmbedder() {
  const { pipeline } = await import('@xenova/transformers');
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
  });
  console.log("AI Embedder ready.");
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
    // Note: You must create an Atlas Vector Search index named "vector_index" on the "hscodes" collection
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

    // If vector search is not set up, or the user hasn't created the index yet,
    // this will silently return an empty array instead of throwing an error in some MongoDB versions.
    if (results.length === 0) {
      throw new Error("Vector search returned 0 results, index might be missing or building.");
    }

    res.json({ results });
  } catch (error) {
    console.error("Vector search failed:", error);
    
    // Fallback to basic text search if Vector Search isn't configured yet
    try {
        const { q } = req.query;
        const HSCode = require('./models/HSCode');
        
        // Map common terms to official dataset terms
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
        
        // Split the query into words for better fallback matching
        const words = mappedQ.split(' ').filter(w => w.length > 2);
        const searchRegexes = words.length > 0 ? words.map(w => new RegExp(w, 'i')) : [new RegExp(mappedQ, 'i')];
        
        const fallbackResults = await HSCode.find({
            productName: { $in: searchRegexes }
        }).limit(10).lean();
        
        // Remove embeddings from response to keep it light
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

// Start the background cron job for fuel prices
startFuelIntelligenceCron();

// Get Product Details + Trade Intelligence based on Destination
app.get('/api/product/:hsCode/intelligence', async (req, res) => {
  try {
    const { hsCode } = req.params;
    const { destination, weight = 100 } = req.query; // Default 100kg if not provided

    // 1. Get Product Details from HSCode Collection
    const HSCode = require('./models/HSCode');
    const product = await HSCode.findOne({ hsn8Digit: hsCode }).lean();
    
    if (!product) {
      return res.status(404).json({ error: "Product HS Code not found" });
    }

    // Ensure we don't send massive embeddings to the frontend
    delete product.embedding;

    // If no destination is selected yet, just return the product info
    if (!destination) {
      return res.json({ product });
    }

    // 2. Fetch Compliance Rules & Taxes for Destination
    // For demo purposes, if they don't exist in DB, we'll generate deterministic mock ones
    let countryTax = await CountryTax.findOne({ hsnCode: hsCode, destinationCountry: destination }).lean();
    let compRule = await ComplianceRule.findOne({ hsnCode: hsCode, destinationCountry: destination }).lean();
    let docRule = await DocumentRule.findOne({ hsnCode: hsCode, destinationCountry: destination }).lean();

    // --- Dynamic Mock Rule Generator (for demonstration) ---
    if (!countryTax) {
      // Deterministic generation based on character code
      const hash = hsCode.charCodeAt(0) + destination.charCodeAt(0);
      
      countryTax = {
        importDuty: (hash % 15) + 5, // 5% to 20%
        vatGst: destination === 'India' ? 18 : (destination === 'UAE' ? 5 : 20)
      };
      
      compRule = {
        isDangerousGood: hash % 10 === 0, // 10% chance
        restrictions: hash % 3 === 0 ? ['Import License Required'] : [],
        dgWarnings: hash % 10 === 0 ? ['Class 9 Miscellaneous Dangerous Goods'] : []
      };
      
      docRule = {
        requiredDocuments: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin']
      };
      if (hash % 2 === 0) docRule.requiredDocuments.push('Phytosanitary Certificate');
    }
    // -------------------------------------------------------

    // 3. Calculate Freight Cost
    const origin = 'United States'; // Hardcoded for demo
    const freightCost = await calculateFreightCost({
      origin,
      destination,
      weightKg: parseFloat(weight)
    });

    // 4. Send combined Trade Intelligence Payload
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

  // 1. Extract Quantity
  let quantity = 1;
  let quantityParsed = false;
  
  // Try pattern multiplier first, e.g. "20 10kg" or "20x10kg"
  const qtyWeightRegex = /(\d+)\s*(?:x|\*|\s+)\s*(\d+(?:\.\d+)?)\s*(?:kg|kilograms?|kilo?s?)\b/i;
  const qtyWeightMatch = lowercaseQuery.match(qtyWeightRegex);
  if (qtyWeightMatch) {
    quantity = parseInt(qtyWeightMatch[1], 10);
    quantityParsed = true;
  } else {
    // Check separate quantity suffix
    const qtyRegex = /(\d+)\s*(?:units|pcs|pieces|items|qty|quantity)\b/i;
    const qtyMatch = lowercaseQuery.match(qtyRegex);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
      quantityParsed = true;
    } else {
      // Check isolated leading quantity, e.g. "export 40 batteries"
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

  // 2. Extract Weight (unit or total)
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

  // 3. Extract Transport Mode
  let mode = null;
  if (/\b(?:air|plane|flight)\b/i.test(lowercaseQuery)) {
    mode = 'air';
  } else if (/\b(?:sea|ocean|ship|boat)\b/i.test(lowercaseQuery)) {
    mode = 'sea';
  } else if (/\b(?:road|truck|land|car)\b/i.test(lowercaseQuery)) {
    mode = 'road';
  }

  // 4. Extract Price/Value (unit or total)
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
    /i want to export/gi,
    /i want to import/gi,
    /i want to ship/gi,
    /i want to send/gi,
    /please export/gi,
    /please ship/gi,
    /please send/gi,
    /how to export/gi,
    /exporting/gi,
    /importing/gi,
    /export/gi,
    /import/gi,
    /shipment/gi,
    /shipping/gi,
    /ship/gi,
    /send/gi,
    /\bto\b/gi,
    /\bfrom\b/gi,
    /\bof\b/gi,
    /\ba\b/gi,
    /\ban\b/gi,
    /\bthe\b/gi,
    /\bwith\b/gi,
    /\bweighing\b/gi,
    /\bweight\b/gi,
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
                  product: {
                    type: "string",
                    description: "The primary product/commodity name being shipped, e.g. 'leather wallets', 'laptop'."
                  },
                  destination: {
                    type: "string",
                    description: "The destination country name, matching exactly one of the supported countries list (Capitalized), or null if not specified."
                  },
                  origin: {
                    type: "string",
                    description: "The origin country name, matching exactly one of the supported countries list (Capitalized), or null if not specified."
                  },
                  quantity: {
                    type: "number",
                    description: "The number of units or items being shipped. Defaults to 1 if not explicitly mentioned otherwise."
                  },
                  unitWeight: {
                    type: "number",
                    description: "The weight of a single unit in kilograms (numeric only), or null if not specified. E.g. for '40 30kg batteries', unitWeight is 30."
                  },
                  totalWeight: {
                    type: "number",
                    description: "The total gross weight of the shipment in kilograms if explicitly specified (numeric only), or null if not specified."
                  },
                  unitPrice: {
                    type: "number",
                    description: "The price of a single unit in USD (numeric only), or null if not specified. E.g. for 'each costing 200 dollars', unitPrice is 200."
                  },
                  totalPrice: {
                    type: "number",
                    description: "The total cost or value of the shipment in USD if explicitly specified (numeric only), or null if not specified."
                  },
                  mode: {
                    type: "string",
                    description: "The preferred transport mode, matching exactly one of: 'air', 'sea', 'road', or null if not specified."
                  }
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

