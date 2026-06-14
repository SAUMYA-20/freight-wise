/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Globe, AlertTriangle, FileText, CheckCircle2, ShieldAlert, Package, TrendingUp, Truck, DollarSign } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

const DESTINATIONS = ['India', 'UAE', 'Germany', 'France', 'Italy', 'Netherlands', 'Spain'];
const DEST_FLAGS: Record<string, string> = {
  India: '🇮🇳', UAE: '🇦🇪', Germany: '🇩🇪', France: '🇫🇷',
  Italy: '🇮🇹', Netherlands: '🇳🇱', Spain: '🇪🇸'
};
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6'];
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];

const ITEM_VALUE = 500;

function StatCard({ label, value, sub, color, icon: Icon, gradient }: any) {
  return (
    <div style={{
      borderRadius: 16, padding: '1.4rem 1.5rem', position: 'relative', overflow: 'hidden',
      background: gradient || '#fff', border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
            {label}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>{sub}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '18', flexShrink: 0 }}>
          <Icon size={22} color={color} />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: color + '08' }} />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1e293b', color: '#fff', padding: '0.6rem 1rem', borderRadius: 10, fontSize: '0.85rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <div style={{ fontWeight: 700 }}>{label || payload[0]?.name}</div>
        <div style={{ color: '#94a3b8', marginTop: 2 }}>${Number(payload[0]?.value).toFixed(2)}</div>
      </div>
    );
  }
  return null;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const hsCode = params.hsCode as string;

  const [product, setProduct] = useState<any>(null);
  const [destination, setDestination] = useState('');
  const [intelligence, setIntelligence] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [destLoading, setDestLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  // Pre-fill destination if the AI assistant passed it via URL ?destination=Germany
  const searchParams = useSearchParams();
  useEffect(() => {
    const dest = searchParams.get('destination');
    if (dest) setDestination(dest);
  }, [searchParams]);
  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
    fetch(`${baseUrl}/api/product/${hsCode}/intelligence`)
      .then(r => r.json())
      .then(d => { if (d.product) setProduct(d.product); })
      .catch(console.error)
      .finally(() => setPageLoading(false));
  }, [hsCode]);

  useEffect(() => {
    if (!destination) { setTimeout(() => setIntelligence(null), 0); return; }
    // avoid synchronous setState calls inside effect to prevent cascading renders
    setTimeout(() => {
      setDestLoading(true);
      setIntelligence(null);
    }, 0);
    const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
    fetch(`${baseUrl}/api/product/${hsCode}/intelligence?destination=${destination}&weight=100`)
      .then(r => r.json())
      .then(d => setIntelligence(d))
      .catch(console.error)
      .finally(() => setDestLoading(false));
  }, [hsCode, destination]);

  useEffect(() => {
    if (!product) return;
    const tops = ['India', 'UAE', 'Germany', 'Spain'];
    Promise.all(tops.map(d => {
      const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
      return fetch(`${baseUrl}/api/product/${hsCode}/intelligence?destination=${d}&weight=100`).then(r => r.json());
    })).then(results => {
      setComparisonData(results.map((r, i) => {
        if (!r.taxes || !r.freight) return { name: tops[i], Total: 0, Duty: 0, VAT: 0, Freight: 0 };
        const duty = ITEM_VALUE * (r.taxes.importDuty / 100);
        const vat = (ITEM_VALUE + duty) * (r.taxes.vatGst / 100);
        const freight = r.freight.estimatedFreightUSD;
        return {
          name: tops[i],
          'Product': ITEM_VALUE,
          'Duty': Math.round(duty),
          'VAT': Math.round(vat),
          'Freight': Math.round(freight),
        };
      }));
    }).catch(console.error);
  }, [hsCode, product]);

  if (pageLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={40} color="#6366f1" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: '#64748b', fontWeight: 500 }}>Loading product intelligence...</p>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <Package size={48} color="#94a3b8" />
      <h2 style={{ color: '#0f172a' }}>Product Not Found</h2>
      <button onClick={() => router.back()} style={{ padding: '0.6rem 1.5rem', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
        ← Go Back
      </button>
    </div>
  );

  // Safe cost calculations - only when intelligence is fully loaded with valid taxes
  const taxes = intelligence?.taxes;
  const freight = intelligence?.freight;
  const compliance = intelligence?.compliance;
  const documents = intelligence?.documents;

  const dutyCost   = taxes  ? ITEM_VALUE * (taxes.importDuty / 100) : 0;
  const vatCost    = taxes  ? (ITEM_VALUE + dutyCost) * (taxes.vatGst / 100) : 0;
  const freightCost = freight ? freight.estimatedFreightUSD : 0;
  const totalLanded = ITEM_VALUE + dutyCost + vatCost + freightCost;

  const pieData = intelligence ? [
    { name: 'Product Value', value: ITEM_VALUE },
    { name: 'Import Duty',   value: parseFloat(dutyCost.toFixed(2)) },
    { name: 'VAT / GST',     value: parseFloat(vatCost.toFixed(2)) },
    { name: 'Freight',       value: parseFloat(freightCost.toFixed(2)) },
  ].filter(d => d.value > 0) : [];

  const hasWarnings = compliance && (compliance.restrictions?.length > 0 || compliance.dgWarnings?.length > 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Hero Header ─────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2855 100%)',
        padding: '2rem 0 3rem', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: 280, height: 280, borderRadius: '50%', background: 'rgba(99,102,241,0.12)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '20%', width: 180, height: 180, borderRadius: '50%', background: 'rgba(16,185,129,0.08)' }} />

        <div className="container" style={{ position: 'relative' }}>
          <button onClick={() => router.back()} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.8)', cursor: 'pointer', borderRadius: 8,
            padding: '0.4rem 1rem', fontSize: '0.85rem', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem',
            backdropFilter: 'blur(8px)'
          }}>
            <ArrowLeft size={15} /> Back to Search
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.5)',
                  color: '#a5b4fc', padding: '0.3rem 0.875rem', borderRadius: 8,
                  fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem'
                }}>
                  HS: {product.hsn8Digit || product.hsn4Digit}
                </span>
                {compliance?.isDangerousGood && (
                  <span style={{
                    background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                    color: '#fca5a5', padding: '0.3rem 0.875rem', borderRadius: 8,
                    fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem'
                  }}>
                    <ShieldAlert size={14} /> Dangerous Good
                  </span>
                )}
              </div>
              <h1 style={{ color: '#fff', fontSize: '1.875rem', fontWeight: 800, margin: 0, maxWidth: 600, lineHeight: 1.3 }}>
                {product.productName}
              </h1>
            </div>

            {/* Destination Selector */}
            <div style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              padding: '1.25rem', borderRadius: 16, minWidth: 260, backdropFilter: 'blur(12px)'
            }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🌍 Select Destination Country
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {DESTINATIONS.map(d => (
                  <button key={d} onClick={() => setDestination(d)} style={{
                    padding: '0.6rem 0.875rem', borderRadius: 10, cursor: 'pointer',
                    background: destination === d ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)',
                    color: destination === d ? '#fff' : 'rgba(255,255,255,0.7)',
                    fontWeight: destination === d ? 700 : 500, fontSize: '0.9rem',
                    textAlign: 'left', transition: 'all 0.15s',
                    border: destination === d ? '1px solid rgba(99,102,241,0.7)' : '1px solid transparent'
                  }}>
                    {DEST_FLAGS[d]} {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

        {!destination ? (
          <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: '#fff', borderRadius: 20, border: '2px dashed #e2e8f0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
          }}>
            <Globe size={56} color="#94a3b8" style={{ margin: '0 auto 1.25rem', opacity: 0.5 }} />
            <h3 style={{ color: '#0f172a', marginBottom: '0.5rem', fontSize: '1.25rem' }}>Select a destination country to unlock Trade Intelligence</h3>
            <p style={{ color: '#64748b' }}>Taxes, compliance rules, freight costs, and duty rates vary by destination.</p>
          </div>
        ) : destLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem' }}>
            <Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#64748b', fontWeight: 500 }}>Calculating trade intelligence for {destination}...</p>
          </div>
        ) : intelligence && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Stat Cards ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <StatCard label="Import Duty" value={`${taxes?.importDuty ?? 0}%`} sub={`≈ $${dutyCost.toFixed(2)} on $500 goods`} color="#6366f1" icon={TrendingUp} />
              <StatCard label="VAT / GST" value={`${taxes?.vatGst ?? 0}%`} sub={`≈ $${vatCost.toFixed(2)} post-duty`} color="#f59e0b" icon={DollarSign} />
              <StatCard label="Est. Freight (100 kg)" value={`$${freightCost.toFixed(0)}`} sub={`Fuel adj: $${freight?.breakdown?.fuelAdjustment?.toFixed(2) ?? '0.00'}`} color="#10b981" icon={Truck} />
              <StatCard
                label="Total Landed Cost"
                value={`$${totalLanded.toFixed(0)}`}
                sub="Product + Duty + VAT + Freight"
                color="#3b82f6"
                icon={Package}
                gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
              />
            </div>

            {/* ── Charts Row ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>

              {/* Pie Chart */}
              <div style={{ background: '#fff', borderRadius: 20, padding: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>Cost Breakdown</h3>
                  <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.8rem' }}>Distribution of your total landed cost</p>
                </div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                        {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                  {pieData.map((entry, i) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span><strong style={{ color: '#334155' }}>{entry.name}</strong> ${entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stacked Bar Chart — Country Comparison */}
              <div style={{ background: '#fff', borderRadius: 20, padding: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>Country Cost Comparison</h3>
                  <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.8rem' }}>Stacked landed cost breakdown across destinations</p>
                </div>
                {comparisonData.length === 0 ? (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={24} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : (
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                        <YAxis hide />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="Product" stackId="a" fill="#6366f1" radius={[0,0,0,0]} />
                        <Bar dataKey="Duty" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="VAT" stackId="a" fill="#10b981" />
                        <Bar dataKey="Freight" stackId="a" fill="#3b82f6" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                  {[['Product', '#6366f1'], ['Duty', '#f59e0b'], ['VAT', '#10b981'], ['Freight', '#3b82f6']].map(([name, color]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#64748b' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: color as string }} />
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Freight Breakdown Card ─────────────────── */}
            {freight?.breakdown && (
              <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 20, padding: '1.75rem', boxShadow: '0 4px 24px rgba(15,23,42,0.2)' }}>
                <h3 style={{ color: '#fff', margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>🚢 Freight Cost Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                  {[
                    { label: 'Base Freight', val: `$${freight.breakdown.baseFreight}`, color: '#a5b4fc' },
                    { label: 'Weight Cost', val: `$${freight.breakdown.weightCost}`, color: '#6ee7b7' },
                    { label: 'Fuel Adjustment', val: `$${freight.breakdown.fuelAdjustment}`, color: '#fcd34d' },
                    { label: 'Handling', val: `$${freight.breakdown.handlingCharges}`, color: '#93c5fd' },
                    { label: 'Fuel Index', val: freight.breakdown.fuelIndexUsed?.toFixed(4), color: '#f9a8d4' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>{label}</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Compliance Section ─────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: hasWarnings ? '1fr 1fr' : '1fr', gap: '1.25rem' }}>
              {/* Documents */}
              <div style={{ background: '#fff', borderRadius: 20, padding: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <h3 style={{ color: '#0f172a', margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} color="#6366f1" /> Required Documents for {destination}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {(documents?.requiredDocuments ?? []).map((doc: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {hasWarnings && (
                <div style={{ background: '#fff', borderRadius: 20, padding: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1.5px solid #fecaca' }}>
                  <h3 style={{ color: '#dc2626', margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} /> Compliance Warnings
                  </h3>
                  {(compliance.restrictions ?? []).length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Import Restrictions</div>
                      {compliance.restrictions.map((r: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fef2f2', borderRadius: 8, marginBottom: '0.4rem', border: '1px solid #fecaca' }}>
                          <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(compliance.dgWarnings ?? []).length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Dangerous Goods</div>
                      {compliance.dgWarnings.map((w: string, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fef2f2', borderRadius: 8, marginBottom: '0.4rem', border: '1px solid #fecaca' }}>
                          <ShieldAlert size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem 1.25rem', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              ℹ️ Rates are indicative. Based on a $500 product value and 100 kg weight. Actual duties depend on origin, trade agreements, and current regulations.
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
