'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { PriceTag } from '@/components/ui/PriceTag';
import { Badge } from '@/components/ui/Badge';
import { useCart } from '@/components/cart/CartContext';
import type { Product } from '@/lib/types';

interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: Product;
}

export default function WishlistPage() {
  const { status } = useSession();
  const { addToCart } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/wishlist');
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items);
      }
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWishlist();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status]);

  const handleRemove = async (productId: string) => {
    try {
      const res = await fetch(`/api/wishlist?productId=${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((i) => i.productId !== productId));
      }
    } catch {
      /* fallback */
    }
  };

  const handleMoveToBag = (product: Product) => {
    addToCart(product, 1);
    setToastMessage(`Added ${product.name} to bag!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 py-20 text-center font-display-grotesk font-bold uppercase tracking-widest text-sm">
        LOADING ARCHIVED SPECIMENS...
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen text-[#F0301A] max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <h1 className="font-display-grotesk font-black text-3xl sm:text-4xl uppercase tracking-tight">
          WISHLIST BOOKMARKS
        </h1>
        <p className="font-sans text-sm text-[#161412]/80 max-w-md mx-auto">
          Please sign in to view and synchronize your saved wishlist specimens across devices.
        </p>
        <div>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-[#F0301A] text-[#EFE7DC] font-display-grotesk font-bold text-xs uppercase tracking-widest hover:opacity-90"
          >
            SIGN IN / REGISTER ↗
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="border-b border-[#F0301A]/30 pb-6 mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display-grotesk font-black text-3xl sm:text-4xl uppercase tracking-tight">
            SAVED SPECIMENS ({items.length})
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[#F0301A]/70 mt-1">
            CURATED ARCHIVE OF BOOKMARKED GOODS
          </p>
        </div>
        <Link
          href="/shop"
          className="text-xs uppercase font-bold tracking-widest hover:underline"
        >
          CONTINUE BROWSING ↗
        </Link>
      </div>

      {/* Feedback Toast */}
      {toastMessage && (
        <div className="mb-6 p-3 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase tracking-wider flex items-center justify-between">
          <span>● {toastMessage}</span>
          <Link href="/cart" className="underline hover:opacity-80">
            VIEW BAG ↗
          </Link>
        </div>
      )}

      {/* Wishlist Grid */}
      {items.length === 0 ? (
        <div className="p-16 border border-[#F0301A]/30 text-center space-y-4">
          <div className="text-4xl font-light text-[#F0301A]/40">♡</div>
          <h2 className="font-display-grotesk font-bold text-lg uppercase tracking-wider">
            YOUR WISHLIST IS CURRENTLY EMPTY
          </h2>
          <p className="font-sans text-xs text-[#161412]/70 max-w-sm mx-auto">
            Bookmark items from the shop catalogue to track availability and quickly move them to your bag.
          </p>
          <div className="pt-2">
            <Link
              href="/shop"
              className="inline-block px-6 py-2.5 bg-[#F0301A] text-[#EFE7DC] font-display-grotesk font-bold text-xs uppercase tracking-widest hover:opacity-90"
            >
              EXPLORE SHOP ↗
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map(({ product }) => (
            <div
              key={product.id}
              className="group border border-[#F0301A]/30 bg-[#FFFFFF] flex flex-col justify-between"
            >
              <div>
                {/* Photo */}
                <Link href={`/product/${product.slug}`} className="block relative aspect-square bg-[#FFFFFF] overflow-hidden">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  {!product.inStock && (
                    <div className="absolute top-3 left-3 bg-[#EFE7DC]/90 px-2 py-1">
                      <Badge label="SOLD OUT" variant="status" />
                    </div>
                  )}
                </Link>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge label={product.category} variant="category" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#F0301A]/70">
                      {product.brand}
                    </span>
                  </div>

                  <Link href={`/product/${product.slug}`} className="block">
                    <h3 className="font-display-grotesk font-bold text-sm uppercase tracking-tight line-clamp-1 group-hover:opacity-80">
                      {product.name}
                    </h3>
                  </Link>

                  <div>
                    <PriceTag price={product.price} originalPrice={product.originalPrice} size="sm" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 space-y-2">
                <button
                  onClick={() => handleMoveToBag(product)}
                  disabled={!product.inStock}
                  className="w-full py-2 bg-[#F0301A] text-[#EFE7DC] font-display-grotesk font-bold text-xs uppercase tracking-wider hover:opacity-90 cursor-pointer disabled:opacity-40"
                >
                  {product.inStock ? 'MOVE TO BAG ↗' : 'OUT OF STOCK'}
                </button>
                <button
                  onClick={() => handleRemove(product.id)}
                  className="w-full py-1.5 bg-transparent border border-[#F0301A]/30 text-[#F0301A] font-display-grotesk font-bold text-[11px] uppercase tracking-wider hover:bg-[#F0301A]/10 cursor-pointer"
                >
                  REMOVE ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
