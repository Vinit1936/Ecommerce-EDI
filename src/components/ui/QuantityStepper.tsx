import React from 'react';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (newValue: number) => void;
  className?: string;
}

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  className = '',
}: QuantityStepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-4 font-display-grotesk font-bold text-[#F0301A] text-lg select-none ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="cursor-pointer hover:opacity-75 disabled:opacity-30 border-0 bg-transparent p-0 text-xl font-bold"
        aria-label="Decrease quantity"
      >
        –
      </button>
      <span className="min-w-[1.5rem] text-center">{value}</span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className="cursor-pointer hover:opacity-75 disabled:opacity-30 border-0 bg-transparent p-0 text-xl font-bold"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
