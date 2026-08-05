import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'category' | 'status' | 'sale' | 'new';
  className?: string;
}

export function Badge({ label, variant = 'category', className = '' }: BadgeProps) {
  if (variant === 'status' && (label.toLowerCase().includes('sold out') || label.toLowerCase().includes('out of stock'))) {
    return (
      <span className={`text-xs uppercase font-bold tracking-wider text-[#F0301A] sold-out-strike ${className}`}>
        {label}
      </span>
    );
  }

  if (variant === 'sale') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F0301A] ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#F0301A]" />
        SALE — {label}
      </span>
    );
  }

  if (variant === 'new') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F0301A] ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#F0301A]" />
        NEW SPECIMEN
      </span>
    );
  }

  // Category variant: dot + text, no pill, no fill
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#F0301A] ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#F0301A]" />
      {label}
    </span>
  );
}
