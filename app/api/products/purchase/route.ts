import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getUser } from "@stackframe/stack"

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, quantity = 1 } = body

    if (!product_id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 })
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
      const hasDebtRestriction = restrictions.some((r) => r.restriction_type === "banking_disabled")
      if (hasDebtRestriction) {
        return NextResponse.json({ error: "Account restricted due to outstanding debt" }, { status: 403 })
      }
    }

    // Get product details
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", product_id)
      .eq("is_active", true)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check stock
    if (product.stock_quantity !== -1 && product.stock_quantity < quantity) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
    }

    // Calculate total cost
    const totalCostFriendcoins = product.price_friendcoins * quantity
    const totalCostFractions = product.price_friendship_fractions * quantity

    // Handle fraction overflow
    const finalCostFriendcoins = totalCostFriendcoins + Math.floor(totalCostFractions / 100)
    const finalCostFractions = totalCostFractions % 100

    // Get user balance
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("stack_user_id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has sufficient balance
    const userTotalFractions = userData.balance_friendcoins * 100 + userData.balance_friendship_fractions
    const requiredFractions = finalCostFriendcoins * 100 + finalCostFractions

    if (userTotalFractions < requiredFractions) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Deduct from user balance
    const newUserFractions = userTotalFractions - requiredFractions
    const newFriendcoins = Math.floor(newUserFractions / 100)
    const newFractions = newUserFractions % 100

    // Update user balance
    const { error: balanceError } = await supabaseAdmin
      .from("users")
      .update({
        balance_friendcoins: newFriendcoins,
        balance_friendship_fractions: newFractions,
        updated_at: new Date().toISOString(),
      })
      .eq("stack_user_id", user.id)

    if (balanceError) {
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    // Update product stock if not unlimited
    if (product.stock_quantity !== -1) {
      const { error: stockError } = await supabaseAdmin
        .from("products")
        .update({
          stock_quantity: product.stock_quantity - quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product_id)

      if (stockError) {
        console.error("Error updating stock:", stockError)
      }
    }

    // Record the purchase
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("product_purchases")
      .insert({
        user_id: user.id,
        product_id,
        quantity,
        total_price_friendcoins: finalCostFriendcoins,
        total_price_friendship_fractions: finalCostFractions,
        status: "completed",
      })
      .select()
      .single()

    if (purchaseError) {
      console.error("Error recording purchase:", purchaseError)
      return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 })
    }

    // Record transaction
    const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
      from_user_id: user.id,
      to_user_id: "system",
      amount_friendcoins: finalCostFriendcoins,
      amount_friendship_fractions: finalCostFractions,
      tax_amount: 0,
      transaction_type: "product_purchase",
      status: "completed",
      external_reference: purchase.id,
    })

    if (transactionError) {
      console.error("Error recording transaction:", transactionError)
    }

    return NextResponse.json({
      success: true,
      purchase,
      message: `Successfully purchased ${quantity}x ${product.name}`,
    })
  } catch (error) {
    console.error("Product purchase error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
