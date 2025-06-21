import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get transactions for the user
    const { data: transactions, error } = await supabaseAdmin
      .from("transactions")
      .select(`
        *,
        merchant_projects(name)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching transactions:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Add merchant name to transactions
    const enrichedTransactions = transactions.map((transaction) => ({
      ...transaction,
      merchant_name: transaction.merchant_projects?.name || null,
    }))

    return NextResponse.json({ transactions: enrichedTransactions })
  } catch (error) {
    console.error("Transactions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
