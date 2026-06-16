export function getBackendUrl(): string {
  // If the NEXT_PUBLIC_BACKEND_URL is explicitly set, use it.
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }

  // Client-side environment check
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Check if we are on a remote deployment (not localhost, 127.0.0.1, or local network IPs)
    if (
      hostname &&
      !hostname.includes('localhost') &&
      !hostname.includes('127.0.0.1') &&
      !hostname.startsWith('192.168.') &&
      !hostname.startsWith('10.') &&
      !hostname.startsWith('172.')
    ) {
      return 'https://freight-wise-jksh.vercel.app';
    }

    // If we are on a local network IP (e.g. testing from mobile), use the same host but on backend port 5001
    if (
      hostname &&
      (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.'))
    ) {
      return `http://${hostname}:5001`;
    }
  }

  // Server-side (SSR / Next.js API route proxies) checks
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return 'https://freight-wise-jksh.vercel.app';
  }

  return 'http://localhost:5001';
}
