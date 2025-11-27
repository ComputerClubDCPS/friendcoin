import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"
import * as Sentry from "@sentry/nextjs"

export async function POST(request: NextRequest) {
  return Sentry.withServerActionInstrumentation("marketplace-purchase-post", async () => {
    try {
      const user = await stackServerApp.getUser()
      if (!user) {
        Sentry.captureMessage("Unauthorized marketplace purchase attempt", "warning")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const body = await request.json()
      const { product_id } = body

      if (!product_id) {
        Sentry.captureMessage("Product ID missing in marketplace purchase", "warning", {
          extra: { user_id: user.id },
        })
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
        Sentry.captureException(productError || new Error("Product not found"), {
          tags: { operation: "marketplace_fetch_product" },
          extra: { user_id: user.id, product_id },
        })
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }

      // Get user balance
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("stack_user_id", user.id)
        .single()

      if (userError || !userData) {
        Sentry.captureException(userError || new Error("User not found"), {
          tags: { operation: "marketplace_fetch_user" },
          extra: { user_id: user.id },
        })
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Check if user has sufficient balance
      const userTotalFractions = userData.balance_friendcoins * 100 + userData.balance_friendship_fractions
      const productTotalFractions = product.price_friendcoins * 100 + product.price_friendship_fractions

      if (userTotalFractions < productTotalFractions) {
        Sentry.captureMessage("Insufficient balance for marketplace purchase", "info", {
          extra: {
            user_id: user.id,
            product_id,
            user_balance: userTotalFractions,
            product_price: productTotalFractions,
          },
        })
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
        Sentry.captureException(balanceError, {
          tags: { operation: "marketplace_update_user_balance" },
          extra: { user_id: user.id, product_id },
        })
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

        const { error: devUpdateError } = await supabaseAdmin
          .from("users")
          .update({
            balance_friendcoins: newDevFriendcoins,
            balance_friendship_fractions: newDevFractionsRemainder,
            updated_at: new Date().toISOString(),
          })
          .eq("stack_user_id", product.developer_id)

        if (devUpdateError) {
          Sentry.captureException(devUpdateError, {
            tags: { operation: "marketplace_update_developer_balance" },
            extra: { user_id: user.id, developer_id: product.developer_id, product_id },
          })
        }
      } else if (developerError) {
        Sentry.captureException(developerError, {
          tags: { operation: "marketplace_fetch_developer" },
          extra: { user_id: user.id, developer_id: product.developer_id, product_id },
        })
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
        Sentry.captureException(purchaseError, {
          tags: { operation: "marketplace_record_purchase" },
          extra: { user_id: user.id, product_id },
        })
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
        Sentry.captureException(transactionError, {
          tags: { operation: "marketplace_record_transaction" },
          extra: { user_id: user.id, product_id, purchase_id: purchase.id },
        })
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
          Sentry.captureException(webhookError, {
            tags: { operation: "marketplace_webhook_call" },
            extra: { user_id: user.id, product_id, webhook_url: product.webhook_url },
          })
        }
      }

      return NextResponse.json({
        success: true,
        purchase,
        message: `Successfully purchased ${product.name}`,
      })
    } catch (error) {
      console.error("Purchase error:", error)
      Sentry.captureException(error, {
        tags: { operation: "marketplace_purchase_error" },
        extra: { request_url: request.url },
      })
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  })
}
