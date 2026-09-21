'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface HealthData {
  status: string;
  database: {
    provider: string;
    latencyMs: number;
    status: string;
  };
  system: {
    uptimeSeconds: number;
    nodeEnv: string;
    memoryUsageMb: number;
  };
  totalDatabaseRows: number;
  tableCounts: Record<string, number>;
  checkedAt: string;
}

export default function DashboardHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/health');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch diagnostics');
      }
    } catch {
      setError('Unable to contact health API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
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
            SYSTEM HEALTH &amp; DIAGNOSTICS
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[#F0301A]/70 mt-1">
            REAL-TIME DATABASE LATENCY, CONNECTION METRICS, AND TABLE POPULATION
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-4 py-2 bg-[#F0301A] text-[#EFE7DC] font-display-grotesk font-bold text-xs uppercase tracking-wider hover:opacity-90 cursor-pointer disabled:opacity-50"
        >
          {loading ? 'TESTING...' : 'RE-PROBE SYSTEM ⟳'}
        </button>
      </div>

      {error ? (
        <div className="p-8 border border-red-500 bg-red-50 text-red-700 text-xs font-bold uppercase">
          ERROR: {error}
        </div>
      ) : !data ? (
        <div className="py-20 text-center text-xs font-bold uppercase tracking-widest">
          PROBING POSTGRESQL CLUSTER &amp; RUNTIME STATE...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Metric 1 */}
            <div className="p-6 border border-[#F0301A]/30 bg-[#FFFFFF] space-y-2">
              <div className="text-xs uppercase font-bold tracking-wider text-[#161412]/60">
                OVERALL STATUS
              </div>
              <div className="font-display-grotesk font-black text-2xl text-emerald-700">
                ● {data.status}
              </div>
              <div className="text-[11px] text-[#161412]/70 font-mono">
                {data.database.provider}
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-6 border border-[#F0301A]/30 bg-[#FFFFFF] space-y-2">
              <div className="text-xs uppercase font-bold tracking-wider text-[#161412]/60">
                DB ROUND-TRIP LATENCY
              </div>
              <div className="font-display-grotesk font-black text-2xl text-[#F0301A] font-mono">
                {data.database.latencyMs} ms
              </div>
              <div className="text-[11px] font-bold tracking-wider text-emerald-700">
                STATUS: {data.database.status}
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-6 border border-[#F0301A]/30 bg-[#FFFFFF] space-y-2">
              <div className="text-xs uppercase font-bold tracking-wider text-[#161412]/60">
                TOTAL TABLE ROWS
              </div>
              <div className="font-display-grotesk font-black text-2xl font-mono text-[#161412]">
                {data.totalDatabaseRows.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#161412]/70">
                Across 16 monitored tables
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-6 border border-[#F0301A]/30 bg-[#FFFFFF] space-y-2">
              <div className="text-xs uppercase font-bold tracking-wider text-[#161412]/60">
                RUNTIME MEMORY
              </div>
              <div className="font-display-grotesk font-black text-2xl font-mono text-[#161412]">
                {data.system.memoryUsageMb} MB
              </div>
              <div className="text-[11px] text-[#161412]/70 font-mono">
                Node Uptime: {data.system.uptimeSeconds}s ({data.system.nodeEnv})
              </div>
            </div>
          </div>

          {/* Database Table Inventory Grid */}
          <div className="border border-[#F0301A]/30 bg-[#FFFFFF] p-6 space-y-4">
            <h2 className="font-display-grotesk font-bold text-base uppercase tracking-tight text-[#F0301A]">
              POSTGRESQL ENTITY INVENTORY &amp; RECORD COUNTERS
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs font-mono">
              {Object.entries(data.tableCounts).map(([table, count]) => (
                <div
                  key={table}
                  className="p-3 border border-[#F0301A]/20 bg-[#EFE7DC]/40 flex items-center justify-between"
                >
                  <span className="uppercase text-[#161412] truncate mr-2 font-bold">
                    {table}
                  </span>
                  <span className="text-[#F0301A] font-bold text-sm">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Colophon */}
          <div className="text-right text-[10px] font-mono text-[#161412]/60 uppercase">
            LAST PROBE COMPLETED AT: {new Date(data.checkedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
