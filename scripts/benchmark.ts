/**
 * scripts/benchmark.ts
 *
 * System Performance & Latency Benchmarking Engine
 * Evaluates KPI #2: Average Response Time <= 2000ms under operational load
 *
 * Usage:
 *   npx tsx scripts/benchmark.ts
 */
import prisma from '../src/lib/db';
import { razorpayAdapter, charge } from '../src/lib/gateway';
import { ProductTrie } from '../src/structures/ProductTrie';
import { OrderQueue } from '../src/structures/OrderQueue';
import { NotificationStack } from '../src/structures/NotificationStack';

interface BenchmarkMetric {
  name: string;
  category: 'DATABASE' | 'BUSINESS_LOGIC' | 'DATA_STRUCTURE' | 'GATEWAY_SECURITY';
  samples: number[];
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  passedKpi: boolean;
}

const KPI_LATENCY_THRESHOLD_MS = 2000;

function computeStats(name: string, category: BenchmarkMetric['category'], samples: number[]): BenchmarkMetric {
  const sorted = [...samples].sort((a, b) => a - b);
  const minMs = Number(sorted[0].toFixed(2));
  const maxMs = Number(sorted[sorted.length - 1].toFixed(2));
  const avgMs = Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2));
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p95Ms = Number(sorted[p95Index].toFixed(2));

  return {
    name,
    category,
    samples,
    avgMs,
    minMs,
    maxMs,
    p95Ms,
    passedKpi: avgMs <= KPI_LATENCY_THRESHOLD_MS,
  };
}

