import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: '++ HELLOHELLO — EDITORIAL ECOMMERCE ARCHIVE',
  description: 'Streetwear and brutalist objects catalogue. Made to be worn. Or judged. Or both.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#EFE7DC] text-[#F0301A] font-display-grotesk selection:bg-[#F0301A] selection:text-[#EFE7DC]"
      >
        <Providers>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
