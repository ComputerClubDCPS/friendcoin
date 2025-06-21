"use client"

import { useUser } from "@stackframe/stack"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { ArrowLeft, Send, Clock, User } from "lucide-react"
import Link from "next/link"

interface RecentTransfer {
  to_user_id: string
  to_display_name: string
  last_transfer_at: string
  transfer_count: number
}

export default function TransferPage() {
  const user = useUser({ or: "redirect" })
  const [recipientId, setRecipientId] = useState("")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [recentTransfers, setRecentTransfers] = useState<RecentTransfer[]>([])

  useEffect(() => {
    fetchRecentTransfers()
  }, [])

  async function fetchRecentTransfers() {
    try {
      const response = await fetch("/api/transfer/recent")
      if (response.ok) {
        const data = await response.json()
        setRecentTransfers(data.recentTransfers || [])
      }
    } catch (error) {
      console.error("Error fetching recent transfers:", error)
    }
  }

  async function handleTransfer() {
    if (!user || !recipientId || !amount) return

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId,
          amount,
          notes,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`${data.message}. Tax: ${data.tax}`)
        setAmount("")
        setRecipientId("")
        setNotes("")
        fetchRecentTransfers() // Refresh recent transfers
      } else {
        setMessage(data.error || "Transfer failed")
      }
    } catch (error) {
      console.error("Transfer error:", error)
      setMessage("Transfer failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function selectRecentRecipient(transfer: RecentTransfer) {
    setRecipientId(transfer.to_user_id)
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Send Money</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Transfer FriendCoins</span>
              </CardTitle>
              <CardDescription>Send money to another user. A 5% tax will be applied to all transfers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Account Number</Label>
                <Input
                  id="recipient"
                  placeholder="Enter recipient's account number"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Enter amount in FriendCoins (e.g., 1.50)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add a note for this transfer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
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

              <Button onClick={handleTransfer} disabled={loading || !recipientId || !amount} className="w-full">
                {loading ? "Processing..." : "Send Money"}
              </Button>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>• 5% tax will be deducted from your balance</p>
                <p>• Recipient receives the full amount</p>
                <p>• Transactions are processed instantly</p>
              </div>
            </CardContent>
          </Card>

          {recentTransfers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recent Recipients</span>
                </CardTitle>
                <CardDescription>Quick access to people you've sent money to recently</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTransfers.map((transfer) => (
                    <div
                      key={transfer.to_user_id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => selectRecentRecipient(transfer)}
                    >
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{transfer.to_display_name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{transfer.to_user_id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {transfer.transfer_count} transfer{transfer.transfer_count > 1 ? "s" : ""}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(transfer.last_transfer_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
