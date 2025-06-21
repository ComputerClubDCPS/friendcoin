"use client"

import { useUser } from "@stackframe/stack"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { supabase } from "@/lib/supabase"
import { formatCurrency, type CurrencyAmount } from "@/lib/currency"
import { Gift, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function RedeemPage() {
  const user = useUser()
  const searchParams = useSearchParams()
  const code = searchParams.get("code")
  const [couponData, setCouponData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [redeemed, setRedeemed] = useState(false)

  useEffect(() => {
    if (code) {
      fetchCouponData()
    }
  }, [code])

  async function fetchCouponData() {
    if (!code) return

    try {
      const { data, error } = await supabase.from("coupons").select("*").eq("code", code.toUpperCase()).single()

      if (error) {
        setMessage("Coupon not found")
        return
      }

      setCouponData(data)
      if (data.is_redeemed) {
        setMessage("This coupon has already been redeemed")
      }
    } catch (error) {
      setMessage("Error loading coupon data")
    }
  }

  async function redeemCoupon() {
    if (!user || !couponData || couponData.is_redeemed) return

    setLoading(true)
    setMessage("")

    try {
      // Get user's current balance
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("stack_user_id", user.id)
        .single()

      if (userError) {
        setMessage("Error fetching your account data")
        return
      }

      const couponAmount: CurrencyAmount = {
        friendcoins: couponData.amount_friendcoins,
        friendshipFractions: couponData.amount_friendship_fractions,
      }

      // Add amount to user's balance
      let newFractions = userData.balance_friendship_fractions + couponAmount.friendshipFractions
      let newCoins = userData.balance_friendcoins + couponAmount.friendcoins

      if (newFractions >= 100) {
        newCoins += Math.floor(newFractions / 100)
        newFractions = newFractions % 100
      }

      // Update user balance
      const { error: updateError } = await supabase
        .from("users")
        .update({
          balance_friendcoins: newCoins,
          balance_friendship_fractions: newFractions,
          updated_at: new Date().toISOString(),
        })
        .eq("stack_user_id", user.id)

      if (updateError) {
        setMessage("Error updating your balance")
        return
      }

      // Mark coupon as redeemed
      const { error: redeemError } = await supabase
        .from("coupons")
        .update({
          is_redeemed: true,
          redeemed_by: user.id,
          redeemed_at: new Date().toISOString(),
        })
        .eq("code", code.toUpperCase())

      if (redeemError) {
        setMessage("Error marking coupon as redeemed")
        return
      }

      // Record transaction
      const { error: transactionError } = await supabase.from("transactions").insert({
        from_user_id: couponData.created_by,
        to_user_id: user.id,
        amount_friendcoins: couponAmount.friendcoins,
        amount_friendship_fractions: couponAmount.friendshipFractions,
        tax_amount: 0,
        transaction_type: "coupon_redeem",
        status: "completed",
      })

      if (transactionError) {
        console.error("Error recording transaction:", transactionError)
      }

      setRedeemed(true)
      setMessage(`Successfully redeemed ${formatCurrency(couponAmount)}!`)
    } catch (error) {
      console.error("Coupon redemption error:", error)
      setMessage("Failed to redeem coupon. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-red-600">No coupon code provided</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <FriendCoinLogo size={64} showStars />
            </div>
            <CardTitle className="flex items-center justify-center space-x-2">
              {redeemed ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Gift className="h-5 w-5" />}
              <span>{redeemed ? "Coupon Redeemed!" : "Redeem Coupon"}</span>
            </CardTitle>
            <CardDescription>
              {couponData && !couponData.is_redeemed && !redeemed
                ? `Redeem ${formatCurrency({
                    friendcoins: couponData.amount_friendcoins,
                    friendshipFractions: couponData.amount_friendship_fractions,
                  })}`
                : "FriendCoin Gift Coupon"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {couponData && !couponData.is_redeemed && !redeemed && (
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-4">
                  {formatCurrency({
                    friendcoins: couponData.amount_friendcoins,
                    friendshipFractions: couponData.amount_friendship_fractions,
                  })}
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4">
                  <div className="font-mono text-lg font-bold">{code.toUpperCase()}</div>
                </div>
              </div>
            )}

            {message && (
              <div
                className={`p-3 rounded-lg text-sm text-center ${
                  message.includes("Successfully") || redeemed
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {message}
              </div>
            )}

            {!user ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center">Sign in to redeem this coupon</p>
                <Link href="/auth/signin">
                  <Button className="w-full">Sign In</Button>
                </Link>
              </div>
            ) : couponData && !couponData.is_redeemed && !redeemed ? (
              <Button onClick={redeemCoupon} disabled={loading} className="w-full">
                {loading ? "Redeeming..." : "Redeem Coupon"}
              </Button>
            ) : redeemed ? (
              <Link href="/dashboard">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            ) : null}

            <div className="text-center">
              <Link href="/" className="text-sm text-blue-600 hover:underline">
                Back to FriendCoin
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
