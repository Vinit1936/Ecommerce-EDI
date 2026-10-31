/**
 * src/domain/team3.ts
 *
 * Object-Oriented Domain Entities — Team 3 (Payments, Analytics & Admin)
 * Satisfies Academic Syllabus: Object-Oriented Programming (Classes, Double-Entry Ledger, Financial Integrity)
 */

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type TransactionType = 'PAYMENT' | 'REFUND' | 'CHARGEBACK' | 'ADJUSTMENT';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

/**
 * Domain entity representing a payment attempt via a payment gateway.
 */
export class Payment {
  private _id: string;
  private _orderId: string;
  private _amount: number;
  private _status: PaymentStatus;
  private _gatewayTxnId?: string;
  private _transactions: Transaction[] = [];

  constructor(id: string, orderId: string, amount: number) {
    if (amount <= 0) throw new Error('Payment amount must be positive');
    this._id = id;
    this._orderId = orderId;
    this._amount = amount;
    this._status = 'PENDING';
  }

  get id(): string {
    return this._id;
  }

  get orderId(): string {
    return this._orderId;
  }

  get amount(): number {
    return this._amount;
  }

  get status(): PaymentStatus {
    return this._status;
  }

  get gatewayTxnId(): string | undefined {
    return this._gatewayTxnId;
  }

  get transactions(): Transaction[] {
    return [...this._transactions];
  }

  markCompleted(gatewayTxnId: string): Transaction {
    this._status = 'COMPLETED';
    this._gatewayTxnId = gatewayTxnId;

    const txn = new Transaction({
      id: `txn_${Date.now()}`,
      paymentId: this._id,
      type: 'PAYMENT',
      amount: this._amount,
      status: 'SUCCESS',
    });
    this._transactions.push(txn);
    return txn;
  }

  markFailed(reason: string): Transaction {
    this._status = 'FAILED';
    const txn = new Transaction({
      id: `txn_${Date.now()}`,
      paymentId: this._id,
      type: 'PAYMENT',
      amount: this._amount,
      status: 'FAILED',
      notes: reason,
    });
    this._transactions.push(txn);
    return txn;
  }

  refund(): Transaction {
    if (this._status !== 'COMPLETED') {
      throw new Error(`Cannot issue refund for payment with status ${this._status}`);
    }
    this._status = 'REFUNDED';

    const txn = new Transaction({
      id: `txn_rfnd_${Date.now()}`,
      paymentId: this._id,
      type: 'REFUND',
      amount: this._amount,
      status: 'SUCCESS',
    });
    this._transactions.push(txn);
    return txn;
  }
}

/**
 * Domain entity representing an immutable ledger transaction.
 */
export class Transaction {
  private _id: string;
  private _paymentId: string;
  private _type: TransactionType;
  private _amount: number;
  private _status: TransactionStatus;
  private _createdAt: Date;
  private _notes?: string;

  constructor(params: {
    id: string;
    paymentId: string;
    type: TransactionType;
    amount: number;
    status: TransactionStatus;
    notes?: string;
  }) {
    this._id = params.id;
    this._paymentId = params.paymentId;
    this._type = params.type;
    this._amount = params.amount;
    this._status = params.status;
    this._notes = params.notes;
    this._createdAt = new Date();
  }

  get id(): string {
    return this._id;
  }

  get paymentId(): string {
    return this._paymentId;
  }

  get type(): TransactionType {
    return this._type;
  }

  get amount(): number {
    return this._amount;
  }

  get status(): TransactionStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get notes(): string | undefined {
    return this._notes;
  }
}

/**
 * Domain entity representing an alert or event notification.
 */
export class Notification {
  private _id: string;
  private _userId: string;
  private _message: string;
  private _read: boolean;
  private _createdAt: Date;

  constructor(id: string, userId: string, message: string, read = false) {
    this._id = id;
    this._userId = userId;
    this._message = message;
    this._read = read;
    this._createdAt = new Date();
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get message(): string {
    return this._message;
  }

  get read(): boolean {
    return this._read;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  markAsRead(): void {
    this._read = true;
  }
}

/**
 * Domain entity representing a business intelligence report.
 */
export class Report {
  private _id: string;
  private _type: 'SALES' | 'INVENTORY' | 'FINANCIAL' | 'USER_ACTIVITY';
  private _generatedAt: Date;
  private _rows: Record<string, unknown>[];

  constructor(id: string, type: 'SALES' | 'INVENTORY' | 'FINANCIAL' | 'USER_ACTIVITY', rows: Record<string, unknown>[] = []) {
    this._id = id;
    this._type = type;
    this._rows = [...rows];
    this._generatedAt = new Date();
  }

  get id(): string {
    return this._id;
  }

  get type(): string {
    return this._type;
  }

  get rowCount(): number {
    return this._rows.length;
  }

  get rows() {
    return [...this._rows];
  }

  exportCsv(): string {
    if (this._rows.length === 0) return '';
    const headers = Object.keys(this._rows[0]);
    const lines = [
      headers.join(','),
      ...this._rows.map((row) =>
        headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
      ),
    ];
    return lines.join('\n');
  }
}
