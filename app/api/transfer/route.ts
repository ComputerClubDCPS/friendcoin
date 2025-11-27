import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"
import { parseCurrency, subtractCurrency, addCurrency, calculateTax, type CurrencyAmount } from "@/lib/currency"
import * as Sentry from "@sentry/nextjs"

// Helper function to create a CurrencyAmount from a number
function createCurrencyAmount(amount: number): CurrencyAmount {
  const friendcoins = Math.floor(amount)
  const friendshipFractions = Math.round((amount - friendcoins) * 100) // Round to nearest fraction
  if (friendshipFractions < 0) {
    return {
      friendcoins: 0,
      friendshipFractions: 0,
    }
  }
  return {
    friendcoins: friendcoins,
    friendshipFractions: friendshipFractions,
  }
}

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return Sentry.withServerActionInstrumentation("transfer-post", async () => {
    try {
      const user = await stackServerApp.getUser()
      if (!user) {
        Sentry.captureMessage("Unauthorized transfer attempt", "warning")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const { recipientId, amount, notes } = await request.json()

      if (!recipientId || amount === undefined || amount === null) {
        Sentry.captureMessage("Transfer request missing required fields", "warning", {
          extra: {
            user_id: user.id,
            has_recipientId: !!recipientId,
            has_amount: amount !== undefined && amount !== null,
          },
        })
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      let transferAmount: CurrencyAmount

      try {
        if (typeof amount === "string") {
          const cleanAmount = amount
            .replace(/[f€$,\s]/g, "") // Remove currency symbols, commas, and spaces
            .replace(/[^\d.]/g, "") // Keep only digits and decimal points
            .trim()

          console.log("[v0] Parsing amount:", amount, "->", cleanAmount)

          if (!cleanAmount || isNaN(Number.parseFloat(cleanAmount))) {
            Sentry.captureMessage("Invalid amount format in transfer", "warning", {
              extra: { user_id: user.id, original_amount: amount, cleaned_amount: cleanAmount },
            })
            return NextResponse.json({ error: "Invalid amount format" }, { status: 400 })
          }

          transferAmount = parseCurrency(cleanAmount)
        } else if (typeof amount === "number") {
          transferAmount = createCurrencyAmount(amount) // Use helper function
        } else {
          Sentry.captureMessage("Invalid amount type in transfer", "warning", {
            extra: { user_id: user.id, amount_type: typeof amount },
          })
          return NextResponse.json({ error: "Invalid amount format" }, { status: 400 })
        }
      } catch (error) {
        console.log("[v0] Currency parsing error:", error)
        Sentry.captureException(error, {
          tags: { operation: "transfer_amount_parsing" },
          extra: { user_id: user.id, amount },
        })
        return NextResponse.json({ error: "Invalid amount format" }, { status: 400 })
      }

      // Get sender's current balance
      const { data: senderData, error: senderError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("stack_user_id", user.id)
        .single()

      if (senderError) {
        Sentry.captureException(senderError, {
          tags: { operation: "transfer_fetch_sender" },
          extra: { user_id: user.id },
        })
        return NextResponse.json({ error: "Error fetching your account data" }, { status: 400 })
      }

      const senderBalance: CurrencyAmount = {
        friendcoins: senderData.balance_friendcoins,
        friendshipFractions: senderData.balance_friendship_fractions,
      }

      // Calculate tax (5%)
      const tax = calculateTax(transferAmount)
      const totalDeduction = addCurrency(transferAmount, tax)

      // Check if sender has sufficient funds
      try {
        subtractCurrency(senderBalance, totalDeduction)
      } catch (error) {
        Sentry.captureMessage("Insufficient funds for transfer", "info", {
          extra: {
            user_id: user.id,
            sender_balance: senderBalance,
            requested_amount: transferAmount,
            total_deduction: totalDeduction,
          },
        })
        return NextResponse.json({ error: "Insufficient funds for this transfer" }, { status: 400 })
      }

      // Get recipient data
      const { data: recipientData, error: recipientError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("stack_user_id", recipientId)
        .single()

      if (recipientError) {
        Sentry.captureException(recipientError, {
          tags: { operation: "transfer_fetch_recipient" },
          extra: { user_id: user.id, recipient_id: recipientId },
        })
        return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
      }

      // Perform the transaction
      const newSenderBalance = subtractCurrency(senderBalance, totalDeduction)
      const recipientBalance: CurrencyAmount = {
        friendcoins: recipientData.balance_friendcoins,
        friendshipFractions: recipientData.balance_friendship_fractions,
      }
      const newRecipientBalance = addCurrency(recipientBalance, transferAmount)

      // Update balances in a transaction
      const { error: updateSenderError } = await supabaseAdmin
        .from("users")
        .update({
          balance_friendcoins: newSenderBalance.friendcoins,
          balance_friendship_fractions: newSenderBalance.friendshipFractions,
          updated_at: new Date().toISOString(),
        })
        .eq("stack_user_id", user.id)

      if (updateSenderError) {
        Sentry.captureException(updateSenderError, {
          tags: { operation: "transfer_update_sender_balance" },
          extra: { user_id: user.id, new_balance: newSenderBalance },
        })
        return NextResponse.json({ error: "Error updating your balance" }, { status: 500 })
      }

      const { error: updateRecipientError } = await supabaseAdmin
        .from("users")
        .update({
          balance_friendcoins: newRecipientBalance.friendcoins,
          balance_friendship_fractions: newRecipientBalance.friendshipFractions,
          updated_at: new Date().toISOString(),
        })
        .eq("stack_user_id", recipientId)

      if (updateRecipientError) {
        Sentry.captureException(updateRecipientError, {
          tags: { operation: "transfer_update_recipient_balance" },
          extra: { user_id: user.id, recipient_id: recipientId, new_balance: newRecipientBalance },
        })
        return NextResponse.json({ error: "Error updating recipient balance" }, { status: 500 })
      }

      // Record the transaction
      const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
        from_user_id: user.id,
        to_user_id: recipientId,
        amount_friendcoins: transferAmount.friendcoins,
        amount_friendship_fractions: transferAmount.friendshipFractions,
        tax_amount: tax.friendcoins * 100 + tax.friendshipFractions,
        transaction_type: "transfer",
        status: "completed",
        notes: notes || null,
      })

      if (transactionError) {
        console.error("Error recording transaction:", transactionError)
        Sentry.captureException(transactionError, {
          tags: { operation: "transfer_record_transaction" },
          extra: { user_id: user.id, recipient_id: recipientId },
        })
      }

      // Update recent transfers
      const { error: recentTransferError } = await supabaseAdmin.from("recent_transfers").upsert(
        {
          from_user_id: user.id,
          to_user_id: recipientId,
          to_display_name: recipientId,
          last_transfer_at: new Date().toISOString(),
          transfer_count: 1,
        },
        {
          onConflict: "from_user_id,to_user_id",
          ignoreDuplicates: false,
        },
      )

      if (recentTransferError) {
        console.error("Error updating recent transfers:", recentTransferError)
        Sentry.captureException(recentTransferError, {
          tags: { operation: "transfer_update_recent" },
          extra: { user_id: user.id, recipient_id: recipientId },
        })
      }

      return NextResponse.json({
        success: true,
        message: `Successfully sent ${transferAmount.friendcoins}.${transferAmount.friendshipFractions.toString().padStart(2, "0")}f€ to ${recipientId}`,
        tax: `${tax.friendcoins}.${tax.friendshipFractions.toString().padStart(2, "0")}f€`,
      })
    } catch (error) {
      console.error("Transfer error:", error)
      Sentry.captureException(error, {
        tags: { operation: "transfer_general_error" },
        extra: { request_url: request.url },
      })
      return NextResponse.json({ error: "Transfer failed. Please try again." }, { status: 500 })
    }
  })
}
