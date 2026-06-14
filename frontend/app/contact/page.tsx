'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2, Search, Calculator, Globe } from 'lucide-react';

interface ContactForm {
  name: string; company: string; email: string; phone: string;
  enquiry: string; origin: string; destination: string; message: string;
}

const ENQUIRY_TYPES = [
  'General Enquiry', 'Get a Freight Quote', 'Customs & Compliance',
  'HS Code Classification Help', 'Warehousing & Distribution',
  'Partnership / B2B', 'Technical Support',
];

const OFFICES = [
  { city: 'Dubai (HQ)', address: 'Gate Avenue, DIFC, Dubai, UAE',       phone: '+971 4 000 0000', flag: '🇦🇪' },
  { city: 'London',      address: '1 Canada Square, Canary Wharf, E14', phone: '+44 20 0000 0000', flag: '🇬🇧' },
  { city: 'Singapore',   address: '1 Raffles Place, #20-01',            phone: '+65 6000 0000',   flag: '🇸🇬' },
];

const EMPTY: ContactForm = { name: '', company: '', email: '', phone: '', enquiry: '', origin: '', destination: '', message: '' };

export default function ContactPage() {
  const [form,       setForm]       = useState<ContactForm>(EMPTY);
  const [submitted,  setSubmitted]  = useState(false);
  const [loading,    setLoading]    = useState(false);

  const set = (k: keyof ContactForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  // TODO: API — Replace the fake timeout with a real backend call:
  //   POST /api/contact with form payload (SendGrid / Resend / Nodemailer)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 1200);
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '80vh' }}>

      {/* Page header */}
      <div className="page-header">
        <div className="container">
          <div className="animate-fadeUp">
            <div className="label">Contact Us</div>
          </div>
          <h1 className="animate-fadeUp delay-1" style={{ marginBottom: '1rem' }}>Let&apos;s talk logistics</h1>
          <p className="animate-fadeUp delay-2" style={{ maxWidth: 480, fontSize: '1.0625rem' }}>
            Freight quote, HS code help, or anything else — our team responds within 2 hours.
          </p>
        </div>
      </div>

      {/* Contact channels row */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { icon: Phone, text: '+1 (800) FREIGHT', sub: 'Mon–Fri 8am–8pm GST' },
              { icon: Mail,  text: 'hello@freightwise.com', sub: '< 2 hour response' },
              { icon: Clock, text: '24/7 Live Chat', sub: 'Instant AI + human support' },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.75rem 1rem',
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--navy)' }}>{text}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>

          {/* ── Enquiry form ──────────────────────────────── */}
          <div className="card">
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: 'var(--success-bg)',
                  border: '2px solid #A7F3D0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                }}>
                  <CheckCircle2 size={30} color="var(--success)" />
                </div>
                <h2 style={{ fontSize: '1.375rem', marginBottom: '0.75rem' }}>Message sent!</h2>
                <p style={{ marginBottom: '2rem', maxWidth: 320, margin: '0 auto 2rem' }}>
                  Thanks <strong>{form.name}</strong> — one of our logistics experts will reach out within 2 business hours.
                </p>
                <button onClick={() => { setSubmitted(false); setForm(EMPTY); }} className="btn btn-outline">
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.75rem' }}>
                  <h2 style={{ fontSize: '1.125rem', marginBottom: '0.375rem' }}>Send a message</h2>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>We respond within 2 business hours.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div><label>Name *</label><input className="input" required value={form.name} onChange={set('name')} placeholder="Jane Smith" /></div>
                    <div><label>Company</label><input className="input" value={form.company} onChange={set('company')} placeholder="Acme Co." /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div><label>Email *</label><input className="input" type="email" required value={form.email} onChange={set('email')} placeholder="jane@company.com" /></div>
                    <div><label>Phone</label><input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" /></div>
                  </div>

                  {/* TODO: API — Enquiry types could be fetched from backend for easier CMS management */}
                  <div>
                    <label>Enquiry Type</label>
                    <select className="input select" value={form.enquiry} onChange={set('enquiry')}>
                      <option value="">Select type…</option>
                      {ENQUIRY_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div><label>Shipment Origin</label><input className="input" value={form.origin} onChange={set('origin')} placeholder="e.g. China" /></div>
                    <div><label>Destination</label><input className="input" value={form.destination} onChange={set('destination')} placeholder="e.g. UK" /></div>
                  </div>

                  <div>
                    <label>Message *</label>
                    <textarea className="input" required rows={4} value={form.message} onChange={set('message')} placeholder="Tell us about your shipment or question…" />
                  </div>

                  <button type="submit" className="btn btn-blue" style={{ justifyContent: 'center', padding: '0.9375rem' }} disabled={loading}>
                    {loading ? 'Sending…' : <><Send size={15} /> Send Message</>}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* ── Sidebar ───────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Offices */}
            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Our Offices</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {OFFICES.map(({ city, address, phone, flag }, i) => (
                  <div key={city} style={{
                    padding: '1rem 0',
                    borderBottom: i < OFFICES.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{flag}</span> {city}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><MapPin size={11} color="var(--accent)" /> {address}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Phone size={11} color="var(--accent)" /> {phone}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick tools */}
            <div className="card">
              <h3 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Quick Tools</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { href: '/hs-codes',        icon: Search,     label: 'Search HS Codes',      color: '#0066FF', bg: '#EBF2FF' },
                  { href: '/cost-calculator', icon: Calculator, label: 'Estimate Landed Cost', color: '#7C3AED', bg: '#F5F3FF' },
                  { href: '/supply-chain',    icon: Globe,      label: 'Plan Supply Chain',    color: '#0D9488', bg: '#EDFAF9' },
                ].map(({ href, icon: Icon, label, color, bg }) => (
                  <Link key={href} href={href} style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    transition: 'all 0.15s',
                    textDecoration: 'none',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.background = bg; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={15} color={color} />
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)' }}>{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Response SLA */}
            <div style={{
              padding: '1.25rem', background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', marginBottom: '0.875rem' }}>
                ⚡ Response Times
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { emoji: '📧', channel: 'Email', time: 'within 2 business hours' },
                  { emoji: '📞', channel: 'Phone', time: 'immediate (business hours)' },
                  { emoji: '💬', channel: 'Chat',  time: '24/7 · under 2 minutes' },
                ].map(({ emoji, channel, time }) => (
                  <div key={channel} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                    <span>{emoji}</span>
                    <span style={{ fontWeight: 600, color: 'var(--navy)', minWidth: 44 }}>{channel}</span>
                    <span style={{ color: 'var(--muted)' }}>— {time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
