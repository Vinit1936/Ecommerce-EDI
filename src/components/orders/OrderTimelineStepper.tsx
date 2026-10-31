'use client';

import React from 'react';

export interface OrderStatusEntry {
  id: string;
  status: string;
  changedAt: Date | string;
}

interface OrderTimelineStepperProps {
  currentStatus: string;
  history: OrderStatusEntry[];
}

interface Milestone {
  key: string;
  label: string;
  title: string;
  description: string;
}

const STANDARD_MILESTONES: Milestone[] = [
  {
    key: 'PENDING',
    label: 'STEP 01',
    title: 'ORDER PLACED',
    description: 'Transaction logged in database. Row locks verified inventory allocation.',
  },
  {
    key: 'CONFIRMED',
    label: 'STEP 02',
    title: 'PAYMENT VERIFIED',
    description: 'Payment authorization settled. Serial invoice issued.',
  },
  {
    key: 'PROCESSING',
    label: 'STEP 03',
    title: 'STAGED & PACKED',
    description: 'Specimen inspected and prepared at central warehouse.',
  },
  {
    key: 'SHIPPED',
    label: 'STEP 04',
    title: 'IN TRANSIT',
    description: 'Dispatched to logistics carrier for global expedited delivery.',
  },
  {
    key: 'DELIVERED',
    label: 'STEP 05',
    title: 'DELIVERED',
    description: 'Package successfully delivered and signed by patron.',
  },
];

export function OrderTimelineStepper({ currentStatus, history }: OrderTimelineStepperProps) {
  const isCancelled = currentStatus === 'CANCELLED';
  const isReturned = currentStatus === 'RETURNED';

  // Build a lookup map of status -> timestamp
  const statusTimestamps: Record<string, string> = {};
  for (const entry of history) {
    statusTimestamps[entry.status] = new Date(entry.changedAt).toLocaleString();
  }

  // Determine current active milestone index in standard flow
  const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  if (isCancelled || isReturned) {
    const cancelTimestamp = statusTimestamps[currentStatus] || new Date().toLocaleString();

    return (
      <div className="hairline-all p-6 bg-red-500/5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-bold">
            ✕
          </span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-700">
              TERMINATED ORDER LIFECYCLE
            </div>
            <h3 className="font-display-grotesk font-black text-2xl uppercase tracking-tight text-red-700">
              ORDER {currentStatus}
            </h3>
          </div>
        </div>

        <div className="p-4 bg-white hairline-all space-y-2 text-xs font-sans">
          <div className="flex items-center justify-between text-[#161412]">
            <span className="font-bold uppercase tracking-wider">EVENT TIMESTAMP:</span>
            <span className="font-mono">{cancelTimestamp}</span>
          </div>
          <p className="text-[#161412]/70">
            {isCancelled
              ? 'This order was cancelled. Authoritative product stock has been restored to warehouse inventory in an atomic transaction.'
              : 'This order was returned. Return merchandise authorization is completed.'}
          </p>
        </div>

        {/* Prior status trace */}
        <div className="pt-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#F0301A]/60 mb-2">
            PRE-CANCELLATION AUDIT TRAIL:
          </div>
          <div className="space-y-1 font-mono text-[11px] text-[#161412]/80">
            {history.map((h, i) => (
              <div key={h.id || i} className="flex items-center justify-between">
                <span>● {h.status}</span>
                <span className="text-[#161412]/50">{new Date(h.changedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Horizontal / Vertical Stepper Container */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STANDARD_MILESTONES.map((milestone, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            const timestamp = statusTimestamps[milestone.key];

            return (
              <div
                key={milestone.key}
                className={`hairline-all p-4 transition-colors relative flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-[#F0301A] text-[#EFE7DC]'
                    : isCompleted
                    ? 'bg-[#F0301A]/10 text-[#161412]'
                    : 'bg-[#EFE7DC] opacity-50 text-[#161412]'
                }`}
              >
                {/* Header Row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-widest ${
                        isCurrent ? 'text-[#EFE7DC]/80' : 'text-[#F0301A]'
                      }`}
                    >
                      {milestone.label}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCurrent
                          ? 'bg-[#EFE7DC] text-[#F0301A] animate-pulse'
                          : isCompleted
                          ? 'bg-[#F0301A] text-[#EFE7DC]'
                          : 'hairline-all text-[#161412]/40'
                      }`}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </span>
                  </div>

                  <div className="font-display-grotesk font-black text-sm uppercase tracking-tight">
                    {milestone.title}
                  </div>

                  <p
                    className={`text-[11px] font-sans leading-tight mt-1 ${
                      isCurrent ? 'text-[#EFE7DC]/90' : 'text-[#161412]/70'
                    }`}
                  >
                    {milestone.description}
                  </p>
                </div>

                {/* Timestamp Footer */}
                <div
                  className={`pt-3 mt-3 border-t font-mono text-[10px] ${
                    isCurrent
                      ? 'border-[#EFE7DC]/30 text-[#EFE7DC]'
                      : 'border-[#F0301A]/20 text-[#161412]/60'
                  }`}
                >
                  {timestamp ? (
                    <div>
                      <div className="text-[8px] uppercase tracking-wider opacity-70">RECORDED:</div>
                      <div>{timestamp}</div>
                    </div>
                  ) : (
                    <div className="uppercase tracking-wider opacity-60">PENDING DISPATCH</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
