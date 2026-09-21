import React from 'react';
import Link from 'next/link';
import { getFeaturedProducts, listProducts, listCategoryNames } from '@/lib/products';
import { ProductCard } from '@/components/ui/ProductCard';
import { ActionLink } from '@/components/ui/Button';
import { Colophon } from '@/components/layout/Colophon';

export default async function HomePage() {
  const [featuredProducts, apparel, CATEGORIES] = await Promise.all([
    getFeaturedProducts(7),
    listProducts({ category: 'APPAREL', limit: 4 }),
    listCategoryNames(),
  ]);
  const apparelProducts = apparel.products;

  return (
    <div className="min-h-screen text-[#F0301A]">
      {/* Hero Section — Editorial Brutalist Presentation */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-12">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#F0301A]">
              ● EDITION 2026 / MONTEVIDEO
            </span>
            <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#F0301A]">
              01 — 12 SPECIMENS
            </span>
          </div>

          {/* Massive Display Grotesk Headline */}
          <h1 className="font-display-grotesk font-black text-5xl sm:text-7xl md:text-8xl lg:text-9xl uppercase tracking-tighter leading-[0.85] text-[#F0301A]">
            NEW<br />SPECIMENS
          </h1>

          <div className="hairline-b pb-8 pt-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <p className="font-sans text-sm md:text-base text-[#161412] max-w-xl leading-relaxed">
              Strictly engineered streetwear, technical carry, and brutalist physical objects.
              No artificial fluff, no decorative fillers. Photography and structure carry the catalogue.
            </p>
            <div>
              <ActionLink href="/shop" size="lg">
                EXPLORE CATALOGUE
              </ActionLink>
            </div>
          </div>
        </div>
      </section>

      {/* Category Navigation Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center justify-between border-b border-[#F0301A]/30 pb-3 overflow-x-auto gap-6 no-scrollbar">
          <div className="flex items-center gap-6 text-sm font-bold uppercase tracking-wider">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/shop?category=${cat}`}
                className="whitespace-nowrap hover:opacity-75 transition-opacity"
              >
                {cat === 'ALL' ? '● ALL SPECIMENS' : cat}
              </Link>
            ))}
          </div>
          <Link href="/shop" className="text-xs uppercase font-bold text-[#F0301A] hover:underline whitespace-nowrap">
            VIEW ALL ↗
          </Link>
        </div>
      </section>

      {/* Asymmetric Product Grid — Mixing 2-up hero tiles with smaller cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display-grotesk font-black text-2xl md:text-3xl uppercase tracking-tight">
            FEATURED CURATION
          </h2>
          <span className="text-xs uppercase font-bold text-[#F0301A]">
            {String(featuredProducts.length).padStart(2, '0')} ITEMS
          </span>
        </div>

        {/* Asymmetric Editorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 gap-x-6">
          {/* Tile 1: Hero Large Tile (Spans 8 cols on desktop) */}
          {featuredProducts[0] && (
            <div className="md:col-span-8">
              <ProductCard product={featuredProducts[0]} aspectRatio="landscape" />
            </div>
          )}

          {/* Tile 2: Side Vertical Tile (Spans 4 cols on desktop) */}
          {featuredProducts[1] && (
            <div className="md:col-span-4">
              <ProductCard product={featuredProducts[1]} aspectRatio="portrait" />
            </div>
          )}

          {/* Tile 3, 4, 5: 3-Column Row (4 cols each) */}
          {featuredProducts.slice(2, 5).map((product) => (
            <div key={product.id} className="md:col-span-4">
              <ProductCard product={product} aspectRatio="square" />
            </div>
          ))}

          {/* Tile 6 & 7: 2-Column Row (6 cols each) */}
          {featuredProducts.slice(5, 7).map((product) => (
            <div key={product.id} className="md:col-span-6">
              <ProductCard product={product} aspectRatio="landscape" />
            </div>
          ))}
        </div>
      </section>

      {/* Apparel Collection Highlights */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-16">
        <div className="hairline-t pt-8 mb-6 flex items-center justify-between">
          <h2 className="font-display-grotesk font-black text-2xl md:text-3xl uppercase tracking-tight">
            ● APPAREL SPECIMENS
          </h2>
          <ActionLink href="/shop?category=APPAREL" size="sm">
            SEE ALL APPAREL
          </ActionLink>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {apparelProducts.map((product) => (
            <ProductCard key={product.id} product={product} aspectRatio="square" />
          ))}
        </div>
      </section>

      {/* Colophon Statement Band */}
      <Colophon />
    </div>
  );
}
