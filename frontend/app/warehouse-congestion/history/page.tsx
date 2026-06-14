"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import WarehouseCongestionNav, { CONGESTION_LEVEL_COLORS } from "../components/WarehouseCongestionNav";

interface Prediction {
  congestionLevel: string;
  congestionScore: number;
  predictedWaitTimeMinutes: number;
  recommendedArrivalWindow: string;
}

interface HistoryRecord {
  recordId: string;
  warehouseId: string;
  warehouseName: string;
  createdAt: string;
  latestPrediction: Prediction | null;
}

export default function CongestionHistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Array<{ warehouseId: string; warehouseName: string }>>([]);

  useEffect(() => {
    fetch("/api/warehouse-congestion/warehouses").then((r) => r.json()).then(setWarehouses).catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (warehouseFilter) params.set("warehouseId", warehouseFilter);
    if (levelFilter) params.set("congestionLevel", levelFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/warehouse-congestion/predictions?${params}`);
    const predData = await res.json();

    const recParams = new URLSearchParams({ page: String(page), limit: "10" });
    if (warehouseFilter) recParams.set("warehouseId", warehouseFilter);
    if (levelFilter) recParams.set("congestionLevel", levelFilter);
    if (dateFrom) recParams.set("dateFrom", dateFrom);
    if (dateTo) recParams.set("dateTo", dateTo);

    const recRes = await fetch(`/api/warehouse-congestion/records?${recParams}`);
    const recData = await recRes.json();

    setRecords(recData.records || []);
    setPagination(recData.pagination || predData.pagination || { page: 1, totalPages: 0, total: 0 });
    setLoading(false);
  }, [page, warehouseFilter, levelFilter, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(fetchHistory, 300);
    return () => clearTimeout(t);
  }, [fetchHistory]);

  useEffect(() => { setPage(1); }, [warehouseFilter, levelFilter, dateFrom, dateTo]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="page-header">
        <div className="container">
          <div className="label">Warehouse Congestion</div>
          <h1 style={{ marginBottom: "0.5rem" }}>Historical Records</h1>
          <p style={{ maxWidth: 560, color: "var(--muted)" }}>Browse past operational records and AI predictions.</p>
        </div>
      </div>

      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <WarehouseCongestionNav />

        <div className="card" style={{ marginBottom: "1.25rem", padding: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem" }}>Warehouse</label>
              <select className="input select" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} style={{ width: "100%" }}>
                <option value="">All</option>
                {warehouses.map((w) => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseName || w.warehouseId}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem" }}>Congestion Level</label>
              <select className="input select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ width: "100%" }}>
                <option value="">All</option>
                {["Low", "Moderate", "High", "Critical"].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem" }}>From</label>
              <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem" }}>To</label>
              <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}><Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
          ) : records.length === 0 ? (
            <p style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>No records found.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr 0.7fr 0.7fr 1fr", padding: "0.75rem 1.25rem", background: "var(--bg)", borderBottom: "1px solid var(--border)", fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }} className="desktop-only">
                <span>Date</span><span>Warehouse</span><span>Level</span><span>Score</span><span>Wait</span><span>Recommended Slot</span>
              </div>
              {records.map((r) => {
                const p = r.latestPrediction;
                const badge = CONGESTION_LEVEL_COLORS[p?.congestionLevel || "Unknown"];
                return (
                  <div key={r.recordId} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", gap: "0.5rem", fontSize: "0.8125rem", alignItems: "center" }}>
                    <div style={{ color: "var(--muted)" }}>{fmtDate(r.createdAt)}</div>
                    <div style={{ fontWeight: 600, color: "var(--navy)" }}>{r.warehouseName || r.warehouseId || "—"}</div>
                    <div>
                      {p ? (
                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "var(--radius-pill)", fontSize: "0.7rem", fontWeight: 700, background: badge.bg, color: badge.color }}>{p.congestionLevel}</span>
                      ) : "—"}
                    </div>
                    <div>{p?.congestionScore ?? "—"}{p ? "/100" : ""}</div>
                    <div>{p ? `${p.predictedWaitTimeMinutes} min` : "—"}</div>
                    <div style={{ color: "var(--accent)", fontWeight: 600 }}>{p?.recommendedArrivalWindow || "—"}</div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>{pagination.total} records · Page {page}/{pagination.totalPages}</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={16} /></button>
              <button className="btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
