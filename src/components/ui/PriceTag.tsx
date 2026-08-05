import React from 'react';

interface PriceTagProps {
  price: number;
  originalPrice?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PriceTag({ price, originalPrice, className = '', size = 'md' }: PriceTagProps) {
  const sizeClasses = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-xl font-bold tracking-tight',
    xl: 'text-2xl md:text-3xl font-black tracking-tight',
  };

  const formattedPrice = `$${price.toFixed(0)}`;
  const formattedOriginal = originalPrice ? `$${originalPrice.toFixed(0)}` : null;

  return (
    <div className={`inline-flex items-baseline gap-2 font-display-grotesk text-[#F0301A] ${className}`}>
      <span className={sizeClasses[size]}>{formattedPrice}</span>
      {formattedOriginal && (
        <span className="text-xs md:text-sm line-through text-[#F0301A]/60 font-normal">
          {formattedOriginal}
        </span>
      )}
    </div>
  );
}
