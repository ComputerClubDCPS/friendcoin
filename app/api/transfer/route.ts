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

    if (!recipientId || amount === undefined || amount === null) { // Modified check
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Parse the amount - handle both string and number inputs
    let transferAmount: CurrencyAmount
    try {
      if (typeof amount === "string") {
        // Remove f€ symbol if present and parse
        const cleanAmount = amount.replace(/f€?/g, "").trim()
        transferAmount = parseCurrency(cleanAmount)
      } else if (typeof amount === "number") { // Added check for number type
        transferAmount = parseCurrency(amount.toString())
      } else {
        return NextResponse.json({ error: "Invalid amount format" }, { status: 400 })
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid amount format" }, { status: 400 })
    }

    // ... (rest of your API code remains the same)
  } catch (error) {
    console.error("Transfer error:", error)
    return NextResponse.json({ error: "Transfer failed. Please try again." }, { status: 500 })
  }
}