async function measure<T>(fn: () => Promise<T>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

async function runBenchmark() {
  console.log('\n================================================================');
  console.log('⚡ SYSTEM INTEGRATION & PERFORMANCE BENCHMARK SUITE');
  console.log('   Target KPI #2: Average System Latency <= 2000ms');
  console.log('================================================================\n');

  const results: BenchmarkMetric[] = [];
  const iterations = 5;

  // 1. Raw Database Roundtrip Latency (Neon Cloud PostgreSQL)
  console.log('1. Measuring Cloud PostgreSQL Roundtrip Latency (SELECT 1)...');
  const dbPingSamples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ms = await measure(async () => {
      await prisma.$queryRaw`SELECT 1`;
    });
    dbPingSamples.push(ms);
  }
  results.push(computeStats('Database Query Roundtrip (SELECT 1)', 'DATABASE', dbPingSamples));

  // 2. Catalog & Relation Read (Products with Category, Brand, Inventory)
  console.log('2. Measuring Product Catalog Query Latency (Complex Multi-Join)...');
  const catalogSamples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ms = await measure(async () => {
      await prisma.product.findMany({
        include: {
          category: true,
          brand: true,
          inventories: { include: { warehouse: true } },
          reviews: { take: 5 },
        },
      });
    });
    catalogSamples.push(ms);
  }
  results.push(computeStats('Product Catalog Multi-Join Query', 'DATABASE', catalogSamples));

  // 3. Multi-Warehouse Inventory Matrix Aggregation
  console.log('3. Measuring Multi-Warehouse Inventory Aggregation Query...');
  const inventorySamples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ms = await measure(async () => {
      await prisma.inventory.groupBy({
        by: ['warehouseId'],
        _sum: { quantityAvailable: true },
        _count: { productId: true },
      });
    });
    inventorySamples.push(ms);
  }
  results.push(computeStats('Inventory Facility GroupBy Aggregation', 'DATABASE', inventorySamples));

  // 4. In-Memory Prefix Trie Search Throughput
  console.log('4. Measuring In-Memory Prefix Trie Lookup Throughput (1,000 lookups)...');
  const trie = new ProductTrie();
  for (let i = 0; i < 500; i++) {
    trie.insert(`overshirt-${i}`, { id: `id-${i}`, sku: `SKU-${i}`, name: `Item ${i}`, price: 100 + i });
    trie.insert(`jacket-${i}`, { id: `id-j-${i}`, sku: `SKU-J-${i}`, name: `Jacket ${i}`, price: 200 + i });
  }

  const trieSamples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ms = await measure(async () => {
      for (let j = 0; j < 1000; j++) {
        trie.searchPrefix('over');
      }
    });
    trieSamples.push(ms);
  }
  results.push(computeStats('Prefix Trie 1,000 Lookups Batch', 'DATA_STRUCTURE', trieSamples));

  // 5. FIFO Order Processing Queue Throughput
  console.log('5. Measuring Classical FIFO Queue Throughput (10,000 Enqueue/Dequeue operations)...');
  const queueSamples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ms = await measure(async () => {
      const q = new OrderQueue<number>();
      for (let k = 0; k < 10000; k++) {
        q.enqueue(k);
      }
      while (!q.isEmpty()) {
        q.dequeue();
      }
    });
    queueSamples.push(ms);
  }
  results.push(computeStats('FIFO Queue 10k Push/Pop Cycle', 'DATA_STRUCTURE', queueSamples));

  // 6. LIFO Notification Stack Throughput
  console.log('6. Measuring Classical LIFO Stack Throughput (10,000 Push/Pop operations)...');
  const stackSamples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ms = await measure(async () => {
      const s = new NotificationStack<number>();
      for (let k = 0; k < 10000; k++) {
        s.push(k);
      }
      s.drain();
    });
    stackSamples.push(ms);
  }
  results.push(computeStats('LIFO Stack 10k Push/Drain Cycle', 'DATA_STRUCTURE', stackSamples));

  // 7. Cryptographic HMAC SHA-256 Signature Verification Speed
  console.log('7. Measuring Cryptographic HMAC-SHA256 Timing-Safe Verification (1,000 operations)...');
  const orderRef = 'order_specimen_bench_01';
  const paymentRef = 'pay_specimen_bench_01';
  const sig = razorpayAdapter.generateTestSignature(orderRef, paymentRef);

  const cryptoSamples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ms = await measure(async () => {
      for (let k = 0; k < 1000; k++) {
        razorpayAdapter.verifyPaymentSignature({
          orderId: orderRef,
          paymentId: paymentRef,
          signature: sig,
        });
      }
    });
    cryptoSamples.push(ms);
  }
  results.push(computeStats('HMAC-SHA256 1,000 Verifications', 'GATEWAY_SECURITY', cryptoSamples));

  // 8. Gateway Charge Lifecycle with Network Emulation
  console.log('8. Measuring Gateway Charge & Settlement Emulation...');
  const gatewaySamples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const ms = await measure(async () => {
      await charge(240, false);
    });
    gatewaySamples.push(ms);
  }
  results.push(computeStats('Payment Gateway Charge Lifecycle', 'GATEWAY_SECURITY', gatewaySamples));

  // ===========================================================================
  // REPORT SCORECARD
  // ===========================================================================
  console.log('\n================================================================');
  console.log('📊 PERFORMANCE BENCHMARK SCORECARD');
  console.log('================================================================\n');

  console.log('| Metric Name | Category | Avg Latency | P95 Latency | Min / Max | KPI Status |');
  console.log('|---|---|---|---|---|---|');
  for (const r of results) {
    const kpiBadge = r.passedKpi ? '✅ PASS (<2s)' : '❌ FAIL';
    console.log(
      `| ${r.name} | ${r.category} | ${r.avgMs} ms | ${r.p95Ms} ms | ${r.minMs} / ${r.maxMs} ms | ${kpiBadge} |`
    );
  }

  const grandAverage = (
    results.reduce((acc, curr) => acc + curr.avgMs, 0) / results.length
  ).toFixed(2);
  const allPassed = results.every((r) => r.passedKpi);

  console.log('\n----------------------------------------------------------------');
  console.log(` • Overall Benchmark Grand Average : ${grandAverage} ms`);
  console.log(` • Target Threshold SLA            : <= ${KPI_LATENCY_THRESHOLD_MS} ms`);
  console.log(` • KPI #2 Conformance Status       : ${allPassed ? '✅ 100% COMPLIANT' : '❌ NON-COMPLIANT'}`);
  console.log('----------------------------------------------------------------\n');
}

runBenchmark()
  .catch((err) => {
    console.error('Benchmark error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
