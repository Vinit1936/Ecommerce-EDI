'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface CategoryItem {
  id: string;
  name: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  productCount: number;
  childCount: number;
  createdAt: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories?detailed=true');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch {
      setError('Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.parentCategoryName && c.parentCategoryName.toLowerCase().includes(search.toLowerCase()))
    );
  }, [categories, search]);

  const handleOpenAdd = (parentPresetId?: string) => {
    setEditingCategory(null);
    setName('');
    setParentCategoryId(parentPresetId || '');
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setParentCategoryId(cat.parentCategoryId || '');
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      parentCategoryId: parentCategoryId || null,
    };

    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save category');
      }

      setModalOpen(false);
      await fetchCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (
      !confirm(
        `Are you sure you want to delete category "${cat.name.toUpperCase()}"?\nThis action requires 0 products and 0 subcategories attached.`
      )
    ) {
      return;
    }

    setActionId(cat.id);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchCategories();
      } else {
        alert(data.error || 'Failed to delete category');
      }
    } catch {
      alert('Network error while deleting category');
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
            CATEGORY HIERARCHY &amp; TAXONOMY
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[#F0301A]/70 mt-1">
            MANAGE ROOT CATEGORIES, NESTED SUB-CATEGORIES, AND CATALOG PRODUCT ALLOCATIONS
          </p>
        </div>

        <button
          onClick={() => handleOpenAdd()}
          className="self-start md:self-auto px-5 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#F0301A] text-[#EFE7DC] border border-[#F0301A] hover:bg-[#d02814] cursor-pointer shadow-sm transition-all"
        >
          + ADD CATEGORY
        </button>
      </div>

      {/* Search / Filter Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="max-w-md w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FILTER CATEGORIES OR PARENTS..."
            className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 text-xs font-mono uppercase text-[#161412] placeholder-[#161412]/40 focus:outline-none focus:border-[#F0301A]"
          />
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#F0301A]/80">
          TOTAL: {categories.length} CATEGORIES
        </div>
      </div>

      {/* Categories Table */}
      {loading ? (
        <div className="py-24 text-center text-xs font-bold uppercase tracking-widest">
          SYNCING TAXONOMY STRUCTURE FROM POSTGRESQL...
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="p-16 border border-[#F0301A]/30 text-center text-xs font-bold uppercase tracking-widest bg-[#FFFFFF]">
          NO CATEGORIES FOUND.
        </div>
      ) : (
        <div className="border border-[#F0301A]/30 overflow-x-auto bg-[#FFFFFF]">
          <table className="w-full text-left text-xs uppercase font-sans">
            <thead className="bg-[#EFE7DC] border-b border-[#F0301A]/30 font-display-grotesk font-bold text-[#F0301A]">
              <tr>
                <th className="p-3.5">CATEGORY NAME</th>
                <th className="p-3.5">HIERARCHY TYPE</th>
                <th className="p-3.5">PARENT CATEGORY</th>
                <th className="p-3.5">LINKED PRODUCTS</th>
                <th className="p-3.5">CHILD SUB-CATEGORIES</th>
                <th className="p-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0301A]/10 text-[#161412]">
              {filteredCategories.map((c) => {
                const isChild = Boolean(c.parentCategoryId);
                const isActionBusy = actionId === c.id;

                return (
                  <tr key={c.id} className="hover:bg-[#EFE7DC]/30 transition-colors">
                    <td className="p-3.5 font-bold text-[#161412]">
                      <div className="flex items-center gap-2">
                        {isChild && <span className="text-[#F0301A] font-mono text-sm">└─</span>}
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider border ${
                          isChild
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-[#F0301A]/10 text-[#F0301A] border-[#F0301A]/30'
                        }`}
                      >
                        {isChild ? 'SUB-CATEGORY' : 'ROOT CATEGORY'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-[#161412]/70">
                      {c.parentCategoryName ? (
                        <span className="font-bold text-[#F0301A]">
                          {c.parentCategoryName.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-[#161412]/40">— ROOT —</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#161412]">
                      {c.productCount} PRODUCTS
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-[#161412]/70">
                      {c.childCount} NESTED
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {!isChild && (
                          <button
                            onClick={() => handleOpenAdd(c.id)}
                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#F0301A]/30 text-[#F0301A] hover:bg-[#F0301A] hover:text-[#EFE7DC] cursor-pointer"
                            title="Add Nested Child Category"
                          >
                            + SUB
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#F0301A]/10 text-[#F0301A] border border-[#F0301A]/30 hover:bg-[#F0301A] hover:text-[#EFE7DC] cursor-pointer"
                        >
                          EDIT
                        </button>
                        <button
                          disabled={isActionBusy || c.productCount > 0 || c.childCount > 0}
                          onClick={() => handleDelete(c)}
                          className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-red-300 text-red-700 hover:bg-red-600 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            c.productCount > 0
                              ? 'Cannot delete: Products are assigned to this category'
                              : c.childCount > 0
                              ? 'Cannot delete: Sub-categories are nested under this category'
                              : 'Delete Category'
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
                {editingCategory ? `EDIT: ${editingCategory.name}` : 'NEW CATEGORY'}
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
                  CATEGORY NAME *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OUTERWEAR"
                  className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#F0301A] mb-1">
                  PARENT CATEGORY (OPTIONAL FOR HIERARCHY)
                </label>
                <select
                  value={parentCategoryId}
                  onChange={(e) => setParentCategoryId(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#F0301A]/30 p-2 font-bold uppercase focus:outline-none focus:border-[#F0301A]"
                >
                  <option value="">— NONE (ROOT CATEGORY) —</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name.toUpperCase()}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-[#161412]/60 mt-1 uppercase">
                  Self-referential hierarchy links this category as a child node under the chosen parent.
                </p>
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
                  {saving ? 'SAVING...' : editingCategory ? 'UPDATE' : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
