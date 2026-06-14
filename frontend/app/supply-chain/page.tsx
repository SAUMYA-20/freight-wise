'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Lightbulb, Search, FileText, DollarSign, Ship, Shield, Truck,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, ArrowRight, Clock,
} from 'lucide-react';

interface Stage {
  num: string;
  icon: React.ElementType;
  title: string;
  duration: string;
  desc: string;
  tasks: string[];
  risks: string[];
  documents: string[];
  color: string;
}

// TODO: API (optional) — if you want to make stages configurable
// per customer / product type, you could fetch from:
//   GET /api/supply-chain/stages?productType=<type>&origin=<o>&destination=<d>
const STAGES: Stage[] = [
  {
    num: '01', icon: Lightbulb, title: 'Product Research & Sourcing', color: '#7C3AED',
    duration: '1–4 weeks',
    desc: 'Define your product, find suppliers, request samples, and validate quality before committing.',
    tasks: ['Define specs and target MOQs', 'Research suppliers (Alibaba, trade fairs)', 'Request and evaluate samples', 'Preliminary landed cost estimate', 'Check IP / trademark in target market'],
    risks: ['Poor sample quality', 'IP infringement', 'Unrealistic MOQ terms'],
    documents: ['NDA with supplier', 'Product specification sheet'],
  },
  {
    num: '02', icon: Search, title: 'HS Code Classification', color: '#0066FF',
    duration: '1–3 days',
    desc: 'Classify your product under the correct Harmonized System code to determine duties and permit requirements.',
    tasks: ['Use HS Code Explorer to find chapter', 'Verify with destination tariff schedule', 'Check for FTA preferential rates', 'Identify any restricted classifications', 'Request a binding ruling if uncertain'],
    risks: ['Misclassification penalty (up to 20% surcharge)', 'Shipment hold at border'],
    documents: ['HS Code ruling letter', 'Product technical datasheet'],
  },
  {
    num: '03', icon: FileText, title: 'Compliance & Licensing', color: '#0D9488',
    duration: '1–6 weeks',
    desc: 'Secure all required export/import licenses, product certifications, and certificates of origin.',
    tasks: ['Export license (if controlled goods)', 'Import permit from destination authority', 'Product certs (CE, FDA, RoHS…)', 'Certificate of Origin (CoO)', 'Phytosanitary / health certs (food)'],
    risks: ['Approval delays', 'Non-compliance fines', 'Shipment seizure'],
    documents: ['Export license', 'CoO', 'Product certificates', 'Import permit'],
  },
  {
    num: '04', icon: DollarSign, title: 'Cost & Duty Calculation', color: '#059669',
    duration: '1 day',
    desc: 'Calculate full landed cost — product + freight + insurance + duties + VAT + brokerage.',
    tasks: ['Get freight quotes (air vs sea)', 'Calculate import duty (HS code + origin)', 'Add destination VAT / GST', 'Include customs brokerage fee', 'Factor in warehousing & last-mile'],
    risks: ['Hidden fees', 'Currency fluctuation', 'Unexpected surcharges'],
    documents: ['Pro forma invoice', 'Freight quote', 'Insurance certificate'],
  },
  {
    num: '05', icon: Ship, title: 'Freight Booking', color: '#0891B2',
    duration: '1–2 weeks',
    desc: 'Choose freight mode, book with a carrier, arrange cargo insurance, and confirm Incoterms.',
    tasks: ['Compare air vs sea rates & transit', 'Book with carrier or forwarder', 'Arrange marine cargo insurance', 'Prepare Bill of Lading / AWB', 'Confirm Incoterms (EXW, FOB, CIF, DDP)'],
    risks: ['Port congestion', 'Cargo damage', 'Schedule changes'],
    documents: ['Bill of Lading / AWB', 'Insurance certificate', 'Packing list'],
  },
  {
    num: '06', icon: Shield, title: 'Customs Clearance', color: '#DC2626',
    duration: '1–5 days',
    desc: 'File customs declarations, pay duties, and obtain release at the destination port.',
    tasks: ['Submit import declaration', 'Pay import duties & taxes', 'Handle customs examination', 'Obtain release order', 'Respond to any customs queries'],
    risks: ['Random inspections', 'Document errors', 'Duty disputes'],
    documents: ['Commercial invoice', 'Packing list', 'CoO', 'Bill of Lading', 'Import declaration'],
  },
  {
    num: '07', icon: Truck, title: 'Last-Mile Delivery', color: '#F59E0B',
    duration: '1–7 days',
    desc: 'Move cargo from port to final destination with real-time tracking and proof of delivery.',
    tasks: ['Port-to-warehouse transport', 'Customs de-stuffing', 'Final-mile delivery', 'Real-time tracking updates', 'Collect proof of delivery (POD)'],
    risks: ['Delivery delays', 'Damage in final mile', 'Failed delivery attempts'],
    documents: ['Delivery order', 'Proof of delivery', 'Warehouse receipt'],
  },
];

