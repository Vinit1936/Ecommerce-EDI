/**
 * Order status types and transition rules.
 *
 * Pure, dependency-free module — mirrors the Prisma `OrderStatusType`
 * enum values as string literals so this file can be safely imported
 * from client components, server components, or API routes without
 * pulling in `@prisma/client` (see prisma/schema.prisma for the source
 * of truth on the enum values).
 */

/** Mirrors the Prisma `OrderStatusType` enum. Keep in sync with prisma/schema.prisma. */
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Allowed forward transitions for each order status.
 *
 * Lifecycle:
 *   PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED -> RETURNED
 *
 * Cancellation is only allowed before the order has shipped (PENDING,
 * CONFIRMED, or PROCESSING). Returns are only allowed after DELIVERED.
 * CANCELLED and RETURNED are terminal states with no further transitions.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

/**
 * Returns true if transitioning an order from `from` to `to` is allowed
 * per ORDER_STATUS_TRANSITIONS.
 *
 * A status "transitioning" to itself is not considered a valid transition
 * (returns false), since no status change actually occurs.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** Terminal statuses have no further allowed transitions. */
export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0;
}

/** Convenience helper: all statuses currently reachable from `from`. */
export function getNextStatuses(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[from];
}
 