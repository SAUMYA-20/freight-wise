import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s | FreightWise — Global Logistics',
    default: 'FreightWise — Global Logistics & Supply Chain',
  },
  description:
    'End-to-end supply chain solutions. HS code lookup, cost & duty calculator, freight management, and real-time tracking — all in one platform.',
  keywords: ['logistics', 'supply chain', 'HS codes', 'freight', 'customs', 'shipping', 'duty calculator'],
  openGraph: {
    title: 'FreightWise — Global Logistics',
    description: 'From concept to delivery — your complete logistics partner.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
