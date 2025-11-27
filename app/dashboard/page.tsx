"use client"

import { useUser } from "@stackframe/stack"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { formatCurrency, type CurrencyAmount } from "@/lib/currency"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Send, Gift, TrendingUp, History, RefreshCw, User, BarChart3 } from "lucide-react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"
import { StatusPageWidget } from "@/components/status-page-widget"

interface UserData {
  balance_friendcoins: number
  balance_friendship_fractions: number
  card_number: string
}

interface Transaction {
  id: string
  from_user_id: string
  to_user_id: string
  amount_friendcoins: number
  amount_friendship_fractions: number
  transaction_type: string
  status: string
  created_at: string
  merchant_name?: string
  external_reference?: string
}

interface Investment {
  id: string
  stock_symbol: string
  stock_name: string
  shares_owned: number
  total_invested_friendcoins: number
  total_invested_friendship_fractions: number
  current_value_usd: number
}

export default function DashboardPage() {
  const user = useUser({ or: "redirect" })
  const [userData, setUserData] = useState<UserData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState("")

  useEffect(() => {
    if (user?.id) {
      Sentry.setUser({
        id: user.id,
        username: user.displayName || undefined,
        email: user.primaryEmail || undefined,
      })

      initializeUser()
      fetchTransactions()
      fetchInvestments()
    }
  }, [user?.id])

  const initializeUser = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    Sentry.startSpan(
      {
        op: "ui.action",
        name: "Initialize User",
      },
      async (span) => {
        try {
          span.setAttribute("user_id", user.id)
          span.setAttribute("has_display_name", !!user.displayName)

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
            throw new Error(`Failed to initialize user: ${response.status}`)
          }

          const data = await response.json()
          if (data.user) {
            setUserData(data.user)
            span.setAttribute("initialization_success", true)
          } else {
            throw new Error("No user data in response")
          }
        } catch (error) {
          console.error("Error initializing user:", error)
          Sentry.captureException(error, {
            tags: { operation: "client_user_initialization" },
            extra: { user_id: user?.id },
          })
          setError(`Failed to load user data: ${error instanceof Error ? error.message : "Unknown error"}`)
        } finally {
          setLoading(false)
        }
      },
    )
  }

  async function fetchTransactions() {
    try {
      const response = await fetch(`/api/transactions?user_id=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }

  async function fetchInvestments() {
    try {
      const response = await fetch(`/api/investments?user_id=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setInvestments(data.investments || [])
      }
    } catch (error) {
      console.error("Error fetching investments:", error)
    }
  }

  async function copyUserId() {
    try {
      await navigator.clipboard.writeText(user.id)
      setCopyFeedback("Copied!")
      setTimeout(() => setCopyFeedback(""), 2000)
    } catch (error) {
      setCopyFeedback("Failed to copy")
      setTimeout(() => setCopyFeedback(""), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <FriendCoinLogo size={64} className="mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-300">Loading your account...</p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button onClick={() => user.signOut()} variant="outline" className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-red-600 mb-4">No user data available</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const balance: CurrencyAmount = {
    friendcoins: userData.balance_friendcoins,
    friendshipFractions: userData.balance_friendship_fractions,
  }

  const totalInvestmentValue = investments.reduce((sum, inv) => sum + inv.current_value_usd, 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <FriendCoinLogo size={40} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Welcome back, {user.displayName || "Friend"}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-white">{user.displayName || "User"}</div>
                <div className="text-gray-500 dark:text-gray-400">{user.primaryEmail}</div>
              </div>
            </div>
            <Button onClick={() => user.signOut()} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FriendCoinLogo size={24} />
              <span>Your Balance</span>
            </CardTitle>
            <CardDescription className="text-blue-100">Current FriendCoin holdings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">{formatCurrency(balance)}</div>
            <div className="flex items-center space-x-4 text-sm text-blue-100">
              <div>Card: **** **** **** {userData.card_number.slice(-4)}</div>
              <div>•</div>
              <div
                className="cursor-pointer hover:bg-white/20 px-2 py-1 rounded transition-colors relative"
                onClick={copyUserId}
                title="Click to copy User ID"
              >
                User ID: {user.id.slice(0, 8)}...
                {copyFeedback && (
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                    {copyFeedback}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Link href="/transfer">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center space-x-3 p-6">
                <Send className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="font-semibold">Send Money</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Transfer to friends</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/coupons">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center space-x-3 p-6">
                <Gift className="h-8 w-8 text-green-600" />
                <div>
                  <div className="font-semibold">Coupons</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Create & redeem</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/card">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center space-x-3 p-6">
                <CreditCard className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="font-semibold">Virtual Card</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Manage card</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/invest">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center space-x-3 p-6">
                <BarChart3 className="h-8 w-8 text-indigo-600" />
                <div>
                  <div className="font-semibold">Investments</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Stock portfolio</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/developer">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="flex items-center space-x-3 p-6">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="font-semibold">Developer</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Payment API</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Service Status Widget */}
            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
                <CardDescription>Real-time system status and incidents</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusPageWidget />
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>FriendCoins:</span>
                    <span className="font-semibold">{balance.friendcoins} f€</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Friendship Fractions:</span>
                    <span className="font-semibold">{balance.friendshipFractions} ff</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Total Value:</span>
                    <span className="font-bold text-lg">{formatCurrency(balance)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Investment Portfolio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-600 mb-2">${totalInvestmentValue.toFixed(2)}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{investments.length} active investments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weekly Interest</CardTitle>
                  <CardDescription>Earn 1 ff per f€ weekly</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 mb-2">+{balance.friendcoins} ff</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Next payment in 3 days</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest FriendCoin activity</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Start by sending money or creating coupons</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-semibold">
                            {transaction.transaction_type === "payment" && transaction.merchant_name
                              ? `Payment to ${transaction.merchant_name}`
                              : transaction.transaction_type === "transfer"
                                ? "Transfer"
                                : transaction.transaction_type === "coupon_redeem"
                                  ? "Coupon Redeemed"
                                  : "Transaction"}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </div>
                          {transaction.external_reference && (
                            <div className="text-xs text-gray-500 font-mono">Ref: {transaction.external_reference}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-semibold ${
                              transaction.from_user_id === user.id ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {transaction.from_user_id === user.id ? "-" : "+"}
                            {formatCurrency({
                              friendcoins: transaction.amount_friendcoins,
                              friendshipFractions: transaction.amount_friendship_fractions,
                            })}
                          </div>
                          <div className="text-sm text-gray-500">{transaction.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investments">
            <Card>
              <CardHeader>
                <CardTitle>Investment Portfolio</CardTitle>
                <CardDescription>Your stock investments and performance</CardDescription>
              </CardHeader>
              <CardContent>
                {investments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No investments yet</p>
                    <p className="text-sm">Start investing to build your portfolio</p>
                    <Link href="/invest">
                      <Button className="mt-4">Start Investing</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {investments.map((investment) => (
                      <div key={investment.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{investment.stock_symbol}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{investment.stock_name}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${investment.current_value_usd.toFixed(2)}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {investment.shares_owned.toFixed(4)} shares
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">Invested: </span>
                            <span>
                              {formatCurrency({
                                friendcoins: investment.total_invested_friendcoins,
                                friendshipFractions: investment.total_invested_friendship_fractions,
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">P&L: </span>
                            <span
                              className={
                                investment.current_value_usd >
                                (investment.total_invested_friendcoins +
                                  investment.total_invested_friendship_fractions / 100) *
                                  1.2
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              $
                              {(
                                investment.current_value_usd -
                                (investment.total_invested_friendcoins +
                                  investment.total_invested_friendship_fractions / 100) *
                                  1.2
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No settings available yet</p>
                  <p className="text-sm">Customize your account preferences</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
