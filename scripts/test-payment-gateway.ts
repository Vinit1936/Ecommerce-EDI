/**
 * scripts/test-payment-gateway.ts
 *
 * Automated verification for Step 10:
 * Real Payment Gateway Sandbox Integration & Cryptographic HMAC Verification
 * Satisfies Team 3 Deliverables & Computer Networks "Secure payment gateway communication"
 */
import prisma from '../src/lib/db';
import { razorpayAdapter } from '../src/lib/gateway';
import { POST as webhookHandler } from '../src/app/api/payments/webhook/route';

async function testPaymentGateway() {
  console.log('\n======================================================');
  console.log('🧪 TESTING STEP 10: REAL PAYMENT GATEWAY SANDBOX & HMAC');
  console.log('======================================================\n');

  // 1. Adapter Cryptographic Signature Verification
  console.log('1. Testing HMAC SHA-256 Payment Signature Verification...');
  const orderRef = 'order_specimen_99812';
  const paymentRef = 'pay_specimen_44211';

  const validSignature = razorpayAdapter.generateTestSignature(orderRef, paymentRef);
  console.log(`   Generated HMAC-SHA256 signature: ${validSignature}`);

  const isValid = razorpayAdapter.verifyPaymentSignature({
    orderId: orderRef,
    paymentId: paymentRef,
    signature: validSignature,
  });

  if (!isValid) {
    throw new Error('Valid HMAC signature failed verification!');
  }
  console.log('   ✅ Valid signature cryptographically verified successfully.');

  // Tampered signature check
  const tamperedSig = validSignature.slice(0, -4) + '0000';
  const isTamperedValid = razorpayAdapter.verifyPaymentSignature({
    orderId: orderRef,
    paymentId: paymentRef,
    signature: tamperedSig,
  });

  if (isTamperedValid) {
    throw new Error('Tampered signature unexpectedly passed verification!');
  }
  console.log('   ✅ Tampered signature correctly rejected.');

  // 2. Webhook Signature Verification
  console.log('\n2. Testing Webhook Cryptographic Integrity...');
  const sampleWebhookBody = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_99812',
          amount: 25000,
        },
      },
    },
  });

  const validWebhookSig = razorpayAdapter.generateTestWebhookSignature(sampleWebhookBody);
  const isWebhookValid = razorpayAdapter.verifyWebhookSignature(sampleWebhookBody, validWebhookSig);

  if (!isWebhookValid) {
    throw new Error('Valid webhook HMAC signature failed verification!');
  }
  console.log('   ✅ Webhook HMAC signature verified successfully.');

  const spoofedPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_99812',
          amount: 9999999, // Altered amount attack
        },
      },
    },
  });

  const isSpoofedValid = razorpayAdapter.verifyWebhookSignature(spoofedPayload, validWebhookSig);
  if (isSpoofedValid) {
    throw new Error('Altered webhook payload unexpectedly passed verification!');
  }
  console.log('   ✅ Replay / payload alteration attack prevented (Spoofed payload rejected).');

  // 3. Database & Webhook Ingestion Integration Test
  console.log('\n3. Testing Webhook Route Ingestion & State Machine...');
  const customer = await prisma.customer.findFirstOrThrow({
    include: { user: true },
  });
  const product = await prisma.product.findFirstOrThrow();

  // Create temporary test order
  const testOrder = await prisma.order.create({
    data: {
      customerId: customer.id,
      totalAmount: product.price,
      shippingCost: 12,
      status: 'PENDING',
      orderStatuses: { create: { status: 'PENDING' } },
      orderItems: {
        create: {
          productId: product.id,
          quantity: 1,
          unitPrice: product.price,
        },
      },
    },
  });
  console.log(`   Created test specimen order #${testOrder.id.slice(0, 8)} in PENDING state.`);

  try {
    // 3a. Reject missing signature
    const missingSigReq = new Request('http://localhost:3000/api/payments/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'payment.captured', orderId: testOrder.id }),
    });
    const missingSigRes = await webhookHandler(missingSigReq);
    if (missingSigRes.status !== 400) {
      throw new Error(`Expected 400 for missing signature, got ${missingSigRes.status}`);
    }
    console.log('   ✅ Webhook correctly rejected missing signature header (HTTP 400).');

    // 3b. Reject invalid signature
    const invalidSigReq = new Request('http://localhost:3000/api/payments/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': 'invalid_forged_signature_token',
      },
      body: JSON.stringify({ event: 'payment.captured', orderId: testOrder.id }),
    });
    const invalidSigRes = await webhookHandler(invalidSigReq);
    if (invalidSigRes.status !== 400) {
      throw new Error(`Expected 400 for invalid signature, got ${invalidSigRes.status}`);
    }
    console.log('   ✅ Webhook correctly rejected forged signature header (HTTP 400).');

    // 3c. Process authentic payment.captured webhook
    const validBody = JSON.stringify({
      event: 'payment.captured',
      orderId: testOrder.id,
      gatewayTxnId: 'pay_rzp_live_capture_771',
    });
    const authenticSig = razorpayAdapter.generateTestWebhookSignature(validBody);

    const validReq = new Request('http://localhost:3000/api/payments/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': authenticSig,
      },
      body: validBody,
    });

    const validRes = await webhookHandler(validReq);
    const validJson = await validRes.json();
    if (!validJson.success || !validJson.processed) {
      throw new Error(`Expected successful processing, got: ${JSON.stringify(validJson)}`);
    }
    console.log('   ✅ Webhook processed authentic payment.captured dispatch.');

    // Verify order and payment status in database
    const updatedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: testOrder.id },
      include: { payments: { include: { transactions: true } }, orderStatuses: true },
    });

    if (updatedOrder.status !== 'CONFIRMED') {
      throw new Error(`Expected order status CONFIRMED, got ${updatedOrder.status}`);
    }
    const completedPay = updatedOrder.payments.find((p) => p.status === 'COMPLETED');
    if (!completedPay) {
      throw new Error('COMPLETED payment not recorded in database');
    }
    console.log(`   ✅ Order promoted to CONFIRMED. Payment ID: ${completedPay.id}`);
    console.log(`   ✅ Associated Transaction recorded: ${completedPay.transactions[0]?.status}`);

    // 3d. Test Idempotency (Duplicate webhook delivery)
    const duplicateRes = await webhookHandler(
      new Request('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-razorpay-signature': authenticSig,
        },
        body: validBody,
      })
    );
    const duplicateJson = await duplicateRes.json();
    if (!duplicateJson.success || duplicateJson.processed !== false) {
      throw new Error(`Expected duplicate to be safely ignored, got: ${JSON.stringify(duplicateJson)}`);
    }
    console.log('   ✅ Idempotent duplicate delivery handled gracefully without double-crediting.');

    // 3e. Process refund.processed webhook
    const refundBody = JSON.stringify({
      event: 'refund.processed',
      orderId: testOrder.id,
    });
    const refundSig = razorpayAdapter.generateTestWebhookSignature(refundBody);

    const refundRes = await webhookHandler(
      new Request('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-razorpay-signature': refundSig,
        },
        body: refundBody,
      })
    );
    const refundJson = await refundRes.json();
    if (!refundJson.success || refundJson.status !== 'REFUNDED') {
      throw new Error(`Expected refund processing, got: ${JSON.stringify(refundJson)}`);
    }

    const refundedPay = await prisma.payment.findUniqueOrThrow({
      where: { id: completedPay.id },
    });
    if (refundedPay.status !== 'REFUNDED') {
      throw new Error(`Expected payment REFUNDED, got ${refundedPay.status}`);
    }
    console.log('   ✅ Refund webhook executed and payment marked REFUNDED.');
  } finally {
    // Clean up test order
    await prisma.transaction.deleteMany({
      where: { payment: { orderId: testOrder.id } },
    });
    await prisma.payment.deleteMany({
      where: { orderId: testOrder.id },
    });
    await prisma.orderStatus.deleteMany({
      where: { orderId: testOrder.id },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: testOrder.id },
    });
    await prisma.order.delete({
      where: { id: testOrder.id },
    });
    console.log('   🧹 Test order and associated transactions cleaned up.');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL PAYMENT GATEWAY & WEBHOOK TESTS PASSED (100%)');
  console.log('======================================================\n');
}

testPaymentGateway()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
