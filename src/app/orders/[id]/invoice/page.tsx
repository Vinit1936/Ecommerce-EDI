import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect('/login');

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
          product: { select: { name: true, sku: true, specimenNo: true } },
        },
      },
      invoice: true,
      payments: true,
    },
  });

  if (!order) notFound();

  // Allow order owner or admin
  const isOwner = session.user.customerId === order.customerId;
  const isAdmin = session.user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    redirect('/orders');
  }

  const invoiceNo = order.invoice?.invoiceNo ?? `INV-${order.id.slice(0, 8).toUpperCase()}`;
  const subtotal = order.orderItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0
  );
  const shippingCost = Number(order.shippingCost);
  const totalAmount = Number(order.totalAmount);
  const payment = order.payments[0];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#161412] p-6 sm:p-12 font-sans max-w-4xl mx-auto">
      {/* Top action bar: hidden when printing */}
      <div className="mb-8 flex items-center justify-between print:hidden border-b border-neutral-200 pb-4">
        <Link
          href="/orders"
          className="text-xs font-bold uppercase tracking-widest text-[#F0301A] hover:underline"
        >
          ← RETURN TO ORDERS
        </Link>
        <PrintButton />
      </div>

      {/* Invoice Printable Sheet */}
      <div className="border border-neutral-300 p-8 sm:p-12 space-y-8">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-neutral-200 pb-8">
          <div>
            <div className="text-3xl font-black text-[#F0301A] tracking-tighter font-display-grotesk">
              ++ HELLOHELLO STUDIO
            </div>
            <div className="text-xs font-mono text-neutral-500 mt-1 uppercase tracking-widest">
              COMMERCIAL ARCHIVE & SPECIMEN DIVISION
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              tax id: US-94820184 · montevideo catalog edition
            </div>
          </div>
          <div className="sm:text-right space-y-1">
            <div className="text-xl font-bold font-mono tracking-tight text-[#F0301A]">
              INVOICE
            </div>
            <div className="font-mono text-sm font-bold text-neutral-800">
              {invoiceNo}
            </div>
            <div className="text-xs text-neutral-500">
              Issued: {new Date(order.invoice?.issuedAt ?? order.createdAt).toLocaleDateString()}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              STATUS: {payment?.status === 'COMPLETED' ? 'PAID IN FULL' : order.status}
            </div>
          </div>
        </div>

        {/* Customer & Shipping Addresses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
          <div>
            <div className="font-bold text-neutral-400 uppercase tracking-wider mb-2">
              BILLED TO:
            </div>
            <div className="font-bold text-sm text-neutral-900">
              {order.customer.firstName} {order.customer.lastName}
            </div>
            <div className="text-neutral-600 lowercase">{order.customer.user.email}</div>
            {order.customer.phone && (
              <div className="text-neutral-600">{order.customer.phone}</div>
            )}
          </div>
          <div>
            <div className="font-bold text-neutral-400 uppercase tracking-wider mb-2">
              SHIP TO:
            </div>
            <div className="text-neutral-800 font-medium">
              {order.shippingAddress || order.customer.address}
            </div>
            <div className="text-neutral-800">
              {order.shippingCity || order.customer.city}
              {order.shippingPostalCode ? `, ${order.shippingPostalCode}` : ''}
            </div>
            <div className="text-neutral-600 uppercase">
              {order.shippingCountry || 'DOMESTIC'} · {order.shippingMethod.toUpperCase()} FREIGHT
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="border border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100 border-b border-neutral-200 font-bold uppercase text-neutral-600">
              <tr>
                <th className="p-3">SPECIMEN / DESCRIPTION</th>
                <th className="p-3 text-center">QTY</th>
                <th className="p-3 text-right">UNIT PRICE</th>
                <th className="p-3 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {order.orderItems.map((item) => {
                const lineTotal = Number(item.unitPrice) * item.quantity;
                return (
                  <tr key={item.id}>
                    <td className="p-3">
                      <div className="font-bold text-neutral-900">{item.product.name}</div>
                      <div className="text-[11px] font-mono text-neutral-500 uppercase">
                        SKU: {item.product.sku}
                        {item.selectedSize ? ` · SIZE: ${item.selectedSize}` : ''}
                        {item.selectedColor ? ` · COLOR: ${item.selectedColor}` : ''}
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono">{item.quantity}</td>
                    <td className="p-3 text-right font-mono">${Number(item.unitPrice).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold">${lineTotal.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end pt-2">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>SUBTOTAL:</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>SHIPPING ({order.shippingMethod.toUpperCase()}):</span>
              <span className="font-mono">${shippingCost.toFixed(2)}</span>
            </div>
            <div className="border-t border-neutral-300 pt-2 flex justify-between font-bold text-sm text-neutral-900">
              <span>TOTAL PAID:</span>
              <span className="font-mono text-[#F0301A]">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Colophon & Disclaimer */}
        <div className="border-t border-neutral-200 pt-6 text-[10px] text-neutral-500 space-y-1">
          <div>
            THANK YOU FOR YOUR ORDER. GOODS RETAINED IN PERPETUITY SUBJECT TO HELLOHELLO ARCHIVE TERMS.
          </div>
          <div>
            TRANSACTION REFERENCE: {payment?.gatewayTxnId ?? order.id}
          </div>
        </div>
      </div>
    </div>
  );
}
