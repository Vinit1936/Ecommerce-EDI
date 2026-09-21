'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { CartProvider } from '@/components/cart/CartContext';

/**
 * Client providers. SessionProvider has to wrap CartProvider, because the cart
 * switches between its localStorage and database backends based on session
 * status.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>{children}</CartProvider>
    </SessionProvider>
  );
}
