"use client";

import React, { useState, useEffect } from 'react';
import { Search, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SearchResult {
  hsn4Digit: string;
  hsn8Digit: string;
  productName: string;
  gstRate: string;
}

export default function HSSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'standard' | 'ai'>('standard');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [geminiAvailable, setGeminiAvailable] = useState<boolean | null>(null);

  // Fetch API status on mount
  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
    fetch(`${baseUrl}/api/assistant/status`)
      .then(res => res.json())
      .then(data => setGeminiAvailable(data.geminiAvailable))
      .catch(err => {
        console.error('Failed to fetch assistant status:', err);
        setGeminiAvailable(false);
      });
  }, []);

  // Debounced search for standard mode only
  useEffect(() => {
    if (searchMode !== 'standard' || !query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
        const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch results.');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, searchMode]);

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError('');
    setAiStatus('Analyzing your shipment request...');

    try {
      // 1. Call intent parser
      const baseUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
      const parseRes = await fetch(`${baseUrl}/api/assistant/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!parseRes.ok) throw new Error('Parse failed');
      const parsed = await parseRes.json();

      setAiStatus(`Searching for: "${parsed.product}"...`);

      // 2. Search HS codes using the extracted product
      const baseUrlSearch = typeof window !== 'undefined' ? `http://${window.location.hostname}:5001` : 'http://localhost:5001';
      const searchRes = await fetch(`${baseUrlSearch}/api/search?q=${encodeURIComponent(parsed.product)}`);
      if (!searchRes.ok) throw new Error('Search failed');
      const searchData = await searchRes.json();
      const topResult = searchData.results?.[0];

      if (!topResult?.hsn8Digit) {
        setError(`No HS code found for "${parsed.product}". Try standard search.`);
        setAiStatus('');
        setLoading(false);
        return;
      }

      setAiStatus('Opening trade dashboard...');

      // 3. Navigate to product page, pre-filling destination if extracted
      const destParam = parsed.destination ? `?destination=${encodeURIComponent(parsed.destination)}` : '';
      router.push(`/product/${topResult.hsn8Digit}${destParam}`);

    } catch (err) {
      console.error(err);
      setError('AI assistant encountered an error. Please try standard search.');
      setAiStatus('');
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto 2.5rem', zIndex: 50 }}>
      {/* Tab Switcher */}
      <div style={{
        display: 'inline-flex',
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 'var(--radius-pill)',
        padding: '0.25rem',
        marginBottom: '0.75rem',
        backdropFilter: 'blur(8px)',
      }}>
        <button
          onClick={() => { setSearchMode('standard'); setQuery(''); setError(''); setIsOpen(false); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.35rem 1rem', borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            background: searchMode === 'standard' ? 'var(--accent)' : 'transparent',
            color: '#fff', transition: 'all 0.2s',
          }}
        >
          <Search size={14} />
          Standard Search
        </button>
        <button
          onClick={() => { setSearchMode('ai'); setQuery(''); setError(''); setIsOpen(false); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.35rem 1.125rem', borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer',
            background: searchMode === 'ai' ? 'var(--accent)' : 'transparent',
            color: '#fff', transition: 'all 0.2s',
          }}
        >
          <Sparkles size={14} />
          AI Logistics Assistant
        </button>
      </div>

      {/* Input */}
      <form onSubmit={searchMode === 'ai' ? handleAISubmit : (e) => e.preventDefault()}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          border: searchMode === 'ai' ? '1.5px solid rgba(0, 102, 255, 0.45)' : '1.5px solid rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.5rem 1rem',
          boxShadow: searchMode === 'ai' ? 'var(--shadow-accent)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s'
        }}>
          {searchMode === 'ai'
            ? <Sparkles color="rgba(255,255,255,0.7)" size={20} style={{ marginRight: '0.75rem' }} />
            : <Search color="rgba(255,255,255,0.7)" size={20} style={{ marginRight: '0.75rem' }} />
          }
          <input
            type="text"
            placeholder={
              searchMode === 'ai'
                ? "Try: 'I want to export leather wallets to Germany' or 'ship 50kg laptops to UAE'..."
                : "Search product (e.g. mobile phone, pumps, ceramic)..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', width: '100%', fontSize: '0.95rem', padding: '0.5rem 0'
            }}
          />
          {loading && !aiStatus && (
            <Loader2 size={20} color="rgba(255,255,255,0.7)" className="animate-spin" />
          )}
          {searchMode === 'ai' && (
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius)', padding: '0.4rem 0.875rem',
                fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                opacity: query.trim() ? 1 : 0.6, marginLeft: '0.5rem'
              }}
            >
              Ask AI <ArrowRight size={13} />
            </button>
          )}
        </div>
      </form>

      {/* Gemini status */}
      {searchMode === 'ai' && !aiStatus && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)',
          marginTop: '0.5rem', padding: '0 0.5rem',
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: geminiAvailable === null ? '#94a3b8' : (geminiAvailable ? '#10b981' : '#f59e0b'),
            transition: 'background 0.3s'
          }} />
          <span>
            {geminiAvailable === null ? 'Checking Assistant...' : (geminiAvailable ? 'Gemini API Connected' : 'Local Fallback Parser Active')}
          </span>
        </div>
      )}

      {/* AI progress */}
      {searchMode === 'ai' && aiStatus && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)',
          marginTop: '0.625rem', padding: '0 0.5rem'
        }}>
          <Loader2 size={13} color="#fff" className="animate-spin" />
          <span>{aiStatus}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fecaca', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
          fontSize: '0.8125rem', marginTop: '0.625rem', textAlign: 'left'
        }}>
          {error}
        </div>
      )}

      {/* Standard search dropdown */}
      {searchMode === 'standard' && isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem',
          background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', textAlign: 'left', maxHeight: 350, overflowY: 'auto'
        }}>
          {!loading && !error && results.length === 0 && (
            <div style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>No HS codes found for "{query}".</div>
          )}
          {results.map((r, i) => (
            <Link href={`/product/${r.hsn8Digit}`} key={i} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '1rem',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', flexDirection: 'column', gap: '0.25rem', cursor: 'pointer'
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.9375rem' }}>{r.productName}</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                  <strong style={{ color: '#4b5563' }}>HS Code:</strong> {r.hsn8Digit || r.hsn4Digit}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
