"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert, Search, Plus, ChevronRight, Loader2,
  Filter, ArrowUpDown, ChevronLeft,
} from "lucide-react";

interface TheftReportSummary {
  reportId: string;
  trackingNumber: string;
  shipmentId: string;
  incidentType: string;
  estimatedLossAmount: number;
  status: string;
  createdAt: string;
  location: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Reported: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  "Under Investigation": { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  Resolved: { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
  Closed: { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
};

const STATUSES = ["", "Reported", "Under Investigation", "Resolved", "Closed"];

export default function TheftReportsListPage() {
  const [reports, setReports] = useState<TheftReportSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        sort,
        ...(search.trim() && { search: search.trim() }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/theft-reports?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reports");
      setReports(data.reports);
      setPagination(data.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sort]);

  useEffect(() => {
    const timer = setTimeout(fetchReports, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchReports, search]);

  useEffect(() => { setPage(1); }, [search, statusFilter, sort]);

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="page-header">
        <div className="container">
          <div className="animate-fadeUp"><div className="label">Security</div></div>
          <div className="animate-fadeUp delay-1" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ marginBottom: "0.875rem" }}>Theft Reports</h1>
              <p style={{ maxWidth: 520, fontSize: "1.0625rem", color: "var(--muted)" }}>
                Report and track cargo, package, vehicle, and equipment theft incidents across your supply chain.
              </p>
            </div>
            <Link href="/theft-reports/new" className="btn btn-blue" style={{ flexShrink: 0 }}>
              <Plus size={16} /> Report Theft
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        {/* Filters */}
        <div className="card" style={{ marginBottom: "1.25rem", padding: "1rem 1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.875rem", alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "0.75rem" }}>Search</label>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input
                  className="input"
                  placeholder="Report ID, tracking, shipment…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: "2.25rem", width: "100%" }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem" }}><Filter size={12} style={{ display: "inline", marginRight: 4 }} />Status</label>
              <select className="input select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: "100%" }}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s || "All statuses"}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem" }}><ArrowUpDown size={12} style={{ display: "inline", marginRight: 4 }} />Sort by date</label>
              <select className="input select" value={sort} onChange={(e) => setSort(e.target.value as "desc" | "asc")} style={{ width: "100%" }}>
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : error ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#DC2626" }}>{error}</div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
              <ShieldAlert size={40} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
              <p>No theft reports found.</p>
              <Link href="/theft-reports/new" className="btn btn-blue" style={{ marginTop: "1rem" }}>
                Submit first report
              </Link>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr 0.9fr 0.8fr 32px",
                padding: "0.75rem 1.25rem", background: "var(--bg)",
                borderBottom: "1px solid var(--border)", fontSize: "0.7rem",
                fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em",
              }} className="desktop-only">
                <span>Report ID</span>
                <span>Tracking #</span>
                <span>Incident Type</span>
                <span>Est. Loss</span>
                <span>Status</span>
                <span>Date Reported</span>
                <span />
              </div>

              {reports.map((r) => {
                const badge = STATUS_COLORS[r.status] || STATUS_COLORS.Closed;
                return (
                  <Link key={r.reportId} href={`/theft-reports/${r.reportId}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr)) 32px",
                      padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)",
                      alignItems: "center", gap: "0.5rem", transition: "background 0.15s",
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--navy)" }}>{r.reportId}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{r.location}</div>
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--navy)" }}>{r.trackingNumber}</div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>{r.incidentType}</div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--navy)" }}>{fmt(r.estimatedLossAmount)}</div>
                      <span style={{
                        display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-pill)",
                        fontSize: "0.7rem", fontWeight: 700, background: badge.bg, color: badge.color,
                        border: `1px solid ${badge.border}`, width: "fit-content",
                      }}>{r.status}</span>
                      <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>{fmtDate(r.createdAt)}</div>
                      <ChevronRight size={16} color="var(--muted)" />
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem" }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
              {pagination.total} report{pagination.total !== 1 ? "s" : ""} · Page {pagination.page} of {pagination.totalPages}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "0.4rem 0.75rem" }}>
                <ChevronLeft size={16} /> Prev
              </button>
              <button className="btn" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: "0.4rem 0.75rem" }}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
