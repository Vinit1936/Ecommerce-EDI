'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/cart/CartContext';
import { PriceTag } from '@/components/ui/PriceTag';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ActionLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, subtotal, totalItemsCount, clearCart } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl uppercase tracking-tighter mb-4">
          YOUR BAG
        </h1>
        <div className="hairline-b mb-8" />
        <EmptyState
          title="YOUR BAG IS EMPTY"
          description="You haven't selected any specimens yet. Explore the catalogue to add items to your bag."
          actionText="EXPLORE SPECIMENS ↗"
          actionHref="/shop"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      {/* Page Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl md:text-7xl uppercase tracking-tighter">
          YOUR BAG
        </h1>
        <span className="text-sm font-bold uppercase tracking-wider">
          {totalItemsCount} {totalItemsCount === 1 ? 'ITEM' : 'ITEMS'}
        </span>
      </div>
      <div className="hairline-b mb-8" />

      {/* Cart Grid: Left Items List, Right Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Cart Line Items */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#F0301A]/70 pb-2 border-b border-[#F0301A]/20">
            <span>SELECTED ITEMS</span>
            <button
              onClick={clearCart}
              className="hover:underline cursor-pointer bg-transparent border-0 text-[#F0301A]"
            >
              CLEAR BAG
            </button>
          </div>

          {items.map((item, idx) => (
            <div
              key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}-${idx}`}
              className="hairline-b pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
            >
              {/* Product Info Left */}
              <div className="flex-grow space-y-2">
                <span className="text-xs uppercase font-bold tracking-widest text-[#F0301A]">
                  {item.product.specimenNo}
                </span>
                <h3 className="font-editorial-serif font-bold text-2xl text-[#161412]">
                  <Link href={`/product/${item.product.id}`} className="hover:opacity-80">
                    {item.product.name}
                  </Link>
                </h3>
                
                {/* Variants if applicable */}
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-[#F0301A]/80">
                  {item.selectedSize && <span>SIZE: {item.selectedSize}</span>}
                  {item.selectedColor && <span>COLOR: {item.selectedColor}</span>}
                </div>

                {/* Price */}
                <PriceTag price={item.product.price} size="md" />

                {/* Quantity Stepper + Remove Link Mobile/Desktop */}
                <div className="pt-2 flex items-center gap-6">
                  <QuantityStepper
                    value={item.quantity}
                    onChange={(newQty) =>
                      updateQuantity(
                        item.product.id,
                        newQty,
                        item.selectedSize,
                        item.selectedColor
                      )
                    }
                  />
                  <button
                    onClick={() =>
                      removeFromCart(
                        item.product.id,
                        item.selectedSize,
                        item.selectedColor
                      )
                    }
                    className="text-xs uppercase font-bold text-[#F0301A] hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    DELETE
                  </button>
                </div>
              </div>

              {/* Product Thumbnail Right (Full-bleed square photo per design spec) */}
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 bg-[#FFFFFF] flex-shrink-0">
                <Image
                  src={item.product.images[0]}
                  alt={item.product.name}
                  fill
                  sizes="150px"
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Order Subtotal Summary Sticky Card */}
        <div className="lg:col-span-4 bg-[#EFE7DC] hairline-all p-6 space-y-6 self-start lg:sticky lg:top-24">
          <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3">
            SUMMARY
          </h2>

          <div className="space-y-3 text-sm font-bold uppercase tracking-wider">
            <div className="flex justify-between">
              <span>SUBTOTAL</span>
              <PriceTag price={subtotal} size="md" />
            </div>
            <div className="flex justify-between text-xs text-[#161412]">
              <span className="font-normal normal-case text-[#161412]">Taxes & shipping</span>
              <span className="font-normal normal-case text-[#161412]">Calculated at checkout</span>
            </div>
          </div>

          <div className="hairline-t pt-4">
            <ActionLink href="/checkout" size="lg" className="w-full justify-between">
              CHECKOUT
            </ActionLink>
          </div>

          <p className="text-[11px] font-sans text-[#161412] leading-relaxed">
            All specimens are packed in recycled kraft mailers. Orders ship within 48 hours from Porto, Portugal.
          </p>
        </div>
      </div>
    </div>
  );
}
