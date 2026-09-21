'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import type { Product } from '@/lib/types';
import { PriceTag } from './PriceTag';
import { Badge } from './Badge';

interface ProductCardProps {
  product: Product;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  className?: string;
  initialInWishlist?: boolean;
}

export function ProductCard({
  product,
  aspectRatio = 'square',
  className = '',
  initialInWishlist = false,
}: ProductCardProps) {
  const { data: session } = useSession();
  const [inWishlist, setInWishlist] = useState<boolean>(initialInWishlist);
  const [loading, setLoading] = useState<boolean>(false);

  const aspectClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      alert('Please sign in to save items to your wishlist.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (data.success) {
        setInWishlist(data.data.inWishlist);
      }
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link href={`/product/${product.slug}`} className={`group block text-[#F0301A] ${className}`}>
      {/* Photo container: edge to edge, square cropped, zero radius, no border/shadow */}
      <div className={`relative w-full overflow-hidden bg-[#FFFFFF] ${aspectClasses[aspectRatio]}`}>
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top-left Badges */}
        {!product.inStock && (
          <div className="absolute top-3 left-3 bg-[#EFE7DC]/90 px-2 py-1">
            <Badge label="SOLD OUT" variant="status" />
          </div>
        )}
        {product.isSale && product.inStock && (
          <div className="absolute top-3 left-3 bg-[#EFE7DC]/90 px-2 py-1">
            <Badge label="SALE" variant="sale" />
          </div>
        )}

        {/* Top-right Wishlist Heart Button */}
        <button
          onClick={handleWishlistToggle}
          disabled={loading}
          className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-[#EFE7DC]/90 text-sm font-bold transition-transform hover:scale-110 cursor-pointer ${
            inWishlist ? 'text-[#F0301A]' : 'text-[#F0301A]/50 hover:text-[#F0301A]'
          }`}
          title={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-label="Wishlist toggle"
        >
          {inWishlist ? '♥' : '♡'}
        </button>
      </div>

      {/* Info row: name left, price right */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="font-display-grotesk font-bold text-sm md:text-base uppercase tracking-tight line-clamp-1 group-hover:opacity-85">
          {product.name}
        </h3>
        <PriceTag price={product.price} originalPrice={product.originalPrice} size="sm" />
      </div>

      {/* Category tag directly below name/price line */}
      <div className="mt-1">
        <Badge label={product.category} variant="category" />
      </div>
    </Link>
  );
}
