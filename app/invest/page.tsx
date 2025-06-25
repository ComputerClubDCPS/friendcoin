"use client"

import { useUser } from "@stackframe/stack"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { ArrowLeft, TrendingUp, TrendingDown, Search, DollarSign, Minus } from "lucide-react"
import Link from "next/link"
import { formatCurrency, type CurrencyAmount } from "@/lib/currency"
import { searchStocks, getStockPrice, friendCoinsToUsd, type StockData } from "@/lib/stock-api"

interface UserData {
  balance_friendcoins: number
  balance_friendship_fractions: number
}

interface Investment {
  id: string
  stock_symbol: string
  stock_name: string
  shares_owned: number
  total_invested_friendcoins: number
  total_invested_friendship_fractions: number
  current_value_usd: number
  last_updated: string
}

export default function InvestPage() {
  const user = useUser({ or: "redirect" })
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<StockData[]>([])
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null)
  const [investAmount, setInvestAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [userBalance, setUserBalance] = useState<CurrencyAmount>({ friendcoins: 0, friendshipFractions: 0 })
  const [userInvestments, setUserInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (user?.id) {
      fetchUserData()
      fetchUserInvestments()
    }
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
        setUserBalance({
          friendcoins: data.user.balance_friendcoins,
          friendshipFractions: data.user.balance_friendship_fractions,
        })
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      setMessage("Error fetching user data")
    }
  }

  async function fetchUserInvestments() {
    try {
      const response = await fetch(`/api/investments?user_id=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setUserInvestments(data.investments || [])
      } else {
        console.error("Failed to fetch investments")
      }
    } catch (error) {
      console.error("Error fetching investments:", error)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return

    setLoading(true)
    setMessage("")
    try {
      const results = await searchStocks(searchQuery)
      setSearchResults(results)
      if (results.length === 0) {
        setMessage("No stocks found for your search")
      }
    } catch (error) {
      console.error("Search error:", error)
      setMessage("Error searching stocks")
    } finally {
      setLoading(false)
    }
  }
  async function selectStock(stock: StockData) {
    setLoading(true)
    setMessage("")
    try {
      const stockData = await getStockPrice(stock.symbol)
      if (stockData) {
        setSelectedStock(stockData)
      } else {
        setMessage("Error fetching stock price")
      }
    } catch (error) {
      console.error("Error fetching stock price:", error)
      setMessage("Error fetching stock price")
    } finally {
      setLoading(false)
    }
  }

  async function handleInvestment() {
    if (!user || !selectedStock || !investAmount) return

    setLoading(true)
    setMessage("")

    try {
      const investmentFriendCoins = Number.parseFloat(investAmount)
      const totalUserBalance = userBalance.friendcoins + userBalance.friendshipFractions / 100

      if (investmentFriendCoins > totalUserBalance) {
        setMessage("Insufficient balance for this investment")
        setLoading(false)
        return
      }

      if (investmentFriendCoins <= 0) {
        setMessage("Investment amount must be greater than 0")
        setLoading(false)
        return
      }

      const response = await fetch("/api/investments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          stock_symbol: selectedStock.symbol,
          stock_name: selectedStock.name,
          amount_friendcoins: Math.floor(investmentFriendCoins),
          amount_friendship_fractions: Math.round((investmentFriendCoins % 1) * 100),
          current_price: selectedStock.price,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setMessage(errorData.error || "Failed to create investment")
        return
      }

      setMessage(`Successfully invested ${investAmount} f€ in ${selectedStock.symbol}`)
      setInvestAmount("")
      setSelectedStock(null)

      // Refresh data
      fetchUserData()
      fetchUserInvestments()
    } catch (error) {
      console.error("Investment error:", error)
      setMessage("Investment failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleWithdrawal(investment: Investment) {
    if (!user || !withdrawAmount) return

    setLoading(true)
    setMessage("")

    try {
      const withdrawalAmount = Number.parseFloat(withdrawAmount)

      if (withdrawalAmount <= 0) {
        setMessage("Withdrawal amount must be greater than 0")
        setLoading(false)
        return
      }

      const response = await fetch("/api/investments/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          investment_id: investment.id,
          shares_to_sell: `${withdrawalAmount}.toString()` 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setMessage(errorData.error || "Failed to withdraw from investment")
        return
      }

      const data = await response.json()
      setMessage(data.message || "Withdrawal successful")
      setWithdrawAmount("")

      // Refresh data
      fetchUserData()
      fetchUserInvestments()
    } catch (error) {
      console.error("Withdrawal error:", error)
      setMessage("Withdrawal failed. Please try again.")
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Investments</h1>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="invest" className="space-y-4">
            <TabsList>
              <TabsTrigger value="invest">Invest</TabsTrigger>
              <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
            </TabsList>

            <TabsContent value="invest" className="space-y-6">
              {/* Balance Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(userBalance)}</div>
                </CardContent>
              </Card>

              {/* Stock Search */}
              <Card>
                <CardHeader>
                  <CardTitle>Search Stocks</CardTitle>
                  <CardDescription>Search for stocks to invest in with real market data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter stock symbol or company name (e.g., AAPL, Tesla)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                      <Search className="h-4 w-4 mr-2" />
                      {loading ? "Searching..." : "Search"}
                    </Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="grid gap-2">
                      {searchResults.map((stock) => (
                        <div
                          key={stock.symbol}
                          className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => selectStock(stock)}
                        >
                          <div>
                            <div className="font-semibold">{stock.symbol}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">{stock.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${stock.price.toFixed(2)}</div>
                            <div
                              className={`text-sm flex items-center ${
                                stock.change >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {stock.change >= 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {stock.changePercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Investment Form */}
              {selectedStock && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5" />
                      <span>Invest in {selectedStock.symbol}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Current Price</div>
                        <div className="text-2xl font-bold">${selectedStock.price.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Change</div>
                        <div
                          className={`text-lg font-semibold flex items-center ${
                            selectedStock.change >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {selectedStock.change >= 0 ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          {selectedStock.changePercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="investAmount">Investment Amount (FriendCoins)</Label>
                      <Input
                        id="investAmount"
                        placeholder="0.00"
                        value={investAmount}
                        onChange={(e) => setInvestAmount(e.target.value)}
                        type="number"
                        step="0.01"
                      />
                      {investAmount && (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          You will receive approximately{" "}
                          {(friendCoinsToUsd(Number.parseFloat(investAmount), 0) / selectedStock.price).toFixed(4)}{" "}
                          shares
                        </div>
                      )}
                    </div>

                    {message && (
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          message.includes("Successfully")
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {message}
                      </div>
                    )}

                    <Button
                      onClick={handleInvestment}
                      disabled={loading || !investAmount || Number.parseFloat(investAmount) <= 0}
                      className="w-full"
                    >
                      {loading ? "Processing..." : "Invest Now"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="portfolio">
              <Card>
                <CardHeader>
                  <CardTitle>Your Investment Portfolio</CardTitle>
                  <CardDescription>Track your stock investments and performance</CardDescription>
                </CardHeader>
                <CardContent>
                  {userInvestments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No investments yet</p>
                      <p className="text-sm">Start investing to build your portfolio</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userInvestments.map((investment) => (
                        <div key={investment.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
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

                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
                              <span className="text-gray-600 dark:text-gray-300">Last Updated: </span>
                              <span>{new Date(investment.last_updated).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Withdrawal Section */}
                          <div className="border-t pt-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <Minus className="h-4 w-4" />
                              <Label className="text-sm font-medium">Withdraw Investment</Label>
                            </div>
                            <div className="flex space-x-2">
                              <Input
                                placeholder="Amount to withdraw"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                type="number"
                                step="0.01"
                                className="flex-1"
                              />
                              <Button
                                onClick={() => handleWithdrawal(investment)}
                                disabled={loading || !withdrawAmount || Number.parseFloat(withdrawAmount) <= 0}
                                variant="outline"
                                size="sm"
                              >
                                {loading ? "Processing..." : "Withdraw"}
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Withdraw funds from this investment back to your FriendCoin balance
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
