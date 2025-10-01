import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import * as Sentry from "@sentry/nextjs"
import { captureDbQuery, enhanceDbError } from "@/lib/sentry-db-monitor"

export async function GET(request: NextRequest) {
  return Sentry.withServerActionInstrumentation(
    "transactions-get",
    async () => {
      try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("user_id")

        if (!userId) {
          Sentry.captureMessage("Missing user_id parameter in transactions request", "warning")
          return NextResponse.json({ error: "User ID required" }, { status: 400 })
        }

        // Get transactions for the user with enhanced monitoring
        const { data: transactions, error } = await captureDbQuery(
          "select_with_join",
          "transactions",
          () => supabaseAdmin
            .from("transactions")
            .select(`
              *,
              merchant_projects(name)
            `)
            .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
            .order("created_at", { ascending: false })
            .limit(50),
          {
            operation: "fetch_user_transactions",
            table: "transactions",
            userId,
            queryDetails: {
              join_table: "merchant_projects",
              filter_type: "user_transactions",
              limit: 50,
              order: "created_at desc"
            }
          }
        )

        if (error) {
          console.error("Error fetching transactions:", error)
          
          // Enhanced error monitoring
          enhanceDbError(error, {
            operation: "fetch_user_transactions",
            table: "transactions",
            userId,
            queryDetails: {
              join_table: "merchant_projects",
              filter_type: "user_transactions",
              limit: 50
            }
          })

          // Check if it's a permission/auth error
          if (error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
            return NextResponse.json({ 
              error: "Access denied. Please check your authentication or contact support.",
              details: "Database permission error"
            }, { status: 403 })
          }

          return NextResponse.json({ 
            error: "Failed to fetch transactions",
            details: "Database query failed"
          }, { status: 500 })
        }

        // Add merchant name to transactions
        const enrichedTransactions = transactions.map((transaction) => ({
          ...transaction,
          merchant_name: transaction.merchant_projects?.name || null,
        }))

        return NextResponse.json({ transactions: enrichedTransactions })
      } catch (error) {
        console.error("Transactions API error:", error)
        Sentry.captureException(error, {
          tags: { operation: "fetch_transactions" },
          extra: { request_url: request.url }
        })

        // Check if it's a Supabase configuration error
        if (error instanceof Error && error.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          return NextResponse.json({ 
            error: "Service configuration error. Please contact support.",
            details: "Missing database credentials"
          }, { status: 503 })
        }

        return NextResponse.json({ 
          error: "Internal server error",
          details: "Unexpected error occurred"
        }, { status: 500 })
      }
    }
  )
}
