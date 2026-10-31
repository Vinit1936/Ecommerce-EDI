'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface WarehouseInfo {
  id: string;
  name: string;
  location: string;
  totalUnits: number;
}

interface InventoryItem {
  id: string;
  sku: string;
  specimenNo: string;
  name: string;
  category: string;
  brand: string;
  totalStock: number;
  price: number;
  images: string[];
  isLowStock: boolean;
  isDepleted: boolean;
  warehouseBreakdown: {
    warehouseId: string;
    warehouseName: string;
    quantityAvailable: number;
  }[];
}

interface InventoryData {
  warehouses: WarehouseInfo[];
  items: InventoryItem[];
  metrics: {
    totalStock: number;
    totalSkus: number;
    lowStockCount: number;
    depletedCount: number;
    warehouseCount: number;
  };
}

export default function AdminInventoryPage() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState<InventoryItem | null>(null);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferring, setTransferring] = useState(false);

  // Direct Adjust Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<InventoryItem | null>(null);
  const [adjustWarehouseId, setAdjustWarehouseId] = useState('');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjusting, setAdjusting] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/inventory');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setFeedback({ type: 'error', message: json.error || 'Failed to fetch inventory data' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error retrieving inventory telemetry.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInventory();
  }, []);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());

      const matchLowStock = !onlyLowStock || item.isLowStock || item.isDepleted;

      const matchWarehouse =
        selectedWarehouseFilter === 'ALL' ||
        item.warehouseBreakdown.some(
          (wb) => wb.warehouseId === selectedWarehouseFilter && wb.quantityAvailable > 0
        );

      return matchSearch && matchLowStock && matchWarehouse;
    });
  }, [data, search, onlyLowStock, selectedWarehouseFilter]);

  const handleOpenTransfer = (item: InventoryItem) => {
    setTransferProduct(item);
    if (data?.warehouses && data.warehouses.length >= 2) {
      setFromWarehouseId(data.warehouses[0].id);
      setToWarehouseId(data.warehouses[1].id);
    }
    setTransferQty(1);
    setTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProduct || !fromWarehouseId || !toWarehouseId) return;

    if (fromWarehouseId === toWarehouseId) {
      setFeedback({ type: 'error', message: 'Source and destination facilities must be different.' });
      return;
    }

    try {
      setTransferring(true);
      setFeedback(null);
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TRANSFER',
          productId: transferProduct.id,
          fromWarehouseId,
          toWarehouseId,
          quantity: transferQty,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete stock transfer');
      }

      setFeedback({
        type: 'success',
        message: `Successfully transferred ${transferQty} units of ${transferProduct.name} from ${json.data.source.name} to ${json.data.destination.name}.`,
      });
      setTransferModalOpen(false);
      await fetchInventory();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Transfer execution error',
      });
    } finally {
      setTransferring(false);
    }
  };

  const handleOpenAdjust = (item: InventoryItem, warehouseId?: string) => {
    setAdjustProduct(item);
    const targetWhId = warehouseId || data?.warehouses[0]?.id || '';
    setAdjustWarehouseId(targetWhId);

    const existingQty =
      item.warehouseBreakdown.find((wb) => wb.warehouseId === targetWhId)?.quantityAvailable ?? 0;
    setAdjustQty(existingQty);
    setAdjustModalOpen(true);
  };

  const handleExecuteAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || !adjustWarehouseId) return;

    try {
      setAdjusting(true);
      setFeedback(null);
      const res = await fetch('/api/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ADJUST',
          productId: adjustProduct.id,
          warehouseId: adjustWarehouseId,
          quantity: adjustQty,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to adjust warehouse stock');
      }

      setFeedback({
        type: 'success',
        message: `Stock for ${adjustProduct.name} at ${json.data.warehouseName} set to ${adjustQty} units (Total: ${json.data.totalStock}).`,
      });
      setAdjustModalOpen(false);
      await fetchInventory();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Adjustment error',
      });
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/60 mb-1">
            <Link href="/dashboard" className="hover:underline">
              ← DASHBOARD
            </Link>{' '}
            / LOGISTICS
          </div>
          <h1 className="font-display-grotesk font-black text-4xl sm:text-5xl uppercase tracking-tighter">
            MULTI-WAREHOUSE INVENTORY
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchInventory()}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider hairline-all hover:bg-[#F0301A] hover:text-[#EFE7DC] transition-colors"
          >
            ↻ REFRESH MATRIX
          </button>
        </div>
      </div>

      <div className="hairline-b mb-8" />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="hairline-all p-5 bg-[#F0301A]/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70">
            TOTAL UNITS ON-HAND
          </div>
          <div className="font-display-grotesk font-black text-3xl mt-1">
            {data?.metrics.totalStock ?? '—'}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">
            across {data?.metrics.totalSkus ?? 0} catalog specimens
          </div>
        </div>

        <div className="hairline-all p-5 bg-[#F0301A]/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/70">
            FACILITIES ACTIVE
          </div>
          <div className="font-display-grotesk font-black text-3xl mt-1">
            {data?.metrics.warehouseCount ?? '—'}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">global distribution centers</div>
        </div>

        <div className="hairline-all p-5 bg-[#F0301A]/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
            LOW STOCK ALERTS (&le; 5)
          </div>
          <div className="font-display-grotesk font-black text-3xl mt-1 text-amber-700">
            {data?.metrics.lowStockCount ?? 0}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">items approaching depletion</div>
        </div>

        <div className="hairline-all p-5 bg-[#F0301A]/5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-red-700">
            DEPLETED SPECIMENS (0)
          </div>
          <div className="font-display-grotesk font-black text-3xl mt-1 text-red-700">
            {data?.metrics.depletedCount ?? 0}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">urgent replenishment required</div>
        </div>
      </div>

      {/* Facilities Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {data?.warehouses.map((wh) => (
          <div key={wh.id} className="hairline-all p-4 bg-[#EFE7DC] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase text-xs text-[#161412]">{wh.name}</span>
              <span className="font-mono font-black text-xs px-2 py-0.5 bg-[#F0301A]/10 text-[#F0301A]">
                {wh.totalUnits} UNITS
              </span>
            </div>
            <div className="font-mono text-[10px] text-[#161412]/60">{wh.location}</div>
          </div>
        ))}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 text-xs font-bold uppercase tracking-wider hairline-all flex items-center justify-between ${
            feedback.type === 'success' ? 'bg-[#F0301A]/10 text-[#F0301A]' : 'bg-red-700 text-white'
          }`}
        >
          <span>● {feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="underline ml-4">
            DISMISS
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="hairline-all p-4 mb-8 flex flex-wrap items-center justify-between gap-4 bg-[#F0301A]/5">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <input
            type="text"
            placeholder="FILTER BY SPECIMEN NAME, SKU, CATEGORY..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent hairline-all px-3 py-2 text-xs font-mono text-[#161412] placeholder:text-[#F0301A]/40 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              className="accent-[#F0301A]"
            />
            <span className="text-amber-800">LOW STOCK ONLY</span>
          </label>

          <span className="text-[#F0301A]/50">|</span>

          <span className="text-[#F0301A]/70">FACILITY:</span>
          <select
            value={selectedWarehouseFilter}
            onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
            className="bg-transparent hairline-all px-2 py-1.5 text-xs font-mono text-[#161412] focus:outline-none"
          >
            <option value="ALL">ALL FACILITIES</option>
            {data?.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-Warehouse Stock Matrix Table */}
      <div className="hairline-all overflow-x-auto bg-[#EFE7DC] mb-12">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold uppercase tracking-widest text-[#F0301A]/70 animate-pulse">
            LOADING REAL-TIME INVENTORY TELEMETRY...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="font-display-grotesk font-black text-xl uppercase tracking-tight">
              NO INVENTORY ALLOCATIONS MATCH
            </div>
            <p className="font-sans text-xs text-[#161412]/60">
              Try adjusting your search criteria or facility filter.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="hairline-b bg-[#F0301A]/10 text-[10px] font-bold uppercase tracking-widest">
                <th className="p-3">SPECIMEN / SKU</th>
                <th className="p-3">CATEGORY</th>
                <th className="p-3 text-center">TOTAL STOCK</th>
                {data?.warehouses.map((wh) => (
                  <th key={wh.id} className="p-3 text-center">
                    {wh.name}
                  </th>
                ))}
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0301A]/20">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#F0301A]/5 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-[#161412] text-sm uppercase">{item.name}</div>
                    <div className="font-mono text-[10px] text-[#F0301A]/80">
                      SKU: {item.sku} · {item.specimenNo}
                    </div>
                  </td>
                  <td className="p-3 font-mono uppercase text-[#161412]/70">{item.category}</td>
                  <td className="p-3 text-center">
                    <div className="font-mono font-black text-sm text-[#161412]">
                      {item.totalStock}
                    </div>
                    {item.isDepleted ? (
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
                        DEPLETED
                      </span>
                    ) : item.isLowStock ? (
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                        LOW STOCK
                      </span>
                    ) : (
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                        HEALTHY
                      </span>
                    )}
                  </td>

                  {/* Warehouse specific counts */}
                  {data?.warehouses.map((wh) => {
                    const match = item.warehouseBreakdown.find((wb) => wb.warehouseId === wh.id);
                    const qty = match ? match.quantityAvailable : 0;

                    return (
                      <td key={wh.id} className="p-3 text-center font-mono">
                        <button
                          onClick={() => handleOpenAdjust(item, wh.id)}
                          className="px-2 py-1 font-bold hover:bg-[#F0301A]/10 rounded transition-colors text-xs text-[#161412]"
                          title="Click to adjust quantity for this warehouse"
                        >
                          {qty}
                        </button>
                      </td>
                    );
                  })}

                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleOpenTransfer(item)}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#F0301A] text-[#EFE7DC] hover:opacity-90"
                    >
                      TRANSFER ⇄
                    </button>
                    <button
                      onClick={() => handleOpenAdjust(item)}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hairline-all hover:bg-[#F0301A] hover:text-[#EFE7DC]"
                    >
                      ADJUST
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Transfer Stock Modal */}
      {transferModalOpen && transferProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#EFE7DC] text-[#161412] max-w-lg w-full hairline-all p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-baseline justify-between border-b border-[#F0301A]/20 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]">
                  INTER-WAREHOUSE CONSIGNMENT
                </div>
                <h2 className="font-display-grotesk font-black text-2xl uppercase tracking-tight text-[#F0301A]">
                  TRANSFER SPECIMEN STOCK
                </h2>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-xs font-bold uppercase tracking-wider text-[#F0301A] hover:underline"
              >
                CLOSE ✕
              </button>
            </div>

            <div className="p-3 bg-[#F0301A]/5 hairline-all">
              <div className="font-bold text-sm uppercase text-[#161412]">{transferProduct.name}</div>
              <div className="font-mono text-xs text-[#F0301A]">
                SKU: {transferProduct.sku} · TOTAL ON-HAND: {transferProduct.totalStock} UNITS
              </div>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#F0301A] mb-1">
                    SOURCE FACILITY (ORIGIN)
                  </label>
                  <select
                    value={fromWarehouseId}
                    onChange={(e) => setFromWarehouseId(e.target.value)}
                    className="w-full bg-white hairline-all p-2 font-mono text-xs focus:outline-none"
                    required
                  >
                    {data?.warehouses.map((w) => {
                      const avail =
                        transferProduct.warehouseBreakdown.find((wb) => wb.warehouseId === w.id)
                          ?.quantityAvailable ?? 0;
                      return (
                        <option key={w.id} value={w.id}>
                          {w.name} ({avail} avail)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#F0301A] mb-1">
                    DESTINATION FACILITY
                  </label>
                  <select
                    value={toWarehouseId}
                    onChange={(e) => setToWarehouseId(e.target.value)}
                    className="w-full bg-white hairline-all p-2 font-mono text-xs focus:outline-none"
                    required
                  >
                    {data?.warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#F0301A] mb-1">
                  TRANSFER UNITS (CONSERVED)
                </label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-white hairline-all p-2 font-mono font-bold text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="p-3 hairline-all bg-white font-mono text-[11px] space-y-1">
                <div className="text-[9px] uppercase font-bold text-[#F0301A]">TRANSFER TELEMETRY:</div>
                <div className="text-[#161412]/80">
                  Moving {transferQty} unit(s). Total product inventory across all facilities remains strictly conserved at {transferProduct.totalStock} units.
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F0301A]/20">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 hairline-all uppercase font-bold text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="px-4 py-2 bg-[#F0301A] text-[#EFE7DC] uppercase font-bold text-xs hover:opacity-90 disabled:opacity-50"
                >
                  {transferring ? 'COMMITTING TRANSACTION...' : 'EXECUTE TRANSFER ⇄'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Stock Adjust Modal */}
      {adjustModalOpen && adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#EFE7DC] text-[#161412] max-w-md w-full hairline-all p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-baseline justify-between border-b border-[#F0301A]/20 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]">
                  FACILITY INVENTORY
                </div>
                <h2 className="font-display-grotesk font-black text-2xl uppercase tracking-tight text-[#F0301A]">
                  ADJUST STOCK
                </h2>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="text-xs font-bold uppercase tracking-wider text-[#F0301A] hover:underline"
              >
                CLOSE ✕
              </button>
            </div>

            <div className="p-3 bg-[#F0301A]/5 hairline-all">
              <div className="font-bold text-sm uppercase text-[#161412]">{adjustProduct.name}</div>
              <div className="font-mono text-xs text-[#F0301A]">SKU: {adjustProduct.sku}</div>
            </div>

            <form onSubmit={handleExecuteAdjust} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#F0301A] mb-1">
                  SELECT WAREHOUSE FACILITY
                </label>
                <select
                  value={adjustWarehouseId}
                  onChange={(e) => {
                    const newWhId = e.target.value;
                    setAdjustWarehouseId(newWhId);
                    const existing =
                      adjustProduct.warehouseBreakdown.find((wb) => wb.warehouseId === newWhId)
                        ?.quantityAvailable ?? 0;
                    setAdjustQty(existing);
                  }}
                  className="w-full bg-white hairline-all p-2 font-mono text-xs focus:outline-none"
                  required
                >
                  {data?.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#F0301A] mb-1">
                  NEW ON-HAND QUANTITY AT THIS FACILITY
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-white hairline-all p-2 font-mono font-bold text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#F0301A]/20">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 hairline-all uppercase font-bold text-xs"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-4 py-2 bg-[#F0301A] text-[#EFE7DC] uppercase font-bold text-xs hover:opacity-90 disabled:opacity-50"
                >
                  {adjusting ? 'SAVING...' : 'SAVE STOCK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
