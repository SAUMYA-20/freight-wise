import Link from 'next/link';
import type { Metadata } from 'next';
import { Globe, Award, CheckCircle2, ArrowRight, MapPin, Users, TrendingUp, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us — FreightWise',
  description: 'Learn about FreightWise — our mission, team, and global presence in logistics.',
};

const STATS = [
  { value: '2024', label: 'Started' },
  { value: '1st', label: 'Hackathon Project' },
  { value: '4', label: 'Team members' },
  { value: '100%', label: 'Dedication' },
];

const VALUES = [
  { icon: CheckCircle2, title: 'Innovation',   desc: 'Building next-generation AI tools to solve real-world supply chain problems.', color: '#0066FF', bg: '#EBF2FF' },
  { icon: Globe,        title: 'Transparency',  desc: 'Making global trade data open and accessible for businesses of all sizes.', color: '#0D9488', bg: '#EDFAF9' },
  { icon: Zap,          title: 'Speed',         desc: 'Optimized routing and instant HS code classifications using modern tech.', color: '#7C3AED', bg: '#F5F3FF' },
  { icon: Users,        title: 'Collaboration', desc: 'Designed with the user in mind, built by a passionate team of student developers.', color: '#F59E0B', bg: '#FFFBEB' },
];

const TEAM = [
  { name: 'Gautam Saini', role: 'Developer', location: '', color: '#0066FF' },
  { name: 'Saumya',       role: 'Developer', location: '', color: '#0D9488' },
  { name: 'Mayank',       role: 'Developer', location: '', color: '#7C3AED' },
  { name: 'Shahreyar',    role: 'Developer', location: '', color: '#F59E0B' },
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
            FreightWise is built by a team from IIT to showcase next-generation logistics tracking and intelligence.
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
                We built FreightWise to tackle real-world logistics challenges—opaque pricing, unexpected duty bills, and mountains of paperwork.
              </p>
              <p style={{ marginBottom: '2rem' }}>
                Today our platform demonstrates how to ship confidently with upfront costs, accurate classification, and real-time tracking.
              </p>
              <Link href="/contact" className="btn btn-blue">
                Work with us <ArrowRight size={14} />
              </Link>
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



      {/* CTA */}
      <section style={{ background: 'var(--gradient-hero)', padding: '6rem 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0,102,255,0.2) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div className="container" style={{ textAlign: 'center', position: 'relative' }}>
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Experience Next-Gen Logistics</h2>
          <p style={{ marginBottom: '2.5rem', maxWidth: 360, margin: '0 auto 2.5rem', color: 'rgba(255,255,255,0.6)' }}>
            Explore FreightWise today.
          </p>
          <Link href="/contact" className="btn btn-amber btn-lg">
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
