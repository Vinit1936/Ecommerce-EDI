'use client';

import React from 'react';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-6 py-2.5 bg-[#F0301A] text-[#EFE7DC] font-display-grotesk font-bold text-xs uppercase tracking-widest hover:opacity-90 cursor-pointer shadow-sm"
    >
      PRINT INVOICE 🖨
    </button>
  );
}
