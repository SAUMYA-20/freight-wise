"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, Warehouse, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import WarehouseCongestionNav from "../components/WarehouseCongestionNav";

interface DashboardStats {
  totalWarehouses: number;
  totalRecords: number;
  activePredictions: number;
  highCongestionCount: number;
  criticalCongestionCount: number;
  averageWaitTimeMinutes: number;
  averageCongestionScore: number;
  trendData: Array<{ date: string; congestionScore: number; waitTime: number; warehouse: string }>;
}

export default function CongestionDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/warehouse-congestion/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const s = stats || {
    totalWarehouses: 0, totalRecords: 0, activePredictions: 0,
    highCongestionCount: 0, criticalCongestionCount: 0,
    averageWaitTimeMinutes: 0, averageCongestionScore: 0, trendData: [],
  };

  const statCards = [
    { label: "Total Warehouses", value: s.totalWarehouses, icon: Warehouse, color: "#0066FF" },
    { label: "Active Predictions", value: s.activePredictions, icon: TrendingUp, color: "#0D9488" },
    { label: "High Congestion", value: s.highCongestionCount, icon: AlertTriangle, color: "#EA580C" },
    { label: "Critical", value: s.criticalCongestionCount, icon: AlertTriangle, color: "#DC2626" },
    { label: "Avg Wait Time", value: `${s.averageWaitTimeMinutes} min`, icon: Clock, color: "#7C3AED" },
    { label: "Avg Congestion Score", value: `${s.averageCongestionScore}/100`, icon: TrendingUp, color: "#F59E0B" },
  ];

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="page-header">
        <div className="container">
          <div className="label">Warehouse Congestion</div>
          <h1 style={{ marginBottom: "0.5rem" }}>Congestion Dashboard</h1>
          <p style={{ maxWidth: 560, color: "var(--muted)" }}>Real-time overview of warehouse congestion across your network.</p>
        </div>
      </div>

      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <WarehouseCongestionNav />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card" style={{ padding: "1.25rem" }}>
              <Icon size={20} color={color} style={{ marginBottom: "0.5rem" }} />
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--navy)" }}>{value}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          <div className="card">
            <h3 style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>Congestion Score Trend</h3>
            {s.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={s.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="congestionScore" stroke="#0066FF" strokeWidth={2} dot={{ r: 3 }} name="Score" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", textAlign: "center", padding: "2rem" }}>No prediction data yet. <Link href="/warehouse-congestion/new">Create a record</Link></p>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>Wait Time Trend</h3>
            {s.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={s.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="waitTime" stroke="#EA580C" strokeWidth={2} dot={{ r: 3 }} name="Wait (min)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", textAlign: "center", padding: "2rem" }}>No data available</p>
            )}
          </div>

          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>Arrival Volume (Congestion Score by Date)</h3>
            {s.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={s.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="congestionScore" fill="#7C3AED" name="Congestion Score" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
