import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params
    const body = await request.json()
    const { payment_method, card_details, user_id } = body

    if (!token || !payment_method || !user_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get payment session with project info
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("merchant_payment_sessions")
      .select(`
        *,
        merchant_payment_plans(*),
        merchant_projects(*)
      `)
      .eq("session_token", token)
      .eq("status", "pending")
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Payment session not found or already processed" }, { status: 404 })
    }

    // Check if session has expired
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (now > expiresAt) {
      return NextResponse.json({ error: "Payment session has expired" }, { status: 400 })
    }

    // Generate validation code
    const validationCode = `vc_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

    // Process payment based on method
    if (payment_method === "friendcoin") {
      // Get user's FriendCoin balance
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("stack_user_id", user_id)
        .single()

      if (userError || !userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Check sufficient balance
      const userBalance = userData.balance_friendcoins + userData.balance_friendship_fractions / 100
      const requiredAmount = session.amount_friendcoins + session.amount_friendship_fractions / 100

      if (userBalance < requiredAmount) {
        return NextResponse.json({ error: "Insufficient FriendCoin balance" }, { status: 400 })
      }

      // Deduct from user balance
      let newFractions = userData.balance_friendship_fractions - session.amount_friendship_fractions
      let newCoins = userData.balance_friendcoins - session.amount_friendcoins

      if (newFractions < 0) {
        newCoins -= 1
        newFractions += 100
      }

      // Update user balance
      const { error: balanceError } = await supabaseAdmin
        .from("users")
        .update({
          balance_friendcoins: newCoins,
          balance_friendship_fractions: newFractions,
          updated_at: new Date().toISOString(),
        })
        .eq("stack_user_id", user_id)

      if (balanceError) {
        return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
      }
    } else if (payment_method === "card") {
      // Simulate card processing
      if (!card_details || !card_details.number || !card_details.expiry || !card_details.cvc) {
        return NextResponse.json({ error: "Invalid card details" }, { status: 400 })
      }
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        from_user_id: user_id,
        to_user_id: session.merchant_projects.user_id,
        amount_friendcoins: session.amount_friendcoins,
        amount_friendship_fractions: session.amount_friendship_fractions,
        tax_amount: 0,
        transaction_type: "payment",
        status: "completed",
        external_reference: validationCode,
        merchant_project_id: session.project_id,
      })
      .select()
      .single()

    if (transactionError) {
      console.error("Error creating transaction:", transactionError)
      return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 })
    }

    // Update payment session
    const { error: updateError } = await supabaseAdmin
      .from("merchant_payment_sessions")
      .update({
        status: "completed",
        validation_code: validationCode,
        transaction_id: transaction.id,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session.id)

    if (updateError) {
      console.error("Error updating payment session:", updateError)
    }

    // Send webhook notification if configured
    if (session.merchant_projects.webhook_url) {
      try {
        await fetch(session.merchant_projects.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-FriendCoin-Event": "payment.completed",
            "X-FriendCoin-Signature": `sha256=${validationCode}`, // In production, use proper HMAC
          },
          body: JSON.stringify({
            event: "payment.completed",
            session_token: token,
            validation_code: validationCode,
            amount: {
              friendcoins: session.amount_friendcoins,
              friendship_fractions: session.amount_friendship_fractions,
            },
            customer: {
              email: session.customer_email,
              name: session.customer_name,
            },
            metadata: session.metadata,
            payment_method,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (webhookError) {
        console.error("Webhook delivery failed:", webhookError)
      }
    }

    return NextResponse.json({
      success: true,
      validation_code: validationCode,
      status: "completed",
      amount: formatCurrency({
        friendcoins: session.amount_friendcoins,
        friendshipFractions: session.amount_friendship_fractions,
      }),
    })
  } catch (error) {
    console.error("Payment processing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
