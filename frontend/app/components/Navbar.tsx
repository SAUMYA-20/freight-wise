'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Package2, 
  Menu, 
  X, 
  ChevronDown, 
  Search, 
  Network, 
  Calculator, 
  Route, 
  ShieldAlert, 
  Warehouse,
  Moon,
  Sun
} from 'lucide-react';

const SOLUTIONS = [
  { href: '/hs-codes', label: 'HS Codes', desc: 'Search & verify global harmonized codes', icon: Search },
  { href: '/supply-chain', label: 'Supply Chain', desc: 'End-to-end logistics & cargo tracking', icon: Network },
  { href: '/cost-calculator', label: 'Cost Calculator', desc: 'Estimate duties, taxes & shipping costs', icon: Calculator },
  { href: '/route-optimization', label: 'Route Optimizer', desc: 'Find the most efficient transit routes', icon: Route },
  { href: '/theft-reports', label: 'Theft Reports', desc: 'Report and track cargo security incidents', icon: ShieldAlert },
  { href: '/warehouse-congestion', label: 'Warehouse Congestion', desc: 'Predict and analyze warehouse delays', icon: Warehouse },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const isSolutionsActive = SOLUTIONS.some(item => pathname === item.href);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handler);
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const toggleDark = () => {
    setIsDark(d => {
      const next = !d;
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return next;
    });
  };

  useEffect(() => { 
    setOpen(false); 
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isSolutionsActive) {
      setMobileSolutionsOpen(true);
    }
  }, [isSolutionsActive, pathname]);

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'var(--nav-bg-scrolled)' : 'var(--nav-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
        transition: 'all 0.25s',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      }}>
        <div className="container" style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 68,
        }}>

          {/* ── Logo ─────────────────────────────────── */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--gradient-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(0,102,255,0.3)',
            }}>
              <Package2 size={18} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.035em', color: 'var(--navy)' }}>
              FreightWise
            </span>
          </Link>

          {/* ── Desktop links ─────────────────────── */}
          <div className="hidden xl:flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
            {/* Home Link */}
            <Link href="/" style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.875rem',
              fontWeight: pathname === '/' ? 600 : 500,
              color: pathname === '/' ? 'var(--accent)' : 'var(--muted)',
              background: pathname === '/' ? 'var(--accent-bg)' : 'transparent',
              border: `1.5px solid ${pathname === '/' ? 'var(--accent-border)' : 'transparent'}`,
              transition: 'all 0.15s',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (pathname !== '/') { (e.currentTarget as HTMLElement).style.color = 'var(--navy)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; } }}
              onMouseLeave={e => { if (pathname !== '/') { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
            >
              Home
            </Link>

            {/* Solutions Dropdown Menu */}
            <div 
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
              style={{ position: 'relative' }}
            >
              <button 
                onClick={() => setDropdownOpen(v => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.875rem',
                  fontWeight: isSolutionsActive ? 600 : 500,
                  color: isSolutionsActive ? 'var(--accent)' : 'var(--muted)',
                  background: isSolutionsActive ? 'var(--accent-bg)' : 'transparent',
                  border: `1.5px solid ${isSolutionsActive ? 'var(--accent-border)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!isSolutionsActive) { (e.currentTarget as HTMLElement).style.color = 'var(--navy)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; } }}
                onMouseLeave={e => { if (!isSolutionsActive) { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
              >
                <span>Solutions</span>
                <ChevronDown size={14} style={{
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s',
                }} />
              </button>

              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: dropdownOpen ? 'translate(-50%, 0)' : 'translate(-50%, 10px)',
                opacity: dropdownOpen ? 1 : 0,
                visibility: dropdownOpen ? 'visible' : 'hidden',
                pointerEvents: dropdownOpen ? 'all' : 'none',
                width: 580,
                paddingTop: '0.5rem',
                transition: 'opacity 0.2s ease-out, transform 0.2s ease-out, visibility 0.2s',
                zIndex: 1010,
              }}>
                <div style={{
                  background: scrolled ? 'var(--nav-bg-scrolled)' : 'var(--nav-bg)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem',
                }}>
                {SOLUTIONS.map(item => {
                  const Icon = item.icon;
                  const itemActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius)',
                        background: itemActive ? 'var(--accent-bg)' : 'transparent',
                        border: `1.5px solid ${itemActive ? 'var(--accent-border)' : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (!itemActive) {
                          (e.currentTarget as HTMLElement).style.background = 'var(--bg)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!itemActive) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: itemActive ? 'var(--accent)' : 'var(--accent-bg)',
                        color: itemActive ? '#fff' : 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div style={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: 'var(--navy)',
                          letterSpacing: '-0.01em',
                        }}>
                          {item.label}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--muted)',
                          lineHeight: '1.4',
                          marginTop: '0.15rem',
                        }}>
                          {item.desc}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                </div>
              </div>
            </div>

            {/* Services Link */}
            <Link href="/services" style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.875rem',
              fontWeight: pathname === '/services' ? 600 : 500,
              color: pathname === '/services' ? 'var(--accent)' : 'var(--muted)',
              background: pathname === '/services' ? 'var(--accent-bg)' : 'transparent',
              border: `1.5px solid ${pathname === '/services' ? 'var(--accent-border)' : 'transparent'}`,
              transition: 'all 0.15s',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (pathname !== '/services') { (e.currentTarget as HTMLElement).style.color = 'var(--navy)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; } }}
              onMouseLeave={e => { if (pathname !== '/services') { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
            >
              Services
            </Link>

            {/* About Link */}
            <Link href="/about" style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.875rem',
              fontWeight: pathname === '/about' ? 600 : 500,
              color: pathname === '/about' ? 'var(--accent)' : 'var(--muted)',
              background: pathname === '/about' ? 'var(--accent-bg)' : 'transparent',
              border: `1.5px solid ${pathname === '/about' ? 'var(--accent-border)' : 'transparent'}`,
              transition: 'all 0.15s',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (pathname !== '/about') { (e.currentTarget as HTMLElement).style.color = 'var(--navy)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; } }}
              onMouseLeave={e => { if (pathname !== '/about') { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
            >
              About
            </Link>
          </div>

          {/* ── CTA + hamburger ──────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

            <Link href="/contact" className="btn btn-blue hidden xl:inline-flex" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem' }}>
              Get a Quote
            </Link>
            <button
              className="flex xl:hidden"
              onClick={() => setOpen(v => !v)}
              style={{
                width: 40, height: 40, borderRadius: 'var(--radius)',
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--navy)',
                boxShadow: 'var(--shadow-xs)',
              }}
              aria-label="Toggle menu"
            >
              {open ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ─────────────────────────────────────── */}
      <>
        {/* Overlay */}
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(13,27,42,0.4)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'opacity 0.25s',
        }} />

        {/* Panel */}
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 999,
          width: 'min(300px,85vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.375rem',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
          boxShadow: '-8px 0 32px rgba(13,27,42,0.12)',
        }}>
          {/* header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy)' }}>Navigation</span>
            <button onClick={() => setOpen(false)} style={{
              width: 34, height: 34, borderRadius: 'var(--radius)', border: '1.5px solid var(--border)',
              background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={16} color="var(--muted)" />
            </button>
          </div>

          {/* Home Link */}
          <Link href="/" style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
            fontSize: '0.9375rem', fontWeight: pathname === '/' ? 600 : 500,
            color: pathname === '/' ? 'var(--accent)' : 'var(--navy)',
            background: pathname === '/' ? 'var(--accent-bg)' : 'transparent',
            border: `1.5px solid ${pathname === '/' ? 'var(--accent-border)' : 'transparent'}`,
            transition: 'all 0.15s',
          }}>
            Home
          </Link>

          {/* Collapsible Solutions Link Group */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => setMobileSolutionsOpen(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.9375rem',
                fontWeight: isSolutionsActive ? 600 : 500,
                color: isSolutionsActive ? 'var(--accent)' : 'var(--navy)',
                background: isSolutionsActive && !mobileSolutionsOpen ? 'var(--accent-bg)' : 'transparent',
                border: '1.5px solid transparent',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <span>Solutions</span>
              <ChevronDown size={16} style={{
                transform: mobileSolutionsOpen ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
                color: isSolutionsActive ? 'var(--accent)' : 'var(--muted)',
              }} />
            </button>

            <div style={{
              maxHeight: mobileSolutionsOpen ? '500px' : '0px',
              overflow: 'hidden',
              transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              paddingLeft: '0.75rem',
              borderLeft: '1.5px solid var(--border)',
              marginLeft: '1.75rem',
              marginTop: '0.25rem',
              gap: '0.25rem',
            }}>
              {SOLUTIONS.map(item => {
                const Icon = item.icon;
                const itemActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.875rem',
                      fontWeight: itemActive ? 600 : 500,
                      color: itemActive ? 'var(--accent)' : 'var(--muted)',
                      background: itemActive ? 'var(--accent-bg)' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Services Link */}
          <Link href="/services" style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
            fontSize: '0.9375rem', fontWeight: pathname === '/services' ? 600 : 500,
            color: pathname === '/services' ? 'var(--accent)' : 'var(--navy)',
            background: pathname === '/services' ? 'var(--accent-bg)' : 'transparent',
            border: `1.5px solid ${pathname === '/services' ? 'var(--accent-border)' : 'transparent'}`,
            transition: 'all 0.15s',
          }}>
            Services
          </Link>

          {/* About Link */}
          <Link href="/about" style={{
            padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
            fontSize: '0.9375rem', fontWeight: pathname === '/about' ? 600 : 500,
            color: pathname === '/about' ? 'var(--accent)' : 'var(--navy)',
            background: pathname === '/about' ? 'var(--accent-bg)' : 'transparent',
            border: `1.5px solid ${pathname === '/about' ? 'var(--accent-border)' : 'transparent'}`,
            transition: 'all 0.15s',
          }}>
            About
          </Link>

          <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <Link href="/contact" className="btn btn-blue" style={{ width: '100%', justifyContent: 'center' }}>
              Get a Quote
            </Link>
          </div>
        </div>
      </>

      {/* Spacer */}
      <div style={{ height: 68 }} />
    </>
  );
}
