import type { Metadata } from 'next';
import { Space_Grotesk, Playfair_Display } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/cart/CartContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-grotesk',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const playfairDisplay = Playfair_Display({
  variable: '--font-serif',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700', '800'],
});

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
      className={`${spaceGrotesk.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#EFE7DC] text-[#F0301A] font-display-grotesk selection:bg-[#F0301A] selection:text-[#EFE7DC]"
      >
        <CartProvider>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
