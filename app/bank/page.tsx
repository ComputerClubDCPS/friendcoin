"use client"

import type React from "react"

import { useUser } from "@stackframe/stack"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { AlertTriangle, DollarSign } from "lucide-react"
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

  const restrictionsBankingDisabled = restrictions.find((r) => r.restriction_type === "banking_disabled" && r.is_active)

  if (!user) {
    return <div>Loading...</div>
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="mt-3 text-gray-500">Fetching your banking data...</p>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">FriendCoin Bank</h1>
          <p className="text-gray-500">Manage your FriendCoin finances</p>
        </div>
        {restrictionsBankingDisabled && (
          <Badge variant="destructive">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Banking Disabled
          </Badge>
        )}
      </div>

      {loans.length === 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>No Loans Yet</CardTitle>
            <CardDescription>Start your first loan today!</CardDescription>
          </CardHeader>
          <CardContent>Looks like you don't have any active loans. Ready to get started?</CardContent>
        </Card>
      )}

      {loans.length > 0 && (
        <div className="grid gap-4 mb-8">
          {loans.map((loan) => (
            <Card key={loan.id}>
              <CardHeader>
                <CardTitle>Loan #{loan.id.substring(0, 8)}</CardTitle>
                <CardDescription>Loan taken on {new Date(loan.created_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Principal:</span>
                    <span>
                      {loan.principal_friendcoins}.{loan.principal_friendship_fractions} f€
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span>
                      {loan.amount_paid_friendcoins}.{loan.amount_paid_friendship_fractions} f€
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due Date:</span>
                    <span>{new Date(loan.due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span>{loan.status}</span>
                  </div>
                </div>
                <Separator className="my-4" />
                {loan.status === "active" && (
                  <div className="flex justify-end">
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
                      className="mr-2"
                    />
                    <Button onClick={() => repayLoan(loan.id)} disabled={repayingLoan === loan.id}>
                      {repayingLoan === loan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Repaying...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Repay Loan
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {loan.status === "paid" && (
                  <div className="flex items-center text-sm text-green-500">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Loan fully repaid!
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Take a Loan</CardTitle>
          <CardDescription>Borrow FriendCoins from the bank.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={takeLoan} className="space-y-4">
            <div>
              <Label htmlFor="loanAmount">Loan Amount (f€)</Label>
              <Input
                type="number"
                id="loanAmount"
                placeholder="Enter amount"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                disabled={takingLoan || restrictionsBankingDisabled != null}
              />
            </div>
            <Button type="submit" disabled={takingLoan || restrictionsBankingDisabled != null}>
              {takingLoan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Taking Loan...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Take Loan
                </>
              )}
            </Button>
            {restrictionsBankingDisabled && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Banking is currently disabled due to account restrictions.
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
