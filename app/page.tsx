"use client"

import { useUser } from "@stackframe/stack"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { ArrowRight, Coins, CreditCard, Gift, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const user = useUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-3">
            <FriendCoinLogo size={48} showStars />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">FriendCoin</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Monetary Exchange Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <Link href="/dashboard">
                <Button>
                  Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <div className="space-x-2">
                <Link href="/auth/signin">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <FriendCoinLogo size={120} showStars className="mx-auto mb-6" />
          </div>
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">Welcome to FriendCoin</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            The revolutionary monetary exchange platform where friendship meets finance. Trade, save, and grow your
            wealth with our unique currency system.
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
            <div>1 FriendCoin = 100 Friendship Fractions</div>
            <div>•</div>
            <div>Weekly Interest Payments</div>
            <div>•</div>
            <div>Virtual Cards & Coupons</div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Coins className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <CardTitle>Digital Banking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure digital wallet with virtual cards for all your FriendCoin transactions
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <CardTitle>Weekly Interest</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Earn 1 friendship fraction per FriendCoin in your balance every week</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CreditCard className="h-12 w-12 mx-auto text-purple-600 mb-4" />
              <CardTitle>Instant Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Send money instantly to other users with just their Stack User ID</CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Gift className="h-12 w-12 mx-auto text-orange-600 mb-4" />
              <CardTitle>Gift Coupons</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Create printable coupons with QR codes to share FriendCoins offline</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Currency Info */}
        <Card className="mb-16">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Currency System</CardTitle>
            <CardDescription>Understanding FriendCoin denominations</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">1 f€</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">1 FriendCoin</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">=</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Equals</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 mb-2">100 ff</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">100 Friendship Fractions</div>
              </div>
            </div>
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Total Circulation:</strong> 100 base FriendCoins + 10 additional coins per registered user
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        {!user && (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to start your FriendCoin journey?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Join thousands of users already trading and earning with FriendCoin
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="px-8 py-3">
                Create Your Account <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
