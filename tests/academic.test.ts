/**
 * tests/academic.test.ts
 *
 * Automated Test Suite for Academic Subject Deliverables:
 * Object-Oriented Programming (Classes) & Data Structures (Trie, Queue, Stack)
 */
import { describe, it, expect } from 'vitest';
import { User, Product, Category, Brand } from '@/domain/team1';
import { Cart, Order, Inventory } from '@/domain/team2';
import { Payment } from '@/domain/team3';
import { ProductTrie } from '@/structures/ProductTrie';
import { OrderQueue } from '@/structures/OrderQueue';
import { NotificationStack } from '@/structures/NotificationStack';

describe('Academic Subjects: OOP Domain Models & Data Structures', () => {
  it('should demonstrate OOP Encapsulation and Business Methods across Team 1, 2, and 3', async () => {
    // 1. Team 1
    const category = new Category('c1', 'SHIRTS');
    const brand = new Brand('b1', 'ATELIER');
    const product = new Product({
      id: 'p1',
      sku: 'SKU-001',
      name: 'RAW LINEN SHIRT',
      price: 150,
      stockQty: 10,
      category,
      brand,
    });

    expect(product.hasAvailableStock(5)).toBe(true);
    product.reserveStock(5);
    expect(product.stockQty).toBe(5);

    product.applyDiscount(20);
    expect(product.price).toBe(120);
    expect(product.isSale).toBe(true);

    const user = new User('u1', 'user@test.com', 'CUSTOMER');
    await user.setPassword('TestSecurePass123!');
    expect(await user.verifyPassword('TestSecurePass123!')).toBe(true);
    expect(await user.verifyPassword('WrongPass')).toBe(false);

    // 2. Team 2
    const cart = new Cart('cust-1');
    cart.addItem(product, 2);
    expect(cart.subtotal).toBe(240); // 120 * 2

    const order = new Order('ord-1', 'cust-1', cart.items, 15);
    expect(order.totalAmount).toBe(255); // 240 + 15
    order.confirm();
    expect(order.status).toBe('CONFIRMED');

    const inv1 = new Inventory('p1', 'wh-1', 20);
    const inv2 = new Inventory('p1', 'wh-2', 10);
    inv1.transferTo(inv2, 5);
    expect(inv1.quantity).toBe(15);
    expect(inv2.quantity).toBe(15);

    // 3. Team 3
    const payment = new Payment('pay-1', order.id, order.totalAmount);
    expect(payment.status).toBe('PENDING');
    const txn = payment.markCompleted('txn_live_99');
    expect(payment.status).toBe('COMPLETED');
    expect(txn.status).toBe('SUCCESS');
    expect(payment.transactions.length).toBe(1);

    const refundTxn = payment.refund();
    expect(payment.status).toBe('REFUNDED');
    expect(refundTxn.type).toBe('REFUND');
  });

  it('should test ProductTrie prefix indexing and autocomplete', () => {
    const trie = new ProductTrie();
    trie.insert('jacket', { id: 'p1', sku: 'JKT-01', name: 'WOOL JACKET', price: 300 });
    trie.insert('jeans', { id: 'p2', sku: 'JNS-01', name: 'SELVEDGE JEANS', price: 180 });
    trie.insert('jersey', { id: 'p3', sku: 'JRS-01', name: 'KNIT JERSEY', price: 140 });

    expect(trie.wordCount).toBe(3);
    const autocompletes = trie.autocomplete('je');
    expect(autocompletes).toContain('jeans');
    expect(autocompletes).toContain('jersey');
    expect(autocompletes).not.toContain('jacket');

    const searchResults = trie.searchPrefix('jea');
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].name).toBe('SELVEDGE JEANS');
  });

  it('should test OrderQueue FIFO queue properties and sequential batch dispatch', () => {
    const queue = new OrderQueue<string>();
    expect(queue.isEmpty()).toBe(true);

    queue.enqueue('ORDER-A');
    queue.enqueue('ORDER-B');
    queue.enqueue('ORDER-C');
    expect(queue.size).toBe(3);
    expect(queue.peek()).toBe('ORDER-A');

    const dispatched: string[] = [];
    queue.processAll((item) => dispatched.push(item));

    expect(dispatched).toEqual(['ORDER-A', 'ORDER-B', 'ORDER-C']);
    expect(queue.isEmpty()).toBe(true);
    expect(queue.size).toBe(0);
  });

  it('should test NotificationStack LIFO stack properties and reverse drain', () => {
    const stack = new NotificationStack<string>();
    expect(stack.isEmpty()).toBe(true);

    stack.push('FIRST');
    stack.push('SECOND');
    stack.push('THIRD');
    expect(stack.size).toBe(3);
    expect(stack.peek()).toBe('THIRD');

    const drained = stack.drain();
    expect(drained).toEqual(['THIRD', 'SECOND', 'FIRST']);
    expect(stack.isEmpty()).toBe(true);
    expect(stack.size).toBe(0);
  });
});
