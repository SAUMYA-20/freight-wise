/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calculator,
  ArrowRight,
  Info,
  RefreshCw,
  Plane,
  Ship,
  Truck,
  Search,
  Loader2,
  Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TYPES & CONFIGURATION
// ─────────────────────────────────────────────────────────────
type FreightMode = "air" | "sea" | "road";

interface CostBreakdown {
  productValue: number;
  freightCost: number;
  insuranceCost: number;
  cif: number;
  importDuty: number;
  vat: number;
  brokerageFee: number;
  total: number;
}

interface HSCodeData {
  gstRate: string | number;
  hsn4Digit: string;
  hsn8Digit: string;
  productName: string;
}

const FREIGHT_RATES: Record<FreightMode, { label: string; icon: React.ElementType; minUSD: number; ratePerKg: number; color: string; bg: string }> = {
  air: { label: "Air Freight", icon: Plane, minUSD: 150, ratePerKg: 4.5, color: "#0066FF", bg: "#EBF2FF" },
  sea: { label: "Sea Freight", icon: Ship, minUSD: 800, ratePerKg: 0.35, color: "#0D9488", bg: "#EDFAF9" },
  road: { label: "Road Freight", icon: Truck, minUSD: 200, ratePerKg: 1.2, color: "#7C3AED", bg: "#F5F3FF" },
};

const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "Japan", "China", "India", "UAE",
  "Saudi Arabia", "Australia", "Canada", "Brazil", "South Korea", "Singapore", "Netherlands",
  "Italy", "Spain", "Mexico", "Indonesia", "South Africa",
];

const VAT_RATES: Record<string, number> = {
  "United Kingdom": 20, Germany: 19, France: 20, Italy: 22, Spain: 21, Netherlands: 21,
  Australia: 10, Japan: 10, Canada: 5, India: 18, "United States": 0, UAE: 5,
  "Saudi Arabia": 15, Brazil: 12, Singapore: 9, "South Korea": 10, Mexico: 16,
  China: 13, Indonesia: 11, "South Africa": 15,
};

