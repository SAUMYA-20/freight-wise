import Link from 'next/link';
import type { Metadata } from 'next';
import { Globe, Award, CheckCircle2, ArrowRight, MapPin, Users, TrendingUp, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us — FreightWise',
  description: 'Learn about FreightWise — our mission, team, and global presence in logistics.',
};

const STATS = [
  { value: '2015', label: 'Founded' },
  { value: '150+', label: 'Countries' },
  { value: '400+', label: 'Team members' },
  { value: '99.2%', label: 'On-time rate' },
];

const VALUES = [
  { icon: CheckCircle2, title: 'Reliability',   desc: '99.2% on-time delivery across 150+ countries. We deliver what we promise.', color: '#0066FF', bg: '#EBF2FF' },
  { icon: Globe,        title: 'Transparency',  desc: 'Full upfront cost breakdown — no hidden fees, no duty surprises.',          color: '#0D9488', bg: '#EDFAF9' },
  { icon: Zap,          title: 'Speed',         desc: 'Quote to departure in hours, not days. Our platform cuts out the paperwork.', color: '#7C3AED', bg: '#F5F3FF' },
  { icon: Users,        title: 'Expertise',     desc: 'Licensed customs brokers, IATA-certified agents, and trade law specialists.', color: '#F59E0B', bg: '#FFFBEB' },
];

const CERTS = [
  'ISO 9001:2015 Quality Management',
  'AEO — Authorised Economic Operator',
  'IATA Cargo Agent (certified)',
  'FIATA Member',
  'C-TPAT Certified (US)',
  'SOLAS compliant',
];

const OFFICES = [
  { city: 'Dubai', country: 'UAE', role: 'Global HQ', flag: '🇦🇪' },
  { city: 'London', country: 'UK', role: 'EMEA HQ', flag: '🇬🇧' },
  { city: 'Singapore', country: 'SG', role: 'APAC HQ', flag: '🇸🇬' },
  { city: 'New York', country: 'US', role: 'Americas HQ', flag: '🇺🇸' },
  { city: 'Shanghai', country: 'CN', role: 'Sourcing hub', flag: '🇨🇳' },
  { city: 'Lagos', country: 'NG', role: 'Africa hub', flag: '🇳🇬' },
];

// TODO: API — Optionally load team members dynamically from CMS
//   GET /api/team  →  { members: TeamMember[] }
const TEAM = [
  { name: 'Aisha Rahman',   role: 'CEO & Co-Founder',   location: 'Dubai, UAE',      color: '#0066FF' },
  { name: 'Marcus Wong',    role: 'CTO',                location: 'Singapore',       color: '#0D9488' },
  { name: 'Elena Petrov',   role: 'Head of Customs',    location: 'Rotterdam, NL',   color: '#7C3AED' },
  { name: 'James Okonkwo',  role: 'Director, Africa',   location: 'Lagos, NG',       color: '#F59E0B' },
];

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* Page header */}
      <div className="page-header">
        <div className="container">
          <div className="animate-fadeUp">
            <div className="label">Our Story</div>
          </div>
          <h1 className="animate-fadeUp delay-1" style={{ marginBottom: '1rem' }}>
            Connecting the world,<br />
            <span className="text-gradient">one shipment at a time</span>
          </h1>
          <p className="animate-fadeUp delay-2" style={{ maxWidth: 520, fontSize: '1.0625rem' }}>
            Founded in 2015, FreightWise was built on a simple belief: international trade should be simple, transparent, and accessible to every business.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          }}>
            {STATS.map(({ value, label }, i) => (
              <div key={label} className="stat-item" style={{
                borderRight: i < STATS.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission + certs */}
      <section className="section" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '3.5rem', alignItems: 'start',
          }}>
            <div>
              <div className="label">Mission</div>
              <h2 style={{ marginBottom: '1.25rem' }}>Making global trade frictionless</h2>
              <p style={{ marginBottom: '1rem' }}>
                We built FreightWise because we saw how broken logistics was — opaque pricing, unexpected duty bills, mountains of paperwork, and zero visibility.
              </p>
              <p style={{ marginBottom: '2rem' }}>
                Today our platform helps 10,000+ businesses in 150 countries ship confidently with upfront costs, accurate classification, and real-time tracking.
              </p>
              <Link href="/contact" className="btn btn-blue">
                Work with us <ArrowRight size={14} />
              </Link>
            </div>

            {/* Certifications */}
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Certifications & Memberships</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {CERTS.map(c => (
                  <div key={c} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    fontSize: '0.875rem', color: 'var(--navy-2)',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                  }}>
                    <Award size={14} color="var(--accent)" style={{ flexShrink: 0 }} /> {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="label" style={{ margin: '0 auto 1rem' }}>Our Values</div>
            <h2>What drives everything we do</h2>
          </div>
          <div className="grid-4">
            {VALUES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="card" style={{ textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 'var(--radius-lg)',
                  background: bg, border: `1px solid ${color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.125rem',
                }}>
                  <Icon size={22} color={color} />
                </div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--navy)' }}>{title}</h4>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="label" style={{ margin: '0 auto 1rem' }}>Leadership</div>
            <h2>Meet the team</h2>
          </div>
          <div className="grid-4">
            {TEAM.map(({ name, role, location, color }) => {
              const initials = name.split(' ').map(n => n[0]).join('');
              return (
                <div key={name} className="card" style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: `${color}15`,
                    border: `2px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.125rem',
                    fontSize: '1.25rem', fontWeight: 800, color,
                  }}>
                    {initials}
                  </div>
                  <div style={{ fontWeight: 700, marginBottom: '0.3rem', fontSize: '0.9375rem' }}>{name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.5rem' }}>{role}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    <MapPin size={11} /> {location}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Offices */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="label" style={{ margin: '0 auto 1rem' }}>Global Presence</div>
            <h2>Our offices</h2>
          </div>
          <div className="grid-3">
            {OFFICES.map(({ city, country, role, flag }) => (
              <div key={city} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: '1.125rem', background: 'var(--surface)' }}>
                <span style={{ fontSize: '2.25rem' }}>{flag}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.2rem' }}>{city}, {country}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600 }}>{role}</div>
                </div>
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
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Join 10,000+ businesses</h2>
          <p style={{ marginBottom: '2.5rem', maxWidth: 360, margin: '0 auto 2.5rem', color: 'rgba(255,255,255,0.6)' }}>
            Start shipping smarter with FreightWise today.
          </p>
          <Link href="/contact" className="btn btn-amber btn-lg">
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
