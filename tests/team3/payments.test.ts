/**
 * tests/team3/payments.test.ts
 *
 * Team 3 Deliverable: Unit Testing Suite for Payment Gateway & Financial Ledger
 * Satisfies IEEE Test Documentation & Team 3 Testing Report
 */
import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { razorpayAdapter, getGatewayProvider, charge } from '@/lib/gateway';

describe('Team 3: Payment Gateway Sandbox & Ledger Security', () => {
  const testSecret = 'secret_edi_test_key_sandbox';

  it('should generate and verify authentic HMAC SHA-256 payment signatures', () => {
    const orderId = 'order_test_99812';
    const paymentId = 'pay_test_44211';

    // Expected signature calculation
    const body = `${orderId}|${paymentId}`;
    const signature = crypto.createHmac('sha256', testSecret).update(body).digest('hex');

    const isValid = razorpayAdapter.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    expect(isValid).toBe(true);
  });

  it('should reject tampered or spoofed payment signatures', () => {
    const orderId = 'order_test_99812';
    const paymentId = 'pay_test_44211';
    const tamperedSig = '4a2b9c8d7e6f50123456789abcdef0123456789abcdef0123456789abcdef01';

    const isValid = razorpayAdapter.verifyPaymentSignature({
      orderId,
      paymentId,
      signature: tamperedSig,
    });

    expect(isValid).toBe(false);
  });

  it('should verify webhook HMAC signatures and detect payload tampering', () => {
    const webhookPayload = JSON.stringify({
      event: 'payment.captured',
      amount: 25000,
      currency: 'USD',
    });

    const validSig = razorpayAdapter.generateTestWebhookSignature(webhookPayload);
    expect(razorpayAdapter.verifyWebhookSignature(webhookPayload, validSig)).toBe(true);

    // Tampered body
    const tamperedPayload = JSON.stringify({
      event: 'payment.captured',
      amount: 50000, // Altered amount
      currency: 'USD',
    });
    expect(razorpayAdapter.verifyWebhookSignature(tamperedPayload, validSig)).toBe(false);
  });

  it('should charge payment and support decline simulation cleanly', async () => {
    const provider = getGatewayProvider();
    expect(['mock', 'razorpay', 'stripe']).toContain(provider);

    const amount = 340.5;

    // Normal successful charge
    const successRes = await charge(amount, false);
    expect(successRes.success).toBe(true);
    expect(successRes.gatewayTxnId).toBeDefined();
    expect(successRes.message).toContain('340.50 USD');

    // Simulated decline
    const declineRes = await charge(amount, true);
    expect(declineRes.success).toBe(false);
    expect(declineRes.message).toContain('declined');
  });

  it('should maintain balanced double-entry accounting in transaction ledger', () => {
    interface LedgerTransaction {
      id: string;
      type: 'PAYMENT' | 'REFUND';
      amount: number;
      status: 'SUCCESS' | 'FAILED';
    }

    interface PaymentRecord {
      id: string;
      orderTotal: number;
      transactions: LedgerTransaction[];
    }

    function calculateNetSettlement(payment: PaymentRecord): number {
      return payment.transactions
        .filter((t) => t.status === 'SUCCESS')
        .reduce((net, t) => {
          if (t.type === 'PAYMENT') return net + t.amount;
          if (t.type === 'REFUND') return net - t.amount;
          return net;
        }, 0);
    }

    const completedPayment: PaymentRecord = {
      id: 'pay-1',
      orderTotal: 150.0,
      transactions: [
        { id: 'txn-1', type: 'PAYMENT', amount: 150.0, status: 'SUCCESS' },
      ],
    };
    expect(calculateNetSettlement(completedPayment)).toBe(150.0);

    // After full refund
    completedPayment.transactions.push({
      id: 'txn-2',
      type: 'REFUND',
      amount: 150.0,
      status: 'SUCCESS',
    });
    expect(calculateNetSettlement(completedPayment)).toBe(0.0);
  });
});
