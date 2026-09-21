'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const CANCELLABLE = ['PENDING', 'CONFIRMED', 'PROCESSING'];

/** Cancel control. Cancelling restores stock server-side, inside a transaction. */
export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!CANCELLABLE.includes(status)) {
    return <span className="text-xs font-bold uppercase tracking-wider text-[#161412]/40">NO ACTIONS</span>;
  }

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? 'Could not cancel');
        return;
      }
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs font-bold uppercase text-[#F0301A]">● {error}</span>}
      <button
        onClick={cancel}
        disabled={busy}
        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#F0301A] bg-transparent text-[#F0301A] hover:bg-[#F0301A] hover:text-[#EFE7DC] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? 'CANCELLING...' : 'CANCEL ORDER'}
      </button>
    </div>
  );
}
