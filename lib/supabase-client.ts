import { createClient } from "@supabase/supabase-js"

// Ensure environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

// Client-side Supabase client (singleton pattern)
let supabaseClient: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
})()

// Server-side Supabase client with service role
export const supabaseAdmin = (() => {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Please set this environment variable.")
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
})()

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          stack_user_id: string
          balance_friendcoins: number
          balance_friendship_fractions: number
          card_number: string
          created_at: string
          updated_at: string
          last_interest_payment: string
        }
        Insert: {
          id?: string
          stack_user_id: string
          balance_friendcoins?: number
          balance_friendship_fractions?: number
          card_number: string
          created_at?: string
          updated_at?: string
          last_interest_payment?: string
        }
        Update: {
          id?: string
          stack_user_id?: string
          balance_friendcoins?: number
          balance_friendship_fractions?: number
          card_number?: string
          created_at?: string
          updated_at?: string
          last_interest_payment?: string
        }
      }
      transactions: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          amount_friendcoins: number
          amount_friendship_fractions: number
          tax_amount: number
          transaction_type: "transfer" | "interest" | "coupon_redeem" | "payment"
          status: "pending" | "completed" | "failed"
          created_at: string
          external_reference?: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          amount_friendcoins: number
          amount_friendship_fractions: number
          tax_amount: number
          transaction_type: "transfer" | "interest" | "coupon_redeem" | "payment"
          status?: "pending" | "completed" | "failed"
          created_at?: string
          external_reference?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          amount_friendcoins?: number
          amount_friendship_fractions?: number
          tax_amount?: number
          transaction_type?: "transfer" | "interest" | "coupon_redeem" | "payment"
          status?: "pending" | "completed" | "failed"
          created_at?: string
          external_reference?: string
        }
      }
      coupons: {
        Row: {
          id: string
          code: string
          amount_friendcoins: number
          amount_friendship_fractions: number
          created_by: string
          redeemed_by: string | null
          is_redeemed: boolean
          created_at: string
          redeemed_at: string | null
        }
        Insert: {
          id?: string
          code: string
          amount_friendcoins: number
          amount_friendship_fractions: number
          created_by: string
          redeemed_by?: string | null
          is_redeemed?: boolean
          created_at?: string
          redeemed_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          amount_friendcoins?: number
          amount_friendship_fractions?: number
          created_by?: string
          redeemed_by?: string | null
          is_redeemed?: boolean
          created_at?: string
          redeemed_at?: string | null
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          api_key: string
          name: string
          webhook_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          api_key: string
          name: string
          webhook_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          api_key?: string
          name?: string
          webhook_url?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      payment_plans: {
        Row: {
          id: string
          api_key_id: string
          external_id: string
          name: string
          description: string
          amount_friendcoins: number
          amount_friendship_fractions: number
          currency: string
          metadata: any
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          api_key_id: string
          external_id: string
          name: string
          description: string
          amount_friendcoins: number
          amount_friendship_fractions: number
          currency?: string
          metadata?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          api_key_id?: string
          external_id?: string
          name?: string
          description?: string
          amount_friendcoins?: number
          amount_friendship_fractions?: number
          currency?: string
          metadata?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payment_sessions: {
        Row: {
          id: string
          payment_plan_id: string
          session_token: string
          customer_email: string | null
          customer_name: string | null
          amount_friendcoins: number
          amount_friendship_fractions: number
          status: "pending" | "completed" | "failed" | "expired"
          payment_method: string | null
          transaction_id: string | null
          external_reference: string | null
          expires_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payment_plan_id: string
          session_token: string
          customer_email?: string | null
          customer_name?: string | null
          amount_friendcoins: number
          amount_friendship_fractions: number
          status?: "pending" | "completed" | "failed" | "expired"
          payment_method?: string | null
          transaction_id?: string | null
          external_reference?: string | null
          expires_at: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payment_plan_id?: string
          session_token?: string
          customer_email?: string | null
          customer_name?: string | null
          amount_friendcoins?: number
          amount_friendship_fractions?: number
          status?: "pending" | "completed" | "failed" | "expired"
          payment_method?: string | null
          transaction_id?: string | null
          external_reference?: string | null
          expires_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      merchant_projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          api_key: string
          webhook_url: string | null
          database_url: string
          account_number: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string
          api_key: string
          webhook_url?: string | null
          database_url?: string
          account_number?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          api_key?: string
          webhook_url?: string | null
          database_url?: string
          account_number?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      merchant_payment_plans: {
        Row: {
          id: string
          project_id: string
          external_id: string
          name: string
          description: string
          amount_friendcoins: number
          amount_friendship_fractions: number
          metadata: any
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          external_id: string
          name: string
          description?: string
          amount_friendcoins: number
          amount_friendship_fractions: number
          metadata?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          external_id?: string
          name?: string
          description?: string
          amount_friendcoins?: number
          amount_friendship_fractions?: number
          metadata?: any
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      merchant_payment_sessions: {
        Row: {
          id: string
          project_id: string
          payment_plan_id: string
          session_token: string
          validation_code: string | null
          customer_email: string | null
          customer_name: string | null
          amount_friendcoins: number
          amount_friendship_fractions: number
          return_url: string | null
          metadata: any
          status: "pending" | "completed" | "failed" | "expired"
          transaction_id: string | null
          expires_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          payment_plan_id: string
          session_token: string
          validation_code?: string | null
          customer_email?: string | null
          customer_name?: string | null
          amount_friendcoins: number
          amount_friendship_fractions: number
          return_url?: string | null
          metadata?: any
          status?: "pending" | "completed" | "failed" | "expired"
          transaction_id?: string | null
          expires_at: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          payment_plan_id?: string
          session_token?: string
          validation_code?: string | null
          customer_email?: string | null
          customer_name?: string | null
          amount_friendcoins?: number
          amount_friendship_fractions?: number
          return_url?: string | null
          metadata?: any
          status?: "pending" | "completed" | "failed" | "expired"
          transaction_id?: string | null
          expires_at?: string
          completed_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
