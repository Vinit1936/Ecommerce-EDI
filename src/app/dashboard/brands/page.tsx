'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface BrandItem {
  id: string;
  name: string;
  productCount: number;
  createdAt: string;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/brands?detailed=true');
      const data = await res.json();
      if (data.success) {
        setBrands(data.data.brands);
      }
    } catch {
      setError('Failed to fetch brands.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBrands();
  }, []);

  const filteredBrands = useMemo(() => {
    return brands.filter(
      (b) => !search.trim() || b.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [brands, search]);

  const handleOpenAdd = () => {
    setEditingBrand(null);
    setName('');
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (brand: BrandItem) => {
    setEditingBrand(brand);
    setName(brand.name);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { name: name.trim() };

    try {
      const url = editingBrand ? `/api/brands/${editingBrand.id}` : '/api/brands';
      const method = editingBrand ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save brand');
      }

      setModalOpen(false);
      await fetchBrands();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (brand: BrandItem) => {
    if (
      !confirm(
        `Are you sure you want to delete brand "${brand.name.toUpperCase()}"?\nThis action requires 0 active catalog products associated.`
      )
    ) {
      return;
    }

    setActionId(brand.id);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchBrands();
      } else {
        alert(data.error || 'Failed to delete brand');
      }
    } catch {
      alert('Network error while deleting brand');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <div className="border-b border-[#F0301A]/30 pb-6 mb-8 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard"
              className="text-xs font-bold uppercase tracking-widest hover:underline"
            >
              ← ADMIN DASHBOARD
            </Link>
          </div>
          <h1 className="font-display-grotesk font-black text-3xl sm:text-5xl uppercase tracking-tight">
            BRAND &amp; MANUFACTURER REGISTRY
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[#F0301A]/70 mt-1">
            MANAGE ATELIER HOUSES, LABEL PARTNERSHIPS, AND PROVENANCE DIRECTORIES
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="self-start md:self-auto px-5 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#F0301A] text-[#EFE7DC] border border-[#F0301A] hover:bg-[#d02814] cursor-pointer shadow-sm transition-all"
        >
          + ADD BRAND
        </button>
      </div>

      {/* Search / Filter Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="max-w-md w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FILTER BRANDS..."
            className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 text-xs font-mono uppercase text-[#161412] placeholder-[#161412]/40 focus:outline-none focus:border-[#F0301A]"
          />
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#F0301A]/80">
          TOTAL: {brands.length} BRANDS
        </div>
      </div>

      {/* Brands Table */}
      {loading ? (
        <div className="py-24 text-center text-xs font-bold uppercase tracking-widest">
          SYNCING BRAND LEDGER FROM POSTGRESQL...
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="p-16 border border-[#F0301A]/30 text-center text-xs font-bold uppercase tracking-widest bg-[#FFFFFF]">
          NO BRANDS FOUND.
        </div>
      ) : (
        <div className="border border-[#F0301A]/30 overflow-x-auto bg-[#FFFFFF]">
          <table className="w-full text-left text-xs uppercase font-sans">
            <thead className="bg-[#EFE7DC] border-b border-[#F0301A]/30 font-display-grotesk font-bold text-[#F0301A]">
              <tr>
                <th className="p-3.5">BRAND NAME</th>
                <th className="p-3.5">CATALOG PRODUCTS</th>
                <th className="p-3.5">REGISTERED ON</th>
                <th className="p-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0301A]/10 text-[#161412]">
              {filteredBrands.map((b) => {
                const isActionBusy = actionId === b.id;

                return (
                  <tr key={b.id} className="hover:bg-[#EFE7DC]/30 transition-colors">
                    <td className="p-3.5 font-bold text-[#161412]">
                      <span className="font-display-grotesk font-black text-sm tracking-tight text-[#F0301A]">
                        {b.name}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#161412]">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider border ${
                          b.productCount > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {b.productCount} PRODUCTS
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-[#161412]/70">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/shop?brand=${encodeURIComponent(b.name)}`}
                          target="_blank"
                          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#F0301A]/30 hover:border-[#F0301A] text-[#F0301A]"
                          title="View Products by this Brand"
                        >
                          STOREFRONT ↗
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#F0301A]/10 text-[#F0301A] border border-[#F0301A]/30 hover:bg-[#F0301A] hover:text-[#EFE7DC] cursor-pointer"
                        >
                          EDIT
                        </button>
                        <button
                          disabled={isActionBusy || b.productCount > 0}
                          onClick={() => handleDelete(b)}
                          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-red-300 text-red-700 hover:bg-red-600 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            b.productCount > 0
                              ? 'Cannot delete: Products are associated with this brand'
                              : 'Delete Brand'
                          }
                        >
                          DEL
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161412]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#EFE7DC] border-2 border-[#F0301A] max-w-md w-full p-6 shadow-2xl text-[#161412]">
            <div className="flex items-center justify-between border-b border-[#F0301A]/30 pb-3 mb-4">
              <h2 className="font-display-grotesk font-black text-xl text-[#F0301A] uppercase tracking-tight">
                {editingBrand ? `EDIT: ${editingBrand.name}` : 'NEW BRAND'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-xs font-bold text-[#F0301A] hover:opacity-75 uppercase tracking-widest cursor-pointer"
              >
                [ CLOSE ✕ ]
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-800 text-xs font-bold mb-4 uppercase">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  BRAND / ATELIER NAME *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. MAISON MARGIELA"
                  className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F0301A]/30">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#F0301A]/40 text-[#F0301A] text-xs font-bold uppercase tracking-widest hover:border-[#F0301A] cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase tracking-widest hover:bg-[#d02814] cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'SAVING...' : editingBrand ? 'UPDATE' : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
