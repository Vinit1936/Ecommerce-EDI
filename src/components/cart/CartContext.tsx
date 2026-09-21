'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Product } from '@/lib/types';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSize?: string, selectedColor?: string) => void;
  removeFromCart: (productId: string, selectedSize?: string, selectedColor?: string) => void;
  updateQuantity: (productId: string, quantity: number, selectedSize?: string, selectedColor?: string) => void;
  clearCart: () => void;
  refresh: () => Promise<void>;
  totalItemsCount: number;
  subtotal: number;
  /** True once the initial load (guest or server) has settled. */
  isLoaded: boolean;
  /** True while a server write is in flight. */
  isSyncing: boolean;
  isSignedIn: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'hh_ecommerce_cart_v1';

function readGuestCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Cart state with two backends.
 *
 * Signed out, the cart lives in localStorage exactly as before, so visitors can
 * shop without an account. Signed in, the `carts` table is authoritative: every
 * mutation goes to /api/cart and the response replaces local state, which is
 * what lets a cart survive a refresh or a different device.
 *
 * At sign-in, whatever the guest accumulated is merged into the database cart
 * rather than discarded.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isSignedIn = status === 'authenticated';

  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  /** Pulls the authoritative cart from the server. */
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();
      if (data.success) setItems(data.data.items);
    } catch {
      /* offline — keep whatever is on screen */
    }
  }, []);

  // Guest cart: load once from localStorage. localStorage does not exist
  // during server rendering, so this genuinely cannot be lazy initial state —
  // doing so would desynchronise the server and client HTML. Runs once per
  // session-status change, so there is no cascading-render risk here.
  useEffect(() => {
    if (status === 'loading' || isSignedIn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readGuestCart());
    setIsLoaded(true);
  }, [status, isSignedIn]);

  // Signed in: merge anything from the guest cart, then adopt the server cart.
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    (async () => {
      const guest = readGuestCart();
      try {
        if (guest.length > 0) {
          await fetch('/api/cart', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              merge: guest.map((i) => ({
                productId: i.product.id,
                quantity: i.quantity,
                selectedSize: i.selectedSize,
                selectedColor: i.selectedColor,
              })),
            }),
          });
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
        if (!cancelled) await refresh();
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, refresh]);

  // Guest cart persistence. The server cart must never be mirrored here, or a
  // stale copy would be merged back in at the next sign-in.
  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* quota or private mode — the cart simply will not persist */
    }
  }, [items, isLoaded, isSignedIn]);

  /** Sends a cart mutation and adopts the server's response as the new state. */
  const sync = useCallback(async (input: RequestInfo, init?: RequestInit) => {
    setIsSyncing(true);
    try {
      const res = await fetch(input, init);
      const data = await res.json();
      if (data.success) setItems(data.data.items);
    } catch {
      /* leave optimistic state in place */
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const addToCart = useCallback(
    (product: Product, quantity = 1, selectedSize?: string, selectedColor?: string) => {
      // Applied locally first either way, so the UI responds immediately.
      setItems((prev) => {
        const i = prev.findIndex(
          (item) =>
            item.product.id === product.id &&
            item.selectedSize === selectedSize &&
            item.selectedColor === selectedColor
        );
        if (i > -1) {
          const updated = [...prev];
          updated[i] = { ...updated[i], quantity: updated[i].quantity + quantity };
          return updated;
        }
        return [...prev, { product, quantity, selectedSize, selectedColor }];
      });

      if (isSignedIn) {
        void sync('/api/cart', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: product.id, quantity, selectedSize, selectedColor }),
        });
      }
    },
    [isSignedIn, sync]
  );

  const removeFromCart = useCallback(
    (productId: string, selectedSize?: string, selectedColor?: string) => {
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(
              item.product.id === productId &&
              item.selectedSize === selectedSize &&
              item.selectedColor === selectedColor
            )
        )
      );

      if (isSignedIn) {
        const params = new URLSearchParams({ productId });
        if (selectedSize) params.set('size', selectedSize);
        if (selectedColor) params.set('color', selectedColor);
        void sync(`/api/cart?${params.toString()}`, { method: 'DELETE' });
      }
    },
    [isSignedIn, sync]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number, selectedSize?: string, selectedColor?: string) => {
      if (quantity <= 0) {
        removeFromCart(productId, selectedSize, selectedColor);
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.product.id === productId &&
          item.selectedSize === selectedSize &&
          item.selectedColor === selectedColor
            ? { ...item, quantity }
            : item
        )
      );

      if (isSignedIn) {
        void sync('/api/cart', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId, quantity, selectedSize, selectedColor }),
        });
      }
    },
    [isSignedIn, removeFromCart, sync]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (isSignedIn) void sync('/api/cart', { method: 'DELETE' });
  }, [isSignedIn, sync]);

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refresh,
        totalItemsCount,
        subtotal,
        isLoaded,
        isSyncing,
        isSignedIn,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
