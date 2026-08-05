'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MOCK_PRODUCTS, CATEGORIES } from '@/lib/mock-data';
import { ProductCard } from '@/components/ui/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionLink } from '@/components/ui/Button';

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'ALL';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      // Category filter
      if (selectedCategory !== 'ALL' && product.category !== selectedCategory) {
        return false;
      }
      // Availability filter
      if (inStockOnly && !product.inStock) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesSpecimen = product.specimenNo.toLowerCase().includes(query);
        const matchesCategory = product.category.toLowerCase().includes(query);
        if (!matchesName && !matchesSpecimen && !matchesCategory) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      return 0; // featured default order
    });
  }, [selectedCategory, inStockOnly, sortBy, searchQuery]);

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      {/* Header section */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-widest text-[#F0301A]">
            ● CATALOGUE / {selectedCategory}
          </span>
          <span className="text-xs uppercase font-bold tracking-widest text-[#F0301A]">
            {filteredProducts.length} SPECIMENS FOUND
          </span>
        </div>

        <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl md:text-7xl uppercase tracking-tighter">
          FULL CATALOGUE
        </h1>
        <div className="hairline-b pb-4" />
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-6 border-b border-[#F0301A]/20">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#F0301A] text-[#EFE7DC]'
                    : 'bg-transparent text-[#F0301A] hover:bg-[#F0301A]/10'
                }`}
              >
                {category === 'ALL' ? 'ALL SPECIMENS' : category}
              </button>
            );
          })}
        </div>

        {/* Controls: Search, Stock filter, Sort */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider">
          {/* Search Input */}
          <div className="relative flex-grow sm:flex-grow-0">
            <input
              type="text"
              placeholder="SEARCH SPECIMEN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border border-[#F0301A] text-[#F0301A] placeholder-[#F0301A]/50 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#F0301A] w-full sm:w-48 font-display-grotesk"
            />
          </div>

          {/* In-Stock Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="accent-[#F0301A] w-4 h-4 cursor-pointer"
            />
            <span>IN STOCK ONLY</span>
          </label>

          {/* Sort Select */}
          <div className="flex items-center gap-2">
            <span>SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#EFE7DC] border border-[#F0301A] text-[#F0301A] px-2 py-1.5 focus:outline-none cursor-pointer font-display-grotesk font-bold"
            >
              <option value="featured">FEATURED</option>
              <option value="price-asc">PRICE: LOW TO HIGH</option>
              <option value="price-desc">PRICE: HIGH TO LOW</option>
              <option value="newest">NEWEST FIRST</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid or Empty State */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
          {filteredProducts.map((product, index) => {
            // Apply asymmetric spans for continuous visual rhythm
            const isHeroTile = index % 7 === 0;
            return (
              <div
                key={product.id}
                className={isHeroTile ? 'sm:col-span-2 lg:col-span-2' : ''}
              >
                <ProductCard
                  product={product}
                  aspectRatio={isHeroTile ? 'landscape' : 'square'}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="NO SPECIMENS FOUND"
          description="We couldn't find any items matching your active category or search filter criteria."
          actionText="CLEAR FILTERS ↗"
          actionHref="/shop"
        />
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold">LOADING CATALOGUE...</div>}>
      <ShopContent />
    </Suspense>
  );
}
