/**
 * src/domain/team2.ts
 *
 * Object-Oriented Domain Entities — Team 2 (Order & Inventory Management)
 * Satisfies Academic Syllabus: Object-Oriented Programming (Classes, Encapsulation, State Machines)
 */
import { Product } from './team1';

export type OrderStatusType =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

/**
 * Line item within a cart or draft order.
 */
export class CartItem {
  private _product: Product;
  private _quantity: number;
  private _selectedSize?: string;
  private _selectedColor?: string;

  constructor(product: Product, quantity: number, selectedSize?: string, selectedColor?: string) {
    if (quantity <= 0) throw new Error('Quantity must be greater than zero');
    this._product = product;
    this._quantity = quantity;
    this._selectedSize = selectedSize;
    this._selectedColor = selectedColor;
  }

  get product(): Product {
    return this._product;
  }

  get quantity(): number {
    return this._quantity;
  }

  get selectedSize(): string | undefined {
    return this._selectedSize;
  }

  get selectedColor(): string | undefined {
    return this._selectedColor;
  }

  get lineTotal(): number {
    return Number((this._product.price * this._quantity).toFixed(2));
  }

  increment(qty = 1): void {
    this._quantity += qty;
  }

  setQuantity(qty: number): void {
    if (qty <= 0) throw new Error('Quantity must be positive');
    this._quantity = qty;
  }
}

/**
 * Domain entity representing a customer shopping cart.
 */
export class Cart {
  private _customerId: string;
  private _items: CartItem[] = [];

  constructor(customerId: string) {
    this._customerId = customerId;
  }

  get customerId(): string {
    return this._customerId;
  }

  get items(): CartItem[] {
    return [...this._items];
  }

  get itemCount(): number {
    return this._items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get subtotal(): number {
    return Number(this._items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  }

  addItem(product: Product, quantity: number, size?: string, color?: string): void {
    const existing = this._items.find(
      (i) =>
        i.product.id === product.id &&
        i.selectedSize === size &&
        i.selectedColor === color
    );
    if (existing) {
      existing.increment(quantity);
    } else {
      this._items.push(new CartItem(product, quantity, size, color));
    }
  }

  removeItem(productId: string, size?: string, color?: string): void {
    this._items = this._items.filter(
      (i) =>
        !(
          i.product.id === productId &&
          i.selectedSize === size &&
          i.selectedColor === color
        )
    );
  }

  clear(): void {
    this._items = [];
  }
}

/**
 * Domain entity representing an order lifecycle state machine.
 */
export class Order {
  private _id: string;
  private _customerId: string;
  private _items: CartItem[];
  private _shippingCost: number;
  private _status: OrderStatusType;
  private _history: { status: OrderStatusType; changedAt: Date }[] = [];

  constructor(id: string, customerId: string, items: CartItem[], shippingCost = 12) {
    if (items.length === 0) throw new Error('Cannot construct order with zero items');
    this._id = id;
    this._customerId = customerId;
    this._items = [...items];
    this._shippingCost = shippingCost;
    this._status = 'PENDING';
    this._history.push({ status: 'PENDING', changedAt: new Date() });
  }

  get id(): string {
    return this._id;
  }

  get customerId(): string {
    return this._customerId;
  }

  get items(): CartItem[] {
    return [...this._items];
  }

  get status(): OrderStatusType {
    return this._status;
  }

  get history() {
    return [...this._history];
  }

  get subtotal(): number {
    return Number(this._items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  }

  get totalAmount(): number {
    return Number((this.subtotal + this._shippingCost).toFixed(2));
  }

  isCancellable(): boolean {
    return this._status === 'PENDING' || this._status === 'CONFIRMED';
  }

  confirm(): void {
    if (this._status !== 'PENDING') throw new Error(`Cannot confirm order from ${this._status}`);
    this._status = 'CONFIRMED';
    this._history.push({ status: 'CONFIRMED', changedAt: new Date() });
  }

  advanceStatus(next: OrderStatusType): void {
    const validMap: Record<OrderStatusType, OrderStatusType[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: ['RETURNED'],
      CANCELLED: [],
      RETURNED: [],
    };
    if (!validMap[this._status]?.includes(next)) {
      throw new Error(`Illegal state transition from ${this._status} to ${next}`);
    }
    this._status = next;
    this._history.push({ status: next, changedAt: new Date() });
  }

  cancel(): void {
    if (!this.isCancellable()) {
      throw new Error(`Cannot cancel order in ${this._status} state.`);
    }
    this._status = 'CANCELLED';
    this._history.push({ status: 'CANCELLED', changedAt: new Date() });
  }
}

/**
 * Domain entity representing warehouse inventory allocation with conservation laws.
 */
export class Inventory {
  private _productId: string;
  private _warehouseId: string;
  private _quantityAvailable: number;

  constructor(productId: string, warehouseId: string, initialQuantity = 0) {
    this._productId = productId;
    this._warehouseId = warehouseId;
    this._quantityAvailable = Math.max(0, initialQuantity);
  }

  get productId(): string {
    return this._productId;
  }

  get warehouseId(): string {
    return this._warehouseId;
  }

  get quantity(): number {
    return this._quantityAvailable;
  }

  adjust(delta: number): void {
    if (this._quantityAvailable + delta < 0) {
      throw new Error(`Insufficient inventory: current ${this._quantityAvailable}, adjustment ${delta}`);
    }
    this._quantityAvailable += delta;
  }

  transferTo(destination: Inventory, amount: number): void {
    if (amount <= 0) throw new Error('Transfer amount must be positive');
    if (this._productId !== destination.productId) {
      throw new Error('Cannot transfer inventory between different products');
    }
    this.adjust(-amount);
    destination.adjust(amount);
  }
}

/**
 * Domain entity representing an official invoice.
 */
export class Invoice {
  private _invoiceNo: string;
  private _orderId: string;
  private _totalAmount: number;
  private _issuedAt: Date;

  constructor(invoiceNo: string, orderId: string, totalAmount: number, issuedAt: Date = new Date()) {
    this._invoiceNo = invoiceNo;
    this._orderId = orderId;
    this._totalAmount = totalAmount;
    this._issuedAt = issuedAt;
  }

  get invoiceNo(): string {
    return this._invoiceNo;
  }

  get orderId(): string {
    return this._orderId;
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get issuedAt(): Date {
    return this._issuedAt;
  }

  formatSummary(): string {
    return `[INVOICE ${this._invoiceNo}] Order: ${this._orderId.slice(0, 8)} | Total: $${this._totalAmount.toFixed(2)} | Date: ${this._issuedAt.toISOString().split('T')[0]}`;
  }
}
