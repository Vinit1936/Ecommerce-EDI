/**
 * tests/team2/cart.test.ts
 *
 * Team 2 Deliverable: Unit Testing Suite for Shopping Cart & Pricing Engine
 * Satisfies IEEE Test Documentation & Team 2 Testing Report
 */
import { describe, it, expect } from 'vitest';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

function calculateCartTotals(items: CartItem[], shippingMethod: 'standard' | 'express' = 'standard') {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingCost = items.length === 0 ? 0 : shippingMethod === 'express' ? 25 : 12;
  const total = subtotal + shippingCost;
  return { subtotal, shippingCost, total };
}

function mergeGuestCart(serverCart: CartItem[], guestCart: CartItem[]): CartItem[] {
  const merged = [...serverCart];

  for (const guestItem of guestCart) {
    const existingIndex = merged.findIndex(
      (m) =>
        m.productId === guestItem.productId &&
        m.selectedSize === guestItem.selectedSize &&
        m.selectedColor === guestItem.selectedColor
    );

    if (existingIndex > -1) {
      merged[existingIndex].quantity += guestItem.quantity;
    } else {
      merged.push({ ...guestItem });
    }
  }

  return merged;
}

describe('Team 2: Shopping Cart & Price Aggregation Engine', () => {
  it('should calculate subtotal, shipping fees, and grand total accurately', () => {
    const items: CartItem[] = [
      { productId: 'p1', name: 'WOOL OVERSHIRT', price: 240, quantity: 2, selectedSize: 'L' },
      { productId: 'p2', name: 'CANVAS TOTE', price: 65, quantity: 1 },
    ];

    // Standard shipping ($12)
    const standardResult = calculateCartTotals(items, 'standard');
    expect(standardResult.subtotal).toBe(545); // (240*2) + 65
    expect(standardResult.shippingCost).toBe(12);
    expect(standardResult.total).toBe(557);

    // Express shipping ($25)
    const expressResult = calculateCartTotals(items, 'express');
    expect(expressResult.subtotal).toBe(545);
    expect(expressResult.shippingCost).toBe(25);
    expect(expressResult.total).toBe(570);
  });

  it('should yield zero totals for an empty cart', () => {
    const emptyResult = calculateCartTotals([], 'standard');
    expect(emptyResult.subtotal).toBe(0);
    expect(emptyResult.shippingCost).toBe(0);
    expect(emptyResult.total).toBe(0);
  });

  it('should merge guest cart items with server cart items correctly without losing variant specifications', () => {
    const serverCart: CartItem[] = [
      { productId: 'p1', name: 'WOOL OVERSHIRT', price: 240, quantity: 1, selectedSize: 'M' },
      { productId: 'p1', name: 'WOOL OVERSHIRT', price: 240, quantity: 1, selectedSize: 'L' },
    ];

    const guestCart: CartItem[] = [
      // Same product, same variant -> should increment quantity of M
      { productId: 'p1', name: 'WOOL OVERSHIRT', price: 240, quantity: 2, selectedSize: 'M' },
      // New product
      { productId: 'p3', name: 'LEATHER BELT', price: 85, quantity: 1 },
    ];

    const merged = mergeGuestCart(serverCart, guestCart);
    expect(merged.length).toBe(3);

    const sizeM = merged.find((i) => i.productId === 'p1' && i.selectedSize === 'M');
    expect(sizeM).toBeDefined();
    expect(sizeM?.quantity).toBe(3); // 1 + 2

    const sizeL = merged.find((i) => i.productId === 'p1' && i.selectedSize === 'L');
    expect(sizeL).toBeDefined();
    expect(sizeL?.quantity).toBe(1);

    const belt = merged.find((i) => i.productId === 'p3');
    expect(belt).toBeDefined();
    expect(belt?.quantity).toBe(1);
  });
});
