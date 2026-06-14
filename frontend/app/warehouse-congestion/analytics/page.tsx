"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import WarehouseCongestionNav, { CONGESTION_LEVEL_COLORS } from "../components/WarehouseCongestionNav";

const PIE_COLORS = ["#059669", "#D97706", "#EA580C", "#DC2626"];

interface Prediction {
  predictionId: string;
  warehouseName: string;
  warehouseId: string;
  congestionLevel: string;
  congestionScore: number;
  predictedWaitTimeMinutes: number;
  recommendedArrivalWindow: string;
  confidenceScore: number;
  createdAt: string;
}

export default function CongestionAnalyticsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/warehouse-congestion/predictions?limit=50")
      .then((r) => r.json())
      .then((d) => setPredictions(d.predictions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartData = predictions.slice().reverse().map((p) => ({
    date: new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: p.congestionScore,
    wait: p.predictedWaitTimeMinutes,
    confidence: p.confidenceScore,
    warehouse: p.warehouseName || p.warehouseId,
  }));

  const levelCounts = ["Low", "Moderate", "High", "Critical"].map((level) => ({
    name: level,
    value: predictions.filter((p) => p.congestionLevel === level).length,
  })).filter((d) => d.value > 0);

  const warehouseCounts: Record<string, number> = {};
  predictions.forEach((p) => {
    const name = p.warehouseName || p.warehouseId || "Unknown";
    warehouseCounts[name] = (warehouseCounts[name] || 0) + 1;
  });
  const dockData = Object.entries(warehouseCounts).map(([name, count]) => ({ name, count }));

  if (loading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="page-header">
        <div className="container">
          <div className="label">Warehouse Congestion</div>
          <h1 style={{ marginBottom: "0.5rem" }}>Prediction Analytics</h1>
          <p style={{ maxWidth: 560, color: "var(--muted)" }}>Deep dive into AI prediction trends, confidence scores, and congestion distribution.</p>
        </div>
      </div>

      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <WarehouseCongestionNav />

        {predictions.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
            No predictions yet. Create a record and run Predict Congestion to see analytics.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
            <div className="card">
              <h3 style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>Congestion Score Over Time</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#0066FF" strokeWidth={2} name="Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>Wait Time Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="wait" stroke="#EA580C" strokeWidth={2} name="Wait (min)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>AI Confidence Scores</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="confidence" fill="#7C3AED" name="Confidence %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>Congestion Level Distribution</h3>
              {levelCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={levelCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {levelCounts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{ color: "var(--muted)", textAlign: "center", padding: "2rem" }}>No data</p>}
            </div>

            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>Predictions by Warehouse</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dockData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0D9488" name="Predictions" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ gridColumn: "1 / -1", padding: 0, overflow: "hidden" }}>
              <h3 style={{ fontSize: "0.9375rem", padding: "1.25rem 1.25rem 0" }}>Recent Predictions</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                      {["Date", "Warehouse", "Level", "Score", "Wait", "Slot", "Confidence"].map((h) => (
                        <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, color: "var(--muted)", fontSize: "0.7rem", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.slice(0, 15).map((p) => {
                      const badge = CONGESTION_LEVEL_COLORS[p.congestionLevel] || CONGESTION_LEVEL_COLORS.Unknown;
                      return (
                        <tr key={p.predictionId} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--muted)" }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{p.warehouseName || p.warehouseId}</td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span style={{ padding: "0.15rem 0.5rem", borderRadius: "var(--radius-pill)", fontSize: "0.7rem", fontWeight: 700, background: badge.bg, color: badge.color }}>{p.congestionLevel}</span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>{p.congestionScore}/100</td>
                          <td style={{ padding: "0.75rem 1rem" }}>{p.predictedWaitTimeMinutes} min</td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--accent)", fontWeight: 600 }}>{p.recommendedArrivalWindow}</td>
                          <td style={{ padding: "0.75rem 1rem" }}>{p.confidenceScore}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
