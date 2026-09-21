import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '32+ | STAYS OF 32+ NIGHTS',
  description: 'STAYS OF 32+ NIGHTS',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
