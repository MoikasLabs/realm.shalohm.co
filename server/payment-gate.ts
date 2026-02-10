/**
 * Payment Gate for Realm Access
 * Supports: x402 payments, token gating, API key auth
 */

interface PaymentGateConfig {
  enabled: boolean;
  mode: "x402" | "token" | "apikey" | "none";
  // x402 config
  x402ReceiverAddress?: string;
  x402UsdAmount?: string;
  // Token gating config
  tokenAddress?: string;
  minTokenBalance?: string;
  // API key config
  apiKeys?: Set<string>;
  // Free allowance (first N registrations free)
  freeRegistrations?: number;
}

interface RegistrationAttempt {
  agentId: string;
  pubkey?: string;
  proof?: PaymentProof;
  timestamp: number;
}

interface PaymentProof {
  type: "x402" | "token" | "apikey";
  data: unknown;
}

export class PaymentGate {
  private config: PaymentGateConfig;
  private registrationCount = 0;
  private verifiedAgents = new Map<string, string>(); // agentId -> paymentType
  private pendingPayments = new Map<string, RegistrationAttempt>(); // agentId -> attempt

  constructor(config: PaymentGateConfig) {
    this.config = {
      enabled: process.env.REQUIRE_PAYMENT === "true",
      mode: (process.env.PAYMENT_MODE as PaymentGateConfig["mode"]) || "none",
      x402ReceiverAddress: process.env.X402_RECEIVER,
      x402UsdAmount: process.env.X402_AMOUNT || "0.001",
      tokenAddress: process.env.GATE_TOKEN_ADDRESS || "0x8a6d3bb6091ea0dd8b1b87c915041708d11f9d3a", // KOBOLDS
      minTokenBalance: process.env.GATE_MIN_BALANCE || "1000000000000000000", // 1 KOBOLD
      apiKeys: new Set(process.env.ALLOWED_API_KEYS?.split(",") || []),
      freeRegistrations: Number(process.env.FREE_REGISTRATIONS || "5"),
    };
  }

  /**
   * Check if payment is required for registration
   */
  isPaymentRequired(): boolean {
    if (!this.config.enabled) return false;
    if (this.registrationCount < (this.config.freeRegistrations || 0)) return false;
    return true;
  }

  /**
   * Get payment requirements for new agent
   */
  getPaymentRequirements(): {
    required: boolean;
    mode: string;
    amount?: string;
    tokenAddress?: string;
    receiverAddress?: string;
  } {
    if (!this.isPaymentRequired()) {
      return { required: false, mode: "none" };
    }

    switch (this.config.mode) {
      case "x402":
        return {
          required: true,
          mode: "x402",
          amount: this.config.x402UsdAmount,
          receiverAddress: this.config.x402ReceiverAddress,
        };
      case "token":
        return {
          required: true,
          mode: "token",
          tokenAddress: this.config.tokenAddress,
        };
      case "apikey":
        return { required: true, mode: "apikey" };
      default:
        return { required: false, mode: "none" };
    }
  }

  /**
   * Verify payment proof for agent registration
   */
  async verifyPayment(agentId: string, proof: PaymentProof): Promise<{
    ok: boolean;
    error?: string;
  }> {
    if (!this.isPaymentRequired()) {
      return { ok: true };
    }

    switch (proof.type) {
      case "x402":
        return this.verifyX402(proof.data);
      case "token":
        return this.verifyTokenGate(proof.data);
      case "apikey":
        return this.verifyApiKey(proof.data);
      default:
        return { ok: false, error: "Unknown payment type" };
    }
  }

  private async verifyX402(proofData: unknown): Promise<{ ok: boolean; error?: string }> {
    try {
      const { payment, receipt } = proofData as { payment: unknown; receipt: string };
      
      // For now, validate that receipt exists and looks valid
      // Real x402 verification would use: await verifyPayment(payment, receipt, ...)
      if (!receipt || receipt.length < 10) {
        return { ok: false, error: "Invalid x402 receipt format" };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: `x402 verification failed: ${err}` };
    }
  }

