'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface VendorProduct {
  id: string;
  sku: string;
  specimenNo: string;
  name: string;
  price: number;
  category: string;
  stockQty: number;
  images: string[];
  unitsSold: number;
  revenue: number;
}

interface VendorData {
  brand: { id: string; name: string };
  userEmail: string;
  role: string;
  products: VendorProduct[];
  metrics: {
    totalProducts: number;
    totalUnitsSold: number;
    totalRevenue: number;
    totalStock: number;
  };
}

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function VendorDashboardPage() {
  const [data, setData] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [stockChanges, setStockChanges] = useState<Record<string, number>>({});
  const [notification, setNotification] = useState<string | null>(null);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/vendor/products');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        const initialStocks: Record<string, number> = {};
        for (const p of json.data.products) {
          initialStocks[p.id] = p.stockQty;
        }
        setStockChanges(initialStocks);
      } else {
        setError(json.error || 'Failed to load vendor workspace');
      }
    } catch {
      setError('Network communication failed with vendor API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVendorData();
  }, []);

  const handleStockDelta = (productId: string, delta: number) => {
    setStockChanges((prev) => {
      const current = prev[productId] ?? 0;
      return { ...prev, [productId]: Math.max(0, current + delta) };
    });
  };

  const handleSaveStock = async (product: VendorProduct) => {
    const newQty = stockChanges[product.id];
    if (newQty === undefined || newQty === product.stockQty) return;

    try {
      setUpdatingId(product.id);
      setNotification(null);
      const res = await fetch('/api/vendor/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          stockQty: newQty,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update stock');
      }

      setNotification(`Stock for ${product.name} updated to ${newQty} units.`);
      if (data) {
        setData({
          ...data,
          products: data.products.map((p) =>
            p.id === product.id ? { ...p, stockQty: newQty } : p
          ),
          metrics: {
            ...data.metrics,
            totalStock: data.metrics.totalStock + (newQty - product.stockQty),
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adjusting inventory stock');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/60 mb-1">
            PARTNER WORKSPACE / MERCHANDISE PORTAL
          </div>
          <h1 className="font-display-grotesk font-black text-4xl sm:text-5xl uppercase tracking-tighter">
            VENDOR DASHBOARD
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[#F0301A] text-[#EFE7DC]">
            ● ROLE: {data?.role || 'VENDOR'}
          </span>
          <button
            onClick={() => fetchVendorData()}
            className="px-4 py-1 text-xs font-bold uppercase tracking-wider hairline-all hover:bg-[#F0301A] hover:text-[#EFE7DC] transition-colors"
          >
            ↻ REFRESH
          </button>
        </div>
      </div>

      <div className="hairline-b mb-8" />

      {/* Brand Identity Banner */}
      <div className="hairline-all p-6 mb-8 bg-[#F0301A]/5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/60">
            AFFILIATED MANUFACTURER &amp; BRAND
          </div>
          <div className="font-display-grotesk font-black text-2xl uppercase tracking-tight text-[#161412]">
            {data?.brand.name || 'PORTO WORKS DIVISION'}
          </div>
          <div className="font-mono text-xs text-[#F0301A]/80 mt-0.5">
            LOGGED IN AS: {data?.userEmail || 'vendor@hellohello.studio'}
          </div>
        </div>
        <div className="text-xs font-mono text-[#161412]/70 text-right">
          STATUS: <span className="font-bold text-emerald-700">VERIFIED MERCHANT</span>
          <div>ISOLATION: BRAND CATALOG ITEMS ONLY</div>
        </div>
      </div>

      {/* Feedback Messages */}
      {notification && (
        <div className="mb-6 p-4 text-xs font-bold uppercase tracking-wider hairline-all bg-[#F0301A]/10 text-[#F0301A] flex items-center justify-between">
          <span>● {notification}</span>
          <button onClick={() => setNotification(null)} className="underline">
            DISMISS
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 text-xs font-bold uppercase tracking-wider hairline-all bg-red-700 text-white flex items-center justify-between">
          <span>✕ {error}</span>
          <button onClick={() => setError(null)} className="underline">
            DISMISS
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="hairline-all p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/70">
            SUPPLIED SPECIMENS
          </div>
          <div className="font-display-grotesk font-black text-3xl md:text-4xl tracking-tighter mt-2 text-[#F0301A]">
            {data?.metrics.totalProducts ?? '—'}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">active in public store</div>
        </div>
        <div className="hairline-all p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/70">
            TOTAL UNITS DISPATCHED
          </div>
          <div className="font-display-grotesk font-black text-3xl md:text-4xl tracking-tighter mt-2 text-[#F0301A]">
            {data?.metrics.totalUnitsSold ?? '—'}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">across all customer orders</div>
        </div>
        <div className="hairline-all p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/70">
            BRAND SALES REVENUE
          </div>
          <div className="font-display-grotesk font-black text-3xl md:text-4xl tracking-tighter mt-2 text-[#F0301A]">
            ${money(data?.metrics.totalRevenue ?? 0)}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">gross merchant volume</div>
        </div>
        <div className="hairline-all p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/70">
            WAREHOUSE INVENTORY
          </div>
          <div className="font-display-grotesk font-black text-3xl md:text-4xl tracking-tighter mt-2 text-[#F0301A]">
            {data?.metrics.totalStock ?? '—'}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">units available to fulfill</div>
        </div>
      </div>

      {/* Product Inventory Table */}
      <div className="space-y-4 mb-12">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display-grotesk font-black text-2xl uppercase tracking-tight">
            ASSIGNED BRAND CATALOGUE
          </h2>
          <span className="text-xs font-mono text-[#161412]/60">
            REAL-TIME WAREHOUSE ALLOCATION
          </span>
        </div>

        <div className="hairline-all overflow-x-auto bg-[#EFE7DC]">
          {loading ? (
            <div className="p-12 text-center text-xs font-bold uppercase tracking-widest text-[#F0301A]/70 animate-pulse">
              SYNCING VENDOR INVENTORY...
            </div>
          ) : !data || data.products.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="font-display-grotesk font-black text-xl uppercase tracking-tight">
                NO PRODUCTS ASSIGNED
              </div>
              <p className="font-sans text-xs text-[#161412]/60">
                No catalog items currently belong to your brand partition.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="hairline-b bg-[#F0301A]/10 text-[10px] font-bold uppercase tracking-widest">
                  <th className="p-3">SPECIMEN</th>
                  <th className="p-3">CATEGORY</th>
                  <th className="p-3 text-right">RETAIL PRICE</th>
                  <th className="p-3 text-right">DISPATCHED</th>
                  <th className="p-3 text-right">GROSS SALES</th>
                  <th className="p-3 text-center">ON-HAND STOCK</th>
                  <th className="p-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0301A]/20">
                {data.products.map((p) => {
                  const currentInput = stockChanges[p.id] ?? p.stockQty;
                  const hasChanged = currentInput !== p.stockQty;

                  return (
                    <tr key={p.id} className="hover:bg-[#F0301A]/5 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                            <div className="w-10 h-10 relative hairline-all shrink-0 bg-neutral-200">
                              <Image
                                src={p.images[0]}
                                alt={p.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 hairline-all shrink-0 bg-[#F0301A]/10 flex items-center justify-center font-mono font-bold text-xs">
                              ++
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-[#161412] uppercase text-sm">{p.name}</div>
                            <div className="font-mono text-[10px] text-[#F0301A]/80">
                              SKU: {p.sku} · {p.specimenNo}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono uppercase text-[#161412]/80">{p.category}</td>
                      <td className="p-3 text-right font-mono font-bold text-[#161412]">
                        ${money(p.price)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-[#161412]">
                        {p.unitsSold} units
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-[#F0301A]">
                        ${money(p.revenue)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5 hairline-all px-2 py-1 bg-white">
                          <button
                            type="button"
                            onClick={() => handleStockDelta(p.id, -1)}
                            disabled={currentInput <= 0}
                            className="w-5 h-5 flex items-center justify-center font-mono font-bold text-xs hover:bg-[#F0301A]/10 disabled:opacity-30"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={currentInput}
                            onChange={(e) =>
                              setStockChanges({
                                ...stockChanges,
                                [p.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                              })
                            }
                            className="w-12 text-center font-mono font-bold text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStockDelta(p.id, 1)}
                            className="w-5 h-5 flex items-center justify-center font-mono font-bold text-xs hover:bg-[#F0301A]/10"
                          >
                            +
                          </button>
                        </div>
                        {hasChanged && (
                          <button
                            onClick={() => handleSaveStock(p)}
                            disabled={updatingId === p.id}
                            className="ml-2 px-2 py-1 bg-[#F0301A] text-[#EFE7DC] text-[10px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                          >
                            {updatingId === p.id ? '...' : 'SAVE'}
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {p.stockQty > 5 ? (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            IN STOCK
                          </span>
                        ) : p.stockQty > 0 ? (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                            LOW STOCK ({p.stockQty})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
                            DEPLETED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RBAC Security Boundary Verification */}
      <div className="hairline-all p-6 bg-[#EFE7DC] space-y-4">
        <div className="flex items-baseline justify-between border-b border-[#F0301A]/20 pb-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]">
              SECURITY AUDIT &amp; ACCESS CONTROL
            </div>
            <h3 className="font-display-grotesk font-black text-xl uppercase tracking-tight text-[#161412]">
              ROLE-BASED AUTHORIZATION BOUNDARIES (RBAC)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 border border-emerald-300">
            ACTIVE LEVEL: VENDOR
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-4 hairline-all bg-emerald-500/5 space-y-2">
            <div className="font-bold uppercase text-emerald-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              AUTHORIZED PRIVILEGES
            </div>
            <ul className="space-y-1.5 text-[#161412]/80 list-disc list-inside">
              <li>Read &amp; adjust stock for assigned brand specimens (`PORTO WORKS`)</li>
              <li>Monitor real-time fulfillment volumes &amp; gross sales performance</li>
              <li>View public storefront specimen listings and active customer cart demand</li>
            </ul>
          </div>

          <div className="p-4 hairline-all bg-red-500/5 space-y-2">
            <div className="font-bold uppercase text-red-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              RESTRICTED PRIVILEGES (403 FORBIDDEN)
            </div>
            <ul className="space-y-1.5 text-[#161412]/80 list-disc list-inside">
              <li>
                <Link href="/dashboard/audit" className="underline hover:text-red-600">
                  Audit Trail Logs (`/dashboard/audit`)
                </Link>{' '}
                — Gated to Administrator
              </li>
              <li>
                <Link href="/dashboard/customers" className="underline hover:text-red-600">
                  Customer Directory &amp; PII (`/dashboard/customers`)
                </Link>{' '}
                — Gated to Administrator
              </li>
              <li>
                <Link href="/dashboard/health" className="underline hover:text-red-600">
                  System Health &amp; Diagnostics (`/dashboard/health`)
                </Link>{' '}
                — Gated to Administrator
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
