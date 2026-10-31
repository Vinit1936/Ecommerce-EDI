/**
 * tests/team2/orders.test.ts
 *
 * Team 2 Deliverable: Unit Testing Suite for Order State Machine & Stock Reservation
 * Satisfies IEEE Test Documentation & Team 2 Testing Report
 */
import { describe, it, expect } from 'vitest';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';

interface OrderStateMachine {
  status: OrderStatus;
  transitions: { status: OrderStatus; timestamp: Date }[];
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

function transitionOrder(
  order: OrderStateMachine,
  nextStatus: OrderStatus
): { success: boolean; error?: string } {
  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed.includes(nextStatus)) {
    return {
      success: false,
      error: `Illegal state transition from ${order.status} to ${nextStatus}`,
    };
  }

  order.status = nextStatus;
  order.transitions.push({ status: nextStatus, timestamp: new Date() });
  return { success: true };
}

describe('Team 2: Order Lifecycle State Machine & Inventory Conservation', () => {
  it('should follow strict chronological lifecycle transitions', () => {
    const order: OrderStateMachine = {
      status: 'PENDING',
      transitions: [{ status: 'PENDING', timestamp: new Date() }],
    };

    // PENDING -> CONFIRMED
    const step1 = transitionOrder(order, 'CONFIRMED');
    expect(step1.success).toBe(true);
    expect(order.status).toBe('CONFIRMED');

    // CONFIRMED -> PROCESSING
    const step2 = transitionOrder(order, 'PROCESSING');
    expect(step2.success).toBe(true);
    expect(order.status).toBe('PROCESSING');

    // PROCESSING -> SHIPPED
    const step3 = transitionOrder(order, 'SHIPPED');
    expect(step3.success).toBe(true);
    expect(order.status).toBe('SHIPPED');

    // SHIPPED -> DELIVERED
    const step4 = transitionOrder(order, 'DELIVERED');
    expect(step4.success).toBe(true);
    expect(order.status).toBe('DELIVERED');

    expect(order.transitions.length).toBe(5);
  });

  it('should reject invalid or backwards state transitions', () => {
    const order: OrderStateMachine = {
      status: 'SHIPPED',
      transitions: [],
    };

    // Cannot jump back to PENDING
    const invalidBack = transitionOrder(order, 'PENDING');
    expect(invalidBack.success).toBe(false);
    expect(invalidBack.error).toContain('Illegal state transition');

    // Once DELIVERED, cannot cancel directly
    order.status = 'DELIVERED';
    const invalidCancel = transitionOrder(order, 'CANCELLED');
    expect(invalidCancel.success).toBe(false);
  });

  it('should verify stock conservation on allocation and cancellation restock', () => {
    let warehouseStock = 20;
    const orderQty = 5;

    // 1. Order placed: stock deducted
    function allocateStock(qty: number) {
      if (warehouseStock < qty) throw new Error('Insufficient inventory');
      warehouseStock -= qty;
      return warehouseStock;
    }

    // 2. Order cancelled: stock restored
    function restockInventory(qty: number) {
      warehouseStock += qty;
      return warehouseStock;
    }

    expect(allocateStock(orderQty)).toBe(15);
    expect(warehouseStock).toBe(15);

    // Cancel order
    expect(restockInventory(orderQty)).toBe(20);
    expect(warehouseStock).toBe(20);
  });

  it('should generate standardized unique sequential invoice numbers', () => {
    function generateInvoiceNumber(sequence: number, prefix = 'INV'): string {
      const year = new Date().getFullYear();
      const padded = String(sequence).padStart(5, '0');
      return `${prefix}-${year}-${padded}`;
    }

    const inv1 = generateInvoiceNumber(1);
    const inv2 = generateInvoiceNumber(42);

    expect(inv1).toMatch(/^INV-\d{4}-00001$/);
    expect(inv2).toMatch(/^INV-\d{4}-00042$/);
  });
});
