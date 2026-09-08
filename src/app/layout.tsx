import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Forklift Tracker',
  description: 'Enterprise fleet management and tracking.',
  robots: 'noindex, nofollow', // Section 25: internal tool, stay out of search engines
};

export const viewport: Viewport = {
  themeColor: '#1e40af', // matches bg-primary / blue-800
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

