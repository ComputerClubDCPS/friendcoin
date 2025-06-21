import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"
import { parseCurrency, subtractCurrency, addCurrency, calculateTax, type CurrencyAmount } from "@/lib/currency"

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recipientId, amount, notes } = await request.json()

    if (!recipientId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Parse the amount - handle both string and number inputs
    let transferAmount: CurrencyAmount
    try {
      if (typeof amount === "string") {
        // Remove f€ symbol if present and parse
        const cleanAmount = amount.replace(/f€?/g, "").trim()
        transferAmount = parseCurrency(cleanAmount)
      } else {
        transferAmount = parseCurrency(amount.toString())
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid amount format" }, { status: 400 })
    }

    // Get sender's current balance
    const { data: senderData, error: senderError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("stack_user_id", user.id)
      .single()

    if (senderError) {
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
    } catch {
      return NextResponse.json({ error: "Insufficient funds for this transfer" }, { status: 400 })
    }

    // Get recipient data
    const { data: recipientData, error: recipientError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("stack_user_id", recipientId)
      .single()

    if (recipientError) {
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
    }

    // Update recent transfers
    const { error: recentTransferError } = await supabaseAdmin.from("recent_transfers").upsert(
      {
        from_user_id: user.id,
        to_user_id: recipientId,
        to_display_name: recipientData.display_name || recipientId,
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
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${transferAmount.friendcoins}.${transferAmount.friendshipFractions.toString().padStart(2, "0")}f€ to ${recipientData.display_name || recipientId}`,
      tax: `${tax.friendcoins}.${tax.friendshipFractions.toString().padStart(2, "0")}f€`,
    })
  } catch (error) {
    console.error("Transfer error:", error)
    return NextResponse.json({ error: "Transfer failed. Please try again." }, { status: 500 })
  }
}
