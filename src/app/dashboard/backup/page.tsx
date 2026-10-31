'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface BackupRecord {
  id: string;
  fileName: string;
  fileUrl: string;
  sizeKb: number;
  totalEntities: number;
  status: 'COMPLETED' | 'FAILED';
  createdAt: string;
  existsOnDisk: boolean;
}

export default function AdminBackupPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/backup');
      const json = await res.json();
      if (json.success && json.data?.backups) {
        setBackups(json.data.backups);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to communicate with backup registry.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBackups();
  }, []);

  const handleTriggerBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setMessage({
          type: 'success',
          text: `Snapshot ${json.data.fileName} generated successfully (${json.data.sizeKb} KB).`,
        });
        await fetchBackups();
      } else {
        setMessage({
          type: 'error',
          text: json.error || 'Failed to generate snapshot archive.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network failure during snapshot creation.' });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCli = (fileName: string, id: string) => {
    const cmd = `npx tsx scripts/restore.ts backups/${fileName}`;
    navigator.clipboard.writeText(cmd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const totalSizeKb = backups.reduce((acc, b) => acc + (b.sizeKb || 0), 0);
  const completedCount = backups.filter((b) => b.status === 'COMPLETED').length;
  const latestBackup = backups[0];

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-[#F0301A]">
            ● SYSTEM ADMINISTRATION / DISASTER RECOVERY
          </span>
          <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl uppercase tracking-tighter">
            BACKUP &amp; RESTORE
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider">
          <Link href="/dashboard" className="hover:underline">
            ← MAIN DASHBOARD
          </Link>
          <Link href="/dashboard/health" className="hover:underline">
            HEALTH STATUS ↗
          </Link>
          <Link href="/dashboard/audit" className="hover:underline">
            AUDIT TRAIL ↗
          </Link>
        </div>
      </div>

      <div className="hairline-b mb-8" />

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 mb-6 border text-xs font-bold uppercase tracking-wider ${
            message.type === 'success'
              ? 'border-[#F0301A] bg-[#F0301A]/10 text-[#F0301A]'
              : 'border-red-600 bg-red-100 text-red-700'
          }`}
        >
          ● {message.text}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="hairline-all p-5 bg-[#EFE7DC]">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/70">
            TOTAL ARCHIVES
          </div>
          <div className="font-display-grotesk font-black text-3xl md:text-4xl tracking-tighter mt-2 text-[#F0301A]">
            {backups.length}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">
            {completedCount} verified completed
          </div>
        </div>

        <div className="hairline-all p-5 bg-[#EFE7DC]">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/70">
            LATEST SNAPSHOT
          </div>
          <div className="font-display-grotesk font-black text-2xl md:text-3xl tracking-tighter mt-2 text-[#F0301A] truncate">
            {latestBackup
              ? new Date(latestBackup.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'NONE'}
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">
            {latestBackup ? new Date(latestBackup.createdAt).toLocaleDateString() : 'No archives created'}
          </div>
        </div>

        <div className="hairline-all p-5 bg-[#EFE7DC]">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/70">
            STORAGE VOLUME
          </div>
          <div className="font-display-grotesk font-black text-3xl md:text-4xl tracking-tighter mt-2 text-[#F0301A]">
            {(totalSizeKb / 1024).toFixed(2)} MB
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">
            {totalSizeKb.toFixed(1)} KB across disk volume
          </div>
        </div>

        <div className="hairline-all p-5 bg-[#EFE7DC]">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F0301A]/70">
            RESTORATION STATUS
          </div>
          <div className="font-display-grotesk font-black text-2xl md:text-3xl tracking-tighter mt-2 text-green-700">
            ONLINE
          </div>
          <div className="text-xs font-sans text-[#161412]/60 mt-1">
            Zero-data-loss rollback ready
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="font-display-grotesk font-bold text-xl uppercase tracking-tight">
            HISTORICAL SNAPSHOT REGISTRY
          </h2>
          <p className="text-xs text-[#161412] mt-0.5">
            JSON state snapshots with transactional table dumps and strict referential conservation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchBackups}
            disabled={loading}
            className="px-4 py-2 border border-[#F0301A] text-xs font-bold uppercase tracking-wider hover:bg-[#F0301A]/10 cursor-pointer disabled:opacity-50"
          >
            REFRESH ↻
          </button>
          <button
            type="button"
            onClick={handleTriggerBackup}
            disabled={creating}
            className="px-5 py-2 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase tracking-wider hover:bg-[#F0301A]/90 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-[#EFE7DC] animate-ping" />
                EXTRACTING SNAPSHOT...
              </>
            ) : (
              '+ TRIGGER INSTANT BACKUP'
            )}
          </button>
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="hairline-all bg-[#EFE7DC] overflow-x-auto mb-12">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-[#F0301A] bg-[#F0301A]/10 font-bold uppercase tracking-wider text-[#F0301A]">
              <th className="p-3">SNAPSHOT ARCHIVE</th>
              <th className="p-3">STATUS</th>
              <th className="p-3">CREATED AT</th>
              <th className="p-3">SIZE</th>
              <th className="p-3">DISK STATUS</th>
              <th className="p-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0301A]/20">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center uppercase tracking-widest text-[#F0301A]">
                  QUERYING SYSTEM STORAGE REGISTRY...
                </td>
              </tr>
            ) : backups.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#161412]">
                  No database snapshots found in registry. Trigger a backup to create your first archive.
                </td>
              </tr>
            ) : (
              backups.map((b) => (
                <tr key={b.id} className="hover:bg-[#F0301A]/5">
                  <td className="p-3 font-mono font-bold text-[#F0301A]">
                    {b.fileName}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border ${
                        b.status === 'COMPLETED'
                          ? 'border-green-600 bg-green-100 text-green-800'
                          : 'border-red-600 bg-red-100 text-red-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          b.status === 'COMPLETED' ? 'bg-green-600' : 'bg-red-600'
                        }`}
                      />
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3 text-[#161412]">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-[#161412]">
                    {b.sizeKb > 0 ? `${b.sizeKb} KB` : '—'}
                  </td>
                  <td className="p-3">
                    {b.existsOnDisk ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]">
                        ● ON DISK
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#161412]/50">
                        OFFLINE
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {b.existsOnDisk && (
                      <a
                        href={`/api/admin/backup/${b.id}/download`}
                        download
                        className="px-2.5 py-1 border border-[#F0301A] text-[10px] font-bold uppercase tracking-wider hover:bg-[#F0301A] hover:text-[#EFE7DC] transition-colors"
                      >
                        DOWNLOAD ↓
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyCli(b.fileName, b.id)}
                      className="px-2.5 py-1 border border-[#F0301A] text-[10px] font-bold uppercase tracking-wider hover:bg-[#F0301A]/10 cursor-pointer"
                    >
                      {copiedId === b.id ? 'COPIED ✓' : 'RESTORE CLI 📋'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Disaster Recovery Terminal Cheatsheet */}
      <div className="hairline-all p-6 bg-[#FFFFFF]/60 space-y-4">
        <h3 className="font-display-grotesk font-bold text-lg uppercase tracking-wider">
          DISASTER RECOVERY &amp; OPERATING SYSTEM SCHEDULER PROTOCOLS
        </h3>
        <p className="text-xs text-[#161412]">
          In the event of database corruption or migration to another environment, execute the automated restore engine using the command line:
        </p>
        <div className="p-3 bg-[#161412] text-[#EFE7DC] font-mono text-xs space-y-2">
          <div>
            <span className="text-emerald-400"># 1. Restore the most recent snapshot archive automatically</span>
            <br />
            npx tsx scripts/restore.ts
          </div>
          <div>
            <span className="text-emerald-400"># 2. Restore an explicit historical snapshot</span>
            <br />
            npx tsx scripts/restore.ts backups/snapshot-2026-09-21T18-08-37-535Z.json
          </div>
          <div>
            <span className="text-emerald-400"># 3. Run background automated cron scheduler daemon with log rotation</span>
            <br />
            npx tsx scripts/backup-cron.ts --run-once
          </div>
        </div>
      </div>
    </div>
  );
}
