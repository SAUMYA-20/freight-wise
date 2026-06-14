/**
 * hs-scan/hsScanService.js
 *
 * Handles the two-step AI pipeline:
 *   1. Send the uploaded image to Gemini Vision → identify the product.
 *   2. Query the MongoDB HSCode collection → return matching HS codes.
 */

const mongoose = require('mongoose');

// ─── Lazy-load HSCode model (avoids re-registration conflicts) ───────────────
function getHSCodeModel() {
  if (mongoose.models.HSCode) return mongoose.models.HSCode;

  const schema = new mongoose.Schema({
    hsn4Digit:   { type: String },
    hsn8Digit:   { type: String },
    productName: { type: String },
    gstRate:     { type: String },
    embedding:   { type: [Number] },
  }, { timestamps: true });

  return mongoose.model('HSCode', schema);
}

// ─── Step 1: Ask Gemini Vision to identify what the image shows ──────────────
async function identifyProductFromImage(imageBuffer, mimeType) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL   = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!GEMINI_API_KEY) {
    // No API key — return a stub so the feature still responds gracefully
    return {
      identified_item:  'Unknown Product',
      search_keywords:  [],
      confidence:       0,
      description:      'GEMINI_API_KEY not set in .env — image analysis unavailable.',
      isFallback:       true,
    };
  }

  const base64Image = imageBuffer.toString('base64');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `You are a customs and trade expert. Analyze the provided image and identify the physical product shown.
Return ONLY valid JSON — no markdown, no explanation — with this exact structure:
{
  "identified_item": "<concise product name, e.g. Wireless Bluetooth Headphones>",
  "search_keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "confidence": <number 0–100>,
  "description": "<one sentence describing the product for customs classification purposes>"
}

Rules:
- "identified_item" must be a short, generic product name suitable for an HS code lookup.
- "search_keywords" must list 3–6 single words or short phrases that would appear in an HS code database product name field.
- "confidence" reflects how certain you are about the identification (0 = no idea, 100 = certain).
- If the image is unclear or not a physical product, set confidence to 0 and explain in description.`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Image } },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429) {
      console.warn('[HSScan] Gemini Quota Exceeded (429). Using fallback.');
      return {
        identified_item:  'Item (Fallback Mode)',
        search_keywords:  ['laptop', 'electronics'], // basic fallback keywords
        confidence:       0,
        description:      'Your Gemini API key has exceeded its free tier quota or is blocked in your region. This is a fallback response.',
        isFallback:       true,
      };
    }
    throw new Error(`Gemini Vision API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Empty response from Gemini Vision API');

  // Strip any accidental markdown fences
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── Step 2: Search the HSCode collection using the identified keywords ───────
async function findHSCodesForKeywords(keywords, identifiedItem) {
  const HSCode = getHSCodeModel();

  if (!keywords || keywords.length === 0) return [];

  // Build one regex per keyword, search inside productName
  const regexes = keywords.map(kw => new RegExp(kw, 'i'));

  const results = await HSCode.find({
    $or: [
      { productName: { $in: regexes } },
      // Also try the identified_item itself as a direct regex
      { productName: { $regex: identifiedItem, $options: 'i' } },
    ],
  })
    .select('hsn4Digit hsn8Digit productName gstRate -_id')
    .limit(12)
    .lean();

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────
async function scanImageForHSCodes(imageBuffer, mimeType) {
  console.log('[HSScan] Sending image to Gemini Vision…');
  const identification = await identifyProductFromImage(imageBuffer, mimeType);
  console.log('[HSScan] Identified:', identification.identified_item, `(confidence: ${identification.confidence}%)`);

  const matches = await findHSCodesForKeywords(
    identification.search_keywords,
    identification.identified_item,
  );
  console.log(`[HSScan] Found ${matches.length} HS code match(es).`);

  return {
    identification,
    matches,
  };
}

module.exports = { scanImageForHSCodes };
