"use client"

import { useUser } from "@stackframe/stack"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { ArrowLeft, ShoppingCart, Package, Star, Gift, Wrench, Crown } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/currency"

interface Product {
  id: string
  name: string
  description: string
  price_friendcoins: number
  price_friendship_fractions: number
  category: string
  stock_quantity: number
  is_active: boolean
}

interface UserData {
  balance_friendcoins: number
  balance_friendship_fractions: number
}

export default function ProductsPage() {
  const user = useUser({ or: "redirect" })
  const [products, setProducts] = useState<Product[]>([])
  const [userBalance, setUserBalance] = useState<UserData | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchProducts()
    fetchUserBalance()
  }, [selectedCategory])

  async function fetchProducts() {
    try {
      const response = await fetch(`/api/products?category=${selectedCategory}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  async function fetchUserBalance() {
    try {
      const response = await fetch("/api/user/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stack_user_id: user.id,
          display_name: user.displayName || null,
          email: user.primaryEmail || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserBalance(data.user)
      }
    } catch (error) {
      console.error("Error fetching balance:", error)
    }
  }

  async function purchaseProduct(productId: string, quantity = 1) {
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/products/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          quantity,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
        fetchUserBalance()
        fetchProducts()
      } else {
        setMessage(data.error || "Purchase failed")
      }
    } catch (error) {
      console.error("Purchase error:", error)
      setMessage("Purchase failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case "subscription":
        return <Crown className="h-4 w-4" />
      case "cosmetic":
        return <Star className="h-4 w-4" />
      case "utility":
        return <Wrench className="h-4 w-4" />
      case "service":
        return <Package className="h-4 w-4" />
      case "gift":
        return <Gift className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  function getCategoryColor(category: string) {
    switch (category) {
      case "subscription":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
      case "cosmetic":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400"
      case "utility":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "service":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "gift":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  function canAfford(product: Product): boolean {
    if (!userBalance) return false
    const userTotal = userBalance.balance_friendcoins * 100 + userBalance.balance_friendship_fractions
    const productTotal = product.price_friendcoins * 100 + product.price_friendship_fractions
    return userTotal >= productTotal
  }

  const categories = ["all", "subscription", "cosmetic", "utility", "service", "gift"]

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products Store</h1>
          </div>
        </div>

        {/* Balance Display */}
        {userBalance && (
          <Card className="mb-6 bg-gradient-to-r from-green-600 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Your Balance</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency({
                      friendcoins: userBalance.balance_friendcoins,
                      friendshipFractions: userBalance.balance_friendship_fractions,
                    })}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 opacity-75" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category === "all" ? "All" : category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory}>
            {message && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  message.includes("Successfully")
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {message}
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription className="mt-2">{product.description}</CardDescription>
                      </div>
                      <Badge className={`ml-2 ${getCategoryColor(product.category)}`}>
                        <div className="flex items-center space-x-1">
                          {getCategoryIcon(product.category)}
                          <span className="capitalize">{product.category}</span>
                        </div>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency({
                            friendcoins: product.price_friendcoins,
                            friendshipFractions: product.price_friendship_fractions,
                          })}
                        </div>
                        {product.stock_quantity !== -1 && (
                          <div className="text-sm text-gray-500">Stock: {product.stock_quantity}</div>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => purchaseProduct(product.id)}
                      disabled={
                        loading || !canAfford(product) || (product.stock_quantity !== -1 && product.stock_quantity <= 0)
                      }
                      className="w-full"
                    >
                      {loading ? (
                        "Processing..."
                      ) : !canAfford(product) ? (
                        "Insufficient Balance"
                      ) : product.stock_quantity !== -1 && product.stock_quantity <= 0 ? (
                        "Out of Stock"
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Purchase
                        </>
                      )}
                    </Button>

                    {!canAfford(product) && userBalance && (
                      <div className="text-xs text-red-600 dark:text-red-400">
                        Need{" "}
                        {formatCurrency({
                          friendcoins:
                            product.price_friendcoins -
                            userBalance.balance_friendcoins +
                            Math.ceil(
                              (product.price_friendship_fractions - userBalance.balance_friendship_fractions) / 100,
                            ),
                          friendshipFractions:
                            (product.price_friendship_fractions - userBalance.balance_friendship_fractions + 100) % 100,
                        })}{" "}
                        more
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Products Available</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {selectedCategory === "all"
                    ? "No products are currently available."
                    : `No products available in the ${selectedCategory} category.`}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
