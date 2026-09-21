import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '32+ | STAYS OF 32 NIGHTS OR MORE',
  description: 'Furnished homes for temporary stays.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
