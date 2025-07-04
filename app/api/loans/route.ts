import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: loans, error } = await supabaseAdmin
      .from("loans")
      .select(`
        *,
        loan_payments(*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching loans:", error)
      return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 })
    }

    return NextResponse.json({ loans: loans || [] })
  } catch (error) {
    console.error("Loans API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { amount_friendcoins, amount_friendship_fractions } = body

    if (amount_friendcoins === undefined || amount_friendship_fractions === undefined) {
      return NextResponse.json({ error: "Loan amount required" }, { status: 400 })
    }

    // Check for existing active loans
    const { data: existingLoans, error: loanCheckError } = await supabaseAdmin
      .from("loans")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")

    if (loanCheckError) {
      console.error("Error checking existing loans:", loanCheckError)
      return NextResponse.json({ error: "Failed to check existing loans" }, { status: 500 })
    }

    if (existingLoans && existingLoans.length > 0) {
      return NextResponse.json(
        { error: "You already have an active loan. Pay it off before taking another." },
        { status: 400 },
      )
    }

    // Check for account restrictions
    const { data: restrictions, error: restrictionError } = await supabaseAdmin
      .from("account_restrictions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (restrictionError) {
      console.error("Error checking restrictions:", restrictionError)
    }

    if (restrictions && restrictions.length > 0) {
      return NextResponse.json({ error: "Account restricted. Cannot take loans." }, { status: 403 })
    }

    // Check currency circulation limits
    const totalLoanAmount = amount_friendcoins + amount_friendship_fractions / 100

    const circulationResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/currency/circulation`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_change: Math.ceil(totalLoanAmount),
          reason: `Loan to user ${user.id}`,
        }),
      },
    )

    if (!circulationResponse.ok) {
      const circulationError = await circulationResponse.json()
      return NextResponse.json({ error: circulationError.error || "Currency limit exceeded" }, { status: 400 })
    }

    // Create loan (due in 1 month)
    const dueDate = new Date()
    dueDate.setMonth(dueDate.getMonth() + 1)

    const { data: loan, error: loanError } = await supabaseAdmin
      .from("loans")
      .insert({
        user_id: user.id,
        principal_friendcoins: amount_friendcoins,
        principal_friendship_fractions: amount_friendship_fractions,
        due_date: dueDate.toISOString(),
        status: "active",
      })
      .select()
      .single()

    if (loanError) {
      console.error("Error creating loan:", loanError)
      return NextResponse.json({ error: "Failed to create loan" }, { status: 500 })
    }

    // Add loan amount to user balance
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("stack_user_id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const newFractions = userData.balance_friendship_fractions + amount_friendship_fractions
    const newFriendcoins = userData.balance_friendcoins + amount_friendcoins + Math.floor(newFractions / 100)
    const finalFractions = newFractions % 100

    const { error: balanceError } = await supabaseAdmin
      .from("users")
      .update({
        balance_friendcoins: newFriendcoins,
        balance_friendship_fractions: finalFractions,
        updated_at: new Date().toISOString(),
      })
      .eq("stack_user_id", user.id)

    if (balanceError) {
      console.error("Error updating balance:", balanceError)
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    // Record transaction
    const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
      from_user_id: "bank",
      to_user_id: user.id,
      amount_friendcoins,
      amount_friendship_fractions,
      tax_amount: 0,
      transaction_type: "loan",
      status: "completed",
      external_reference: loan.id,
    })

    if (transactionError) {
      console.error("Error recording transaction:", transactionError)
    }

    return NextResponse.json({
      success: true,
      loan,
      message: `Loan of ${amount_friendcoins}.${amount_friendship_fractions.toString().padStart(2, "0")}f€ approved`,
    })
  } catch (error) {
    console.error("Loan creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
