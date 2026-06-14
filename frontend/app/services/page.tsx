import Link from 'next/link';
import type { Metadata } from 'next';
import { Plane, Ship, Truck, Warehouse, Shield, BarChart3, CheckCircle2, ArrowRight, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Services — FreightWise',
  description: 'Air freight, sea freight, customs brokerage, warehousing and supply chain advisory — all under one roof.',
};

// TODO: API — Optionally load services dynamically from CMS or backend
//   GET /api/services  →  { services: Service[] }
const SERVICES = [
  {
    icon: Plane,
    title: 'Air Freight',
    transit: '1–5 days',
    ideal: 'High-value or urgent cargo',
    color: '#0066FF',
    bg: '#EBF2FF',
    features: ['Door-to-door express', 'IATA dangerous goods', 'Temperature control', 'Real-time tracking'],
  },
  {
    icon: Ship,
    title: 'Sea Freight',
    transit: '15–45 days',
    ideal: 'Large volumes and bulk goods',
    color: '#0D9488',
    bg: '#EDFAF9',
    features: ['FCL and LCL options', 'Reefer & hazmat containers', 'Weekly sailings', 'RoRo for vehicles'],
  },
  {
    icon: Truck,
    title: 'Road Freight',
    transit: '3–10 days',
    ideal: 'Regional and cross-border',
    color: '#7C3AED',
    bg: '#F5F3FF',
    features: ['FTL and LTL', 'GPS-tracked fleet', 'Cross-border customs', 'Refrigerated transport'],
  },
  {
    icon: Warehouse,
    title: 'Warehousing',
    transit: 'On-demand',
    ideal: 'E-commerce and distribution',
    color: '#F59E0B',
    bg: '#FFFBEB',
    features: ['Bonded storage', 'Pick, pack & dispatch', 'Inventory management', 'B2C fulfilment'],
  },
  {
    icon: Shield,
    title: 'Customs Brokerage',
    transit: '1–3 days',
    ideal: 'All importers & exporters',
    color: '#DC2626',
    bg: '#FFF1F2',
    features: ['Licensed brokers', 'HS classification', 'Duty & tax filing', 'Drawback & duty relief'],
  },
  {
    icon: BarChart3,
    title: 'Supply Chain Advisory',
    transit: 'Project-based',
    ideal: 'Complex or growing supply chains',
    color: '#0891B2',
    bg: '#ECFEFF',
    features: ['Trade compliance audit', 'Landed cost optimisation', 'Incoterms strategy', 'Supplier vetting'],
  },
];

const PROCESS = [
  { step: '01', title: 'Get a Quote', desc: 'Submit your shipment details — response within 2 hours.' },
  { step: '02', title: 'Confirm & Book', desc: 'Approve the quote, sign off, and we handle everything.' },
  { step: '03', title: 'We Manage It', desc: 'Freight, docs, customs — all coordinated by our team.' },
  { step: '04', title: 'Track & Receive', desc: 'Real-time updates until your cargo is delivered.' },
];

export default function ServicesPage() {
  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* Page header */}
      <div className="page-header">
        <div className="container">
          <div className="animate-fadeUp">
            <div className="label">Our Services</div>
          </div>
          <h1 className="animate-fadeUp delay-1" style={{ marginBottom: '1rem' }}>
            End-to-End Logistics
          </h1>
          <p className="animate-fadeUp delay-2" style={{ maxWidth: 500, fontSize: '1.0625rem' }}>
            Everything you need to move goods across borders — under one roof, with one point of contact.
          </p>
        </div>
      </div>

      {/* Service cards */}
      <section className="section" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="grid-3">
            {SERVICES.map(({ icon: Icon, title, transit, ideal, color, bg, features }) => (
              <div key={title} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 'var(--radius-lg)',
                  background: bg, border: `1px solid ${color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}>
                  <Icon size={22} color={color} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.0625rem' }}>{title}</h3>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.75rem', fontWeight: 600, color,
                    background: bg, border: `1px solid ${color}22`,
                    borderRadius: 'var(--radius-pill)', padding: '0.2rem 0.625rem',
                  }}>
                    <Clock size={11} /> {transit}
                  </span>
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
                  <strong style={{ color: 'var(--navy-2)' }}>Best for:</strong> {ideal}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                  {features.map(f => (
                    <div key={f} style={{
                      display: 'flex', gap: '0.625rem', alignItems: 'center',
                      fontSize: '0.85rem', color: 'var(--navy-2)',
                    }}>
                      <CheckCircle2 size={14} color={color} style={{ flexShrink: 0 }} /> {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="label" style={{ margin: '0 auto 1rem' }}>How it works</div>
            <h2>Simple 4-step process</h2>
          </div>
          <div className="grid-4">
            {PROCESS.map(({ step, title, desc }, i) => (
              <div key={step} style={{ textAlign: 'center', padding: '1.5rem 0.75rem' }}>
                <div style={{
                  position: 'relative', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '1.25rem',
                }}>
                  <div className="step-num" style={{ width: 48, height: 48, fontSize: '0.875rem' }}>{step}</div>
                  {i < PROCESS.length - 1 && (
                    <div style={{
                      position: 'absolute', left: 'calc(50% + 28px)', top: '50%',
                      width: 'calc(100% - 24px)', height: 1,
                      background: 'linear-gradient(90deg, var(--accent-border), transparent)',
                    }} className="desktop-only" />
                  )}
                </div>
                <h4 style={{ marginBottom: '0.5rem' }}>{title}</h4>
                <p style={{ fontSize: '0.875rem' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--gradient-hero)', padding: '6rem 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0,102,255,0.2) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="container" style={{ textAlign: 'center', position: 'relative' }}>
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Ready to ship?</h2>
          <p style={{ marginBottom: '2.5rem', maxWidth: 400, margin: '0 auto 2.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '1rem' }}>
            Get a tailored quote from our team within 2 hours.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/contact" className="btn btn-amber btn-lg">Get a Free Quote <ArrowRight size={16} /></Link>
            <Link href="/cost-calculator" className="btn btn-lg" style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.85)',
            }}>
              Estimate Costs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
