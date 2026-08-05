import React from 'react';
import { ActionLink } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
  iconGlyph?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionText = 'CONTINUE SHOPPING',
  actionHref = '/shop',
  iconGlyph = '●',
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`py-16 md:py-24 text-center text-[#F0301A] max-w-md mx-auto px-4 ${className}`}>
      <div className="text-3xl md:text-4xl mb-4 font-display-grotesk tracking-widest">{iconGlyph}</div>
      <h2 className="font-display-grotesk font-black text-xl md:text-2xl uppercase tracking-tight mb-2">
        {title}
      </h2>
      {description && (
        <p className="font-sans text-sm md:text-base text-[#161412] mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionHref && actionText && (
        <ActionLink href={actionHref} size="md">
          {actionText}
        </ActionLink>
      )}
    </div>
  );
}
