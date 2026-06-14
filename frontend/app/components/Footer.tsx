'use client';

import Link from 'next/link';
import { Package2, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

const FOOTER_LINKS = {
  Platform: [
    { label: 'HS Code Search',        href: '/hs-codes' },
    { label: 'Landed Cost Calculator',href: '/cost-calculator' },
    { label: 'Route Optimizer',       href: '/route-optimization' },
    { label: 'Supply Chain Planner',  href: '/supply-chain' },
  ],
  Resources: [
    { label: 'Trade Intelligence',    href: '#' },
    { label: 'Compliance Center',     href: '#' },
    { label: 'Documentation',         href: '#' },
  ],
  Company: [
    { label: 'About',  href: '/about' },
    { label: 'Contact',   href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy',   href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--navy)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      marginTop: 'auto',
    }}>
      <div className="container" style={{ padding: '4rem 1.5rem 2rem' }}>

        {/* Top row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '2.5rem',
          marginBottom: '3rem',
        }}>

          {/* Brand column */}
          <div>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'var(--gradient-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(0,102,255,0.4)',
              }}>
                <Package2 size={17} color="#fff" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.035em', color: '#fff' }}>
                FreightWise
              </span>
            </Link>
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, marginBottom: '1.5rem', color: 'rgba(255,255,255,0.45)' }}>
              AI-powered trade intelligence platform helping businesses navigate global commerce through HS code classification, compliance insights, landed cost estimation, and supply chain intelligence.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([cat, links]) => (
            <div key={cat}>
              <div style={{
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)',
                marginBottom: '1rem',
              }}>
                {cat}
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} style={{
                      fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)',
                      transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>



        {/* Bottom bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '1rem',
          alignItems: 'center', justifyContent: 'space-between',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ fontSize: '0.8125rem', margin: 0, color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} FreightWise. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {['Privacy', 'Terms', 'Cookies'].map(item => (
              <a key={item} href="#" style={{
                fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)', transition: 'color 0.15s',
              }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