const GLOBAL_DUTY_ESTIMATES: Record<string, number> = {
  "84": 0.0, "85": 2.5, "61": 12.0, "87": 6.5, "09": 7.5, "94": 2.7, "30": 0.0,
};

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CostCalculatorPage() {
  const [productValue, setProductValue] = useState("5000");
  const [weight, setWeight] = useState("50");
  const [quantity, setQuantity] = useState("100");
  const [origin, setOrigin] = useState("China");
  const [destination, setDestination] = useState("United Kingdom");

  // ── Search State ─────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [hsOptions, setHsOptions] = useState<HSCodeData[]>([]);
  const [selectedHS, setSelectedHS] = useState<HSCodeData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [mode, setMode] = useState<FreightMode>("sea");
  const [withInsurance, setInsurance] = useState(true);
  const [result, setResult] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  const [searchMode, setSearchMode] = useState<"standard" | "ai">("standard");
  const [aiStatus, setAiStatus] = useState("");

  const handleAISubmit = async () => {
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setAiStatus("Analyzing your prompt...");

    try {
      const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
      const parseRes = await fetch(`${baseUrl}/api/assistant/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!parseRes.ok) throw new Error('Parse failed');
      const parsed = await parseRes.json();

      if (parsed.destination && COUNTRIES.includes(parsed.destination)) setDestination(parsed.destination);
      if (parsed.origin && COUNTRIES.includes(parsed.origin)) setOrigin(parsed.origin);
      if (parsed.quantity) setQuantity(parsed.quantity.toString());
      if (parsed.weight) setWeight(parsed.weight.toString());
      if (parsed.mode) setMode(parsed.mode as FreightMode);
      if (parsed.productValue) setProductValue(parsed.productValue.toString());
      
      setSearchQuery(parsed.product || searchQuery);
    } catch (err) {
      console.error(err);
      alert('AI assistant encountered an error. Please try standard search.');
    } finally {
      setIsSearching(false);
      setAiStatus("");
    }
  };

  useEffect(() => {
    // Triggers instantly from the very first letter
    if (searchQuery.trim().length === 0) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/hs-codes?q=${encodeURIComponent(searchQuery)}`);

        if (!res.ok) throw new Error("Search failed");

        const data = await res.json();
        setHsOptions(data);
        setIsOpen(data.length > 0);
      } catch (err) {
        console.error(err);
        setHsOptions([]);
        setIsOpen(false);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce to prevent database spam

    return () => clearTimeout(timer);
  }, [searchQuery]);

  function calculate() {
    if (!selectedHS) {
      alert("Please search and select a product from the list first.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const pv = parseFloat(productValue) || 0;
      const wt = parseFloat(weight) || 0;
      const r = FREIGHT_RATES[mode];

      // 1. Calculate CIF (Cost, Insurance, Freight)
      const freightCost = Math.max(r.minUSD, wt * r.ratePerKg);
      // Industry standard default marine insurance is often calculated at 0.5% to 1.5% of FOB
      const insuranceCost = withInsurance ? pv * 0.012 : 0; 
      const cif = pv + freightCost + insuranceCost;

      // 2. Calculate Import Duty (Based on CIF)
      const chapterPrefix = selectedHS.hsn4Digit?.substring(0, 2) || "00";
      const dutyPct = GLOBAL_DUTY_ESTIMATES[chapterPrefix] ?? 5.0; // 5% global average fallback
      const importDuty = cif * (dutyPct / 100);

      // 3. Calculate VAT / GST (Based on CIF + Duty)
      let destinationTaxPct = 0;
      
      // If the destination is India (or you want to strictly use your DB for taxes everywhere):
      if (destination === "India" && selectedHS.gstRate) {
        // Safely strip out '%' or any text from the MongoDB string
        const cleanDbString = selectedHS.gstRate.toString().replace(/[^0-9.]/g, '');
        destinationTaxPct = parseFloat(cleanDbString) || 0;
      } else {
        // Fallback to standard global VAT tables for other countries
        destinationTaxPct = VAT_RATES[destination] ?? 0;
      }

      const vat = (cif + importDuty) * (destinationTaxPct / 100);

      // 4. Commercial Fees & Totals
      const brokerageFee = 180 + (cif * 0.003); // Flat fee + small % disbursement
      const total = cif + importDuty + vat + brokerageFee;

      setResult({
        productValue: pv,
        freightCost,
        insuranceCost,
        cif,
        importDuty,
        vat,
        brokerageFee,
        total,
      });
      setLoading(false);
    }, 400);
  }

  function reset() {
    setResult(null);
    setSearchQuery("");
    setSelectedHS(null);
    setHsOptions([]);
    setIsOpen(false);
  }

  const qty = parseFloat(quantity) || 1;
  const modeData = FREIGHT_RATES[mode];
  const activeDutyRate = selectedHS ? (GLOBAL_DUTY_ESTIMATES[selectedHS.hsn4Digit?.substring(0, 2)] ?? 5.0) : 0;

  return (
    <div style={{ background: "var(--bg)", minHeight: "80vh" }}>
      <div className="page-header">
        <div className="container">
          <div className="animate-fadeUp"><div className="label">Cost Estimator</div></div>
          <h1 className="animate-fadeUp delay-1" style={{ marginBottom: "0.875rem" }}>Landed Cost Calculator</h1>
          <p className="animate-fadeUp delay-2" style={{ maxWidth: 520, fontSize: "1.0625rem" }}>
            Estimate import duties, VAT, freight, insurance, and brokerage.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.75rem", alignItems: "start" }}>
          
          <div className="card">
            <h2 style={{ fontSize: "1.0625rem", marginBottom: "1.75rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
              Shipment Details
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              {/* ── Live Search / AI Input ── */}
              <div style={{ position: "relative" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ margin: 0 }}>{searchMode === 'ai' ? 'AI Quick Fill' : 'Search Product'}</label>
                  <button
                    type="button"
                    onClick={() => { setSearchMode(searchMode === 'ai' ? 'standard' : 'ai'); setSearchQuery(''); setSelectedHS(null); setIsOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 600,
                      color: searchMode === 'ai' ? 'var(--accent)' : 'var(--muted)',
                    }}
                  >
                    <Sparkles size={13} /> {searchMode === 'ai' ? 'Use Standard Search' : 'Try AI Assistant'}
                  </button>
                </div>
                
                <div style={{ position: "relative", display: "flex", gap: "0.5rem" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    {searchMode === 'ai' ? (
                      <Sparkles size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--accent)" }} />
                    ) : (
                      <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    )}
                    <input
                      className="input"
                      placeholder={searchMode === 'ai' ? "Try: 'ship 50kg leather wallets to Germany for $1000'..." : "Search by product name (e.g. potato, ceramic)..."}
                      value={searchQuery}
                      onKeyDown={(e) => {
                        if (searchMode === 'ai' && e.key === 'Enter') {
                          e.preventDefault();
                          handleAISubmit();
                        }
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSearchQuery(value);
                        if (selectedHS) setSelectedHS(null);

                        if (!value.trim() || searchMode === 'ai') {
                          setHsOptions([]);
                          setIsOpen(false);
                        }
                      }}
                      style={{ paddingLeft: "2.5rem", width: "100%", borderColor: searchMode === 'ai' ? 'var(--accent-border)' : 'var(--border)' }}
                    />
                    {isSearching && !aiStatus && <Loader2 size={14} className="animate-spin" style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />}
                  </div>
                  
                  {searchMode === 'ai' && (
                    <button
                      type="button"
                      onClick={handleAISubmit}
                      disabled={isSearching || !searchQuery.trim()}
                      style={{
                        background: 'var(--accent)', color: '#fff', border: 'none',
                        borderRadius: 'var(--radius)', padding: '0 1rem',
                        fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', opacity: (!searchQuery.trim() || isSearching) ? 0.6 : 1
                      }}
                    >
                      {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Ask AI'}
                    </button>
                  )}
                </div>
                
                {aiStatus && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.5rem', fontWeight: 500 }}>
                    <Loader2 size={12} className="animate-spin" /> {aiStatus}
                  </div>
                )}

                {isOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginTop: "0.25rem", maxHeight: 250, overflowY: "auto", zIndex: 100, boxShadow: "var(--shadow-md)" }}>
                    {hsOptions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedHS(item);
                          setSearchQuery(item.productName);
                          setHsOptions([]);
                          setIsOpen(false);
                        }}
                        style={{ padding: "0.75rem 1rem", cursor: "pointer", borderBottom: idx !== hsOptions.length - 1 ? "1px solid var(--border)" : "none" }}
                      >
                        <div style={{ fontWeight: 600, color: "var(--navy)" }}>{item.productName}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>HS Code: {item.hsn8Digit || item.hsn4Digit}</div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedHS && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--accent)" }}>
                    Selected: <strong>{selectedHS.hsn8Digit || selectedHS.hsn4Digit}</strong> • Duty Est: <strong>{activeDutyRate}%</strong>
                  </div>
                )}
              </div>

              {/* Product value */}
              <div>
                <label>Product Value (USD)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontWeight: 700 }}>$</span>
                  <input className="input" type="number" min="0" value={productValue} onChange={(e) => setProductValue(e.target.value)} style={{ paddingLeft: "1.875rem" }} />
                </div>
              </div>

              {/* Weight & Quantity */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                <div>
                  <label>Gross Weight (kg)</label>
                  <input className="input" type="number" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div>
                  <label>Quantity (units)</label>
                  <input className="input" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
              </div>

              {/* Origin / Destination */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                <div>
                  <label>Origin</label>
                  <select className="input select" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label>Destination</label>
                  <select className="input select" value={destination} onChange={(e) => setDestination(e.target.value)}>
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Freight mode */}
              <div>
                <label>Freight Mode</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.625rem" }}>
                  {(Object.entries(FREIGHT_RATES) as [FreightMode, (typeof FREIGHT_RATES)["air"]][]).map(([key, { label, icon: Icon, color, bg }]) => (
                    <button
                      key={key}
                      onClick={() => setMode(key)}
                      style={{
                        padding: "0.875rem 0.5rem", borderRadius: "var(--radius)",
                        border: `1.5px solid ${mode === key ? color : "var(--border)"}`,
                        background: mode === key ? bg : "var(--surface)", cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
                        color: mode === key ? color : "var(--muted)", fontWeight: 600, fontSize: "0.8rem",
                        boxShadow: mode === key ? `0 3px 12px ${color}20` : "none",
                      }}
                    >
                      <Icon size={18} /> {label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Insurance toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontWeight: 400, fontSize: "0.875rem", padding: "0.75rem 1rem", background: withInsurance ? "var(--accent-bg)" : "var(--bg)", border: `1.5px solid ${withInsurance ? "var(--accent-border)" : "var(--border)"}`, borderRadius: "var(--radius)" }}>
                <input type="checkbox" checked={withInsurance} onChange={(e) => setInsurance(e.target.checked)} style={{ width: 17, height: 17, accentColor: "var(--accent)", cursor: "pointer" }} />
                Include cargo insurance (1.2% of CIF)
              </label>

              <button onClick={calculate} className="btn btn-blue" style={{ justifyContent: "center", padding: "0.9375rem" }} disabled={loading}>
                {loading ? "Calculating…" : <><Calculator size={16} /> Calculate Landed Cost</>}
              </button>
            </div>
          </div>

          {/* ── Results Panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {!result ? (
              <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--muted)" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--bg)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                  <Calculator size={30} color="var(--muted)" style={{ opacity: 0.4 }} />
                </div>
                <p style={{ margin: 0, fontWeight: 500, color: "var(--navy)" }}>Ready to calculate?</p>
                <p style={{ margin: "0.375rem 0 0", fontSize: "0.875rem" }}>Search for a product, fill in the form, and hit calculate.</p>
              </div>
            ) : (
              <>
                <div style={{ background: "var(--gradient-hero)", borderRadius: "var(--radius-xl)", padding: "2rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem", position: "relative" }}>Total Landed Cost</div>
                  <div style={{ fontSize: "3rem", fontWeight: 800, color: "#fff", lineHeight: 1, position: "relative", letterSpacing: "-0.04em" }}>${fmt(result.total)}</div>
                  <div style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.45)", marginTop: "0.625rem", position: "relative" }}>{origin} → {destination} · {modeData.label}</div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: "0.9375rem", marginBottom: "1.25rem" }}>Cost Breakdown</h3>
                  {[
                    { label: "Product Value (FOB)", value: result.productValue, color: "var(--navy)" },
                    { label: `Freight (${modeData.label})`, value: result.freightCost, color: modeData.color },
                    ...(withInsurance ? [{ label: "Cargo Insurance (1.2%)", value: result.insuranceCost, color: "var(--navy)" }] : []),
                    { label: "CIF Value", value: result.cif, color: "var(--navy)", divider: true },
                    { label: `Import Duty (${activeDutyRate}%)`, value: result.importDuty, color: "#DC2626" },
                    { label: `VAT / GST (${VAT_RATES[destination] ?? 0}%)`, value: result.vat, color: "#7C3AED" },
                    { label: "Customs Brokerage (est.)", value: result.brokerageFee, color: "var(--navy)" },
                  ].map(({ label, value, divider, color }: any) => (
                    <div key={label}>
                      {divider && <div className="divider" style={{ margin: "0.75rem 0" }} />}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: divider ? "none" : "1px solid var(--border)" }}>
                        <span style={{ fontSize: "0.875rem", color: divider ? "var(--navy)" : "var(--muted)", fontWeight: divider ? 600 : 400 }}>{label}</span>
                        <span style={{ fontWeight: divider ? 800 : 600, fontSize: "0.9rem", color: divider ? "var(--navy)" : color }}>${fmt(value)}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", marginTop: "0.25rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>Total</span>
                    <span style={{ fontWeight: 800, fontSize: "1.375rem", color: "var(--accent)" }}>${fmt(result.total)}</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Cost Per Unit</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>{quantity} units total</div>
                  </div>
                  <div style={{ fontSize: "1.625rem", fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.04em" }}>${fmt(result.total / qty)}</div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={reset} className="btn btn-outline" style={{ flex: 1 }}><RefreshCw size={14} /> Reset</button>
                  <Link href="/contact" className="btn btn-amber" style={{ flex: 1, justifyContent: "center" }}>Get Official Quote <ArrowRight size={14} /></Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}