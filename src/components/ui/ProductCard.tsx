import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { PriceTag } from './PriceTag';
import { Badge } from './Badge';

interface ProductCardProps {
  product: Product;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  className?: string;
}

export function ProductCard({ product, aspectRatio = 'square', className = '' }: ProductCardProps) {
  const aspectClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
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
