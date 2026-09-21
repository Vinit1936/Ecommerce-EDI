'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

interface AdminOrder {
  id: string;
  createdAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };
  invoiceNo: string | null;
  itemsCount: number;
  items: OrderItem[];
  paymentStatus: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = async (statusFilter?: string) => {
    try {
      setLoading(true);
      const url = statusFilter && statusFilter !== 'ALL'
        ? `/api/admin/orders?status=${statusFilter}`
        : '/api/admin/orders';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
      }
    } catch {
      /* fallback */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders(filter);
  }, [filter]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrders(filter);
      } else {
        alert(data.error || 'Failed to update order status');
      }
    } catch {
      alert('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="border-b border-[#F0301A]/30 pb-6 mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard"
              className="text-xs font-bold uppercase tracking-widest hover:underline"
            >
              ← ADMIN DASHBOARD
            </Link>
          </div>
          <h1 className="font-display-grotesk font-black text-3xl sm:text-4xl uppercase tracking-tight">
            ORDER FULFILLMENT & LIFECYCLE
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[#F0301A]/70 mt-1">
            CONTROL CENTER FOR ORDER STATES AND STOCK MOVEMENTS
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                filter === s
                  ? 'bg-[#F0301A] text-[#EFE7DC] border-[#F0301A]'
                  : 'bg-transparent text-[#F0301A] border-[#F0301A]/30 hover:border-[#F0301A]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="py-20 text-center text-xs font-bold uppercase tracking-widest">
          FETCHING ORDER LEDGER...
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 border border-[#F0301A]/30 text-center text-xs font-bold uppercase tracking-widest">
          NO ORDERS FOUND MATCHING FILTER: {filter}
        </div>
      ) : (
        <div className="border border-[#F0301A]/30 overflow-x-auto bg-[#FFFFFF]">
          <table className="w-full text-left text-xs uppercase font-sans">
            <thead className="bg-[#EFE7DC] border-b border-[#F0301A]/30 font-display-grotesk font-bold text-[#F0301A]">
              <tr>
                <th className="p-3.5">ORDER / INVOICE</th>
                <th className="p-3.5">DATE</th>
                <th className="p-3.5">CUSTOMER</th>
                <th className="p-3.5">ITEMS</th>
                <th className="p-3.5">TOTAL</th>
                <th className="p-3.5">STATUS</th>
                <th className="p-3.5 text-right">LIFECYCLE ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0301A]/10 text-[#161412]">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-[#EFE7DC]/30">
                  <td className="p-3.5">
                    <div className="font-mono text-[11px] font-bold text-[#F0301A]">
                      {o.id.slice(0, 8)}...
                    </div>
                    {o.invoiceNo && (
                      <div className="text-[10px] text-[#161412]/60">
                        INV: {o.invoiceNo}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-[11px] whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold">{o.customer.name}</div>
                    <div className="text-[10px] text-[#161412]/60 lowercase">{o.customer.email}</div>
                  </td>
                  <td className="p-3.5">
                    {o.itemsCount} unit(s)
                  </td>
                  <td className="p-3.5 font-bold font-mono text-[#F0301A]">
                    ${o.totalAmount.toFixed(2)}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                        o.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'SHIPPED'
                          ? 'bg-blue-100 text-blue-800'
                          : o.status === 'DELIVERED'
                          ? 'bg-purple-100 text-purple-800'
                          : o.status === 'CANCELLED'
                          ? 'bg-neutral-200 text-neutral-600 line-through'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                    {o.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(o.id, 'CONFIRMED')}
                        disabled={actionLoading === o.id}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase bg-[#F0301A] text-[#EFE7DC] hover:opacity-90 cursor-pointer disabled:opacity-50"
                      >
                        CONFIRM ↗
                      </button>
                    )}
                    {o.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleUpdateStatus(o.id, 'SHIPPED')}
                        disabled={actionLoading === o.id}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase bg-[#161412] text-[#EFE7DC] hover:opacity-90 cursor-pointer disabled:opacity-50"
                      >
                        SHIP ↗
                      </button>
                    )}
                    {o.status === 'SHIPPED' && (
                      <button
                        onClick={() => handleUpdateStatus(o.id, 'DELIVERED')}
                        disabled={actionLoading === o.id}
                        className="px-2.5 py-1 text-[10px] font-bold uppercase bg-emerald-700 text-[#EFE7DC] hover:opacity-90 cursor-pointer disabled:opacity-50"
                      >
                        DELIVER ↗
                      </button>
                    )}
                    {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
                      <button
                        onClick={() => handleUpdateStatus(o.id, 'CANCELLED')}
                        disabled={actionLoading === o.id}
                        className="px-2 py-1 text-[10px] font-bold uppercase border border-[#F0301A]/30 text-[#F0301A] hover:bg-[#F0301A]/10 cursor-pointer disabled:opacity-50"
                      >
                        CANCEL
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
