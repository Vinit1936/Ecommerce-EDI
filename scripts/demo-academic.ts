/**
 * scripts/demo-academic.ts
 *
 * Academic Subject Demonstration Script:
 * Object-Oriented Programming (Classes & Encapsulation) & Classical Data Structures (Trie, FIFO Queue, LIFO Stack)
 *
 * Usage:
 *   npx tsx scripts/demo-academic.ts
 */
import { User, Customer, Product, Category, Brand } from '../src/domain/team1';
import { Cart, Order, Inventory, Invoice } from '../src/domain/team2';
import { Payment, Report } from '../src/domain/team3';
import { ProductTrie } from '../src/structures/ProductTrie';
import { OrderQueue } from '../src/structures/OrderQueue';
import { NotificationStack } from '../src/structures/NotificationStack';

async function runAcademicDemonstration() {
  console.log('\n================================================================');
  console.log('🎓 ACADEMIC SYLLABUS DEMONSTRATION');
  console.log('   1. Object-Oriented Programming (OOP) Domain Architecture');
  console.log('   2. Classical Data Structures (Prefix Trie, FIFO Queue, LIFO Stack)');
  console.log('================================================================\n');

  // ===========================================================================
  // SECTION 1: OOP CLASSES & ENCAPSULATION
  // ===========================================================================
  console.log('----------------------------------------------------------------');
  console.log('1. TEAM 1: OOP Entities (User, Customer, Product, Category, Brand)');
  console.log('----------------------------------------------------------------');

  // 1a. Category Hierarchy
  const outerwear = new Category('cat-1', 'OUTERWEAR');
  const heavyCoats = new Category('cat-2', 'HEAVY COATS', outerwear);
  console.log(` • Category Hierarchy Path: "${heavyCoats.getFullHierarchyPath()}"`);

  // 1b. Brand
  const brand = new Brand('br-1', 'PORTO WORKS');
  console.log(` • Brand: ${brand.name} (Initial products: ${brand.getProductCount()})`);

  // 1c. Product Encapsulation & Discount Business Method
  const product = new Product({
    id: 'prod-1',
    sku: 'PRT-W01-BLK',
    name: 'ARCHIVAL WOOL OVERSHIRT',
    price: 240,
    stockQty: 25,
    category: heavyCoats,
    brand,
  });
  brand.addProduct(product);
  console.log(` • Product Created: ${product.name} | Base Price: $${product.price} | Stock: ${product.stockQty}`);

  product.applyDiscount(15);
  console.log(`   [Action] Applied 15% discount -> Sale Price: $${product.price} (Original: $240, IsSale: ${product.isSale})`);

  // 1d. User & Customer Security
  const user = new User('usr-1', 'collector@hellohello.studio', 'CUSTOMER');
  await user.setPassword('ArchivalPassword2026!');
  const isAuth = await user.verifyPassword('ArchivalPassword2026!');
  console.log(` • User Authentication Encapsulation: Password match verified? ${isAuth}`);

  const customer = new Customer({
    id: 'cust-1',
    user,
    firstName: 'SPECIMEN',
    lastName: 'COLLECTOR',
    address: 'Rua dos Clérigos 88',
    city: 'Porto',
    country: 'Portugal',
  });
  console.log(` • Customer Profile: ${customer.fullName} | Address: ${customer.shippingAddressString}`);

  console.log('\n----------------------------------------------------------------');
  console.log('2. TEAM 2: OOP Entities (Cart, Order, Inventory, Invoice)');
  console.log('----------------------------------------------------------------');

  // 2a. Shopping Cart Aggregations
  const cart = new Cart(customer.id);
  cart.addItem(product, 2, 'L', 'Noir');
  console.log(` • Shopping Cart: ${cart.itemCount} item(s) | Subtotal: $${cart.subtotal}`);

  // 2b. Order State Machine
  const order = new Order('ord-88912', customer.id, cart.items, 12);
  console.log(` • Order Initialized: ID #${order.id} | Status: ${order.status} | Total: $${order.totalAmount}`);
  order.confirm();
  order.advanceStatus('PROCESSING');
  console.log(`   [State Transition] Advanced through: ${order.history.map((h) => h.status).join(' -> ')}`);

  // 2c. Multi-Warehouse Inventory Conservation Laws
  const centralWh = new Inventory(product.id, 'wh-central', 50);
  const depotWh = new Inventory(product.id, 'wh-depot', 10);
  console.log(` • Baseline Stock: Central = ${centralWh.quantity}, Depot = ${depotWh.quantity} (Total = ${centralWh.quantity + depotWh.quantity})`);
  centralWh.transferTo(depotWh, 15);
  console.log(`   [Transfer 15 units] Central = ${centralWh.quantity}, Depot = ${depotWh.quantity} (Total = ${centralWh.quantity + depotWh.quantity} - Conserved!)`);

  // 2d. Invoice Generation
  const invoice = new Invoice('INV-2026-00042', order.id, order.totalAmount);
  console.log(` • ${invoice.formatSummary()}`);

  console.log('\n----------------------------------------------------------------');
  console.log('3. TEAM 3: OOP Entities (Payment, Transaction, Report)');
  console.log('----------------------------------------------------------------');

  // 3a. Payment & Financial Ledger
  const payment = new Payment('pay-901', order.id, order.totalAmount);
  const txn = payment.markCompleted('rzp_live_capture_4411');
  console.log(` • Payment Status: ${payment.status} | Gateway Ref: ${payment.gatewayTxnId}`);
  console.log(`   Ledger Transaction: Type: ${txn.type} | Amount: $${txn.amount} | Status: ${txn.status}`);

  // 3b. Report CSV Export
  const report = new Report('rep-1', 'SALES', [
    { InvoiceNo: invoice.invoiceNo, Customer: customer.fullName, Amount: order.totalAmount, Status: 'PAID' },
  ]);
  console.log(` • Business Intelligence Report: Generated ${report.rowCount} row(s)`);
  console.log(`   Export Preview: ${report.exportCsv()}`);

  // ===========================================================================
  // SECTION 2: CLASSICAL DATA STRUCTURES
  // ===========================================================================
  console.log('\n================================================================');
  console.log('📚 CLASSICAL DATA STRUCTURES IMPLEMENTATIONS');
  console.log('================================================================\n');

  // 4. Prefix Search Trie
  console.log('4. Data Structure 1: In-Memory Prefix Trie (Product Search & Autocomplete)');
  const trie = new ProductTrie();
  trie.insert('overshirt', { id: 'p1', sku: 'PRT-01', name: 'WOOL OVERSHIRT', price: 240 });
  trie.insert('overcoat', { id: 'p2', sku: 'PRT-02', name: 'HEAVY OVERCOAT', price: 420 });
  trie.insert('oxford', { id: 'p3', sku: 'PRT-03', name: 'OXFORD COTTON SHIRT', price: 160 });
  trie.insert('trousers', { id: 'p4', sku: 'PRT-04', name: 'PLEATED TROUSERS', price: 190 });

  console.log(` • Total Unique Keywords Indexed: ${trie.wordCount}`);
  const autocompletes = trie.autocomplete('ov');
  console.log(` • Autocomplete suggestions for prefix "ov": [${autocompletes.join(', ')}]`);
  const searchResults = trie.searchPrefix('over');
  console.log(` • Prefix search for "over" resolved ${searchResults.length} products:`);
  for (const item of searchResults) {
    console.log(`    → ${item.name} ($${item.price}) [SKU: ${item.sku}]`);
  }

  // 5. FIFO Order Processing Queue
  console.log('\n5. Data Structure 2: Classical FIFO Order Queue (High-Throughput Dispatch)');
  const orderQueue = new OrderQueue<{ orderId: string; priority: string; amount: number }>();
  orderQueue.enqueue({ orderId: 'ORD-101', priority: 'EXPRESS', amount: 340 });
  orderQueue.enqueue({ orderId: 'ORD-102', priority: 'STANDARD', amount: 120 });
  orderQueue.enqueue({ orderId: 'ORD-103', priority: 'STANDARD', amount: 510 });

  console.log(` • Queue size: ${orderQueue.size}`);
  console.log(` • Peek head (first in line): Order #${orderQueue.peek()?.orderId}`);
  console.log(' • Sequential FIFO Batch Dispatch:');
  orderQueue.processAll((item, idx) => {
    console.log(`    [Sequence #${idx + 1}] Dispatched Order ${item.orderId} (${item.priority}) | Amount: $${item.amount}`);
  });
  console.log(` • Remaining in Queue after processing: ${orderQueue.size} (Empty: ${orderQueue.isEmpty()})`);

  // 6. LIFO Notification Stack
  console.log('\n6. Data Structure 3: Classical LIFO Notification Stack (Event Telemetry)');
  const notificationStack = new NotificationStack<{ id: string; message: string; timestamp: string }>();
  notificationStack.push({ id: 'notif-1', message: 'Order #ORD-101 placed', timestamp: '10:00:00' });
  notificationStack.push({ id: 'notif-2', message: 'Payment authorized via Razorpay', timestamp: '10:00:02' });
  notificationStack.push({ id: 'notif-3', message: 'Carrier DHL Express tracking issued', timestamp: '10:01:15' });

  console.log(` • Stack size: ${notificationStack.size}`);
  console.log(` • Top of Stack (most recent event): "${notificationStack.peek()?.message}"`);
  console.log(' • Reverse-Chronological (LIFO) Drain:');
  const drained = notificationStack.drain();
  for (const n of drained) {
    console.log(`    [${n.timestamp}] ${n.message}`);
  }
  console.log(` • Remaining in Stack: ${notificationStack.size} (Empty: ${notificationStack.isEmpty()})`);

  console.log('\n================================================================');
  console.log('🎉 ACADEMIC OOP & DATA STRUCTURES DEMONSTRATION COMPLETE (100%)');
  console.log('================================================================\n');
}

runAcademicDemonstration();
