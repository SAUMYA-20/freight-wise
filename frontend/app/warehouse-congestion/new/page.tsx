"use client";

import { useState } from "react";
import { Loader2, Save, Sparkles, CheckCircle2 } from "lucide-react";
import WarehouseCongestionNav, { EMPTY_FORM, DAYS, MONTHS } from "../components/WarehouseCongestionNav";
import { managerHeaders } from "../../../lib/managerAuth";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--navy)", marginBottom: "0.875rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>{title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.875rem" }}>{children}</div>
    </div>
  );
}

function Field({ label, name, form, setForm, type = "text", options }: {
  label: string; name: string; form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  type?: string; options?: string[];
}) {
  return (
    <div>
      <label style={{ fontSize: "0.75rem" }}>{label}</label>
      {options ? (
        <select className="input select" value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} style={{ width: "100%" }}>
          <option value="">—</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="input" type={type} value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} placeholder="Optional" />
      )}
    </div>
  );
}

export default function CreateCongestionRecordPage() {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ recordId?: string; prediction?: Record<string, unknown> } | null>(null);

  async function submit(predict: boolean) {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const endpoint = predict
        ? "/api/warehouse-congestion/records/predict"
        : "/api/warehouse-congestion/records";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...managerHeaders() },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(predict
        ? { recordId: data.record?.recordId, prediction: data.prediction }
        : { recordId: data.recordId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="page-header">
        <div className="container">
          <div className="label">Warehouse Congestion</div>
          <h1 style={{ marginBottom: "0.5rem" }}>Create Congestion Record</h1>
          <p style={{ maxWidth: 560, color: "var(--muted)" }}>All fields are optional. Enter whatever operational data you have — Gemini AI will predict congestion from available inputs.</p>
        </div>
      </div>

      <div className="container" style={{ padding: "2rem 1.5rem", maxWidth: 900 }}>
        <WarehouseCongestionNav />

        {result && (
          <div style={{ padding: "1rem 1.25rem", marginBottom: "1.25rem", borderRadius: "var(--radius)", background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
            <CheckCircle2 size={16} style={{ display: "inline", marginRight: 6, color: "#059669" }} />
            <strong>Saved:</strong> {result.recordId}
            {result.prediction && (
              <span style={{ marginLeft: "1rem" }}>
                Congestion: <strong>{String(result.prediction.congestionLevel)}</strong> ({String(result.prediction.congestionScore)}/100) · Wait: {String(result.prediction.predictedWaitTimeMinutes)} min
              </span>
            )}
          </div>
        )}

        <div className="card">
          <Section title="Warehouse Information">
            <Field label="Warehouse ID" name="warehouseId" form={form} setForm={setForm} />
            <Field label="Warehouse Name" name="warehouseName" form={form} setForm={setForm} />
            <Field label="Location" name="location" form={form} setForm={setForm} />
            <Field label="Dock Count" name="dockCount" form={form} setForm={setForm} type="number" />
            <Field label="Warehouse Capacity" name="warehouseCapacity" form={form} setForm={setForm} type="number" />
          </Section>

          <Section title="Operational Data">
            <Field label="Arrival Time" name="arrivalTime" form={form} setForm={setForm} type="time" />
            <Field label="Day of Week" name="dayOfWeek" form={form} setForm={setForm} options={DAYS} />
            <Field label="Month" name="month" form={form} setForm={setForm} options={MONTHS} />
            <Field label="Trucks Scheduled (Next Hour)" name="trucksScheduledNextHour" form={form} setForm={setForm} type="number" />
            <Field label="Trucks Scheduled (Next 2 Hours)" name="trucksScheduledNext2Hours" form={form} setForm={setForm} type="number" />
            <Field label="Trucks Currently Inside" name="trucksCurrentlyInside" form={form} setForm={setForm} type="number" />
            <Field label="Trucks Waiting Outside" name="trucksWaitingOutside" form={form} setForm={setForm} type="number" />
            <Field label="Avg Unload Time (min)" name="avgUnloadTime" form={form} setForm={setForm} type="number" />
            <Field label="Avg Load Time (min)" name="avgLoadTime" form={form} setForm={setForm} type="number" />
          </Section>

          <Section title="External Conditions">
            <Field label="Weather" name="weather" form={form} setForm={setForm} />
            <Field label="Holiday" name="holiday" form={form} setForm={setForm} />
            <Field label="Traffic Delay (min)" name="trafficDelay" form={form} setForm={setForm} type="number" />
            <Field label="Festival / Event Nearby" name="festivalEventNearby" form={form} setForm={setForm} />
          </Section>

          <Section title="Additional Inputs">
            <Field label="Active Workers" name="activeWorkers" form={form} setForm={setForm} type="number" />
            <Field label="Equipment Availability" name="equipmentAvailability" form={form} setForm={setForm} />
            <Field label="Forklift Availability" name="forkliftAvailability" form={form} setForm={setForm} />
            <Field label="Dock Utilization (%)" name="dockUtilization" form={form} setForm={setForm} type="number" />
          </Section>

          <div style={{ marginBottom: "1.25rem" }}>
            <label>Special Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" style={{ width: "100%", resize: "vertical" }} />
          </div>

          {error && <div style={{ padding: "0.75rem", marginBottom: "1rem", borderRadius: "var(--radius)", background: "#FEF2F2", color: "#DC2626", fontSize: "0.875rem" }}>{error}</div>}

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn" onClick={() => submit(false)} disabled={loading} style={{ flex: 1, justifyContent: "center", minWidth: 140 }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
            </button>
            <button className="btn btn-blue" onClick={() => submit(true)} disabled={loading} style={{ flex: 1, justifyContent: "center", minWidth: 140 }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Predict Congestion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
