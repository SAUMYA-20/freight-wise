'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, ChevronRight, X, Loader2, Tag,
  Camera, Upload, Sparkles, CheckCircle2,
  AlertCircle, ScanLine, Package, ZoomIn,
} from 'lucide-react';
import Link from 'next/link';

/* ─────────────────────────────── Types ─────────────────────────────── */
interface HSCode {
  hsn4Digit: string;
  hsn8Digit: string;
  productName: string;
  gstRate?: string;
}

interface ScanIdentification {
  identified_item: string;
  search_keywords: string[];
  confidence: number;
  description: string;
  isFallback?: boolean;
}

interface ScanResult {
  success: boolean;
  identification: ScanIdentification;
  matches: HSCode[];
  matchCount: number;
}

type ActiveTab = 'search' | 'scan';
type ScanPhase = 'idle' | 'uploading' | 'scanning' | 'done' | 'error';

/* ─────────────────────────── Scan Phase Label ──────────────────────── */
function scanPhaseLabel(phase: ScanPhase) {
  switch (phase) {
    case 'uploading': return 'Uploading image…';
    case 'scanning':  return 'AI analysing your product…';
    case 'done':      return 'Scan complete!';
    case 'error':     return 'Scan failed';
    default:          return '';
  }
}

/* ──────────────────────────── Confidence Bar ───────────────────────── */
function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`, background: color,
          borderRadius: 3, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
        }} />
      </div>
      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color, minWidth: 36 }}>{value}%</span>
    </div>
  );
}

/* ══════════════════════════════ Main Page ══════════════════════════════ */
export default function HSCodesPage() {
  /* ── Text Search state ── */
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<HSCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');

  /* ── Scan state ── */
  const [scanPhase, setScanPhase]       = useState<ScanPhase>('idle');
  const [scanResult, setScanResult]     = useState<ScanResult | null>(null);
  const [scanError, setScanError]       = useState('');
  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);
  const [dragging, setDragging]         = useState(false);
  const [scannerTop, setScannerTop]     = useState(0);
  const [geminiOk, setGeminiOk]         = useState<boolean | null>(null);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const animFrameRef   = useRef<number | null>(null);
  const scanStartRef   = useRef<number>(0);

  /* ── Check backend health on mount ── */
  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
    fetch(`${baseUrl}/api/hs-scan/health`)
      .then(r => r.json())
      .then(d => setGeminiOk(d.geminiAvailable))
      .catch(() => setGeminiOk(false));
  }, []);

  /* ── Text search debounce ── */
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        setLoading(true); setError('');
        const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
        const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.results || []);
      } catch { setError('Failed to fetch results.'); }
      finally  { setLoading(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  /* ── Laser animation ── */
  const runScanAnimation = useCallback(() => {
    const DURATION = 1800; // ms per sweep
    const step = (now: number) => {
      const elapsed  = (now - scanStartRef.current) % DURATION;
      const progress = elapsed / DURATION;
      setScannerTop(progress * 100);
      animFrameRef.current = requestAnimationFrame(step);
    };
    scanStartRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  const stopScanAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  /* ── Process uploaded file ── */
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanError('Please upload an image file (JPEG, PNG, WebP).'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setScanError('Image is too large. Max 10 MB.'); return;
    }

    // Preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanResult(null);
    setScanError('');
    setScanPhase('uploading');

    // Build FormData
    const form = new FormData();
    form.append('image', file);

    // Short delay so "uploading" phase is visible
    await new Promise(r => setTimeout(r, 600));
    setScanPhase('scanning');
    runScanAnimation();

    try {
      const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
      const res = await fetch(`${baseUrl}/api/hs-scan/identify`, {
        method: 'POST',
        body: form,
      });
      const data: ScanResult = await res.json();

      if (!res.ok || !data.success) {
        throw new Error((data as unknown as { error: string }).error || 'Scan failed');
      }

      stopScanAnimation();
      setScanPhase('done');
      setScanResult(data);
    } catch (err: unknown) {
      stopScanAnimation();
      setScanPhase('error');
      setScanError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [runScanAnimation, stopScanAnimation]);

  /* ── Drag events ── */
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const resetScan = () => {
    stopScanAnimation();
    setScanPhase('idle');
    setScanResult(null);
    setScanError('');
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ════════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <div style={{ minHeight: '80vh', background: 'var(--bg)' }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="container">
          <div className="animate-fadeUp">
            <div className="label">Product Search</div>
          </div>
          <h1 className="animate-fadeUp delay-1" style={{ marginBottom: '0.875rem' }}>
            Global Trade Database
          </h1>
          <p className="animate-fadeUp delay-2" style={{ maxWidth: 520, fontSize: '1.0625rem', marginBottom: '1.75rem' }}>
            Search any product or <strong>scan its image</strong> to find its official HS code,
            compliance rules, and freight costs.
          </p>

          {/* ── Tab switcher ── */}
          <div className="animate-fadeUp delay-3" style={{
            display: 'inline-flex', background: 'var(--surface)',
            border: '1.5px solid var(--border)', borderRadius: 'var(--radius-pill)',
            padding: '0.3rem', gap: '0.25rem', boxShadow: 'var(--shadow-sm)',
          }}>
            {(['search', 'scan'] as ActiveTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-pill)',
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: activeTab === tab ? 'var(--accent)' : 'transparent',
                  color:      activeTab === tab ? '#fff' : 'var(--muted)',
                  boxShadow:  activeTab === tab ? 'var(--shadow-accent)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'search' ? <Search size={15} /> : <Camera size={15} />}
                {tab === 'search' ? 'Text Search' : 'Image Scan'}
                {tab === 'scan' && (
                  <span style={{
                    background: 'rgba(255,255,255,0.25)', borderRadius: 'var(--radius-pill)',
                    fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem',
                    letterSpacing: '0.04em',
                  }}>AI</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ TEXT SEARCH TAB ══════════ */}
      {activeTab === 'search' && (
        <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 800 }}>

          {/* Search bar */}
          <div style={{
            display: 'flex', background: 'var(--surface)',
            border: '2px solid var(--border)', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', maxWidth: 580, boxShadow: 'var(--shadow)',
            marginBottom: '1.5rem', transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
            onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 4px rgba(0,102,255,0.1), var(--shadow)'; }}
            onBlurCapture={e =>  { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
              {loading
                ? <Loader2 size={17} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                : <Search size={17} color="var(--muted)" />
              }
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by product name (e.g. potato, laptop, ceramic)..."
              style={{
                flex: 1, padding: '0.9375rem 0', border: 'none',
                background: 'transparent', outline: 'none',
                fontSize: '0.9375rem', fontFamily: 'Inter, sans-serif', color: 'var(--navy)',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0 1rem', color: 'var(--muted)', display: 'flex', alignItems: 'center',
              }}>
                <X size={16} />
              </button>
            )}
          </div>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</div>}

          {/* Result count */}
          {query && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={13} />
              <strong style={{ color: 'var(--navy)' }}>{results.length}</strong> result{results.length !== 1 ? 's' : ''} found
            </div>
          )}

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!query ? (
              <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--muted)' }}>
                <Search size={36} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Start searching to find products.</p>
                <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem' }}>Our AI handles synonyms, so just type naturally.</p>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="card" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--muted)' }}>
                <Search size={36} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No products match your search.</p>
                <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem' }}>Try a different keyword.</p>
              </div>
            ) : results.map((item, index) => (
              <Link href={`/product/${item.hsn8Digit || item.hsn4Digit}`} key={index} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1.25rem',
                  padding: '1.25rem', width: '100%', textAlign: 'left',
                  background: 'var(--surface)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0066FF'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px #0066FF15'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}
                >
                  <span style={{
                    fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 700,
                    color: 'var(--navy)', background: 'var(--bg)',
                    padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', whiteSpace: 'nowrap', minWidth: 80, textAlign: 'center',
                  }}>
                    HS: {item.hsn8Digit || item.hsn4Digit || 'N/A'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.productName}
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--muted)" style={{ flexShrink: 0 }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ IMAGE SCAN TAB ══════════ */}
      {activeTab === 'scan' && (
        <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: 900 }}>

          {/* Gemini status banner */}
          {geminiOk === false && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1.25rem', borderRadius: 'var(--radius)',
              background: 'var(--amber-bg)', border: '1.5px solid #FDE68A',
              marginBottom: '1.5rem', fontSize: '0.875rem', color: '#92400E',
            }}>
              <AlertCircle size={16} />
              <span><strong>GEMINI_API_KEY</strong> is not set in your backend .env — scans will return a fallback response.</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: scanResult ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* ── Left: Drop Zone + Preview ─────────────────────────────── */}
            <div>
              {/* Drop zone */}
              {scanPhase === 'idle' && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-dark)'}`,
                    borderRadius: 'var(--radius-xl)',
                    padding: '3.5rem 2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragging ? 'var(--accent-bg)' : 'var(--surface)',
                    transition: 'all 0.2s',
                    boxShadow: dragging ? '0 0 0 4px rgba(0,102,255,0.1)' : 'var(--shadow-sm)',
                  }}
                >
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'var(--accent-bg)', border: '2px solid var(--accent-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.25rem', transition: 'transform 0.2s',
                    transform: dragging ? 'scale(1.1)' : 'scale(1)',
                  }}>
                    <Upload size={28} color="var(--accent)" />
                  </div>

                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--navy)' }}>
                    {dragging ? 'Drop it here!' : 'Upload Product Image'}
                  </h3>
                  <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem', color: 'var(--muted)' }}>
                    Drag &amp; drop or click to select · JPEG, PNG, WebP · Max 10 MB
                  </p>

                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-pill)',
                    background: 'var(--gradient-accent)', color: '#fff',
                    fontSize: '0.875rem', fontWeight: 600, boxShadow: 'var(--shadow-accent)',
                  }}>
                    <Sparkles size={15} />
                    Scan with AI
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>
              )}

              {/* Preview + scanner animation */}
              {previewUrl && scanPhase !== 'idle' && (
                <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Scanned product"
                    style={{ width: '100%', display: 'block', maxHeight: 380, objectFit: 'cover' }}
                  />

                  {/* Dark overlay while scanning */}
                  {scanPhase === 'scanning' && (
                    <>
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(13,27,42,0.35)',
                      }} />
                      {/* Laser line */}
                      <div style={{
                        position: 'absolute', left: 0, right: 0,
                        top: `${scannerTop}%`,
                        height: 3,
                        background: 'linear-gradient(90deg, transparent, #0066FF, #00f0ff, #0066FF, transparent)',
                        boxShadow: '0 0 12px 4px rgba(0,102,255,0.6)',
                        transition: 'none',
                      }} />
                      {/* Corner brackets */}
                      {[
                        { top: 12, left: 12, borderTop: '3px solid #0066FF', borderLeft: '3px solid #0066FF' },
                        { top: 12, right: 12, borderTop: '3px solid #0066FF', borderRight: '3px solid #0066FF' },
                        { bottom: 12, left: 12, borderBottom: '3px solid #0066FF', borderLeft: '3px solid #0066FF' },
                        { bottom: 12, right: 12, borderBottom: '3px solid #0066FF', borderRight: '3px solid #0066FF' },
                      ].map((s, i) => (
                        <div key={i} style={{ position: 'absolute', width: 22, height: 22, ...s }} />
                      ))}

                      {/* Status pill */}
                      <div style={{
                        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
                        padding: '0.45rem 1rem', borderRadius: 'var(--radius-pill)',
                        color: '#fff', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        <ScanLine size={14} style={{ animation: 'pulse 1s infinite' }} />
                        AI analysing…
                      </div>
                    </>
                  )}

                  {/* Done overlay */}
                  {scanPhase === 'done' && (
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      background: 'rgba(16,185,129,0.95)', backdropFilter: 'blur(8px)',
                      padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-pill)',
                      color: '#fff', fontSize: '0.8125rem', fontWeight: 700,
                    }}>
                      <CheckCircle2 size={14} /> Identified
                    </div>
                  )}

                  {/* Error overlay */}
                  {scanPhase === 'error' && (
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      background: 'rgba(239,68,68,0.95)', backdropFilter: 'blur(8px)',
                      padding: '0.4rem 0.875rem', borderRadius: 'var(--radius-pill)',
                      color: '#fff', fontSize: '0.8125rem', fontWeight: 700,
                    }}>
                      <AlertCircle size={14} /> Failed
                    </div>
                  )}
                </div>
              )}

              {/* Phase status bar */}
              {scanPhase !== 'idle' && (
                <div style={{
                  marginTop: '1rem', padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  background: scanPhase === 'error' ? 'var(--danger)' + '15' : scanPhase === 'done' ? '#10B98115' : 'var(--accent-bg)',
                  border: `1.5px solid ${scanPhase === 'error' ? '#FCA5A5' : scanPhase === 'done' ? '#A7F3D0' : 'var(--accent-border)'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)' }}>
                    {scanPhase === 'scanning' || scanPhase === 'uploading'
                      ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                      : scanPhase === 'done'
                        ? <CheckCircle2 size={15} color="#10B981" />
                        : <AlertCircle size={15} color="var(--danger)" />
                    }
                    {scanPhaseLabel(scanPhase)}
                  </div>
                  {(scanPhase === 'done' || scanPhase === 'error') && (
                    <button onClick={resetScan} style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      background: 'none', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--navy)',
                      padding: '0.3rem 0.75rem',
                    }}>
                      <ZoomIn size={13} /> Scan Another
                    </button>
                  )}
                </div>
              )}

              {/* Scan error message */}
              {scanPhase === 'error' && scanError && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.875rem 1rem',
                  borderRadius: 'var(--radius)', background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5', fontSize: '0.875rem', color: '#B91C1C',
                }}>
                  {scanError}
                </div>
              )}
            </div>

            {/* ── Right: Scan Results ───────────────────────────────────── */}
            {scanResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Identification card */}
                <div style={{
                  background: 'var(--surface)', border: '1.5px solid var(--accent-border)',
                  borderRadius: 'var(--radius-lg)', padding: '1.25rem',
                  boxShadow: '0 4px 20px rgba(0,102,255,0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'var(--gradient-accent)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Sparkles size={16} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy)' }}>AI Identification</span>
                    {scanResult.identification.isFallback && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700, color: '#92400E', background: 'var(--amber-bg)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', border: '1px solid #FDE68A' }}>FALLBACK</span>
                    )}
                  </div>

                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem' }}>
                    {scanResult.identification.identified_item}
                  </div>
                  <p style={{ fontSize: '0.8125rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                    {scanResult.identification.description}
                  </p>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
                      Confidence
                    </div>
                    <ConfidenceBar value={scanResult.identification.confidence} />
                  </div>

                  {/* Keywords */}
                  {scanResult.identification.search_keywords?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                        Search Keywords
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {scanResult.identification.search_keywords.map((kw, i) => (
                          <span key={i} className="badge badge-blue">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Matches */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Package size={15} color="var(--accent)" />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)' }}>
                      {scanResult.matchCount} HS Code Match{scanResult.matchCount !== 1 ? 'es' : ''} Found
                    </span>
                  </div>

                  {scanResult.matchCount === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                      <Package size={28} style={{ margin: '0 auto 0.75rem', opacity: 0.25 }} />
                      <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>No matches found in database.</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>Try the text search with a keyword.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: 380, overflowY: 'auto' }}>
                      {scanResult.matches.map((item, i) => (
                        <Link href={`/product/${item.hsn8Digit || item.hsn4Digit}`} key={i} style={{ textDecoration: 'none' }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            padding: '1rem', background: 'var(--surface)',
                            border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
                            cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)',
                          }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,102,255,0.12)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}
                          >
                            <span style={{
                              fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 700,
                              color: 'var(--accent)', background: 'var(--accent-bg)',
                              padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--accent-border)', whiteSpace: 'nowrap',
                            }}>
                              {item.hsn8Digit || item.hsn4Digit || 'N/A'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.productName}
                              </div>
                              {item.gstRate && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                                  GST: {item.gstRate}
                                </div>
                              )}
                            </div>
                            <ChevronRight size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CSS for pulse animation ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
