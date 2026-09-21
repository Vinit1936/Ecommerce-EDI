/**
 * Payment gateway boundary — Team 3.
 *
 * Razorpay/Stripe test mode is not wired up yet, so this is a mock that
 * implements the same interface a real gateway adapter would. Swapping it for
 * Razorpay means replacing this file, not touching the payment route.
 *
 * Failure is deterministic and opt-in (`simulateFailure`) rather than random,
 * so the unhappy path can be demonstrated on request without a demo randomly
 * failing on the happy path.
 */
export interface GatewayResult {
  success: boolean;
  gatewayTxnId: string;
  message: string;
}

function reference(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

export async function charge(amount: number, simulateFailure = false): Promise<GatewayResult> {
  // Stand-in for gateway network latency.
  await new Promise((resolve) => setTimeout(resolve, 150));

  if (simulateFailure) {
    return { success: false, gatewayTxnId: reference('fail'), message: 'Card declined by issuer' };
  }
  return {
    success: true,
    gatewayTxnId: reference('pay'),
    message: `Authorised ${amount.toFixed(2)}`,
  };
}

export async function refund(amount: number): Promise<GatewayResult> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return {
    success: true,
    gatewayTxnId: reference('rfnd'),
    message: `Refunded ${amount.toFixed(2)}`,
  };
}
