"use client";

import { useState, useEffect } from "react";
import { Loader2, Truck, Clock, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import WarehouseCongestionNav, { CONGESTION_LEVEL_COLORS } from "../components/WarehouseCongestionNav";

interface Warehouse {
  warehouseId: string;
  warehouseName: string;
  location?: string;
}

interface DriverView {
  warehouseId: string;
  warehouseName: string;
  arrivalTime?: string;
  congestionLevel: string;
  congestionScore: number | null;
  predictedWaitTimeMinutes: number | null;
  recommendedArrivalWindow: string | null;
  riskFactors?: string[];
  recommendations?: string[];
  reasoning?: string;
  confidenceScore?: number;
  message?: string;
}

export default function DriverCongestionPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [view, setView] = useState<DriverView | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetch("/api/warehouse-congestion/warehouses")
      .then((r) => r.json())
      .then((list: Warehouse[]) => {
        setWarehouses(list);
        if (list.length) setWarehouseId(list[0].warehouseId);
      })
      .catch(console.error)
      .finally(() => setLoadingList(false));
  }, []);

  async function checkCongestion() {
    if (!warehouseId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ warehouseId });
      if (arrivalTime) params.set("arrivalTime", arrivalTime);
      const res = await fetch(`/api/warehouse-congestion/driver?${params}`);
      const data = await res.json();
      setView(data);
    } catch {
      setView(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (warehouseId) checkCongestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  const badge = CONGESTION_LEVEL_COLORS[view?.congestionLevel || "Unknown"];

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="page-header" style={{ background: "linear-gradient(135deg, #0D948812 0%, #0066FF08 100%)" }}>
        <div className="container">
          <div className="label">Driver / Captain Portal</div>
          <h1 style={{ marginBottom: "0.5rem" }}>Warehouse Arrival Guide</h1>
          <p style={{ maxWidth: 560, color: "var(--muted)" }}>Check current congestion and get AI-recommended arrival windows before heading to the warehouse.</p>
        </div>
      </div>

      <div className="container" style={{ padding: "2rem 1.5rem", maxWidth: 720 }}>
        <WarehouseCongestionNav />

        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "1rem" }}>
            <div>
              <label>Select Warehouse</label>
              {loadingList ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <select className="input select" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} style={{ width: "100%" }}>
                  {warehouses.length === 0 && <option value="">No warehouses yet</option>}
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseName || w.warehouseId}{w.location ? ` — ${w.location}` : ""}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label>Expected Arrival Time</label>
              <input className="input" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-blue" onClick={checkCongestion} disabled={loading || !warehouseId} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
            Check Congestion
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "2rem" }}><Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
        )}

        {view && !loading && (
          <div className="card" style={{ border: `2px solid ${badge.color}30` }}>
            {view.message ? (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: "1rem" }}>{view.message}</p>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Truck size={24} color={badge.color} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1.25rem", margin: 0 }}>{view.warehouseName}</h2>
                    <span style={{ padding: "0.25rem 0.75rem", borderRadius: "var(--radius-pill)", fontSize: "0.8125rem", fontWeight: 700, background: badge.bg, color: badge.color }}>
                      Congestion: {view.congestionLevel}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  {[
                    { label: "Congestion Score", value: view.congestionScore != null ? `${view.congestionScore}/100` : "—", icon: Sparkles },
                    { label: "Predicted Wait", value: view.predictedWaitTimeMinutes != null ? `${view.predictedWaitTimeMinutes} min` : "—", icon: Clock },
                    { label: "Confidence", value: view.confidenceScore != null ? `${view.confidenceScore}%` : "—", icon: CheckCircle2 },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} style={{ textAlign: "center", padding: "1rem", background: "var(--bg)", borderRadius: "var(--radius)" }}>
                      <Icon size={18} color="var(--accent)" style={{ marginBottom: "0.375rem" }} />
                      <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--navy)" }}>{value}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {view.recommendedArrivalWindow && (
                  <div style={{ padding: "1rem 1.25rem", borderRadius: "var(--radius)", background: "var(--accent-bg)", border: "1px solid var(--accent-border)", marginBottom: "1.25rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: "0.375rem" }}>Recommended Arrival</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--navy)" }}>{view.recommendedArrivalWindow}</div>
                  </div>
                )}

                {view.reasoning && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.375rem" }}>Reason</div>
                    <p style={{ fontSize: "0.875rem", lineHeight: 1.7, color: "var(--navy)" }}>{view.reasoning}</p>
                  </div>
                )}

                {view.riskFactors && view.riskFactors.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                      <AlertTriangle size={12} style={{ display: "inline", marginRight: 4 }} />Risk Factors
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem", color: "var(--navy)", lineHeight: 1.8 }}>
                      {view.riskFactors.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}

                {view.recommendations && view.recommendations.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>Recommendations</div>
                    <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem", color: "var(--navy)", lineHeight: 1.8 }}>
                      {view.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
