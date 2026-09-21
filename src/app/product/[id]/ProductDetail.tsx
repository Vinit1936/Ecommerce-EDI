'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PriceTag } from '@/components/ui/PriceTag';
import { Badge } from '@/components/ui/Badge';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ActionLink } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { useCart } from '@/components/cart/CartContext';
import type { Product } from '@/lib/types';

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: string;
}

export function ProductDetail({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const { data: session } = useSession();
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes ? product.sizes[0] : ''
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors ? product.colors[0].name : ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [addedToast, setAddedToast] = useState<boolean>(false);

  // Wishlist state
  const [inWishlist, setInWishlist] = useState<boolean>(false);
  const [wishlistLoading, setWishlistLoading] = useState<boolean>(false);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${product.id}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data.reviews);
        setAverageRating(data.data.averageRating);
        setTotalReviews(data.data.total);
      }
    } catch {
      /* fallback */
    }
  }, [product.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews();
  }, [fetchReviews]);

  // Check wishlist
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const res = await fetch('/api/wishlist');
        const data = await res.json();
        if (data.success) {
          const exists = data.data.items.some((i: { productId: string }) => i.productId === product.id);
          setInWishlist(exists);
        }
      } catch {
        /* fallback */
      }
    })();
  }, [session, product.id]);

  const handleAddToCart = () => {
    if (!product.inStock) return;
    addToCart(product, quantity, selectedSize, selectedColor);
    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
    }, 3500);
  };

  const handleToggleWishlist = async () => {
    if (!session?.user) {
      alert('Please log in to save items to your wishlist.');
      return;
    }
    setWishlistLoading(true);
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
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      alert('Please log in to write a review.');
      return;
    }
    setReviewSubmitting(true);
    setReviewMessage(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewMessage('Review published successfully!');
        setReviewComment('');
        await fetchReviews();
      } else {
        setReviewMessage(data.error || 'Failed to submit review');
      }
    } catch {
      setReviewMessage('Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

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

      {/* Main PDP Grid: Left Stack of Photos, Right Info Column */}
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
          {/* Specimen Category Tag & Rating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge label={product.category} variant="category" />
              <span className="text-xs uppercase font-bold tracking-widest text-[#F0301A]/70">
                {product.brand}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-widest text-[#F0301A]">
              <span>★ {averageRating > 0 ? averageRating.toFixed(1) : 'NEW'} ({totalReviews})</span>
              <span>• {product.specimenNo}</span>
            </div>
          </div>

          {/* Product Name in HIGH-CONTRAST EDITORIAL SERIF */}
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

          {/* Description Paragraph */}
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

          {/* Quantity & Actions CTA */}
          <div className="space-y-4 hairline-t pt-4">
            {product.inStock ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <QuantityStepper
                  value={quantity}
                  max={product.stockCount}
                  onChange={(val) => setQuantity(val)}
                />
                <div className="flex items-center gap-3">
                  <ActionLink onClick={handleAddToCart} size="lg">
                    ADD TO BAG ↗
                  </ActionLink>
                  <button
                    onClick={handleToggleWishlist}
                    disabled={wishlistLoading}
                    className={`h-11 px-4 text-xs font-bold uppercase tracking-wider border cursor-pointer transition-colors ${
                      inWishlist
                        ? 'bg-[#F0301A] text-[#EFE7DC] border-[#F0301A]'
                        : 'bg-transparent text-[#F0301A] border-[#F0301A] hover:bg-[#F0301A]/10'
                    }`}
                    title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    {inWishlist ? '♥ SAVED' : '♡ WISHLIST'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <ActionLink disabled isStruckThrough size="lg">
                  SOLD OUT ↗
                </ActionLink>
                <button
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  className="h-11 px-4 text-xs font-bold uppercase tracking-wider border border-[#F0301A] text-[#F0301A] cursor-pointer hover:bg-[#F0301A]/10"
                >
                  {inWishlist ? '♥ SAVED' : '♡ WISHLIST'}
                </button>
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

      {/* Customer Reviews Section */}
      <section className="mt-20 hairline-t pt-10">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display-grotesk font-black text-2xl uppercase tracking-tight">
              CUSTOMER REVIEWS & SPECIMEN APPRAISALS
            </h2>
            <div className="text-xs uppercase font-bold tracking-widest text-[#F0301A]/80 mt-1">
              AVERAGE SCORE: {averageRating > 0 ? `${averageRating.toFixed(1)} / 5.0` : 'NO REVIEWS YET'} ({totalReviews} TOTAL)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Reviews List (Left 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {reviews.length === 0 ? (
              <div className="p-6 border border-[#F0301A]/20 text-center text-xs uppercase font-bold text-[#F0301A]/60">
                Be the first customer to review this specimen.
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="p-5 border border-[#F0301A]/20 bg-[#FFFFFF]/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F0301A]">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                    <span className="text-[#161412]/60 uppercase tracking-wider">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm font-sans text-[#161412] leading-relaxed">
                      {r.comment}
                    </p>
                  )}
                  <div className="text-[11px] font-bold tracking-wider text-[#F0301A]/70 uppercase pt-1">
                    VERIFIED BUYER: {r.author}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Post Review Form (Right 5 cols) */}
          <div className="lg:col-span-5 p-6 border border-[#F0301A]/30 bg-[#EFE7DC] space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[#F0301A]">
              WRITE AN APPRAISAL
            </h3>
            {reviewMessage && (
              <div className="p-2.5 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase">
                {reviewMessage}
              </div>
            )}
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#F0301A]">
                  RATING (1-5 STARS)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-xl cursor-pointer ${
                        star <= reviewRating ? 'text-[#F0301A]' : 'text-[#F0301A]/30'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold uppercase ml-2 text-[#F0301A]">
                    {reviewRating} OF 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#F0301A]">
                  COMMENT / REMARKS
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details on sizing, fabric weight, and durability..."
                  rows={4}
                  className="w-full p-2.5 text-xs font-sans text-[#161412] bg-[#FFFFFF] border border-[#F0301A]/30 focus:border-[#F0301A] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full py-2.5 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase tracking-wider hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {reviewSubmitting ? 'SUBMITTING...' : 'PUBLISH REVIEW ↗'}
              </button>
            </form>
          </div>
        </div>
      </section>

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