  private async verifyTokenGate(proofData: unknown): Promise<{ ok: boolean; error?: string }> {
    try {
      const { address, chainId } = proofData as { address: string; chainId: number };
      
      if (!address || !chainId) {
        return { ok: false, error: "Address and chainId required for token verification" };
      }

      // Query token balance via geckoterminal API
      const balance = await this.queryTokenBalance(address, chainId);
      const minBalance = BigInt(this.config.minTokenBalance || "0");
      
      if (balance < minBalance) {
        const required = this.config.minTokenBalance || "1000000000000000000";
        return { 
          ok: false, 
          error: `Insufficient KOBOLDS balance. Required: ${required} wei (1+ KOBOLDS)` 
        };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: `Token verification failed: ${err}` };
    }
  }

  private async queryTokenBalance(address: string, chainId: number): Promise<bigint> {
    // Use geckoterminal API for KOBOLDS balance check on Base
    if (chainId === 8453) { // Base
      try {
        // GeckoTerminal API for token holders
        const url = `https://api.geckoterminal.com/api/v2/networks/base/tokens/${this.config.tokenAddress}/holders/${address}`;
        const response = await fetch(url, { 
          signal: AbortSignal.timeout(5000),
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
          console.warn(`[payment-gate] GeckoTerminal API returned ${response.status}`);
          return BigInt(0);
        }
        
        const responseData = await response.json() as { data?: { attributes?: { balance?: string } } };
        const balanceStr = responseData.data?.attributes?.balance;
        
        if (!balanceStr) {
          return BigInt(0);
        }
        
        return BigInt(balanceStr);
      } catch (err) {
        console.warn("[payment-gate] Failed to query token balance:", err);
        return BigInt(0);
      }
    }
    return BigInt(0);
  }

  private verifyApiKey(proofData: unknown): { ok: boolean; error?: string } {
    const { apiKey } = proofData as { apiKey: string };
    
    if (!apiKey) {
      return { ok: false, error: "API key required" };
    }
    
    if (!this.config.apiKeys?.has(apiKey)) {
      return { ok: false, error: "Invalid API key" };
    }

    return { ok: true };
  }

  /**
   * Mark agent as registered (after payment verification)
   */
  registerAgent(agentId: string, paymentType: string): void {
    this.verifiedAgents.set(agentId, paymentType);
    this.registrationCount++;
  }

  /**
   * Check if agent is verified
   */
  isVerified(agentId: string): boolean {
    // Allow if payment not required
    if (!this.isPaymentRequired()) return true;
    // Check if in verified list
    return this.verifiedAgents.has(agentId);
  }

  /**
   * Get verification status for agent
   */
  getVerification(agentId: string): {
    verified: boolean;
    paymentType?: string;
    freeSlot?: boolean;
  } {
    const paymentType = this.verifiedAgents.get(agentId);
    if (paymentType) {
      return { verified: true, paymentType };
    }
    if (!this.isPaymentRequired()) {
      return { verified: true, freeSlot: true };
    }
    return { verified: false };
  }

  /**
   * Get stats
   */
  getStats(): {
    totalRegistrations: number;
    paidRegistrations: number;
    freeRegistrationsLeft: number;
    mode: string;
  } {
    const freeLeft = Math.max(0, (this.config.freeRegistrations || 0) - this.registrationCount);
    return {
      totalRegistrations: this.registrationCount,
      paidRegistrations: this.verifiedAgents.size,
      freeRegistrationsLeft: freeLeft,
      mode: this.config.mode,
    };
  }
}

// Export singleton instance
export const paymentGate = new PaymentGate({
  enabled: process.env.REQUIRE_PAYMENT === "true",
  mode: (process.env.PAYMENT_MODE as PaymentGateConfig["mode"]) || "none",
});