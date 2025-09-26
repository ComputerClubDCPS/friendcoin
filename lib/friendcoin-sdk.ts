// FriendCoin Developer SDK
export class FriendCoinSDK {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl = "https://friendcoin1.vercel.app") {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/api${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Request failed" }))
        const errorMessage = error.error || `HTTP ${response.status}`

        // Log error details for debugging
        console.error(`[FriendCoinSDK] Request failed: ${endpoint}`, {
          status: response.status,
          error: errorMessage,
          url,
        })

        throw new Error(errorMessage)
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`FriendCoin SDK Error: ${error.message}`)
      }
      throw new Error(`FriendCoin SDK Error: Unknown error occurred`)
    }
  }

  // Payment Sessions
  async createPaymentSession(data: {
    payment_plan_id: string
    customer_email: string
    customer_name: string
    return_url: string
    metadata?: Record<string, any>
  }) {
    return this.request("/payments/create-session", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async validatePayment(validationCode: string) {
    return this.request("/payments/validate", {
      method: "POST",
      body: JSON.stringify({ validation_code: validationCode }),
    })
  }

  // Products
  async createProduct(data: {
    name: string
    description: string
    price_friendcoins: number
    price_friendship_fractions: number
    product_type: "one_time" | "subscription"
    webhook_url?: string
  }) {
    return this.request("/developer/products", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getProducts() {
    return this.request("/developer/products")
  }

  async updateProduct(
    id: string,
    data: Partial<{
      name: string
      description: string
      price_friendcoins: number
      price_friendship_fractions: number
      is_active: boolean
      webhook_url: string
    }>,
  ) {
    return this.request(`/developer/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteProduct(id: string) {
    return this.request(`/developer/products/${id}`, {
      method: "DELETE",
    })
  }

  // Subscriptions
  async createSubscription(data: {
    product_id: string
    billing_interval: "monthly" | "yearly"
    trial_days?: number
  }) {
    return this.request("/developer/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getSubscriptions() {
    return this.request("/developer/subscriptions")
  }

  // Payment Plans (legacy)
  async createPaymentPlan(data: {
    external_id: string
    name: string
    description: string
    amount_friendcoins: number
    amount_friendship_fractions: number
  }) {
    return this.request("/developer/payment-plans", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getPaymentPlans() {
    return this.request("/developer/payment-plans")
  }

  // Webhooks
  verifyWebhook(payload: string, signature: string, secret: string): boolean {
    try {
      // Use crypto for better security in production
      if (typeof crypto !== "undefined" && crypto.subtle) {
        // For modern environments with Web Crypto API
        // Note: This is a simplified version - in production use proper HMAC-SHA256
        const expectedSignature = `sha256=${btoa(payload + secret)}`
        return signature === expectedSignature
      } else {
        // Fallback for older environments
        const expectedSignature = `sha256=${Buffer.from(payload + secret).toString("base64")}`
        return signature === expectedSignature
      }
    } catch (error) {
      console.error("[FriendCoinSDK] Webhook verification failed:", error)
      return false
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`)
      if (response.ok) {
        return {
          status: "healthy",
          timestamp: new Date().toISOString(),
        }
      }
      throw new Error(`Health check failed: ${response.status}`)
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      }
    }
  }
}

// Export for browser usage
if (typeof window !== "undefined") {
  ;(window as any).FriendCoinSDK = FriendCoinSDK
}

// Export types
export interface PaymentSession {
  success: boolean
  session_token: string
  payment_url: string
  expires_at: string
}

export interface ValidationResult {
  success: boolean
  valid: boolean
  transaction?: {
    id: string
    amount: {
      friendcoins: number
      friendship_fractions: number
    }
    status: string
    timestamp: string
  }
}

export interface Product {
  id: string
  name: string
  description: string
  price_friendcoins: number
  price_friendship_fractions: number
  product_type: "one_time" | "subscription"
  webhook_url?: string
  is_active: boolean
  created_at: string
}

export interface WebhookEvent {
  event: "payment.completed" | "subscription.created" | "subscription.cancelled"
  session_token?: string
  validation_code?: string
  amount?: {
    friendcoins: number
    friendship_fractions: number
  }
  customer?: {
    email: string
    name: string
  }
  metadata?: Record<string, any>
  product?: Product
  timestamp: string
}
