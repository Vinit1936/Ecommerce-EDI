import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { OrderTimelineStepper } from '@/components/orders/OrderTimelineStepper';
import { OrderActions } from '../OrderActions';
import { PriceTag } from '@/components/ui/PriceTag';

export const dynamic = 'force-dynamic';

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect('/login?callbackUrl=/orders');

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: {
        include: {
          user: { select: { email: true } },
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              name: true,
              sku: true,
              specimenNo: true,
              images: true,
            },
          },
        },
      },
      orderStatuses: {
        orderBy: { changedAt: 'asc' },
      },
      invoice: true,
      payments: {
        include: { transactions: true },
      },
    },
  });

  if (!order) notFound();

  // Allow order owner or admin
  const isOwner = session.user.customerId === order.customerId;
  const isAdmin = session.user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    redirect('/orders');
  }

  const invoiceNo = order.invoice?.invoiceNo ?? `ORD-${order.id.slice(0, 8).toUpperCase()}`;
  const trackingNumber = `EDI-EXP-${order.id.slice(0, 8).toUpperCase()}`;
  const payment = order.payments[0];

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">
      {/* Navigation & Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/60 mb-1">
            <Link href="/orders" className="hover:underline">
              ← ALL ORDERS
            </Link>{' '}
            / SHIPMENT TRACKING
          </div>
          <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl uppercase tracking-tighter">
            {invoiceNo}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={`/orders/${order.id}/invoice`}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider hairline-all hover:bg-[#F0301A] hover:text-[#EFE7DC] transition-colors"
          >
            PRINT INVOICE ↗
          </Link>
          <OrderActions orderId={order.id} status={order.status} />
        </div>
      </div>

      <div className="hairline-b mb-8" />

      {/* Visual Tracking Timeline Stepper */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display-grotesk font-black text-xl uppercase tracking-tight">
            LIFECYCLE PROGRESSION TIMELINE
          </h2>
          <span className="text-xs font-mono text-[#161412]/60">
            DISPATCH TRACKER: {trackingNumber}
          </span>
        </div>
        <OrderTimelineStepper currentStatus={order.status} history={order.orderStatuses} />
      </section>

      {/* Two Column Layout: Shipping/Logistics & Order Specimen Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Dispatch and Shipping Details */}
        <div className="lg:col-span-5 space-y-6">
          {/* Dispatch Info */}
          <div className="hairline-all p-6 bg-[#EFE7DC] space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]">
              FREIGHT &amp; LOGISTICS TELEMETRY
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#F0301A]/20 pb-2">
                <span className="font-bold uppercase text-[#161412]/70">CARRIER SERVICE:</span>
                <span className="font-mono font-bold text-[#161412]">
                  {order.shippingMethod.toUpperCase()} (EXPEDITED FREIGHT)
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#F0301A]/20 pb-2">
                <span className="font-bold uppercase text-[#161412]/70">WAYBILL / TRACKING:</span>
                <span className="font-mono font-bold text-[#F0301A]">{trackingNumber}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#F0301A]/20 pb-2">
                <span className="font-bold uppercase text-[#161412]/70">DISPATCH ORIGIN:</span>
                <span className="font-mono text-[#161412]">PORTO CENTRAL FACILITY</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-[#161412]/70">LIFECYCLE STATE:</span>
                <span className="font-mono font-black text-sm uppercase text-[#F0301A]">
                  ● {order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="hairline-all p-6 bg-[#EFE7DC] space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]">
              DESTINATION CONSIGNMENT
            </div>

            <div className="text-xs space-y-1 text-[#161412]">
              <div className="font-bold uppercase text-sm">
                {order.shippingName || `${order.customer.firstName} ${order.customer.lastName}`}
              </div>
              <div>{order.shippingAddress || order.customer.address}</div>
              <div>
                {order.shippingCity || order.customer.city},{' '}
                {order.shippingPostalCode || order.customer.postalCode || ''}{' '}
                {order.shippingCountry || order.customer.country || ''}
              </div>
              {order.shippingPhone && (
                <div className="font-mono text-[11px] text-[#161412]/60 mt-2">
                  CONTACT: {order.shippingPhone}
                </div>
              )}
            </div>
          </div>

          {/* Payment & Audit Info */}
          <div className="hairline-all p-6 bg-[#EFE7DC] space-y-3 text-xs">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]">
              SETTLEMENT TELEMETRY
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase text-[#161412]/70">PAYMENT STATUS:</span>
              <span className="font-bold uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 border border-emerald-300">
                {payment?.status ?? 'SETTLED'}
              </span>
            </div>
            {payment?.gatewayTxnId && (
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-[#161412]/70">GATEWAY REF:</span>
                <span className="font-mono text-[10px] text-[#161412]">
                  {payment.gatewayTxnId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Line Items and Totals */}
        <div className="lg:col-span-7 space-y-6">
          <div className="hairline-all p-6 bg-[#EFE7DC] space-y-6">
            <div className="flex items-baseline justify-between border-b border-[#F0301A]/20 pb-3">
              <h3 className="font-display-grotesk font-black text-xl uppercase tracking-tight">
                CONSIGNED SPECIMENS ({order.orderItems.length})
              </h3>
              <span className="text-xs font-mono text-[#161412]/60">
                PLACED {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Line Items List */}
            <div className="space-y-4 divide-y divide-[#F0301A]/10">
              {order.orderItems.map((item) => (
                <div key={item.id} className="pt-4 first:pt-0 flex items-start gap-4">
                  <div className="relative w-16 h-16 bg-white shrink-0 hairline-all overflow-hidden">
                    {item.product.images[0] && (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.product.sku}`}
                      className="font-display-grotesk font-black text-base uppercase tracking-tight text-[#161412] hover:text-[#F0301A] transition-colors line-clamp-1"
                    >
                      {item.product.name}
                    </Link>
                    <div className="font-mono text-[10px] text-[#F0301A]/80 mt-0.5">
                      SKU: {item.product.sku} · {item.product.specimenNo}
                    </div>
                    <div className="text-xs font-sans text-[#161412]/70 mt-1">
                      QUANTITY: {item.quantity}
                      {item.selectedSize ? ` · SIZE: ${item.selectedSize}` : ''}
                      {item.selectedColor ? ` · COLOR: ${item.selectedColor}` : ''}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <PriceTag price={Number(item.unitPrice) * item.quantity} size="md" />
                    <div className="text-[10px] font-mono text-[#161412]/60 mt-0.5">
                      ${money(Number(item.unitPrice))} ea
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="border-t border-[#F0301A]/20 pt-4 space-y-2 text-xs font-sans">
              <div className="flex justify-between text-[#161412]/70">
                <span className="uppercase">ITEMS SUBTOTAL:</span>
                <span className="font-mono font-bold text-[#161412]">
                  $
                  {money(
                    order.orderItems.reduce(
                      (acc, i) => acc + Number(i.unitPrice) * i.quantity,
                      0
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between text-[#161412]/70">
                <span className="uppercase">EXPEDITED FREIGHT &amp; HANDLING:</span>
                <span className="font-mono font-bold text-[#161412]">
                  ${money(Number(order.shippingCost))}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#F0301A] border-t border-[#F0301A]/20 pt-3">
                <span className="font-display-grotesk font-black uppercase tracking-tight">
                  TOTAL SETTLEMENT:
                </span>
                <span className="font-mono font-black text-xl">
                  ${money(Number(order.totalAmount))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
