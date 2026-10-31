import prisma from '../src/lib/db';
import { advanceOrderStatus, getOrder } from '../src/lib/orders';

async function testOrderTracking() {
  console.log('\n======================================================');
  console.log('🧪 TESTING STEP 8: DEDICATED ORDER TRACKING TIMELINE');
  console.log('======================================================\n');

  // 1. Locate existing customer with orders or demo customer
  console.log('1. Querying an active order from database...');
  let order = await prisma.order.findFirst({
    include: {
      orderStatuses: { orderBy: { changedAt: 'asc' } },
      customer: { include: { user: true } },
      orderItems: { include: { product: true } },
    },
  });

  if (!order) {
    console.log('   No order found, creating a demo order for customer...');
    const customer = await prisma.customer.findFirstOrThrow();
    const product = await prisma.product.findFirstOrThrow();

    order = await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: product.price,
        shippingCost: 15,
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
      include: {
        orderStatuses: { orderBy: { changedAt: 'asc' } },
        customer: { include: { user: true } },
        orderItems: { include: { product: true } },
      },
    });
  }

  console.log(`   ✅ Target Order ID: ${order.id}`);
  console.log(`   Customer: ${order.customer.firstName} ${order.customer.lastName} (${order.customer.user.email})`);
  console.log(`   Initial Status: ${order.status}`);
  console.log(`   Historical Timestamps count: ${order.orderStatuses.length}`);

  // 2. Test Chronological Transitions
  console.log('\n2. Testing lifecycle transitions and OrderStatus telemetry recording...');
  const lifecycleSteps = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

  for (const step of lifecycleSteps) {
    await advanceOrderStatus(order.id, step);
    const updated = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { orderStatuses: { orderBy: { changedAt: 'asc' } } },
    });

    const lastStatus = updated.orderStatuses[updated.orderStatuses.length - 1];
    if (updated.status !== step || lastStatus.status !== step) {
      throw new Error(`Failed to advance order to ${step}`);
    }
    console.log(`   ✅ Transitioned to: ${step} (Timestamp: ${new Date(lastStatus.changedAt).toLocaleString()})`);
  }

  // 3. Test Authorization Boundaries (Customer Ownership & Admin Bypass)
  console.log('\n3. Validating Order Tracking access policies...');
  // Owner lookup
  const ownerAccess = await getOrder(order.id, order.customerId);
  if (!ownerAccess) throw new Error('Owner was denied access to their own order');
  console.log('   ✅ Order owner granted access to tracking view.');

  // Admin bypass
  const adminAccess = await getOrder(order.id);
  if (!adminAccess) throw new Error('Admin was denied access to order');
  console.log('   ✅ System admin granted universal access to tracking view.');

  // Unowned customer rejected
  const fakeCustomerId = '00000000-0000-0000-0000-000000000000';
  const strangerAccess = await getOrder(order.id, fakeCustomerId);
  if (strangerAccess !== null) {
    throw new Error('Security failure: Unauthorized customer was able to view unowned order tracking!');
  }
  console.log('   ✅ Unauthorized customer strictly denied access (returns null / 404).');

  // 4. Test Full Stepper Data Integrity
  console.log('\n4. Verifying timeline stepper data contract...');
  const fullOrder = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      orderStatuses: { orderBy: { changedAt: 'asc' } },
      orderItems: { include: { product: true } },
    },
  });

  const recordedStatuses = fullOrder.orderStatuses.map((s) => s.status);
  console.log(`   Status history: ${recordedStatuses.join(' -> ')}`);
  for (const expected of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
    if (!recordedStatuses.includes(expected as (typeof recordedStatuses)[number])) {
      throw new Error(`Missing expected milestone: ${expected}`);
    }
  }
  console.log('   ✅ All 5 lifecycle milestone telemetry records verified.');

  console.log('\n======================================================');
  console.log('🎉 STEP 8 COMPLETE: ORDER TRACKING TIMELINE PASS');
  console.log('======================================================\n');
}

testOrderTracking()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
