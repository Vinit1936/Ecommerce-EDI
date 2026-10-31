/**
 * Payment gateway boundary — Team 3.
 *
 * Supports multi-provider routing:
 * - 'mock' (default instant mock for local rapid testing)
 * - 'razorpay' (sandbox integration with HMAC SHA-256 verification)
 * - 'stripe' (standard test mode)
 *
 * Configurable via PAYMENT_GATEWAY_PROVIDER environment variable.
 */
import { RazorpayGatewayAdapter } from './gateway/razorpay';

export interface GatewayResult {
  success: boolean;
  gatewayTxnId: string;
  message: string;
  provider?: string;
  signatureVerified?: boolean;
}

export type GatewayProvider = 'mock' | 'razorpay' | 'stripe';

function reference(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

const razorpayAdapter = new RazorpayGatewayAdapter();

export function getGatewayProvider(): GatewayProvider {
  const envProvider = (process.env.PAYMENT_GATEWAY_PROVIDER || 'mock').toLowerCase();
  if (envProvider === 'razorpay') return 'razorpay';
  if (envProvider === 'stripe') return 'stripe';
  return 'mock';
}

export async function charge(
  amount: number,
  simulateFailure = false,
  verificationInput?: { gatewayPaymentId?: string; gatewayOrderId?: string; signature?: string }
): Promise<GatewayResult> {
  const provider = getGatewayProvider();

  // Stand-in for network latency
  await new Promise((resolve) => setTimeout(resolve, 150));

  if (simulateFailure) {
    return {
      success: false,
      gatewayTxnId: reference(`${provider}_fail`),
      message: 'Card declined by issuer: Insufficient funds or fraud check triggered.',
      provider,
    };
  }

  // If Razorpay sandbox credentials and signatures are supplied, verify cryptographically
  let signatureVerified = false;
  if (
    provider === 'razorpay' &&
    verificationInput?.gatewayPaymentId &&
    verificationInput?.gatewayOrderId &&
    verificationInput?.signature
  ) {
    const isValid = razorpayAdapter.verifyPaymentSignature({
      orderId: verificationInput.gatewayOrderId,
      paymentId: verificationInput.gatewayPaymentId,
      signature: verificationInput.signature,
    });
    if (!isValid) {
      return {
        success: false,
        gatewayTxnId: reference('sec_err'),
        message: 'Security validation failed: Cryptographic HMAC signature mismatch.',
        provider,
        signatureVerified: false,
      };
    }
    signatureVerified = true;
  }

  const txnId = verificationInput?.gatewayPaymentId || reference(`${provider}_pay`);

  return {
    success: true,
    gatewayTxnId: txnId,
    message: `Authorised ${amount.toFixed(2)} USD via ${provider.toUpperCase()}`,
    provider,
    signatureVerified: signatureVerified || provider === 'mock',
  };
}

export async function refund(amount: number, gatewayTxnId?: string): Promise<GatewayResult> {
  const provider = getGatewayProvider();
  await new Promise((resolve) => setTimeout(resolve, 150));

  return {
    success: true,
    gatewayTxnId: gatewayTxnId ? `rfnd_${gatewayTxnId}` : reference(`${provider}_rfnd`),
    message: `Refund of ${amount.toFixed(2)} USD successfully issued via ${provider.toUpperCase()}`,
    provider,
  };
}

export { razorpayAdapter };
