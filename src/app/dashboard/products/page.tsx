'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product, CategoryRef, BrandRef } from '@/lib/types';
import { ImageUpload } from '@/components/ui/ImageUpload';

interface ProductFormData {
  id?: string;
  sku: string;
  specimenNo: string;
  name: string;
  price: number;
  originalPrice: number | null;
  categoryId: string;
  brandId: string;
  description: string;
  details: string;
  images: string;
  stockQty: number;
  sizes: string;
  isFeatured: boolean;
  isNew: boolean;
  isSale: boolean;
}

const initialForm: ProductFormData = {
  sku: '',
  specimenNo: '',
  name: '',
  price: 150,
  originalPrice: null,
  categoryId: '',
  brandId: '',
  description: '',
  details: '',
  images: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80',
  stockQty: 10,
  sizes: 'S, M, L, XL',
  isFeatured: false,
  isNew: true,
  isSale: false,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryRef[]>([]);
  const [brands, setBrands] = useState<BrandRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW' | 'OUT'>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchCatalogData = async () => {
    try {
      setLoading(true);
      const [prodsRes, catsRes, brandsRes] = await Promise.all([
        fetch('/api/products?limit=200'),
        fetch('/api/categories'),
        fetch('/api/brands'),
      ]);

      const [prodsData, catsData, brandsData] = await Promise.all([
        prodsRes.json(),
        catsRes.json(),
        brandsRes.json(),
      ]);

      if (prodsData.success) setProducts(prodsData.data.products);
      if (catsData.success) setCategories(catsData.data.categories);
      if (brandsData.success) setBrands(brandsData.data.brands);
    } catch {
      setError('Failed to fetch product catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCatalogData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase()) ||
        p.specimenNo.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        categoryFilter === 'ALL' || p.category.toLowerCase() === categoryFilter.toLowerCase();

      let matchStock = true;
      if (stockFilter === 'IN_STOCK') matchStock = p.stockCount > 5;
      else if (stockFilter === 'LOW') matchStock = p.stockCount > 0 && p.stockCount <= 5;
      else if (stockFilter === 'OUT') matchStock = p.stockCount === 0;

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const handleOpenAdd = () => {
    setForm({
      ...initialForm,
      categoryId: categories[0]?.id || '',
      brandId: brands[0]?.id || '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === p.category.toLowerCase()
    );
    const matchedBrand = brands.find((b) => b.name.toLowerCase() === p.brand.toLowerCase());

    setForm({
      id: p.id,
      sku: p.slug,
      specimenNo: p.specimenNo,
      name: p.name,
      price: p.price,
      originalPrice: p.originalPrice ?? null,
      categoryId: matchedCategory?.id || categories[0]?.id || '',
      brandId: matchedBrand?.id || brands[0]?.id || '',
      description: p.description,
      details: (p.details || []).join('\n'),
      images: (p.images || []).join(', '),
      stockQty: p.stockCount,
      sizes: (p.sizes || []).join(', '),
      isFeatured: Boolean(p.isFeatured),
      isNew: Boolean(p.isNew),
      isSale: Boolean(p.isSale),
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      sku: form.sku.trim(),
      specimenNo: form.specimenNo.trim() || undefined,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      stockQty: Number(form.stockQty),
      categoryId: form.categoryId,
      brandId: form.brandId,
      sizes: form.sizes
        ? form.sizes
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      details: form.details
        ? form.details
            .split('\n')
            .map((d) => d.trim())
            .filter(Boolean)
        : [],
      images: form.images
        ? form.images
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean)
        : [],
      isFeatured: form.isFeatured,
      isNew: form.isNew,
      isSale: form.isSale,
    };

    try {
      const url = form.id ? `/api/products/${form.id}` : '/api/products';
      const method = form.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save product');
      }

      setModalOpen(false);
      await fetchCatalogData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleStockAdjust = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stockCount + delta);
    setActionId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stockQty: newStock }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, stockCount: newStock, inStock: newStock > 0 } : p
          )
        );
      } else {
        alert(data.error || 'Failed to adjust stock');
      }
    } catch {
      alert('Error updating stock count');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (product: Product) => {
    if (
      !confirm(
        `Are you sure you want to delete "${product.name}" (${product.slug.toUpperCase()})?\nIf it has past orders, it will be deactivated with 0 stock.`
      )
    ) {
      return;
    }

    setActionId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (data.data?.deactivated) {
          alert(`Product deactivated: ${data.data.message}`);
        }
        await fetchCatalogData();
      } else {
        alert(data.error || 'Failed to delete product');
      }
    } catch {
      alert('Network error while deleting product');
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
            CATALOG &amp; PRODUCT CONTROLLER
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[#F0301A]/70 mt-1">
            ENTERPRISE PRODUCT LIFECYCLE, VARIANTS, PRICING &amp; REAL-TIME STOCK MANAGEMENT
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="self-start md:self-auto px-5 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#F0301A] text-[#EFE7DC] border border-[#F0301A] hover:bg-[#d02814] cursor-pointer shadow-sm transition-all"
        >
          + ADD NEW PRODUCT
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70 mb-1">
            SEARCH PRODUCTS
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FILTER BY NAME, SKU, OR SPECIMEN..."
            className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 text-xs font-mono uppercase text-[#161412] placeholder-[#161412]/40 focus:outline-none focus:border-[#F0301A]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70 mb-1">
            CATEGORY FILTER
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 text-xs font-bold uppercase text-[#161412] focus:outline-none focus:border-[#F0301A]"
          >
            <option value="ALL">ALL CATEGORIES</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70 mb-1">
            STOCK STATUS
          </label>
          <div className="flex gap-1">
            {[
              { id: 'ALL', label: 'ALL' },
              { id: 'IN_STOCK', label: 'IN STOCK' },
              { id: 'LOW', label: 'LOW (<5)' },
              { id: 'OUT', label: 'OUT' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStockFilter(st.id as typeof stockFilter)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                  stockFilter === st.id
                    ? 'bg-[#F0301A] text-[#EFE7DC] border-[#F0301A]'
                    : 'bg-[#FFFFFF] text-[#F0301A] border-[#F0301A]/30 hover:border-[#F0301A]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      {loading ? (
        <div className="py-24 text-center text-xs font-bold uppercase tracking-widest">
          SYNCING PRODUCT CATALOG FROM POSTGRESQL...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 border border-[#F0301A]/30 text-center text-xs font-bold uppercase tracking-widest bg-[#FFFFFF]">
          NO PRODUCTS MATCH CURRENT SEARCH CRITERIA.
        </div>
      ) : (
        <div className="border border-[#F0301A]/30 overflow-x-auto bg-[#FFFFFF]">
          <table className="w-full text-left text-xs uppercase font-sans">
            <thead className="bg-[#EFE7DC] border-b border-[#F0301A]/30 font-display-grotesk font-bold text-[#F0301A]">
              <tr>
                <th className="p-3.5">ITEM / SKU</th>
                <th className="p-3.5">SPECIMEN</th>
                <th className="p-3.5">CATEGORY &amp; BRAND</th>
                <th className="p-3.5">UNIT PRICE</th>
                <th className="p-3.5">LIVE STOCK</th>
                <th className="p-3.5">FLAGS</th>
                <th className="p-3.5 text-right">CONTROLS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0301A]/10 text-[#161412]">
              {filteredProducts.map((p) => {
                const isActionBusy = actionId === p.id;
                const isOutOfStock = p.stockCount === 0;
                const isLow = p.stockCount > 0 && p.stockCount <= 5;

                return (
                  <tr key={p.id} className="hover:bg-[#EFE7DC]/30 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          <div className="relative w-10 h-12 bg-[#EFE7DC] shrink-0 border border-[#F0301A]/20">
                            <Image
                              src={p.images[0]}
                              alt={p.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-12 bg-[#EFE7DC] shrink-0 flex items-center justify-center text-[10px] text-[#F0301A]/40 font-mono">
                            N/A
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-[#161412] tracking-tight">{p.name}</div>
                          <div className="font-mono text-[10px] text-[#F0301A] font-bold">
                            {p.slug.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-[#161412]/70">
                      {p.specimenNo}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[11px]">{p.category}</div>
                      <div className="text-[10px] text-[#161412]/60">{p.brand}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#F0301A]">
                      ${p.price.toFixed(2)}
                      {p.originalPrice && (
                        <span className="text-[10px] text-[#161412]/40 line-through ml-1.5 font-normal">
                          ${p.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider border ${
                            isOutOfStock
                              ? 'bg-[#F0301A]/10 text-[#F0301A] border-[#F0301A]'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {p.stockCount} UNITS
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            disabled={isActionBusy || p.stockCount === 0}
                            onClick={() => handleStockAdjust(p, -1)}
                            className="w-5 h-5 flex items-center justify-center border border-[#F0301A]/30 text-xs font-bold hover:bg-[#F0301A] hover:text-[#EFE7DC] disabled:opacity-30 cursor-pointer"
                            title="Decrement stock by 1"
                          >
                            -
                          </button>
                          <button
                            disabled={isActionBusy}
                            onClick={() => handleStockAdjust(p, 1)}
                            className="w-5 h-5 flex items-center justify-center border border-[#F0301A]/30 text-xs font-bold hover:bg-[#F0301A] hover:text-[#EFE7DC] disabled:opacity-30 cursor-pointer"
                            title="Increment stock by 1"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1 text-[9px] font-bold tracking-tighter">
                        {p.isFeatured && (
                          <span className="bg-[#F0301A] text-[#EFE7DC] px-1.5 py-0.5">
                            FEATURED
                          </span>
                        )}
                        {p.isNew && (
                          <span className="border border-[#F0301A] text-[#F0301A] px-1.5 py-0.5">
                            NEW
                          </span>
                        )}
                        {p.isSale && (
                          <span className="bg-[#161412] text-[#EFE7DC] px-1.5 py-0.5">SALE</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/product/${p.slug}`}
                          target="_blank"
                          className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#F0301A]/30 hover:border-[#F0301A] text-[#F0301A]"
                          title="View on Storefront"
                        >
                          VIEW ↗
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#F0301A]/10 text-[#F0301A] border border-[#F0301A]/30 hover:bg-[#F0301A] hover:text-[#EFE7DC] cursor-pointer"
                        >
                          EDIT
                        </button>
                        <button
                          disabled={isActionBusy}
                          onClick={() => handleDelete(p)}
                          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-red-300 text-red-700 hover:bg-red-600 hover:text-white cursor-pointer disabled:opacity-40"
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

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#161412]/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#EFE7DC] border-2 border-[#F0301A] max-w-2xl w-full p-6 shadow-2xl my-8 text-[#161412]">
            <div className="flex items-center justify-between border-b border-[#F0301A]/30 pb-3 mb-4">
              <h2 className="font-display-grotesk font-black text-xl text-[#F0301A] uppercase tracking-tight">
                {form.id ? `EDIT PRODUCT: ${form.sku.toUpperCase()}` : 'NEW PRODUCT CREATION'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    SKU (SLUG) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g. hh-13"
                    className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-mono uppercase focus:outline-none focus:border-[#F0301A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    SPECIMEN NO.
                  </label>
                  <input
                    type="text"
                    value={form.specimenNo}
                    onChange={(e) => setForm({ ...form, specimenNo: e.target.value })}
                    placeholder="e.g. Specimen No. HH13"
                    className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-mono uppercase focus:outline-none focus:border-[#F0301A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  PRODUCT NAME *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. HEAVYWEIGHT MODULAR VEST"
                  className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    CATEGORY *
                  </label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                  >
                    <option value="">SELECT CATEGORY</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    BRAND *
                  </label>
                  <select
                    required
                    value={form.brandId}
                    onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                  >
                    <option value="">SELECT BRAND</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    PRICE ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-mono font-bold focus:outline-none focus:border-[#F0301A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    ORIGINAL PRICE ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={form.originalPrice ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        originalPrice: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="Optional"
                    className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-mono focus:outline-none focus:border-[#F0301A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                    INITIAL STOCK QTY *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.stockQty}
                    onChange={(e) => setForm({ ...form, stockQty: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-mono font-bold focus:outline-none focus:border-[#F0301A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  SIZES (COMMA SEPARATED)
                </label>
                <input
                  type="text"
                  value={form.sizes}
                  onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                  placeholder="e.g. S, M, L, XL, XXL"
                  className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 uppercase font-mono focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              <div>
                <ImageUpload
                  images={form.images ? form.images.split(',').map((s) => s.trim()).filter(Boolean) : []}
                  onChange={(urls) => setForm({ ...form, images: urls.join(', ') })}
                  maxFiles={5}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Architectural product copy and silhouette specifications..."
                  className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 text-xs focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  BULLET DETAILS (ONE PER LINE)
                </label>
                <textarea
                  rows={3}
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  placeholder="480GSM 100% Cotton&#10;Made in Portugal&#10;Double layered hood"
                  className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-mono text-xs focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-6 pt-1 border-t border-[#F0301A]/20">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="accent-[#F0301A]"
                  />
                  FEATURED ITEM
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase">
                  <input
                    type="checkbox"
                    checked={form.isNew}
                    onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
                    className="accent-[#F0301A]"
                  />
                  NEW ARRIVAL
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase">
                  <input
                    type="checkbox"
                    checked={form.isSale}
                    onChange={(e) => setForm({ ...form, isSale: e.target.checked })}
                    className="accent-[#F0301A]"
                  />
                  ON SALE
                </label>
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
                  {saving ? 'COMMITTING TO POSTGRES...' : form.id ? 'UPDATE PRODUCT' : 'CREATE PRODUCT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
