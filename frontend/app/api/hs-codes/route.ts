/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Ensure this matches your exact Mongoose Schema
const hsCodeSchema = new mongoose.Schema({
  hsn4Digit: String,
  hsn8Digit: String,
  productName: String,
  gstRate: String,
});

const HSCode = mongoose.models.HSCode || mongoose.model('HSCode', hsCodeSchema);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q');

    if (!rawQuery) return NextResponse.json([]);

    // Map common terms to official dataset terms
    const synonyms: Record<string, string> = {
      'laptop': 'computer',
      'phone': 'telephone',
      'smartphone': 'telephone',
      'car': 'vehicle',
      'shoes': 'footwear',
      'clothes': 'apparel',
      'tv': 'television',
    };
    const query = synonyms[rawQuery.toLowerCase().trim()] || rawQuery;

    // 1. Strict Environment Check
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is completely missing. Check your .env.local file.");
    }

    // 2. Connect to Database
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
    }

    // 3. Fast Regex Prefix Search (Perfect for "First Letter" typing)
    // This searches for any product name or HS code that CONTAINS the typed letters
    const results = await HSCode.find({
      $or: [
        { productName: { $regex: query, $options: 'i' } }, // 'i' makes it case-insensitive
        { hsn4Digit: { $regex: query, $options: 'i' } }
      ]
    })
    .select('hsn4Digit hsn8Digit productName gstRate -_id')
    .limit(10) // Limit to 10 results so the dropdown doesn't lag
    .lean();

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('BACKEND API ERROR:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}