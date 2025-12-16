import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/shared/Header';

export const metadata: Metadata = {
  title: 'Shop Manager',
  description: 'Workflow automation tool for embroidery pattern creators',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}

