'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/components/cart/CartContext';
import { PriceTag } from '@/components/ui/PriceTag';
import { ActionLink } from '@/components/ui/Button';

export default function CheckoutPage() {
  const { items, subtotal, clearCart, isSignedIn, refresh } = useCart();
  const router = useRouter();

  const [form, setForm] = useState({
    email: 'client@hellohello.studio',
    firstName: 'SPECIMEN',
    lastName: 'COLLECTOR',
    address: 'RUA DOS CLÉRIGOS 88',
    apartment: '3RD FLOOR',
    city: 'PORTO',
    country: 'PORTUGAL',
    postalCode: '4050-204',
    phone: '+351 912 345 678',
    shippingMethod: 'standard',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState<null | {
    id: string;
    items: typeof items;
    total: number;
    shippingAddress: typeof form;
  }>(null);

  const shippingCost = form.shippingMethod === 'express' ? 25 : 12;
  const totalAmount = subtotal + (items.length > 0 ? shippingCost : 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Orders are keyed to a Customer, so an anonymous checkout cannot be
    // persisted. Send guests to sign in and bring them straight back; their
    // cart is merged server-side on arrival.
    if (!isSignedIn) {
      router.push('/login?callbackUrl=/checkout');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const placed = [...items];

    try {
      // 1. Place the order — stock is checked and decremented atomically here.
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          address: [form.address, form.apartment].filter(Boolean).join(', '),
          city: form.city,
          postalCode: form.postalCode,
          country: form.country,
          phone: form.phone,
          method: form.shippingMethod,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) {
        setError(orderData.error ?? 'Could not place your order');
        return;
      }

      const { order, invoiceNo } = orderData.data;

      // 2. Take payment. The order exists either way; a failed payment leaves
      //    it PENDING rather than silently discarding it.
      const payRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payData = await payRes.json();
      if (!payData.success) {
        setError(`Order ${invoiceNo} was created but payment failed: ${payData.error}`);
        return;
      }

      setOrderConfirmed({
        id: invoiceNo,
        items: placed,
        total: Number(order.totalAmount),
        shippingAddress: { ...form },
      });
      clearCart();
      await refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order Confirmation State
  if (orderConfirmed) {
    return (
      <div className="min-h-screen text-[#F0301A] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        <div className="hairline-all p-8 md:p-12 space-y-8 bg-[#EFE7DC]">
          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-[#F0301A]">
              ● ORDER CONFIRMED / SPECIMEN RECORD
            </span>
            <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl uppercase tracking-tighter">
              THANK YOU
            </h1>
            <p className="font-sans text-[#161412] text-sm md:text-base">
              Order reference: <strong className="font-display-grotesk text-[#F0301A]">{orderConfirmed.id}</strong>
            </p>
          </div>

          <div className="hairline-t pt-6 space-y-4">
            <h2 className="font-display-grotesk font-bold text-lg uppercase tracking-wider">
              ORDER SUMMARY
            </h2>
            <div className="space-y-3">
              {orderConfirmed.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm font-sans">
                  <div className="text-[#161412]">
                    <span className="font-bold">{item.product.name}</span> (x{item.quantity})
                    {item.selectedSize && <span className="text-xs text-[#F0301A] ml-2">[{item.selectedSize}]</span>}
                  </div>
                  <PriceTag price={item.product.price * item.quantity} size="sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="hairline-t pt-6 flex flex-col sm:flex-row justify-between gap-6 text-xs text-[#161412]">
            <div>
              <div className="font-display-grotesk font-bold text-[#F0301A] uppercase mb-1">
                DISPATCH ADDRESS
              </div>
              <p>
                {orderConfirmed.shippingAddress.firstName} {orderConfirmed.shippingAddress.lastName}<br />
                {orderConfirmed.shippingAddress.address}<br />
                {orderConfirmed.shippingAddress.city}, {orderConfirmed.shippingAddress.postalCode}<br />
                {orderConfirmed.shippingAddress.country}
              </p>
            </div>
            <div className="sm:text-right">
              <div className="font-display-grotesk font-bold text-[#F0301A] uppercase mb-1">
                TOTAL PAID
              </div>
              <PriceTag price={orderConfirmed.total} size="xl" />
            </div>
          </div>

          <div className="hairline-t pt-8 text-center">
            <ActionLink href="/shop" size="lg">
              RETURN TO CATALOGUE ↗
            </ActionLink>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl uppercase tracking-tighter mb-4">
          CHECKOUT
        </h1>
        <div className="hairline-b mb-8" />
        <div className="text-center py-16 space-y-4">
          <p className="font-sans text-[#161412]">You cannot checkout with an empty bag.</p>
          <ActionLink href="/shop" size="md">
            GO TO SHOP ↗
          </ActionLink>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl uppercase tracking-tighter mb-4">
        CHECKOUT
      </h1>
      <div className="hairline-b mb-8" />

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Shipping Form */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Contact */}
          <div className="space-y-4">
            <h2 className="font-display-grotesk font-bold text-xl uppercase tracking-tight">
              01 — CONTACT INFORMATION
            </h2>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
              />
            </div>
          </div>

          {/* Section 2: Delivery Address */}
          <div className="space-y-4 hairline-t pt-6">
            <h2 className="font-display-grotesk font-bold text-xl uppercase tracking-tight">
              02 — SHIPPING DESTINATION
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  FIRST NAME
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  LAST NAME
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                STREET ADDRESS
              </label>
              <input
                type="text"
                name="address"
                required
                value={form.address}
                onChange={handleChange}
                className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  CITY
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={form.city}
                  onChange={handleChange}
                  className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  POSTAL CODE
                </label>
                <input
                  type="text"
                  name="postalCode"
                  required
                  value={form.postalCode}
                  onChange={handleChange}
                  className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  COUNTRY
                </label>
                <input
                  type="text"
                  name="country"
                  required
                  value={form.country}
                  onChange={handleChange}
                  className="w-full bg-transparent border border-[#F0301A] px-3 py-2 text-[#161412] font-sans focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Shipping Method */}
          <div className="space-y-4 hairline-t pt-6">
            <h2 className="font-display-grotesk font-bold text-xl uppercase tracking-tight">
              03 — SHIPPING METHOD
            </h2>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 border border-[#F0301A] cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="standard"
                    checked={form.shippingMethod === 'standard'}
                    onChange={handleChange}
                    className="accent-[#F0301A]"
                  />
                  <div>
                    <div className="font-bold text-sm uppercase">STANDARD COURIER (3–5 DAYS)</div>
                    <div className="text-xs text-[#161412]">Tracked shipping via DHL Express</div>
                  </div>
                </div>
                <PriceTag price={12} size="sm" />
              </label>

              <label className="flex items-center justify-between p-4 border border-[#F0301A] cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="express"
                    checked={form.shippingMethod === 'express'}
                    onChange={handleChange}
                    className="accent-[#F0301A]"
                  />
                  <div>
                    <div className="font-bold text-sm uppercase">PRIORITY OVERNIGHT (24 HOURS)</div>
                    <div className="text-xs text-[#161412]">Direct courier dispatch</div>
                  </div>
                </div>
                <PriceTag price={25} size="sm" />
              </label>
            </div>
          </div>

          {/* Place Order Action Link */}
          <div className="hairline-t pt-6 space-y-4">
            {error && (
              <div className="p-3 border border-[#F0301A] bg-[#F0301A]/10 text-xs font-bold uppercase tracking-wider text-[#F0301A]">
                ● {error}
              </div>
            )}
            {!isSignedIn && (
              <div className="p-3 border border-[#F0301A]/40 text-xs font-bold uppercase tracking-wider text-[#F0301A]/80">
                ● SIGN IN TO COMPLETE YOUR ORDER — YOUR BAG WILL BE KEPT
              </div>
            )}
            <ActionLink type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting ? 'PROCESSING SPECIMENS...' : isSignedIn ? 'PLACE ORDER ↗' : 'SIGN IN TO CONTINUE ↗'}
            </ActionLink>
          </div>
        </div>

        {/* Right Column: Order Items Summary Sidebar */}
        <div className="lg:col-span-5 bg-[#EFE7DC] hairline-all p-6 space-y-6 self-start lg:sticky lg:top-24">
          <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight hairline-b pb-3">
            ORDER SUMMARY
          </h2>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-center border-b border-[#F0301A]/20 pb-3">
                <div className="relative w-16 h-16 bg-[#FFFFFF] flex-shrink-0">
                  <Image
                    src={item.product.images[0]}
                    alt={item.product.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-bold text-xs uppercase line-clamp-1">{item.product.name}</div>
                  <div className="text-[11px] text-[#161412]">QTY: {item.quantity} {item.selectedSize && `| SIZE: ${item.selectedSize}`}</div>
                </div>
                <PriceTag price={item.product.price * item.quantity} size="sm" />
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs font-bold uppercase tracking-wider hairline-t pt-4">
            <div className="flex justify-between">
              <span>SUBTOTAL</span>
              <PriceTag price={subtotal} size="sm" />
            </div>
            <div className="flex justify-between">
              <span>ESTIMATED SHIPPING</span>
              <PriceTag price={shippingCost} size="sm" />
            </div>
            <div className="flex justify-between text-base font-black pt-2 hairline-t">
              <span>TOTAL</span>
              <PriceTag price={totalAmount} size="lg" />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
