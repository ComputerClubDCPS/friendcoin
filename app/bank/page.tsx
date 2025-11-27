"use client"

import type React from "react"

import { useUser } from "@stackframe/stack"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { AlertTriangle, DollarSign, TrendingDown, Percent } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CreditCard, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Loan {
  id: string
  principal_friendcoins: number
  principal_friendship_fractions: number
  amount_paid_friendcoins: number
  amount_paid_friendship_fractions: number
  interest_rate: number
  status: string
  due_date: string
  created_at: string
  loan_payments: Array<{
    payment_amount_friendcoins: number
    payment_amount_friendship_fractions: number
    payment_type: string
    payment_date: string
  }>
}

interface UserData {
  balance_friendcoins: number
  balance_friendship_fractions: number
}

interface AccountRestriction {
  restriction_type: string
  reason: string
  created_at: string
  expires_at: string | null
}

export default function BankPage() {
  const user = useUser()
  const { toast } = useToast()
  const [loans, setLoans] = useState<Loan[]>([])
  const [restrictions, setRestrictions] = useState<AccountRestriction[]>([])
  const [loading, setLoading] = useState(true)
  const [takingLoan, setTakingLoan] = useState(false)
  const [repayingLoan, setRepayingLoan] = useState<string | null>(null)

  // Loan form
  const [loanAmount, setLoanAmount] = useState("")

  // Repayment form
  const [repaymentAmounts, setRepaymentAmounts] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (user) {
      fetchLoans()
      fetchRestrictions()
    }
  }, [user])

  const fetchLoans = async () => {
    try {
      const response = await fetch("/api/loans")
      if (response.ok) {
        const data = await response.json()
        setLoans(data.loans || [])
      }
    } catch (error) {
      console.error("Error fetching loans:", error)
      toast({
        title: "Error",
        description: "Failed to fetch loans",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRestrictions = async () => {
    try {
      const response = await fetch("/api/account/restrictions")
      if (response.ok) {
        const data = await response.json()
        setRestrictions(data.restrictions || [])
      }
    } catch (error) {
      console.error("Error fetching restrictions:", error)
    }
  }

  const takeLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loanAmount) return

    setTakingLoan(true)
    try {
      const numericAmount = Number.parseFloat(loanAmount.replace(/[^\d.]/g, ""))
      if (isNaN(numericAmount) || numericAmount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid loan amount",
          variant: "destructive",
        })
        return
      }

      const friendcoins = Math.floor(numericAmount)
      const fractions = Math.round((numericAmount % 1) * 100)

      const response = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_friendcoins: friendcoins,
          amount_friendship_fractions: fractions,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Loan Approved!",
          description: data.message,
        })
        setLoanAmount("")
        fetchLoans()
      } else {
        toast({
          title: "Loan Denied",
          description: data.error || "Failed to process loan",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process loan request",
        variant: "destructive",
      })
    } finally {
      setTakingLoan(false)
    }
  }

  const repayLoan = async (loanId: string) => {
    const amount = repaymentAmounts[loanId]
    if (!amount) return

    setRepayingLoan(loanId)
    try {
      const numericAmount = Number.parseFloat(amount.replace(/[^\d.]/g, ""))
      if (isNaN(numericAmount) || numericAmount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid repayment amount",
          variant: "destructive",
        })
        return
      }

      const friendcoins = Math.floor(numericAmount)
      const fractions = Math.round((numericAmount % 1) * 100)

      const response = await fetch("/api/loans/repay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_id: loanId,
          amount_friendcoins: friendcoins,
          amount_friendship_fractions: fractions,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Payment Successful!",
          description: data.message,
        })
        setRepaymentAmounts({ ...repaymentAmounts, [loanId]: "" })
        fetchLoans()
      } else {
        toast({
          title: "Payment Failed",
          description: data.error || "Failed to process repayment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process repayment",
        variant: "destructive",
      })
    } finally {
      setRepayingLoan(null)
    }
  }

  const restrictionsBankingDisabled = restrictions.find((r) => r.restriction_type === "banking_disabled")

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="mt-3 text-gray-500">Fetching your banking data...</p>
      </div>
    )
  }

  const totalBorrowed = loans.reduce(
    (sum, loan) => sum + loan.principal_friendcoins + loan.principal_friendship_fractions / 100,
    0,
  )
  const totalRepaid = loans.reduce(
    (sum, loan) => sum + loan.amount_paid_friendcoins + loan.amount_paid_friendship_fractions / 100,
    0,
  )
  const activeLoanCount = loans.filter((l) => l.status === "active").length

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FriendCoin Bank</h1>
            <p className="text-muted-foreground mt-2">Manage your FriendCoin loans and borrowing</p>
          </div>
          {restrictionsBankingDisabled && (
            <Badge variant="destructive" className="px-3 py-2">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Banking Disabled
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Loans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeLoanCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Borrowed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBorrowed.toFixed(2)}f€</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Repaid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalRepaid.toFixed(2)}f€</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {loans.length === 0 && (
        <Card className="mb-8 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              No Loans Yet
            </CardTitle>
            <CardDescription>Start your first loan today to access FriendCoins!</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once you take a loan, it will appear here for easy management and tracking.
            </p>
          </CardContent>
        </Card>
      )}

      {loans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Loans</h2>
          <div className="grid gap-4">
            {loans.map((loan) => (
              <Card key={loan.id} className={loan.status === "paid" ? "border-green-200 bg-green-50/30" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">Loan #{loan.id.substring(0, 8)}</CardTitle>
                      <CardDescription>
                        {new Date(loan.created_at).toLocaleDateString()} • Due{" "}
                        {new Date(loan.due_date).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant={loan.status === "paid" ? "secondary" : "default"}>
                      {loan.status === "paid" ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Paid
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Active
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Principal</p>
                      <p className="font-semibold">
                        {loan.principal_friendcoins}.{loan.principal_friendship_fractions.toString().padStart(2, "0")}f€
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Paid</p>
                      <p className="font-semibold text-green-600">
                        {loan.amount_paid_friendcoins}.
                        {loan.amount_paid_friendship_fractions.toString().padStart(2, "0")}f€
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Rate
                      </p>
                      <p className="font-semibold">{(loan.interest_rate * 100).toFixed(1)}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="font-semibold">
                        {(
                          loan.principal_friendcoins +
                          loan.principal_friendship_fractions / 100 -
                          loan.amount_paid_friendcoins -
                          loan.amount_paid_friendship_fractions / 100
                        ).toFixed(2)}
                        f€
                      </p>
                    </div>
                  </div>

                  {loan.status === "active" && (
                    <>
                      <Separator />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Amount to repay"
                          value={repaymentAmounts[loan.id] || ""}
                          onChange={(e) =>
                            setRepaymentAmounts({
                              ...repaymentAmounts,
                              [loan.id]: e.target.value,
                            })
                          }
                          step="0.01"
                          min="0"
                          className="flex-1"
                        />
                        <Button
                          onClick={() => repayLoan(loan.id)}
                          disabled={repayingLoan === loan.id || !repaymentAmounts[loan.id]}
                          className="w-32"
                        >
                          {repayingLoan === loan.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Repaying...
                            </>
                          ) : (
                            <>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Repay
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Take a New Loan
          </CardTitle>
          <CardDescription>Borrow FriendCoins from the bank with a competitive interest rate.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={takeLoan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loanAmount">Loan Amount (f€)</Label>
              <Input
                type="number"
                id="loanAmount"
                placeholder="0.00"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                disabled={takingLoan || restrictionsBankingDisabled != null}
                step="0.01"
                min="0"
              />
            </div>
            {restrictionsBankingDisabled && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <div>
                  <p className="font-semibold">Banking Disabled</p>
                  <p className="text-sm">Your account has banking restrictions. Please contact support.</p>
                </div>
              </Alert>
            )}
            <Button
              type="submit"
              disabled={takingLoan || restrictionsBankingDisabled != null || !loanAmount}
              className="w-full"
            >
              {takingLoan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Loan...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Take Loan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