export default function SupplyChainPage() {
  const [expanded, setExpanded] = useState<string | null>('01');

  const toggle = (num: string) => setExpanded(prev => prev === num ? null : num);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '80vh' }}>

      {/* Page header */}
      <div className="page-header">
        <div className="container">
          <div className="animate-fadeUp">
            <div className="label">Supply Chain Journey</div>
          </div>
          <h1 className="animate-fadeUp delay-1" style={{ marginBottom: '1rem' }}>From Idea to Delivery</h1>
          <p className="animate-fadeUp delay-2" style={{ maxWidth: 520, fontSize: '1.0625rem' }}>
            A step-by-step guide through every stage of international shipping — with timelines, tasks, risks, and required documents.
          </p>
          <div className="animate-fadeUp delay-3" style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { icon: Clock, text: '6–14 weeks typical end-to-end' },
              { icon: FileText, text: '15+ documents managed' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.875rem', color: 'var(--muted)',
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-pill)',
                padding: '0.375rem 0.875rem',
              }}>
                <Icon size={14} color="var(--accent)" /> {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {STAGES.map(({ num, title, color }, i) => (
              <button key={num} onClick={() => setExpanded(num)} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0,
                padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-pill)',
                border: `1.5px solid ${expanded === num ? color : 'var(--border)'}`,
                background: expanded === num ? `${color}12` : 'transparent',
                color: expanded === num ? color : 'var(--muted)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: expanded === num ? color : 'var(--border)',
                  color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{num}</span>
                <span className="desktop-only">{title.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stages accordion */}
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {STAGES.map(({ num, icon: Icon, title, duration, desc, tasks, risks, documents, color }) => {
            const open = expanded === num;
            return (
              <div key={num} className="accordion-item" style={{
                borderColor: open ? color : 'var(--border)',
                boxShadow: open ? `0 4px 20px ${color}18` : 'var(--shadow-xs)',
              }}>

                {/* Stage header row */}
                <button onClick={() => toggle(num)} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  width: '100%', padding: '1.25rem 1.5rem',
                  background: open ? `${color}06` : 'var(--surface)',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', textAlign: 'left',
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 'var(--radius)',
                    background: open ? `${color}18` : 'var(--bg)',
                    border: `1.5px solid ${open ? color + '40' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}>
                    <Icon size={18} color={open ? color : 'var(--muted)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: open ? color : 'var(--navy)' }}>
                      <span style={{ color: 'var(--muted)', fontWeight: 500, marginRight: '0.5rem', fontSize: '0.8rem' }}>{num}</span>
                      {title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                      {desc.slice(0, 85)}…
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.75rem', fontWeight: 600,
                    color: open ? color : 'var(--muted)',
                    background: open ? `${color}12` : 'var(--bg)',
                    border: `1px solid ${open ? color + '30' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-pill)', padding: '0.25rem 0.625rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    <Clock size={11} /> {duration}
                  </span>
                  {open ? <ChevronUp size={16} color={color} /> : <ChevronDown size={16} color="var(--muted)" />}
                </button>

                {/* Expanded content */}
                {open && (
                  <div style={{
                    background: 'var(--bg)', borderTop: `1px solid ${color}20`,
                    padding: '1.75rem 1.5rem',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem',
                  }}>
                    {/* Tasks */}
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color, marginBottom: '0.875rem' }}>
                        Key Tasks
                      </div>
                      {tasks.map(t => (
                        <div key={t} style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.625rem', fontSize: '0.875rem', color: 'var(--navy-2)' }}>
                          <CheckCircle2 size={14} color={color} style={{ marginTop: 2, flexShrink: 0 }} /> {t}
                        </div>
                      ))}
                    </div>

                    {/* Risks */}
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--amber-dark)', marginBottom: '0.875rem' }}>
                        Risk Alerts
                      </div>
                      {risks.map(r => (
                        <div key={r} style={{
                          display: 'flex', gap: '0.625rem', marginBottom: '0.625rem',
                          fontSize: '0.875rem', color: '#92400E',
                          background: 'var(--amber-bg)', border: '1px solid #FDE68A',
                          borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.625rem',
                        }}>
                          <AlertTriangle size={14} color="var(--amber)" style={{ marginTop: 1, flexShrink: 0 }} /> {r}
                        </div>
                      ))}
                    </div>

                    {/* Documents */}
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.875rem' }}>
                        Documents Needed
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {documents.map(d => (
                          <span key={d} style={{
                            fontSize: '0.8rem', fontWeight: 500,
                            padding: '0.25rem 0.625rem',
                            borderRadius: 'var(--radius-sm)',
                            background: `${color}10`, color,
                            border: `1px solid ${color}25`,
                          }}>{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{
          marginTop: '2.5rem', padding: '2.5rem 2rem',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--gradient-hero)',
          textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(0,102,255,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <h3 style={{ color: '#fff', marginBottom: '0.625rem', fontSize: '1.25rem', position: 'relative' }}>
            Ready to start your journey?
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: '1.75rem', fontSize: '0.9375rem', position: 'relative' }}>
            Calculate your total landed cost or speak to our team.
          </p>
          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <Link href="/cost-calculator" className="btn btn-amber">Calculate Cost <ArrowRight size={14} /></Link>
            <Link href="/contact" className="btn" style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.85)',
            }}>Talk to an Expert</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
