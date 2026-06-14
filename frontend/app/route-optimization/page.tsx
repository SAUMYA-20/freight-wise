/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Route,
  MapPin,
  Truck,
  Ship,
  Plane,
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Navigation,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Info,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────
type CongestionMode = "road" | "port" | "air" | "border";

interface CongestionCard {
  mode: CongestionMode;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

interface RouteResult {
  origin: { name: string; lat: number; lon: number; source: string };
  destination: { name: string; lat: number; lon: number; source: string };
  optimizedRoute: {
    source: string;
    distanceKm: number;
    durationMinutes: number;
    durationWithTrafficMinutes: number;
    congestionDelayMinutes: number;
    congestionScore: number;
    congestionLevel: string;
    routes: Array<{
      label: string;
      distanceKm: number;
      durationMinutes: number;
      durationWithTrafficMinutes: number;
      congestionDelayMinutes: number;
      instructions?: Array<{ message: string; distanceMeters: number }>;
      incidents?: Array<{ category: string; delaySeconds: number }>;
    }>;
  } | null;
  congestion: {
    road?: any;
    port?: any;
    air?: any;
    border?: any;
  };
  overall: { score: number; level: string; color: string };
  recommendation: string;
  warnings: string[];
  mapUrl: string;
  checkedAt: string;
  apiStatus: Record<string, boolean>;
}

const MODES: CongestionCard[] = [
  { mode: "road", label: "Road Traffic", icon: Truck, color: "#7C3AED", bg: "#F5F3FF" },
  { mode: "port", label: "Port Congestion", icon: Ship, color: "#0D9488", bg: "#EDFAF9" },
  { mode: "air", label: "Air Cargo", icon: Plane, color: "#0066FF", bg: "#EBF2FF" },
  { mode: "border", label: "Border Wait", icon: Shield, color: "#DC2626", bg: "#FEF2F2" },
];

const LEVEL_LABELS: Record<string, string> = {
  clear: "Clear",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  severe: "Severe",
  unknown: "Unknown",
};

function levelBadgeStyle(level: string) {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    clear: { bg: "#ECFDF5", color: "#059669", border: "#A7F3D0" },
    low: { bg: "#EDFAF9", color: "#0D9488", border: "#99F6E4" },
    moderate: { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
    high: { bg: "#FFF7ED", color: "#EA580C", border: "#FED7AA" },
    severe: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
    unknown: { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
  };
  return colors[level] || colors.unknown;
}

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function RouteOptimizationPage() {
  const [origin, setOrigin] = useState("Shanghai, China");
  const [destination, setDestination] = useState("Los Angeles, United States");
  const [selectedModes, setSelectedModes] = useState<CongestionMode[]>(["road", "port", "air", "border"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [activeRoute, setActiveRoute] = useState(0);

  function toggleMode(mode: CongestionMode) {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  }

  async function optimize() {
    if (!origin.trim() || !destination.trim()) {
      setError("Please enter both source and destination locations.");
      return;
    }
    if (selectedModes.length === 0) {
      setError("Select at least one congestion type to check.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveRoute(0);

    try {
      const params = new URLSearchParams({
        origin: origin.trim(),
        destination: destination.trim(),
        modes: selectedModes.join(","),
      });
      const res = await fetch(`/api/routes/optimize?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimization failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to optimize route");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setActiveRoute(0);
  }

  const route = result?.optimizedRoute;
  const activeRouteData = route?.routes?.[activeRoute];

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      {/* Header */}
      <div className="page-header">
        <div className="container">
          <div className="animate-fadeUp"><div className="label">Route Intelligence</div></div>
          <h1 className="animate-fadeUp delay-1" style={{ marginBottom: "0.875rem" }}>
            Route Optimisation & Congestion
          </h1>
          <p className="animate-fadeUp delay-2" style={{ maxWidth: 560, fontSize: "1.0625rem" }}>
            Enter source and destination to get real road routing via OSRM, plus live checks for
            road, port, air cargo, and border congestion.
          </p>
          <div className="animate-fadeUp delay-3" style={{ display: "flex", gap: "1rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            {["OSRM Routing", "CBP Border API", "Port & Air Intel"].map((tag) => (
              <span key={tag} style={{
                fontSize: "0.8rem", fontWeight: 600, color: "var(--accent)",
                background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
                borderRadius: "var(--radius-pill)", padding: "0.3rem 0.75rem",
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.75rem", alignItems: "start" }}>

          {/* ── Input form ── */}
          <div className="card">
            <h2 style={{ fontSize: "1.0625rem", marginBottom: "1.75rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
              <Route size={18} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
              Route Details
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label>Source Location</label>
                <div style={{ position: "relative" }}>
                  <MapPin size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#059669" }} />
                  <input
                    className="input"
                    placeholder="e.g. Shanghai, China or 31.2304, 121.4737"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    style={{ paddingLeft: "2.5rem", width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <label>Destination Location</label>
                <div style={{ position: "relative" }}>
                  <MapPin size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#DC2626" }} />
                  <input
                    className="input"
                    placeholder="e.g. Los Angeles, USA or Port of Rotterdam"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    style={{ paddingLeft: "2.5rem", width: "100%" }}
                  />
                </div>
              </div>

              {/* Congestion mode toggles */}
              <div>
                <label>Congestion Checks</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginTop: "0.375rem" }}>
                  {MODES.map(({ mode, label, icon: Icon, color, bg }) => {
                    const active = selectedModes.includes(mode);
                    return (
                      <button
                        key={mode}
                        onClick={() => toggleMode(mode)}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.5rem",
                          padding: "0.625rem 0.875rem", borderRadius: "var(--radius)",
                          border: `1.5px solid ${active ? color : "var(--border)"}`,
                          background: active ? bg : "var(--surface)",
                          color: active ? color : "var(--muted)",
                          fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
                          fontFamily: "Inter, sans-serif", transition: "all 0.15s",
                        }}
                      >
                        <Icon size={15} /> {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "0.5rem",
                  padding: "0.75rem 1rem", borderRadius: "var(--radius)",
                  background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
                  fontSize: "0.875rem",
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn btn-blue"
                  onClick={optimize}
                  disabled={loading}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                  {loading ? "Analysing…" : "Optimise Route"}
                </button>
                {result && (
                  <button className="btn" onClick={reset} style={{ padding: "0.5rem 1rem" }}>
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>

              {/* <div style={{
                display: "flex", alignItems: "flex-start", gap: "0.5rem",
                padding: "0.75rem", borderRadius: "var(--radius)",
                background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
                fontSize: "0.8rem", color: "var(--muted)",
              }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--accent)" }} />
                Road routing uses OSRM (free, no key). Add <code style={{ fontSize: "0.75rem" }}>GOOGLE_MAPS_API_KEY</code> or <code style={{ fontSize: "0.75rem" }}>MAPBOX_ACCESS_TOKEN</code> to backend <code style={{ fontSize: "0.75rem" }}>.env</code> for live traffic.
              </div> */}
            </div>
          </div>

          {/* ── Results panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {!result && !loading && (
              <div className="card" style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--muted)" }}>
                <Route size={40} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
                <p style={{ fontSize: "0.9375rem" }}>Enter locations and click Optimise Route to see congestion analysis and the best path.</p>
              </div>
            )}

            {loading && (
              <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 1rem", color: "var(--accent)" }} />
                <p style={{ color: "var(--muted)" }}>Geocoding locations and checking congestion across all modes…</p>
              </div>
            )}

            {result && (
              <>
                {/* Overall score hero */}
                <div style={{
                  background: `linear-gradient(135deg, ${result.overall.color}18 0%, ${result.overall.color}08 100%)`,
                  border: `1.5px solid ${result.overall.color}40`,
                  borderRadius: "var(--radius-lg)", padding: "1.5rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: result.overall.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>
                        Overall Congestion
                      </div>
                      <div style={{ fontSize: "2.5rem", fontWeight: 800, color: result.overall.color, lineHeight: 1 }}>
                        {result.overall.score}
                        <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--muted)" }}>/100</span>
                      </div>
                      <span style={{
                        display: "inline-block", marginTop: "0.5rem",
                        padding: "0.25rem 0.75rem", borderRadius: "var(--radius-pill)",
                        fontSize: "0.8125rem", fontWeight: 700,
                        ...levelBadgeStyle(result.overall.level),
                        border: `1px solid ${levelBadgeStyle(result.overall.level).border}`,
                      }}>
                        {LEVEL_LABELS[result.overall.level] || result.overall.level}
                      </span>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "0.8125rem", color: "var(--muted)" }}>
                      <Clock size={13} style={{ display: "inline", marginRight: 4 }} />
                      {new Date(result.checkedAt).toLocaleString()}
                    </div>
                  </div>
                  <p style={{ marginTop: "1rem", fontSize: "0.9375rem", color: "var(--navy)", lineHeight: 1.6 }}>
                    {result.recommendation}
                  </p>
                </div>

                {/* Warnings */}
                {result.warnings?.length > 0 && (
                  <div style={{
                    padding: "0.875rem 1rem", borderRadius: "var(--radius)",
                    background: "#FFFBEB", border: "1px solid #FDE68A",
                    fontSize: "0.8125rem", color: "#92400E",
                  }}>
                    {result.warnings.map((w, i) => (
                      <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: i < result.warnings.length - 1 ? "0.375rem" : 0 }}>
                        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {w}
                      </div>
                    ))}
                  </div>
                )}

                {/* Optimised route summary */}
                {route && (
                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                      <h3 style={{ fontSize: "1rem", margin: 0 }}>
                        <Truck size={16} style={{ display: "inline", marginRight: "0.375rem", verticalAlign: "middle", color: "#7C3AED" }} />
                        Optimised Route
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>
                        via {route.source}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
                      {[
                        { label: "Distance", value: `${route.distanceKm} km` },
                        { label: "Base Time", value: fmtDuration(route.durationMinutes) },
                        { label: "With Traffic", value: fmtDuration(route.durationWithTrafficMinutes) },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ textAlign: "center", padding: "0.75rem", background: "var(--bg)", borderRadius: "var(--radius)" }}>
                          <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                          <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--navy)", marginTop: "0.25rem" }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {route.congestionDelayMinutes > 0 && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        padding: "0.625rem 0.875rem", borderRadius: "var(--radius)",
                        background: "#FFF7ED", border: "1px solid #FED7AA",
                        fontSize: "0.8125rem", color: "#C2410C", marginBottom: "1rem",
                      }}>
                        <AlertTriangle size={14} />
                        +{route.congestionDelayMinutes} min traffic delay on recommended route
                      </div>
                    )}

                    {/* Route alternatives tabs */}
                    {route.routes.length > 1 && (
                      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                        {route.routes.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveRoute(i)}
                            style={{
                              padding: "0.375rem 0.875rem", borderRadius: "var(--radius-pill)",
                              border: `1.5px solid ${activeRoute === i ? "#7C3AED" : "var(--border)"}`,
                              background: activeRoute === i ? "#F5F3FF" : "transparent",
                              color: activeRoute === i ? "#7C3AED" : "var(--muted)",
                              fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            {r.label} · {fmtDuration(r.durationWithTrafficMinutes)}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Turn-by-turn instructions */}
                    {activeRouteData?.instructions && (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.625rem" }}>
                          Route Steps
                        </div>
                        {activeRouteData.instructions.map((step, i) => (
                          <div key={i} style={{
                            display: "flex", gap: "0.75rem", padding: "0.5rem 0",
                            borderBottom: i < activeRouteData.instructions!.length - 1 ? "1px solid var(--border)" : "none",
                            fontSize: "0.8125rem",
                          }}>
                            <span style={{
                              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                              background: "#F5F3FF", color: "#7C3AED",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.7rem", fontWeight: 700,
                            }}>{i + 1}</span>
                            <span style={{ color: "var(--navy)", lineHeight: 1.5 }}>{step.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <a
                      href={result.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ marginTop: "1.25rem", width: "100%", justifyContent: "center", fontSize: "0.8125rem" }}
                    >
                      <ExternalLink size={14} /> View on OpenStreetMap
                    </a>
                  </div>
                )}

                {/* Congestion cards grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  {MODES.filter(({ mode }) => result.congestion[mode]).map(({ mode, label, icon: Icon, color, bg }) => {
                    const data = result.congestion[mode];
                    const badge = levelBadgeStyle(data.level);
                    return (
                      <div key={mode} className="card" style={{ padding: "1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: bg, display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Icon size={18} color={color} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--navy)" }}>{label}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{data.source}</div>
                          </div>
                          <span style={{
                            marginLeft: "auto", padding: "0.2rem 0.6rem",
                            borderRadius: "var(--radius-pill)", fontSize: "0.7rem", fontWeight: 700,
                            background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                          }}>
                            {LEVEL_LABELS[data.level]}
                          </span>
                        </div>

                        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: badge.color, marginBottom: "0.75rem" }}>
                          {data.score}<span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--muted)" }}>/100</span>
                        </div>

                        {/* Mode-specific details */}
                        {mode === "road" && data.congestionDelayMinutes !== undefined && (
                          <div style={{ fontSize: "0.8125rem", color: "var(--muted)", lineHeight: 1.7 }}>
                            <div>Delay: <strong style={{ color: "var(--navy)" }}>+{data.congestionDelayMinutes} min</strong></div>
                            <div>Distance: <strong style={{ color: "var(--navy)" }}>{data.distanceKm} km</strong></div>
                            {data.routes?.[0]?.incidents?.length > 0 && (
                              <div style={{ marginTop: "0.5rem", color: "#C2410C" }}>
                                {data.routes[0].incidents.length} traffic incident(s) reported
                              </div>
                            )}
                          </div>
                        )}

                        {mode === "port" && data.ports && (
                          <div style={{ fontSize: "0.8125rem", color: "var(--muted)", lineHeight: 1.8 }}>
                            {data.ports.map((p: any) => (
                              <div key={p.code} style={{ marginBottom: "0.375rem" }}>
                                <strong style={{ color: "var(--navy)" }}>{p.name}</strong>
                                <div>{p.waitingShips} ships waiting · {p.avgBerthWaitHours}h avg berth wait</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {mode === "air" && data.airports && (
                          <div style={{ fontSize: "0.8125rem", color: "var(--muted)", lineHeight: 1.8 }}>
                            {data.airports.map((a: any) => (
                              <div key={a.iata} style={{ marginBottom: "0.375rem" }}>
                                <strong style={{ color: "var(--navy)" }}>{a.name}</strong>
                                <div>{a.delayedFlights}/{a.activeFlights} flights delayed · avg {a.avgDelayMinutes} min</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {mode === "border" && data.crossings && (
                          <div style={{ fontSize: "0.8125rem", color: "var(--muted)", lineHeight: 1.8 }}>
                            <div>Max wait: <strong style={{ color: "var(--navy)" }}>{data.maxWaitMinutes} min</strong></div>
                            {data.crossings.slice(0, 3).map((c: any, i: number) => (
                              <div key={i}>{c.name}: {c.waitMinutes} min</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Geocoded locations */}
                <div className="card" style={{ padding: "1.25rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.75rem" }}>
                    Resolved GPS Coordinates
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", fontSize: "0.8125rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <CheckCircle2 size={14} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ color: "var(--navy)" }}>Origin:</strong> {result.origin.name}
                        <div style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: "0.75rem" }}>
                          {result.origin.lat.toFixed(4)}, {result.origin.lon.toFixed(4)} · {result.origin.source}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <CheckCircle2 size={14} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ color: "var(--navy)" }}>Destination:</strong> {result.destination.name}
                        <div style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: "0.75rem" }}>
                          {result.destination.lat.toFixed(4)}, {result.destination.lon.toFixed(4)} · {result.destination.source}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Link to cost calculator */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "1rem 1.25rem", borderRadius: "var(--radius-lg)",
                  background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
                }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--navy)" }}>Calculate landed cost for this lane</span>
                  <Link href="/cost-calculator" className="btn btn-blue" style={{ fontSize: "0.8125rem", padding: "0.4rem 1rem" }}>
                    Cost Calculator <ArrowRight size={14} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
