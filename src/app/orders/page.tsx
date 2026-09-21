import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { listOrders } from '@/lib/orders';
import { EmptyState } from '@/components/ui/EmptyState';
import { PriceTag } from '@/components/ui/PriceTag';
import { OrderActions } from './OrderActions';

export const dynamic = 'force-dynamic';

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

function StatusTrail({
  history,
  current,
}: {
  history: { status: string; changedAt: Date }[];
  current: string;
}) {
  if (current === 'CANCELLED' || current === 'RETURNED') {
    return (
      <div className="text-xs font-bold uppercase tracking-wider text-[#F0301A]">
        ● {current}
        {history.length > 0 && (
          <span className="ml-2 font-normal text-[#161412]/60">
            {new Date(history[history.length - 1].changedAt).toLocaleString()}
          </span>
        )}
      </div>
    );
  }

  const reached = new Set(history.map((h) => h.status));
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-wider">
      {STATUS_FLOW.map((step, i) => {
        const done = reached.has(step);
        return (
          <React.Fragment key={step}>
            {i > 0 && <span className={done ? 'text-[#F0301A]' : 'text-[#161412]/25'}>—</span>}
            <span className={done ? 'text-[#F0301A]' : 'text-[#161412]/30'}>
              {done ? '●' : '○'} {step}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default async function OrdersPage() {
  const session = await getSession();
  if (!session?.user) redirect('/login?callbackUrl=/orders');
  if (!session.user.customerId) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 text-[#F0301A]">
        <EmptyState
          title="NO CUSTOMER PROFILE"
          description="This account has no customer profile attached, so it cannot hold orders."
          actionText="BROWSE CATALOGUE ↗"
          actionHref="/shop"
        />
      </div>
    );
  }

  const orders = await listOrders(session.user.customerId);

  return (
    <div className="min-h-screen text-[#F0301A] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display-grotesk font-black text-4xl sm:text-6xl md:text-7xl uppercase tracking-tighter">
          YOUR ORDERS
        </h1>
        <span className="text-sm font-bold uppercase tracking-wider">
          {orders.length} {orders.length === 1 ? 'ORDER' : 'ORDERS'}
        </span>
      </div>
      <div className="hairline-b mb-8" />

      {orders.length === 0 ? (
        <EmptyState
          title="NO ORDERS YET"
          description="You haven't placed any orders. Explore the catalogue to get started."
          actionText="EXPLORE SPECIMENS ↗"
          actionHref="/shop"
        />
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order.id} className="hairline-all p-6 space-y-5">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#F0301A]/20 pb-4">
                <div className="space-y-1">
                  <div className="font-display-grotesk font-black text-xl uppercase tracking-tight">
                    {order.invoice?.invoiceNo ?? order.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-xs font-sans text-[#161412]/70">
                    Placed {new Date(order.createdAt).toLocaleString()} · {order.shippingMethod}
                  </div>
                </div>
                <div className="text-right">
                  <PriceTag price={Number(order.totalAmount)} size="lg" />
                  <div className="text-xs font-sans text-[#161412]/60 mt-1">
                    incl. {Number(order.shippingCost).toFixed(2)} shipping
                  </div>
                </div>
              </div>

              <StatusTrail history={order.orderStatuses} current={order.status} />

              {/* Line items */}
              <div className="space-y-3">
                {order.orderItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="relative w-14 h-14 bg-white shrink-0">
                      {item.product.images[0] && (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <Link
                        href={`/product/${item.product.sku}`}
                        className="font-display-grotesk font-bold text-sm uppercase tracking-tight hover:opacity-75 line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      <div className="text-xs font-sans text-[#161412]/70">
                        QTY {item.quantity}
                        {item.selectedSize ? ` · SIZE ${item.selectedSize}` : ''}
                        {item.selectedColor ? ` · ${item.selectedColor}` : ''}
                      </div>
                    </div>
                    <PriceTag price={Number(item.unitPrice) * item.quantity} size="sm" />
                  </div>
                ))}
              </div>

              {/* Payment + actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0301A]/20 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#161412]/70">
                  {order.payments.some((p) => p.status === 'COMPLETED')
                    ? '● PAID'
                    : order.payments.length > 0
                      ? '○ PAYMENT FAILED'
                      : '○ AWAITING PAYMENT'}
                </div>
                <OrderActions orderId={order.id} status={order.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
