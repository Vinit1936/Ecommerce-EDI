'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../cart/CartContext';

export function Header() {
  const pathname = usePathname();
  const { totalItemsCount } = useCart();

  const isShopActive = pathname === '/shop' || pathname.startsWith('/product/');
  const isBagActive = pathname === '/cart';

  return (
    <header className="sticky top-0 z-50 bg-[#EFE7DC] hairline-b text-[#F0301A]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between font-display-grotesk font-bold">
        {/* Left: Brand Mark */}
        <Link href="/" className="text-2xl md:text-3xl font-black tracking-tighter hover:opacity-80">
          ++
        </Link>

        {/* Center-Right: Navigation */}
        <nav className="flex items-center gap-6 md:gap-10 text-sm md:text-base uppercase tracking-wider">
          <Link
            href="/shop"
            className={`relative py-1 hover:opacity-85 ${
              isShopActive ? 'border-b-2 border-[#F0301A]' : ''
            }`}
          >
            Shop
          </Link>
          <Link
            href="/cart"
            className={`relative py-1 hover:opacity-85 ${
              isBagActive ? 'border-b-2 border-[#F0301A]' : ''
            }`}
          >
            Bag ({totalItemsCount})
          </Link>
          <Link
            href="/login"
            className={`relative py-1 hover:opacity-85 hidden sm:inline-block ${
              pathname === '/login' ? 'border-b-2 border-[#F0301A]' : ''
            }`}
          >
            Account
          </Link>
        </nav>

        {/* Far Right: Constant Brand Sign-off Three-Dot Mark */}
        <div className="flex items-center gap-1.5 select-none" aria-label="Brand mark">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0A0A0A]" title="Black Dot" />
          <span className="w-2.5 h-2.5 rounded-full border border-[#F0301A] bg-transparent" title="Outline Dot" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#F0301A]" title="Red Dot" />
        </div>
      </div>
    </header>
  );
}
