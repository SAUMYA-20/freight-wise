"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShieldAlert, Upload, X, Loader2, CheckCircle2, ArrowLeft, FileText, Image, Film,
} from "lucide-react";

const INCIDENT_TYPES = [
  "Package Theft", "Cargo Theft", "Vehicle Theft", "Equipment Theft", "Other",
];

interface FormData {
  trackingNumber: string;
  shipmentId: string;
  incidentType: string;
  incidentDateTime: string;
  location: string;
  estimatedLossAmount: string;
  description: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
}

const EMPTY: FormData = {
  trackingNumber: "", shipmentId: "", incidentType: "Package Theft",
  incidentDateTime: "", location: "", estimatedLossAmount: "",
  description: "", reporterName: "", reporterEmail: "", reporterPhone: "",
};

function fileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Film;
  return FileText;
}

export default function NewTheftReportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<{ reportId: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setForm((f) => ({ ...f, incidentDateTime: now.toISOString().slice(0, 16) }));
  }, []);

  const set = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime", "application/pdf"];
    const valid = Array.from(newFiles).filter((f) => allowed.includes(f.type));
    setFiles((prev) => [...prev, ...valid].slice(0, 10));
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.trackingNumber.trim() || !form.shipmentId.trim() || !form.location.trim() ||
        !form.description.trim() || !form.estimatedLossAmount || !form.incidentDateTime) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append("evidence", f));

      const res = await fetch("/api/theft-reports", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmitted({ reportId: data.reportId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
        <div className="container" style={{ padding: "4rem 1.5rem", textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: "#ECFDF5",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem",
          }}>
            <CheckCircle2 size={36} color="#059669" />
          </div>
          <h1 style={{ marginBottom: "0.75rem" }}>Report Submitted</h1>
          <p style={{ color: "var(--muted)", marginBottom: "0.5rem" }}>
            Your theft report has been logged and the operations/security team has been notified.
          </p>
          <p style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--accent)", marginBottom: "2rem" }}>
            {submitted.reportId}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={`/theft-reports/${submitted.reportId}`} className="btn btn-blue">View Report</Link>
            <Link href="/theft-reports" className="btn">All Reports</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="page-header">
        <div className="container">
          <Link href="/theft-reports" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "1rem" }}>
            <ArrowLeft size={14} /> Back to reports
          </Link>
          <div className="animate-fadeUp"><div className="label">Security</div></div>
          <h1 className="animate-fadeUp delay-1" style={{ marginBottom: "0.875rem" }}>Report a Theft Incident</h1>
          <p className="animate-fadeUp delay-2" style={{ maxWidth: 520, fontSize: "1.0625rem" }}>
            Submit details about a package, cargo, vehicle, or equipment theft. Upload photos, videos, or documents as evidence.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: "2rem 1.5rem", maxWidth: 720 }}>
        <form onSubmit={handleSubmit} className="card">
          <h2 style={{ fontSize: "1.0625rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
            <ShieldAlert size={18} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle", color: "#DC2626" }} />
            Incident Details
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <div>
                <label>Tracking Number *</label>
                <input className="input" required value={form.trackingNumber} onChange={set("trackingNumber")} placeholder="e.g. 1Z999AA10123456784" />
              </div>
              <div>
                <label>Shipment ID *</label>
                <input className="input" required value={form.shipmentId} onChange={set("shipmentId")} placeholder="e.g. SHP-2024-00891" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <div>
                <label>Incident Type *</label>
                <select className="input select" required value={form.incidentType} onChange={set("incidentType")}>
                  {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>Incident Date & Time *</label>
                <input className="input" type="datetime-local" required value={form.incidentDateTime} onChange={set("incidentDateTime")} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <div>
                <label>Location *</label>
                <input className="input" required value={form.location} onChange={set("location")} placeholder="City, address, or facility name" />
              </div>
              <div>
                <label>Estimated Loss Amount (USD) *</label>
                <input className="input" type="number" min="0" step="0.01" required value={form.estimatedLossAmount} onChange={set("estimatedLossAmount")} placeholder="0.00" />
              </div>
            </div>

            <div>
              <label>Description *</label>
              <textarea
                className="input"
                required
                rows={4}
                value={form.description}
                onChange={set("description")}
                placeholder="Describe what was stolen, circumstances, witnesses, police report number if applicable…"
                style={{ resize: "vertical", width: "100%" }}
              />
            </div>

            {/* Evidence upload */}
            <div>
              <label>Evidence Upload</label>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                Images, videos, or PDFs — max 10 files, 25 MB each
              </p>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: "2px dashed var(--border)", borderRadius: "var(--radius)",
                  padding: "1.5rem", textAlign: "center", cursor: "pointer",
                  background: "var(--bg)", transition: "border-color 0.15s",
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; addFiles(e.dataTransfer.files); }}
              >
                <Upload size={24} style={{ margin: "0 auto 0.5rem", color: "var(--muted)" }} />
                <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>Click or drag files here</p>
              </div>
              <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf" style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />

              {files.length > 0 && (
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {files.map((f, i) => {
                    const Icon = fileIcon(f.type);
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        padding: "0.5rem 0.75rem", background: "var(--bg)", borderRadius: "var(--radius)",
                        border: "1px solid var(--border)", fontSize: "0.8125rem",
                      }}>
                        <Icon size={16} color="var(--accent)" />
                        <span style={{ flex: 1, color: "var(--navy)" }}>{f.name}</span>
                        <span style={{ color: "var(--muted)" }}>{(f.size / 1024).toFixed(0)} KB</span>
                        <button type="button" onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reporter info (optional) */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--navy)", marginBottom: "0.875rem" }}>Reporter Information (optional)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.875rem" }}>
                <div>
                  <label>Name</label>
                  <input className="input" value={form.reporterName} onChange={set("reporterName")} />
                </div>
                <div>
                  <label>Email</label>
                  <input className="input" type="email" value={form.reporterEmail} onChange={set("reporterEmail")} />
                </div>
                <div>
                  <label>Phone</label>
                  <input className="input" value={form.reporterPhone} onChange={set("reporterPhone")} />
                </div>
              </div>
            </div>

            {error && (
              <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius)", background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-blue" disabled={loading} style={{ justifyContent: "center" }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
              {loading ? "Submitting…" : "Submit Theft Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
