"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Loader2, Clock, MapPin, DollarSign,
  FileText, Image, Film, ExternalLink, Lock, LogOut, MessageSquare,
} from "lucide-react";
import {
  getManagerToken, getManagerName, setManagerSession,
  clearManagerSession, isManagerLoggedIn, managerHeaders,
} from "../../../lib/managerAuth";

interface Evidence {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: string;
}

interface TimelineEntry {
  action: string;
  message: string;
  actor: string;
  createdAt: string;
}

interface InvestigationNote {
  _id: string;
  note: string;
  author: string;
  isInternal: boolean;
  createdAt: string;
}

interface TheftReport {
  reportId: string;
  trackingNumber: string;
  shipmentId: string;
  incidentType: string;
  incidentDateTime: string;
  location: string;
  estimatedLossAmount: number;
  description: string;
  status: string;
  evidence: Evidence[];
  timeline: TimelineEntry[];
  investigationNotes: InvestigationNote[];
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUSES = ["Reported", "Under Investigation", "Resolved", "Closed"];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Reported: { bg: "#FEF2F2", color: "#DC2626" },
  "Under Investigation": { bg: "#FFFBEB", color: "#D97706" },
  Resolved: { bg: "#ECFDF5", color: "#059669" },
  Closed: { bg: "#F3F4F6", color: "#6B7280" },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

function evidenceUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url}`;
}

export default function TheftReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<TheftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newNote, setNewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers: HeadersInit = {};
      const token = getManagerToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/theft-reports/${reportId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Report not found");
      setReport(data);
      setNewStatus(data.status);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    setIsManager(isManagerLoggedIn());
    fetchReport();
  }, [fetchReport]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/theft-reports/auth/manager-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword, name: loginName || "Manager" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setManagerSession(data.token, data.name);
      setIsManager(true);
      setShowLogin(false);
      fetchReport();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    clearManagerSession();
    setIsManager(false);
    fetchReport();
  }

  async function updateStatus() {
    if (!report || newStatus === report.status) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/theft-reports/${reportId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...managerHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setReport(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/theft-reports/${reportId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...managerHeaders() },
        body: JSON.stringify({ note: newNote.trim(), isInternal: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add note");
      setReport(data);
      setNewNote("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setActionLoading(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const fmtDateTime = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  if (loading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
        <div className="container" style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
          <p style={{ color: "#DC2626", marginBottom: "1rem" }}>{error || "Report not found"}</p>
          <Link href="/theft-reports" className="btn btn-blue">Back to reports</Link>
        </div>
      </div>
    );
  }

  const badge = STATUS_COLORS[report.status] || STATUS_COLORS.Closed;

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="page-header">
        <div className="container">
          <Link href="/theft-reports" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "1rem" }}>
            <ArrowLeft size={14} /> All reports
          </Link>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div className="label">Theft Report</div>
              <h1 style={{ marginBottom: "0.5rem" }}>{report.reportId}</h1>
              <span style={{
                display: "inline-block", padding: "0.3rem 0.875rem", borderRadius: "var(--radius-pill)",
                fontSize: "0.8125rem", fontWeight: 700, background: badge.bg, color: badge.color,
              }}>{report.status}</span>
            </div>
            {!isManager ? (
              <button className="btn" onClick={() => setShowLogin(true)} style={{ fontSize: "0.8125rem" }}>
                <Lock size={14} /> Manager Login
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>{getManagerName()}</span>
                <button className="btn" onClick={handleLogout} style={{ fontSize: "0.8125rem" }}>
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manager login modal */}
      {showLogin && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(13,27,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="card" style={{ width: "100%", maxWidth: 400 }}>
            <h3 style={{ marginBottom: "1.25rem" }}>Manager Login</h3>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label>Your Name</label>
                <input className="input" value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="Manager name" />
              </div>
              <div>
                <label>Password</label>
                <input className="input" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </div>
              {loginError && <p style={{ color: "#DC2626", fontSize: "0.8125rem" }}>{loginError}</p>}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="submit" className="btn btn-blue" disabled={loginLoading} style={{ flex: 1, justifyContent: "center" }}>
                  {loginLoading ? <Loader2 size={14} className="animate-spin" /> : "Login"}
                </button>
                <button type="button" className="btn" onClick={() => setShowLogin(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", alignItems: "start" }}>

          {/* Main details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="card">
              <h3 style={{ fontSize: "1rem", marginBottom: "1.25rem" }}>Incident Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.875rem" }}>
                {[
                  { label: "Tracking Number", value: report.trackingNumber },
                  { label: "Shipment ID", value: report.shipmentId },
                  { label: "Incident Type", value: report.incidentType },
                  { label: "Incident Date", value: fmtDateTime(report.incidentDateTime) },
                  { label: "Location", value: report.location, icon: MapPin },
                  { label: "Estimated Loss", value: fmt(report.estimatedLossAmount), icon: DollarSign },
                  { label: "Date Reported", value: fmtDateTime(report.createdAt), icon: Clock },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
                      {Icon && <Icon size={11} style={{ display: "inline", marginRight: 3 }} />}{label}
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--navy)" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>Description</div>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.7, color: "var(--navy)" }}>{report.description}</p>
              </div>
              {(report.reporterName || report.reporterEmail) && (
                <div style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "var(--muted)" }}>
                  Reported by: {report.reporterName} {report.reporterEmail && `· ${report.reporterEmail}`}
                </div>
              )}
            </div>

            {/* Evidence */}
            {report.evidence?.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Evidence ({report.evidence.length})</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
                  {report.evidence.map((ev) => {
                    const url = evidenceUrl(ev.url);
                    const isImage = ev.type === "image";
                    const isVideo = ev.type === "video";
                    return (
                      <a key={ev._id} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                        <div style={{
                          border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden",
                          background: "var(--bg)",
                        }}>
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={url} alt={ev.originalName} style={{ width: "100%", height: 100, objectFit: "cover" }} />
                          ) : (
                            <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {isVideo ? <Film size={28} color="var(--accent)" /> : <FileText size={28} color="var(--accent)" />}
                            </div>
                          )}
                          <div style={{ padding: "0.5rem", fontSize: "0.7rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{ev.originalName}</span>
                            <ExternalLink size={10} />
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Investigation notes */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", marginBottom: "1rem" }}>
                <MessageSquare size={16} style={{ display: "inline", marginRight: "0.375rem", verticalAlign: "middle" }} />
                Investigation Notes
              </h3>
              {report.investigationNotes?.length === 0 ? (
                <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>No investigation notes yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {report.investigationNotes.map((n) => (
                    <div key={n._id} style={{ padding: "0.875rem", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--navy)" }}>{n.author}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{fmtDateTime(n.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: "0.875rem", color: "var(--navy)", lineHeight: 1.6 }}>{n.note}</p>
                      {n.isInternal && isManager && (
                        <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.25rem", display: "block" }}>Internal</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isManager && (
                <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Add internal investigation note…"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    style={{ width: "100%", resize: "vertical", marginBottom: "0.75rem" }}
                  />
                  <button className="btn btn-blue" onClick={addNote} disabled={actionLoading || !newNote.trim()} style={{ fontSize: "0.8125rem" }}>
                    Add Note
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: timeline + manager controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Manager status control */}
            {isManager && (
              <div className="card" style={{ border: "1.5px solid var(--accent-border)", background: "var(--accent-bg)" }}>
                <h3 style={{ fontSize: "0.9375rem", marginBottom: "1rem" }}>Manager Actions</h3>
                <label style={{ fontSize: "0.75rem" }}>Update Status</label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.375rem" }}>
                  <select className="input select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ flex: 1 }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn btn-blue" onClick={updateStatus} disabled={actionLoading || newStatus === report.status} style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : "Update"}
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="card">
              <h3 style={{ fontSize: "1rem", marginBottom: "1.25rem" }}>
                <Clock size={16} style={{ display: "inline", marginRight: "0.375rem", verticalAlign: "middle" }} />
                Timeline
              </h3>
              <div style={{ position: "relative", paddingLeft: "1.25rem" }}>
                <div style={{ position: "absolute", left: 4, top: 8, bottom: 8, width: 2, background: "var(--border)" }} />
                {(report.timeline || []).slice().reverse().map((entry, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: "1.25rem" }}>
                    <div style={{
                      position: "absolute", left: -17, top: 4,
                      width: 10, height: 10, borderRadius: "50%",
                      background: i === 0 ? "var(--accent)" : "var(--border)",
                      border: "2px solid var(--surface)",
                    }} />
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--navy)" }}>{entry.message}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.125rem" }}>
                      {entry.actor} · {fmtDateTime(entry.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
