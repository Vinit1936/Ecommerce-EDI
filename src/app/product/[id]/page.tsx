'use client';

import React, { useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { PriceTag } from '@/components/ui/PriceTag';
import { Badge } from '@/components/ui/Badge';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ActionLink } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { useCart } from '@/components/cart/CartContext';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = MOCK_PRODUCTS.find((p) => p.id === id);

  if (!product) {
    notFound();
  }

  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes ? product.sizes[0] : ''
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors ? product.colors[0].name : ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [addedToast, setAddedToast] = useState<boolean>(false);

  const handleAddToCart = () => {
    if (!product.inStock) return;
    addToCart(product, quantity, selectedSize, selectedColor);
    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
    }, 3500);
  };

  const relatedProducts = MOCK_PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
      {/* Return Back Link */}
      <div className="mb-6">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#F0301A] hover:opacity-75"
        >
          ← RETURN TO SHOP
        </Link>
      </div>

      {/* Main PDP Grid: Left Stack of Photos (No Gap), Right Info Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Vertical Photo Stack with 0 Gap */}
        <div className="lg:col-span-7 flex flex-col gap-0 border-b lg:border-b-0 border-[#F0301A]/20 pb-8 lg:pb-0">
          {product.images.map((image, idx) => (
            <div
              key={idx}
              className="relative w-full aspect-square bg-[#FFFFFF] overflow-hidden"
            >
              <Image
                src={image}
                alt={`${product.name} detail ${idx + 1}`}
                fill
                priority={idx === 0}
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>

        {/* Right Column: Sticky Product Info */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 flex flex-col gap-6">
          {/* Specimen Category Tag */}
          <div className="flex items-center justify-between">
            <Badge label={product.category} variant="category" />
            <span className="text-xs uppercase font-bold tracking-widest text-[#F0301A]">
              {product.specimenNo}
            </span>
          </div>

          {/* Product Name in HIGH-CONTRAST EDITORIAL SERIF (Reserved only for PDP product names) */}
          <h1 className="font-editorial-serif font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight leading-tight text-[#161412]">
            {product.name}
          </h1>

          {/* Price & Stock Badge */}
          <div className="flex items-center justify-between hairline-b pb-4">
            <PriceTag price={product.price} originalPrice={product.originalPrice} size="xl" />
            <div>
              {product.inStock ? (
                <span className="text-xs font-bold uppercase tracking-wider text-[#F0301A]">
                  ● IN STOCK ({product.stockCount} AVAILABLE)
                </span>
              ) : (
                <Badge label="SOLD OUT" variant="status" />
              )}
            </div>
          </div>

          {/* Description Paragraph (Reading copy in Ink #161412) */}
          <div className="space-y-4">
            <p className="font-sans text-base text-[#161412] leading-relaxed">
              {product.description}
            </p>
            {product.details && product.details.length > 0 && (
              <ul className="font-sans text-xs text-[#161412]/80 space-y-1 list-disc list-inside">
                {product.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Variant Selectors (Size & Color) */}
          <div className="space-y-4 hairline-t pt-4">
            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#F0301A]">
                  SELECT SIZE: {selectedSize}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase cursor-pointer transition-colors border ${
                          isSelected
                            ? 'bg-[#F0301A] text-[#EFE7DC] border-[#F0301A]'
                            : 'bg-transparent text-[#F0301A] border-[#F0301A]/40 hover:border-[#F0301A]'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#F0301A]">
                  COLOR: {selectedColor}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const isSelected = selectedColor === color.name;
                    return (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color.name)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase cursor-pointer border ${
                          isSelected
                            ? 'border-[#F0301A] bg-[#F0301A]/10'
                            : 'border-[#F0301A]/30 hover:border-[#F0301A]'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/20"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span>{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quantity & Add to Bag CTA */}
          <div className="space-y-4 hairline-t pt-4">
            {product.inStock ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <QuantityStepper
                  value={quantity}
                  max={product.stockCount}
                  onChange={(val) => setQuantity(val)}
                />
                <ActionLink onClick={handleAddToCart} size="lg">
                  ADD TO BAG ↗
                </ActionLink>
              </div>
            ) : (
              <div>
                <ActionLink disabled isStruckThrough size="lg">
                  SOLD OUT ↗
                </ActionLink>
              </div>
            )}

            {/* Added Toast Notification */}
            {addedToast && (
              <div className="p-3 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                <span>● ADDED {quantity} ITEM(S) TO BAG</span>
                <Link href="/cart" className="underline hover:opacity-80">
                  VIEW BAG ↗
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 hairline-t pt-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display-grotesk font-black text-2xl uppercase tracking-tight">
              RELATED SPECIMENS
            </h2>
            <Link href="/shop" className="text-xs uppercase font-bold text-[#F0301A] hover:underline">
              SEE ALL ↗
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relProduct) => (
              <ProductCard key={relProduct.id} product={relProduct} aspectRatio="square" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
