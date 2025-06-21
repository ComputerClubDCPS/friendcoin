"use client"

import { useUser } from "@stackframe/stack"
import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { ErrorAnimation } from "@/components/error-animation"
import { CreditCard, Wallet, CheckCircle, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/currency"

interface PaymentSession {
  id: string
  project_id: string
  amount_friendcoins: number
  amount_friendship_fractions: number
  customer_email: string | null
  customer_name: string | null
  status: string
  expires_at: string
  return_url: string | null
  merchant_payment_plans: {
    name: string
    description: string
  }
  merchant_projects: {
    name: string
    description: string
  }
}

export default function PaymentPage() {
  const user = useUser()
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string
  const returnUrl = searchParams.get("return_url")

  const [session, setSession] = useState<PaymentSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"friendcoin" | "card">("friendcoin")
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  })
  const [completed, setCompleted] = useState(false)
  const [validationCode, setValidationCode] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    fetchPaymentSession()
  }, [token])

  async function fetchPaymentSession() {
    try {
      const response = await fetch(`/api/payments/session/${token}`)

      if (response.ok) {
        const data = await response.json()
        setSession(data.session)

        if (data.session.status === "completed") {
          setCompleted(true)
          setValidationCode(data.session.validation_code)
        } else if (data.session.status === "expired") {
          setError("This payment session has expired")
        }
      } else {
        setError("Payment session not found or expired")
      }
    } catch (error) {
      console.error("Error fetching payment session:", error)
      setError("Failed to load payment session")
    } finally {
      setLoading(false)
    }
  }

  async function processPayment() {
    if (!session || !user) return

    setProcessing(true)
    setError(null)
    setShowError(false)

    try {
      const response = await fetch(`/api/payments/process/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          card_details: paymentMethod === "card" ? cardDetails : null,
          user_id: user.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setValidationCode(data.validation_code)
        setCompleted(true)

        // Redirect after a delay if return URL is provided
        if (returnUrl) {
          setTimeout(() => {
            window.location.href = `${returnUrl}?validation_code=${data.validation_code}&status=success`
          }, 3000)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Payment failed")
        setShowError(true)

        // Hide error animation after 3 seconds
        setTimeout(() => {
          setShowError(false)
        }, 3000)
      }
    } catch (error) {
      console.error("Payment processing error:", error)
      setError("Payment processing failed. Please try again.")
      setShowError(true)

      setTimeout(() => {
        setShowError(false)
      }, 3000)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <FriendCoinLogo size={64} className="mx-auto mb-4 animate-pulse" />
          <p>Loading payment session...</p>
        </div>
      </div>
    )
  }

  if (error && !showError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.close()}>Close</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your payment to {session?.merchant_projects.name} has been processed successfully.
            </p>
            {validationCode && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Validation Code:</p>
                <code className="font-mono text-sm">{validationCode}</code>
              </div>
            )}
            {returnUrl ? (
              <p className="text-sm text-gray-500">Redirecting you back...</p>
            ) : (
              <Button onClick={() => window.close()}>Close</Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-red-600">Payment session not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <FriendCoinLogo size={32} />
            <span className="text-lg font-semibold">{session.merchant_projects.name}</span>
          </div>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>{session.merchant_payment_plans.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Details */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Amount:</span>
              <span className="text-lg font-bold">
                {formatCurrency({
                  friendcoins: session.amount_friendcoins,
                  friendshipFractions: session.amount_friendship_fractions,
                })}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{session.merchant_payment_plans.description}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Merchant: {session.merchant_projects.name}</p>
          </div>

          {/* Error Animation */}
          {showError && (
            <div className="flex flex-col items-center space-y-2">
              <ErrorAnimation size={48} />
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Authentication Required */}
          {!user && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Please sign in to complete your payment</p>
              <Button
                onClick={() =>
                  (window.location.href = `/auth/signin?redirect=${encodeURIComponent(window.location.href)}`)
                }
              >
                Sign In to Pay
              </Button>
            </div>
          )}

          {/* Payment Methods */}
          {user && (
            <>
              <div className="space-y-4">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={paymentMethod === "friendcoin" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("friendcoin")}
                    className="flex items-center space-x-2"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>FriendCoin</span>
                  </Button>
                  <Button
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("card")}
                    className="flex items-center space-x-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>FriendCoin Card</span>
                  </Button>
                </div>
              </div>

              {/* FriendCoin Card Details Form */}
              {paymentMethod === "card" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Use your FriendCoin virtual card details from the Card page
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">FriendCoin Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardDetails.number}
                      onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={cardDetails.expiry}
                        onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        value={cardDetails.cvc}
                        onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      placeholder="John Doe"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Process Payment Button */}
              <Button
                onClick={processPayment}
                disabled={
                  processing ||
                  (paymentMethod === "card" &&
                    (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name))
                }
                className="w-full"
              >
                {processing
                  ? "Processing..."
                  : `Pay ${formatCurrency({
                      friendcoins: session.amount_friendcoins,
                      friendshipFractions: session.amount_friendship_fractions,
                    })}`}
              </Button>
            </>
          )}

          {/* Session Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Session expires: {new Date(session.expires_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
