import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Search, Globe, Calculator, Truck, ChevronRight, TrendingUp, Shield, Clock, Route } from 'lucide-react';
import HSSearchBar from '../components/HSSearchBar';

export const metadata: Metadata = {
  title: 'Freight — Global Logistics & Supply Chain',
  description: 'HS code lookup, landed cost calculator, supply chain planner and freight services — all in one platform.',
};

const WHY_CHOOSE_US = [
  { num: '01', title: 'Accurate HS Classification', desc: 'Find the most relevant HS codes using AI-powered product search.' },
  { num: '02', title: 'Global Trade Intelligence', desc: 'Access duties, VAT, taxes, and trade requirements across multiple countries.' },
  { num: '03', title: 'Compliance Verification', desc: 'Identify dangerous goods, required documents, certifications, and restrictions before shipping.' },
  { num: '04', title: 'Landed Cost Prediction', desc: 'Estimate the true cost of international trade including freight, duties, taxes, and handling charges.' },
];

const FEATURES = [
  {
    icon: Search,
    title: 'HS Code Search',
    desc: 'Find and classify products using intelligent HS code matching and trade datasets.',
    href: '/hs-codes',
    color: '#0066FF',
    bg: '#EBF2FF',
  },
  {
    icon: Globe,
    title: 'Supply Chain Planner',
    desc: 'Visualize sourcing, transportation, compliance, and delivery requirements.',
    href: '/supply-chain',
    color: '#0D9488',
    bg: '#EDFAF9',
  },
  {
    icon: Calculator,
    title: 'Landed Cost Calculator',
    desc: 'Calculate duties, VAT, freight costs, insurance, and total landed costs.',
    href: '/cost-calculator',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: Route,
    title: 'Route Optimizer',
    desc: 'Compare routes using distance, congestion indicators, and trade constraints.',
    href: '/route-optimization',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    icon: Truck,
    title: 'Warehouse Intelligence',
    desc: 'Monitor storage bottlenecks and operational risks.',
    href: '/warehouse-congestion',
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
  {
    icon: Shield,
    title: 'Trade Risk Reports',
    desc: 'Identify compliance risks, restrictions, and regulatory concerns.',
    href: '/theft-reports',
    color: '#0ea5e9',
    bg: '#e0f2fe',
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--gradient-hero)',
        padding: '6rem 0 5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decorations */}
        <div style={{
          position: 'absolute', top: '15%', left: '5%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(0,102,255,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '8%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ maxWidth: 820, textAlign: 'center', position: 'relative' }}>

          {/* Eyebrow badge */}
          <div className="animate-fadeUp" style={{ marginBottom: '1.5rem' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.9)',
              borderRadius: 'var(--radius-pill)',
              padding: '0.35rem 1rem',
              fontSize: '0.8rem', fontWeight: 600,
              backdropFilter: 'blur(8px)',
            }}>
              AI-Powered Trade Intelligence
            </span>
          </div>

          <h1 className="animate-fadeUp delay-1" style={{ color: '#fff', marginBottom: '1.375rem' }}>
            Navigate Global Trade<br />
            <span className="text-gradient">with Confidence</span>
          </h1>

          <p className="animate-fadeUp delay-2" style={{
            fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)',
            maxWidth: 600, margin: '0 auto 2.5rem', lineHeight: 1.7,
          }}>
            Instantly identify HS codes, calculate duties and VAT, estimate landed costs, verify compliance requirements, and optimize international shipping routes.
          </p>

          <div className="animate-fadeUp delay-3" style={{ position: 'relative', zIndex: 50 }}>
            <HSSearchBar />
          </div>

          <div className="animate-fadeUp delay-4" style={{
            display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem',
          }}>
            <Link href="/hs-codes" className="btn btn-white btn-lg">
              Search HS Codes <ArrowRight size={16} />
            </Link>
            <Link href="#features" className="btn btn-lg" style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}>
              Explore Platform
            </Link>
          </div>

        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="label" style={{ margin: '0 auto 1rem' }}>Platform</div>
            <h2 style={{ marginBottom: '0.75rem' }}>Everything in one place</h2>
            <p style={{ maxWidth: 440, margin: '0 auto', fontSize: '1rem' }}>
              Powerful tools for every step of your international trade journey.
            </p>
          </div>

          <div className="grid-2">
            {FEATURES.map(({ icon: Icon, title, desc, href, color, bg }) => (
              <Link key={title} href={href} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
                  <div style={{
                    width: 52, height: 52,
                    borderRadius: 'var(--radius-lg)',
                    background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1.25rem',
                    border: `1px solid ${color}22`,
                  }}>
                    <Icon size={22} color={color} />
                  </div>
                  <h3 style={{ marginBottom: '0.625rem' }}>{title}</h3>
                  <p style={{ fontSize: '0.9rem', marginBottom: '1.375rem' }}>{desc}</p>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    fontSize: '0.8125rem', fontWeight: 700, color,
                  }}>
                    Explore <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ──────────────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="label" style={{ margin: '0 auto 1rem' }}>Why Choose Us</div>
            <h2>Why Businesses Choose FreightWise</h2>
          </div>

          <div className="grid-4">
            {WHY_CHOOSE_US.map(({ num, title, desc }, i) => (
              <div key={num} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                {/* Connector line visual */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <div className="step-num" style={{ width: 48, height: 48, fontSize: '0.875rem' }}>{num}</div>
                  {i < WHY_CHOOSE_US.length - 1 && (
                    <div style={{
                      position: 'absolute', left: 'calc(50% + 28px)', top: '50%',
                      width: 'calc(100% - 24px)', height: 1,
                      background: 'linear-gradient(90deg, var(--accent-border), transparent)',
                      pointerEvents: 'none',
                    }} className="desktop-only" />
                  )}
                </div>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9375rem' }}>{title}</h4>
                <p style={{ fontSize: '0.85rem' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ──────────────────────────────────────────── */}
      <section id="features" style={{ background: 'var(--bg)', padding: '5rem 0' }}>
        <div className="container" style={{ maxWidth: 800, textAlign: 'center' }}>
          <div className="label" style={{ margin: '0 auto 1rem' }}>About Us</div>
          <h2 style={{ marginBottom: '1.5rem' }}>About FreightWise</h2>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.8, marginBottom: '1.5rem', color: 'var(--muted)' }}>
            FreightWise is a trade intelligence platform built to simplify international shipping and cross-border commerce. Our platform combines HS code classification, compliance analysis, landed cost estimation, and route intelligence into a single workflow.
          </p>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.8, marginBottom: '2.5rem', color: 'var(--muted)' }}>
            Instead of navigating multiple customs portals, tariff databases, and logistics resources, businesses can access critical trade information through one unified platform. Whether you are an exporter, importer, logistics professional, or supply chain team, FreightWise helps you make faster and more informed trade decisions.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', textAlign: 'left', background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div>
              <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Our Mission</h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>Make international trade transparent, accessible, and data-driven.</p>
            </div>
            <div>
              <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Our Vision</h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>Become the operating system for global trade intelligence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--gradient-hero)', padding: '6rem 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0,102,255,0.2) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="container" style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{
              display: 'inline-block',
              background: 'rgba(245,158,11,0.2)',
              border: '1px solid rgba(245,158,11,0.4)',
              color: '#FCD34D',
              borderRadius: 'var(--radius-pill)',
              padding: '0.25rem 0.875rem',
              fontSize: '0.75rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>Get Started</span>
          </div>
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Ready to elevate your trade intelligence?</h2>
          <p style={{ marginBottom: '2.5rem', maxWidth: 500, margin: '0 auto 2.5rem', color: 'rgba(255,255,255,0.65)', fontSize: '1rem' }}>
            Access HS code data, duty rates, and compliance requirements across 150+ countries.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/hs-codes" className="btn btn-amber btn-lg">
              Search HS Codes <ArrowRight size={16} />
            </Link>
            <Link href="#features" className="btn btn-lg" style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.85)',
            }}>
              Explore Platform
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
