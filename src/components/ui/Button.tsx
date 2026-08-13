import React from 'react';
import Link from 'next/link';

interface ActionLinkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  children: React.ReactNode;
  showArrow?: boolean;
  arrowDirection?: 'up-right' | 'right' | 'left' | 'down';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  isStruckThrough?: boolean;
  className?: string;
}

export function ActionLink({
  href,
  children,
  showArrow = true,
  arrowDirection = 'up-right',
  size = 'md',
  disabled = false,
  isStruckThrough = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}: ActionLinkProps) {
  const sizeClasses = {
    sm: 'text-sm font-bold tracking-tight',
    md: 'text-base font-bold tracking-tight md:text-lg',
    lg: 'text-xl font-bold tracking-tight md:text-2xl',
  };

  const arrowGlyphs = {
    'up-right': '↗',
    right: '→',
    left: '←',
    down: '↓',
  };

  const content = (
    <span
      className={`inline-flex items-center gap-2 font-display-grotesk uppercase text-[#F0301A] transition-opacity hover:opacity-80 cursor-pointer ${
        sizeClasses[size]
      } ${isStruckThrough ? 'sold-out-strike opacity-60' : ''} ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
    >
      <span>{children}</span>
      {showArrow && !isStruckThrough && (
        <span className="font-sans font-normal">{arrowGlyphs[arrowDirection]}</span>
      )}
    </span>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="inline-block bg-transparent p-0 border-0 text-left"
      {...props}
    >
      {content}
    </button>
  );
}

// Alias Button to ActionLink for compatibility
export const Button = ActionLink;
