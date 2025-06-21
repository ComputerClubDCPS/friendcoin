"use client"

import { useUser } from "@stackframe/stack"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { ArrowLeft, CreditCard, Copy, Eye, EyeOff, Wallet, Smartphone } from "lucide-react"
import Link from "next/link"
import { formatCurrency, type CurrencyAmount } from "@/lib/currency"

interface UserData {
  balance_friendcoins: number
  balance_friendship_fractions: number
  card_number: string
  card_cvc: string
  card_expiry: string
  created_at: string
  updated_at: string
}

export default function CardPage() {
  const user = useUser({ or: "redirect" })
  const [userData, setUserData] = useState<UserData | null>(null)
  const [showFullCard, setShowFullCard] = useState(false)
  const [showCVC, setShowCVC] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copyFeedback, setCopyFeedback] = useState("")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchUserData()
    }

    // Detect mobile device
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  }, [user?.id])

  async function fetchUserData() {
    try {
      const response = await fetch("/api/user/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stack_user_id: user.id,
          display_name: user.displayName || null,
          email: user.primaryEmail || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }

      const data = await response.json()
      if (data.user) {
        // Generate CVC and expiry if not present
        const cardData = {
          ...data.user,
          card_cvc: data.user.card_cvc || Math.floor(Math.random() * 900 + 100).toString(),
          card_expiry: data.user.card_expiry || "12/28",
        }
        setUserData(cardData)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard(text: string, type: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(`${type} copied!`)
      setTimeout(() => setCopyFeedback(""), 2000)
    } catch (error) {
      setCopyFeedback("Failed to copy")
      setTimeout(() => setCopyFeedback(""), 2000)
    }
  }

  function formatCardNumber(cardNumber: string, showFull = false): string {
    if (!cardNumber) return ""

    if (showFull) {
      return cardNumber.replace(/(.{4})/g, "$1 ").trim()
    }

    return `**** **** **** ${cardNumber.slice(-4)}`
  }

  function addToWallet() {
    if (!userData) return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)

    if (isIOS) {
      // Apple Wallet integration
      const passData = {
        formatVersion: 1,
        passTypeIdentifier: "pass.com.friendcoin.card",
        serialNumber: userData.card_number,
        teamIdentifier: "FRIENDCOIN",
        organizationName: "FriendCoin",
        description: "FriendCoin Virtual Card",
        logoText: "FriendCoin",
        foregroundColor: "rgb(255, 255, 255)",
        backgroundColor: "rgb(37, 99, 235)",
        generic: {
          primaryFields: [
            {
              key: "balance",
              label: "Balance",
              value: formatCurrency({
                friendcoins: userData.balance_friendcoins,
                friendshipFractions: userData.balance_friendship_fractions,
              }),
            },
          ],
          secondaryFields: [
            {
              key: "cardNumber",
              label: "Card Number",
              value: formatCardNumber(userData.card_number, true),
            },
          ],
          auxiliaryFields: [
            {
              key: "expiry",
              label: "Expires",
              value: userData.card_expiry,
            },
          ],
        },
      }

      // In a real implementation, you'd generate a proper .pkpass file
      alert("Apple Wallet integration would be implemented here with a proper .pkpass file")
    } else if (isAndroid) {
      // Google Pay integration
      alert("Google Pay integration would be implemented here with the Google Pay API")
    } else {
      alert("Wallet integration is only available on mobile devices")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FriendCoinLogo size={64} className="mx-auto mb-4 animate-pulse" />
          <p>Loading your card...</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading card data</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const balance: CurrencyAmount = {
    friendcoins: userData.balance_friendcoins,
    friendshipFractions: userData.balance_friendship_fractions,
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Virtual Card</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Virtual Card Display */}
          <div className="relative">
            <Card className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
              <div className="absolute top-4 right-4 opacity-20">
                <FriendCoinLogo size={48} showStars />
              </div>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-2">
                    <FriendCoinLogo size={32} />
                    <span className="text-lg font-semibold">FriendCoin</span>
                  </div>
                  <CreditCard className="h-8 w-8" />
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="text-sm opacity-75 mb-1">Card Number</div>
                    <div className="flex items-center space-x-2">
                      <div className="font-mono text-xl tracking-wider">
                        {formatCardNumber(userData.card_number, showFullCard)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFullCard(!showFullCard)}
                        className="text-white hover:bg-white/20"
                      >
                        {showFullCard ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(userData.card_number, "Card number")}
                          className="text-white hover:bg-white/20"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {copyFeedback && (
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            {copyFeedback}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm opacity-75 mb-1">Balance</div>
                      <div className="text-xl font-bold">{formatCurrency(balance)}</div>
                    </div>
                    <div>
                      <div className="text-sm opacity-75 mb-1">Expires</div>
                      <div className="font-mono text-lg">{userData.card_expiry}</div>
                    </div>
                    <div>
                      <div className="text-sm opacity-75 mb-1">CVC</div>
                      <div className="flex items-center space-x-2">
                        <div className="font-mono text-lg">{showCVC ? userData.card_cvc : "***"}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCVC(!showCVC)}
                          className="text-white hover:bg-white/20"
                        >
                          {showCVC ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(userData.card_cvc, "CVC")}
                          className="text-white hover:bg-white/20"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm opacity-75 mb-1">Cardholder</div>
                      <div className="text-lg font-semibold">{user.displayName || "FriendCoin User"}</div>
                    </div>
                    <div>
                      <div className="text-sm opacity-75 mb-1">Account Number</div>
                      <div className="font-mono text-sm">{user.id.slice(0, 8)}...</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wallet Integration */}
          {isMobile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <span>Add to Wallet</span>
                </CardTitle>
                <CardDescription>
                  Add your FriendCoin card to your mobile wallet for easy access and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={addToWallet} className="w-full" size="lg">
                  <Smartphone className="h-4 w-4 mr-2" />
                  {/iPad|iPhone|iPod/.test(navigator.userAgent) ? "Add to Apple Wallet" : "Add to Google Pay"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card Information */}
          <Card>
            <CardHeader>
              <CardTitle>Card Information</CardTitle>
              <CardDescription>Your virtual FriendCoin card details and usage information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Card Number</div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                      {showFullCard ? formatCardNumber(userData.card_number, true) : "•••• •••• •••• ••••"}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => setShowFullCard(!showFullCard)}>
                      {showFullCard ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">CVC Code</div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                      {showCVC ? userData.card_cvc : "•••"}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => setShowCVC(!showCVC)}>
                      {showCVC ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(userData.card_cvc, "CVC")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Created</div>
                  <div className="text-sm">
                    {new Date(userData.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</div>
                  <div className="text-lg font-semibold text-blue-600">{formatCurrency(balance)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Card Features</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Virtual card for secure transactions</li>
                  <li>• Instant balance updates</li>
                  <li>• Compatible with all FriendCoin services</li>
                  <li>• Mobile wallet integration</li>
                  <li>• Unique 16-digit card number with CVC</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/transfer">
              <Button variant="outline" className="w-full h-16 flex flex-col space-y-1">
                <div className="font-medium">Send Money</div>
                <div className="text-xs text-gray-500">Transfer funds</div>
              </Button>
            </Link>

            <Link href="/coupons">
              <Button variant="outline" className="w-full h-16 flex flex-col space-y-1">
                <div className="font-medium">Create Coupon</div>
                <div className="text-xs text-gray-500">Gift FriendCoins</div>
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button variant="outline" className="w-full h-16 flex flex-col space-y-1">
                <div className="font-medium">View Transactions</div>
                <div className="text-xs text-gray-500">Account history</div>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
