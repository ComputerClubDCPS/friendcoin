"use client"

import { useUser } from "@stackframe/stack"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { ArrowLeft, Gift, Plus, Copy } from "lucide-react"
import Link from "next/link"

export default function CouponsPage() {
  const user = useUser({ or: "redirect" })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  // Create coupon form
  const [createForm, setCreateForm] = useState({
    amount: "",
    description: "",
    expiresIn: "24",
  })


  // Redeem coupon form
  const [redeemForm, setRedeemForm] = useState({
    code: "",
  })

  const [friendcoins, setFriendcoins] = useState(0)
  const [friendshipFractions, setFriendshipFractions] = useState(0)

  const [generatedCoupon, setGeneratedCoupon] = useState<string | null>(null)

  async function createCoupon() {
    if (!user || !createForm.amount) return

    setLoading(true)
    setMessage("")

    try {
      // Parse amount - remove any f€ symbols and handle decimal input
      const cleanAmount = createForm.amount.replace(/f€?/g, "").trim()
      const amount = Number.parseFloat(cleanAmount)

      if (isNaN(amount) || amount <= 0) {
        setMessage("Please enter a valid amount")
        setLoading(false)
        return
      }

      const friendcoins = Math.floor(amount)
      const friendshipFractions = Math.round((amount % 1) * 100)

      const response = await fetch("/api/coupons/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: `${friendcoins}.${(friendshipFractions || 0).padStart(2, '0')}f€`,
          description: createForm.description,
          expires_in_hours: Number.parseInt(createForm.expiresIn),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setGeneratedCoupon(data.coupon_code)
        setMessage(`Coupon created successfully! Code: ${data.code || null}`)
        setCreateForm({ amount: "", description: "", expiresIn: "24" })
      } else {
        setMessage(data.error || "Error creating coupon")
      }
    } catch (error) {
      console.error("Coupon creation error:", error)
      setMessage("Failed to create coupon. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function redeemCoupon() {
    if (!user || !redeemForm.code) return

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          code: redeemForm.code,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Coupon redeemed successfully! You received ${data.amount}`)
        setRedeemForm({ code: "" })
      } else {
        setMessage(data.error || "Error redeeming coupon")
      }
    } catch (error) {
      console.error("Coupon redemption error:", error)
      setMessage("Failed to redeem coupon. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setMessage("Coupon code copied to clipboard!")
    setTimeout(() => setMessage(""), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <FriendCoinLogo size={32} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gift Coupons</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="create" className="space-y-4">
            <TabsList>
              <TabsTrigger value="create">Create Coupon</TabsTrigger>
              <TabsTrigger value="redeem">Redeem Coupon</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Create Gift Coupon</span>
                  </CardTitle>
                  <CardDescription>
                    Create a coupon that others can redeem for FriendCoins. The amount will be deducted from your
                    balance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        placeholder="10.50"
                        value={createForm.amount}
                        onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                        type="number"
                        step="0.01"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Enter amount in FriendCoins (e.g., 10.50)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiresIn">Expires In (Hours)</Label>
                      <select
                        id="expiresIn"
                        value={createForm.expiresIn}
                        onChange={(e) => setCreateForm({ ...createForm, expiresIn: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="1">1 Hour</option>
                        <option value="6">6 Hours</option>
                        <option value="24">24 Hours</option>
                        <option value="72">3 Days</option>
                        <option value="168">1 Week</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Happy Birthday! Enjoy this gift..."
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {message && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        message.includes("successfully") || message.includes("copied")
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {message}
                    </div>
                  )}

                  <Button onClick={createCoupon} disabled={loading || !createForm.amount} className="w-full">
                    {loading ? "Creating..." : "Create Coupon"}
                  </Button>

                  {generatedCoupon && (
                    <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-green-800 dark:text-green-200">Coupon Created!</h4>
                            <code className="text-lg font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                              {generatedCoupon}
                            </code>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(generatedCoupon)}
                            className="bg-white dark:bg-gray-800"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                          Share this code with someone to let them redeem the FriendCoins!
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>• The coupon amount will be deducted from your balance immediately</p>
                    <p>• Coupons expire after the specified time period</p>
                    <p>• Each coupon can only be redeemed once</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="redeem" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Gift className="h-5 w-5" />
                    <span>Redeem Gift Coupon</span>
                  </CardTitle>
                  <CardDescription>Enter a coupon code to redeem FriendCoins to your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="couponCode">Coupon Code</Label>
                    <Input
                      id="couponCode"
                      placeholder="Enter coupon code..."
                      value={redeemForm.code}
                      onChange={(e) => setRedeemForm({ ...redeemForm, code: e.target.value })}
                      className="font-mono"
                    />
                  </div>

                  {message && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        message.includes("successfully") || message.includes("copied")
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {message}
                    </div>
                  )}

                  <Button onClick={redeemCoupon} disabled={loading || !redeemForm.code} className="w-full">
                    {loading ? "Redeeming..." : "Redeem Coupon"}
                  </Button>

                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>• Coupon codes are case-sensitive</p>
                    <p>• Each coupon can only be redeemed once</p>
                    <p>• Expired coupons cannot be redeemed</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
