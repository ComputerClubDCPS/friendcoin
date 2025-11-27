import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"
import * as Sentry from "@sentry/nextjs"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return Sentry.withServerActionInstrumentation("loans-repay-post", async () => {
    try {
      const user = await stackServerApp.getUser()
      if (!user) {
        Sentry.captureMessage("Unauthorized loan repayment attempt", "warning")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const body = await request.json()
      const { loan_id, amount_friendcoins, amount_friendship_fractions } = body

      if (!loan_id || amount_friendcoins === undefined || amount_friendship_fractions === undefined) {
        Sentry.captureMessage("Loan repayment request missing required fields", "warning", {
          extra: { user_id: user.id },
        })
        return NextResponse.json({ error: "Loan ID and payment amount required" }, { status: 400 })
      }

      // Get loan details
      const { data: loan, error: loanError } = await supabaseAdmin
        .from("loans")
        .select("*")
        .eq("id", loan_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (loanError || !loan) {
        console.error("Error fetching loan:", loanError)
        Sentry.captureException(loanError, {
          tags: { operation: "loan_repay_fetch_loan" },
          extra: { user_id: user.id, loan_id, error_code: loanError?.code },
        })
        return NextResponse.json({ error: "Loan not found" }, { status: 404 })
      }

      // Get user balance
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("stack_user_id", user.id)
        .single()

      if (userError || !userData) {
        console.error("Error fetching user:", userError)
        Sentry.captureException(userError, {
          tags: { operation: "loan_repay_fetch_user" },
          extra: { user_id: user.id, error_code: userError?.code },
        })
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Check if user has sufficient balance
      const userTotalFractions = userData.balance_friendcoins * 100 + userData.balance_friendship_fractions
      const paymentFractions = amount_friendcoins * 100 + amount_friendship_fractions

      if (userTotalFractions < paymentFractions) {
        Sentry.captureMessage("User attempted repayment with insufficient balance", "info", {
          extra: { user_id: user.id, loan_id, user_balance: userTotalFractions, payment_amount: paymentFractions },
        })
        return NextResponse.json({ error: "Insufficient balance for payment" }, { status: 400 })
      }

      // Calculate remaining loan balance
      const loanTotalFractions = loan.principal_friendcoins * 100 + loan.principal_friendship_fractions
      const paidTotalFractions = loan.amount_paid_friendcoins * 100 + loan.amount_paid_friendship_fractions
      const remainingFractions = loanTotalFractions - paidTotalFractions

      // Ensure payment doesn't exceed remaining balance
      const actualPaymentFractions = Math.min(paymentFractions, remainingFractions)
      const actualPaymentFriendcoins = Math.floor(actualPaymentFractions / 100)
      const actualPaymentFractionsRemainder = actualPaymentFractions % 100

      // Update user balance
      const newUserFractions = userTotalFractions - actualPaymentFractions
      const newFriendcoins = Math.floor(newUserFractions / 100)
      const newFractions = newUserFractions % 100

      const { error: balanceError } = await supabaseAdmin
        .from("users")
        .update({
          balance_friendcoins: newFriendcoins,
          balance_friendship_fractions: newFractions,
          updated_at: new Date().toISOString(),
        })
        .eq("stack_user_id", user.id)

      if (balanceError) {
        console.error("Error updating balance:", balanceError)
        Sentry.captureException(balanceError, {
          tags: { operation: "loan_repay_update_balance" },
          extra: { user_id: user.id, loan_id, error_code: balanceError.code },
        })
        return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
      }

      // Update loan payment amount
      const newPaidFractions = paidTotalFractions + actualPaymentFractions
      const newPaidFriendcoins = Math.floor(newPaidFractions / 100)
      const newPaidFractionsRemainder = newPaidFractions % 100

      // Check if loan is fully paid
      const isFullyPaid = newPaidFractions >= loanTotalFractions

      const { error: loanUpdateError } = await supabaseAdmin
        .from("loans")
        .update({
          amount_paid_friendcoins: newPaidFriendcoins,
          amount_paid_friendship_fractions: newPaidFractionsRemainder,
          status: isFullyPaid ? "paid" : "active",
        })
        .eq("id", loan_id)

      if (loanUpdateError) {
        console.error("Error updating loan:", loanUpdateError)
        Sentry.captureException(loanUpdateError, {
          tags: { operation: "loan_repay_update_loan" },
          extra: { user_id: user.id, loan_id, error_code: loanUpdateError.code },
        })
        return NextResponse.json({ error: "Failed to update loan" }, { status: 500 })
      }

      // Record payment
      const { error: paymentError } = await supabaseAdmin.from("loan_payments").insert({
        loan_id,
        payment_amount_friendcoins: actualPaymentFriendcoins,
        payment_amount_friendship_fractions: actualPaymentFractionsRemainder,
        payment_type: "manual",
      })

      if (paymentError) {
        console.error("Error recording payment:", paymentError)
        Sentry.captureException(paymentError, {
          tags: { operation: "loan_repay_record_payment" },
          extra: { user_id: user.id, loan_id, error_code: paymentError.code },
        })
      }

      // Record transaction
      const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
        from_user_id: user.id,
        to_user_id: "bank",
        amount_friendcoins: actualPaymentFriendcoins,
        amount_friendship_fractions: actualPaymentFractionsRemainder,
        tax_amount: 0,
        transaction_type: "loan_payment",
        status: "completed",
        external_reference: loan_id,
      })

      if (transactionError) {
        console.error("Error recording transaction:", transactionError)
        Sentry.captureException(transactionError, {
          tags: { operation: "loan_repay_record_transaction" },
          extra: { user_id: user.id, loan_id, error_code: transactionError.code },
        })
      }

      // Update currency circulation (remove from circulation)
      if (isFullyPaid) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/currency/circulation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_change: -Math.ceil((loanTotalFractions - paidTotalFractions) / 100),
            reason: `Loan repayment by user ${user.id}`,
          }),
        })
      }

      return NextResponse.json({
        success: true,
        payment_amount: `${actualPaymentFriendcoins}.${actualPaymentFractionsRemainder.toString().padStart(2, "0")}f€`,
        loan_status: isFullyPaid ? "paid" : "active",
        message: isFullyPaid ? "Loan fully repaid!" : "Payment recorded successfully",
      })
    } catch (error) {
      console.error("Loan repayment error:", error)
      Sentry.captureException(error, {
        tags: { operation: "loan_repayment_error" },
        extra: { request_url: request.url },
      })
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  })
}
