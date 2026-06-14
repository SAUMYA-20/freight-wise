/**
 * Google Gemini AI integration for warehouse congestion forecasting.
 * Falls back to heuristic prediction when GEMINI_API_KEY is not set.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function buildPrompt(recordData, historicalSummaries = []) {
  const available = Object.entries(recordData)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const historyBlock = historicalSummaries.length
    ? `\nRecent historical predictions for this warehouse:\n${historicalSummaries.map((h) =>
      `  ${h.date}: score=${h.congestionScore}, wait=${h.predictedWaitTimeMinutes}min, level=${h.congestionLevel}`
    ).join('\n')}`
    : '\nNo historical predictions available for this warehouse.';

  return `You are an expert warehouse operations and logistics AI analyst. Analyze the following warehouse operational data and predict congestion levels, truck waiting times, and optimal arrival windows for drivers.

Available data (partial data is OK — infer from what is provided):
${available || '(minimal data provided — use general logistics heuristics)'}
${historyBlock}

Consider: dock utilization, truck inflow rate, unload/load times, weather, traffic, holidays, worker/equipment availability, and capacity constraints.

Return ONLY valid JSON with this exact structure (no markdown):
{
  "congestion_level": "Low" | "Moderate" | "High" | "Critical",
  "congestion_score": <number 0-100>,
  "predicted_wait_time_minutes": <number>,
  "recommended_arrival_window": "<time range string e.g. 1:00 PM - 2:00 PM>",
  "risk_factors": ["<factor1>", "<factor2>"],
  "recommendations": ["<recommendation1>", "<recommendation2>"],
  "confidence_score": <number 0-100>,
  "reasoning": "<brief explanation for drivers>"
}`;
}

function parseGeminiJson(text) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

function generateFallbackPrediction(recordData) {
  let score = 25;
  const risks = [];
  const recs = [];

  const trucksInside = recordData.trucksCurrentlyInside || 0;
  const trucksWaiting = recordData.trucksWaitingOutside || 0;
  const trucksNextHour = recordData.trucksScheduledNextHour || 0;
  const dockCount = recordData.dockCount || 4;
  const dockUtil = recordData.dockUtilization || 0;
  const avgUnload = recordData.avgUnloadTime || 45;
  const trafficDelay = recordData.trafficDelay || 0;

  score += Math.min(30, trucksWaiting * 5);
  score += Math.min(20, trucksNextHour * 3);
  score += Math.min(15, dockUtil * 0.15);
  score += Math.min(10, trafficDelay * 0.2);
  score = Math.min(100, Math.round(score));

  if (trucksWaiting > 3) risks.push('Trucks queue building outside warehouse');
  if (trucksNextHour > dockCount) risks.push('Incoming truck volume exceeds dock capacity');
  if (dockUtil > 80) risks.push('High dock utilization');
  if (trafficDelay > 15) risks.push('External traffic delays affecting arrivals');
  if (risks.length === 0) risks.push('Limited operational data — estimate based on available metrics');

  if (score > 70) recs.push('Delay arrivals by 1–2 hours');
  if (dockUtil > 85) recs.push('Open overflow staging area');
  if (trucksNextHour > dockCount) recs.push('Stagger delivery appointments');
  recs.push('Monitor dock utilization in real time');

  const waitMinutes = Math.round(
    (trucksWaiting * avgUnload) / Math.max(dockCount, 1) + trafficDelay * 0.5
  );

  let level = 'Low';
  if (score >= 80) level = 'Critical';
  else if (score >= 60) level = 'High';
  else if (score >= 35) level = 'Moderate';

  const hour = new Date().getHours();
  const recommendedStart = (hour + Math.ceil(waitMinutes / 60) + 1) % 24;
  const fmt = (h) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:00 ${period}`;
  };

  return {
    congestion_level: level,
    congestion_score: score,
    predicted_wait_time_minutes: Math.max(5, waitMinutes),
    recommended_arrival_window: `${fmt(recommendedStart)} - ${fmt((recommendedStart + 1) % 24)}`,
    risk_factors: risks,
    recommendations: recs,
    confidence_score: Object.keys(recordData).filter((k) => recordData[k] != null && recordData[k] !== '').length > 5 ? 65 : 40,
    reasoning: `Based on ${trucksWaiting} trucks waiting, ${trucksNextHour} scheduled arrivals, and ${dockUtil}% dock utilization.`,
    source: 'heuristic_fallback',
  };
}

async function predictWithGemini(recordData, historicalSummaries = []) {
  if (!GEMINI_API_KEY) {
    return generateFallbackPrediction(recordData);
  }

  const prompt = buildPrompt(recordData, historicalSummaries);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Gemini API error:', errText);
    const fallback = generateFallbackPrediction(recordData);
    fallback.source = 'heuristic_fallback_gemini_error';
    return fallback;
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');

  const parsed = parseGeminiJson(text);
  parsed.source = 'gemini';
  return parsed;
}

module.exports = { predictWithGemini, generateFallbackPrediction, buildPrompt };
