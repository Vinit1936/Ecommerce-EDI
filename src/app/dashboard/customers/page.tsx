'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface CustomerItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  registeredAt: string;
  orderCount: number;
  lifetimeSpend: number;
  lastOrderDate: string | null;
}

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState('spend-desc');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(search)}&status=${statusFilter}&sort=${sortBy}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data.customers);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load customers' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error loading customer directory.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleToggleStatus = async (customer: CustomerItem) => {
    const nextStatus = !customer.isActive;
    const actionLabel = nextStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${customer.name} (${customer.email})?`)) {
      return;
    }

    try {
      setTogglingId(customer.id);
      setFeedback(null);
      const res = await fetch(`/api/admin/customers/${customer.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update account status');
      }

      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, isActive: nextStatus } : c))
      );
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer((prev) => (prev ? { ...prev, isActive: nextStatus } : null));
      }
      setFeedback({
        type: 'success',
        message: `Account for ${customer.email} successfully ${nextStatus ? 'activated' : 'deactivated'}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error updating status',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const metrics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.isActive).length;
    const totalSpend = customers.reduce((acc, c) => acc + c.lifetimeSpend, 0);
    const repeatBuyers = customers.filter((c) => c.orderCount > 1).length;
    return { total, active, totalSpend, repeatBuyers };
  }, [customers]);

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/60 mb-1">
            <Link href="/dashboard" className="hover:underline">
              ← DASHBOARD
            </Link>{' '}
            / MANAGEMENT
          </div>
          <h1 className="font-display-grotesk font-black text-4xl sm:text-5xl uppercase tracking-tighter">
            CUSTOMER DIRECTORY
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCustomers()}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider hairline-all hover:bg-[#F0301A] hover:text-[#EFE7DC] transition-colors"
          >
            ↻ REFRESH DIRECTORY
          </button>
        </div>
      </div>

      <div className="hairline-b mb-8" />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="hairline-all p-4 bg-[#F0301A]/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70">
            TOTAL REGISTERED
          </div>
          <div className="font-display-grotesk font-black text-3xl mt-1">{metrics.total}</div>
        </div>
        <div className="hairline-all p-4 bg-[#F0301A]/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70">
            ACTIVE ACCOUNTS
          </div>
          <div className="font-display-grotesk font-black text-3xl mt-1">{metrics.active}</div>
        </div>
        <div className="hairline-all p-4 bg-[#F0301A]/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70">
            TOTAL LIFETIME SPEND
          </div>
          <div className="font-display-grotesk font-black text-3xl mt-1">${money(metrics.totalSpend)}</div>
        </div>
        <div className="hairline-all p-4 bg-[#F0301A]/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70">
            REPEAT PATRONS (&gt;1 ORDERS)
          </div>
          <div className="font-display-grotesk font-black text-3xl mt-1">{metrics.repeatBuyers}</div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 text-xs font-bold uppercase tracking-wider hairline-all flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-[#F0301A]/10 text-[#F0301A]'
              : 'bg-red-700 text-white'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="underline ml-4">
            DISMISS
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="hairline-all p-4 mb-8 flex flex-wrap items-center justify-between gap-4 bg-[#F0301A]/5">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[280px]">
          <input
            type="text"
            placeholder="SEARCH BY NAME, EMAIL, CITY, PHONE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent hairline-all px-3 py-2 text-xs font-mono placeholder:text-[#F0301A]/40 text-[#161412] focus:outline-none focus:ring-1 focus:ring-[#F0301A]"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase tracking-wider hover:opacity-90"
          >
            FILTER
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                // re-fetch after clear
                setTimeout(fetchCustomers, 10);
              }}
              className="px-2 py-2 text-xs font-bold uppercase underline"
            >
              CLEAR
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
            <span className="text-[#F0301A]/60 mr-1">STATUS:</span>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition-colors ${
                  statusFilter === s
                    ? 'bg-[#F0301A] text-[#EFE7DC]'
                    : 'hairline-all hover:bg-[#F0301A]/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span className="text-[#F0301A]/60">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent hairline-all px-2 py-1.5 text-xs font-mono text-[#161412] focus:outline-none"
            >
              <option value="spend-desc">LIFETIME SPEND (HIGH → LOW)</option>
              <option value="spend-asc">LIFETIME SPEND (LOW → HIGH)</option>
              <option value="orders-desc">ORDER VOLUME (HIGH → LOW)</option>
              <option value="newest">NEWEST REGISTERED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="hairline-all overflow-x-auto bg-[#EFE7DC]">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold uppercase tracking-widest text-[#F0301A]/70 animate-pulse">
            RETRIEVING CLIENTELE DIRECTORY...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="font-display-grotesk font-black text-xl uppercase tracking-tight">
              NO CLIENT RECORDS FOUND
            </div>
            <p className="font-sans text-xs text-[#161412]/60">
              No registered customers match your active filter criteria.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="hairline-b bg-[#F0301A]/10 text-[10px] font-bold uppercase tracking-widest">
                <th className="p-3">PATRON / IDENTITY</th>
                <th className="p-3">LOCATION</th>
                <th className="p-3 text-right">ORDERS</th>
                <th className="p-3 text-right">LIFETIME SPEND</th>
                <th className="p-3">REGISTERED</th>
                <th className="p-3">STATUS</th>
                <th className="p-3 text-right">ACCESS CONTROLS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0301A]/20">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#F0301A]/5 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-[#161412] text-sm uppercase">{c.name}</div>
                    <div className="font-mono text-[11px] text-[#F0301A]/80">{c.email}</div>
                    {c.phone && (
                      <div className="font-mono text-[10px] text-[#161412]/60 mt-0.5">
                        TEL: {c.phone}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-[#161412]">
                    <div>{c.city || '—'}, {c.country || ''}</div>
                    {c.postalCode && (
                      <div className="text-[10px] font-mono text-[#161412]/50">
                        PIN: {c.postalCode}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-[#161412]">
                    <span className="inline-block px-2 py-0.5 bg-[#F0301A]/10 rounded-sm">
                      {c.orderCount}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-black text-sm text-[#F0301A]">
                    ${money(c.lifetimeSpend)}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-[#161412]/70">
                    {new Date(c.registeredAt).toLocaleDateString()}
                    {c.lastLoginAt && (
                      <div className="text-[9px] text-[#161412]/50">
                        LAST SEEN: {new Date(c.lastLoginAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {c.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        SUSPENDED
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => setSelectedCustomer(c)}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hairline-all hover:bg-[#F0301A] hover:text-[#EFE7DC] transition-colors"
                    >
                      VIEW
                    </button>
                    <button
                      onClick={() => handleToggleStatus(c)}
                      disabled={togglingId === c.id}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                        c.isActive
                          ? 'border-red-600 text-red-700 hover:bg-red-600 hover:text-white'
                          : 'border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                      } ${togglingId === c.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {togglingId === c.id
                        ? 'SAVING...'
                        : c.isActive
                        ? 'SUSPEND'
                        : 'ACTIVATE'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick View Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#EFE7DC] text-[#161412] max-w-xl w-full hairline-all p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-baseline justify-between border-b border-[#F0301A]/20 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]">
                  CLIENT DOSSIER
                </div>
                <h2 className="font-display-grotesk font-black text-2xl uppercase tracking-tight text-[#F0301A]">
                  {selectedCustomer.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-xs font-bold uppercase tracking-wider text-[#F0301A] hover:underline"
              >
                CLOSE ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 hairline-all space-y-1">
                <div className="text-[10px] font-bold uppercase text-[#F0301A]">EMAIL ADDRESS</div>
                <div className="font-mono">{selectedCustomer.email}</div>
              </div>
              <div className="p-3 hairline-all space-y-1">
                <div className="text-[10px] font-bold uppercase text-[#F0301A]">PHONE CONTACT</div>
                <div className="font-mono">{selectedCustomer.phone || 'NOT PROVIDED'}</div>
              </div>
              <div className="col-span-2 p-3 hairline-all space-y-1">
                <div className="text-[10px] font-bold uppercase text-[#F0301A]">SHIPPING DESTINATION</div>
                <div>{selectedCustomer.address || 'NO STREET ADDRESS RECORDED'}</div>
                <div className="text-[#161412]/60">
                  {selectedCustomer.city || '—'}, {selectedCustomer.postalCode || ''}{' '}
                  {selectedCustomer.country || ''}
                </div>
              </div>
              <div className="p-3 hairline-all space-y-1 bg-[#F0301A]/5">
                <div className="text-[10px] font-bold uppercase text-[#F0301A]">LIFETIME EXPENDITURE</div>
                <div className="font-mono font-black text-lg text-[#F0301A]">
                  ${money(selectedCustomer.lifetimeSpend)}
                </div>
              </div>
              <div className="p-3 hairline-all space-y-1 bg-[#F0301A]/5">
                <div className="text-[10px] font-bold uppercase text-[#F0301A]">FULFILLED ORDERS</div>
                <div className="font-mono font-black text-lg text-[#F0301A]">
                  {selectedCustomer.orderCount} ORDERS
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#F0301A]/20">
              <div className="text-[10px] font-mono text-[#161412]/60">
                SYSTEM ID: {selectedCustomer.id}
              </div>
              <div className="space-x-3">
                <button
                  onClick={() => handleToggleStatus(selectedCustomer)}
                  disabled={togglingId === selectedCustomer.id}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border ${
                    selectedCustomer.isActive
                      ? 'border-red-600 text-red-700 hover:bg-red-600 hover:text-white'
                      : 'border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                  }`}
                >
                  {togglingId === selectedCustomer.id
                    ? 'PROCESSING...'
                    : selectedCustomer.isActive
                    ? 'SUSPEND ACCOUNT'
                    : 'ACTIVATE ACCOUNT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
