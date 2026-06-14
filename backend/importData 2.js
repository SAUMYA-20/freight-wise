require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const HSCode = require('./models/HSCode');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing in .env file");
  process.exit(1);
}

// Function to chunk array for batch processing
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  console.log("Loading AI Model for embeddings...");
  // Use dynamic import for the ES Module
  const { pipeline } = await import('@xenova/transformers');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true, // Use a smaller quantized model for speed
  });

  console.log("Model loaded. Reading CSV...");

  const results = [];
  // The csv has headers: HSN Code (4 Digit),HSN Code (8 Digit),Product Group Name,GST Rate
  fs.createReadStream('../ML/hsn_rate_list_cleaned.csv')
    .pipe(csv())
    .on('data', (data) => {
        // Only push rows that have a product name
        if (data['Product Group Name'] && data['Product Group Name'] !== '-') {
            results.push(data);
        }
    })
    .on('end', async () => {
      console.log(`Successfully read ${results.length} valid rows from CSV.`);

      // We will clear existing data to start fresh
      await HSCode.deleteMany({});
      console.log("Cleared existing data.");

      const BATCH_SIZE = 50; // Process in batches to avoid out-of-memory
      const chunks = chunkArray(results, BATCH_SIZE);

      let processed = 0;
      
      for (const chunk of chunks) {
        const hsCodeDocs = [];
        for (const row of chunk) {
          const productName = row['Product Group Name'];
          // Handle potential BOM in the first column header
          const hsn4Digit = row['HSN Code (4 Digit)'] || row['\uFEFFHSN Code (4 Digit)'];
          const hsn8Digit = row['HSN Code (8 Digit)'];
          const gstRate = row['GST Rate'];

          // Generate embedding
          const output = await embedder(productName, { pooling: 'mean', normalize: true });
          const embedding = Array.from(output.data);

          hsCodeDocs.push({
            hsn4Digit,
            hsn8Digit,
            productName,
            gstRate,
            embedding
          });
        }
        
        await HSCode.insertMany(hsCodeDocs);
        processed += chunk.length;
        console.log(`Processed ${processed}/${results.length} rows...`);
      }

      console.log("Import completed successfully!");
      console.log("IMPORTANT: Please make sure to create an Atlas Vector Search index on the 'embedding' field.");
      console.log("The index configuration should look like this:");
      console.log(`
      {
        "fields": [
          {
            "numDimensions": 384,
            "path": "embedding",
            "similarity": "cosine",
            "type": "vector"
          }
        ]
      }
      `);
      process.exit(0);
    });
}

run().catch(console.error);
