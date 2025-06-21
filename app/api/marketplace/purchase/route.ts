import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { product_id } = body

    if (!product_id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 })
    }

    // Get product details
    const { data: product, error: productError } = await supabaseAdmin
      .from("developer_products")
      .select("*")
      .eq("id", product_id)
      .eq("is_active", true)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

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
    const productTotalFractions = product.price_friendcoins * 100 + product.price_friendship_fractions

    if (userTotalFractions < productTotalFractions) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Deduct from user balance
    const newUserFractions = userTotalFractions - productTotalFractions
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
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    // Add to developer balance
    const { data: developerData, error: developerError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("stack_user_id", product.developer_id)
      .single()

    if (!developerError && developerData) {
      const devTotalFractions = developerData.balance_friendcoins * 100 + developerData.balance_friendship_fractions
      const newDevFractions = devTotalFractions + productTotalFractions
      const newDevFriendcoins = Math.floor(newDevFractions / 100)
      const newDevFractionsRemainder = newDevFractions % 100

      await supabaseAdmin
        .from("users")
        .update({
          balance_friendcoins: newDevFriendcoins,
          balance_friendship_fractions: newDevFractionsRemainder,
          updated_at: new Date().toISOString(),
        })
        .eq("stack_user_id", product.developer_id)
    }

    // Record purchase
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("product_purchases")
      .insert({
        user_id: user.id,
        product_id,
        developer_id: product.developer_id,
        amount_paid_friendcoins: product.price_friendcoins,
        amount_paid_friendship_fractions: product.price_friendship_fractions,
        purchase_type: "one_time",
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
      to_user_id: product.developer_id,
      amount_friendcoins: product.price_friendcoins,
      amount_friendship_fractions: product.price_friendship_fractions,
      tax_amount: 0,
      transaction_type: "product_purchase",
      status: "completed",
      external_reference: purchase.id,
    })

    if (transactionError) {
      console.error("Error recording transaction:", transactionError)
    }

    // Call webhook if provided
    if (product.webhook_url) {
      try {
        await fetch(product.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "purchase",
            user_id: user.id,
            product_id,
            purchase_id: purchase.id,
            amount: `${product.price_friendcoins}.${product.price_friendship_fractions.toString().padStart(2, "0")}f€`,
          }),
        })
      } catch (webhookError) {
        console.error("Webhook error:", webhookError)
      }
    }

    return NextResponse.json({
      success: true,
      purchase,
      message: `Successfully purchased ${product.name}`,
    })
  } catch (error) {
    console.error("Purchase error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
