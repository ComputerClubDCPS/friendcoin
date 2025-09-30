"use client"

import { useUser } from "@stackframe/stack"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { ArrowLeft, Code, Copy, Eye, EyeOff, Plus, Database, ExternalLink } from "lucide-react"
import Link from "next/link"

interface Project {
  id: string
  name: string
  description: string
  api_key: string
  webhook_url: string | null
  database_url: string
  account_number: string | null
  is_active: boolean
  created_at: string
}

interface PaymentPlan {
  id: string
  external_id: string
  name: string
  description: string
  amount_friendcoins: number
  amount_friendship_fractions: number
  is_active: boolean
  created_at: string
}

export default function DeveloperPage() {
  const user = useUser({ or: "redirect" })
  const [projects, setProjects] = useState<Project[]>([])
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})

  // Project form
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    webhook_url: "",
    database_url: "",
    account_number: "",
  })

  // Payment plan form
  const [planForm, setPlanForm] = useState({
    external_id: "",
    name: "",
    description: "",
    amount: "",
  })

  useEffect(() => {
    fetchProjects()
  }, [user])

  useEffect(() => {
    if (selectedProject) {
      fetchPaymentPlans()
    }
  }, [selectedProject])

  async function fetchProjects() {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/developer/projects?user_id=${user.id}`)

      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
        if (data.projects?.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  async function fetchPaymentPlans() {
    if (!selectedProject) return

    try {
      const response = await fetch(`/api/developer/payment-plans?project_id=${selectedProject}&user_id=${user.id}`)

      if (response.ok) {
        const data = await response.json()
        setPaymentPlans(data.paymentPlans || [])
      }
    } catch (error) {
      console.error("Error fetching payment plans:", error)
    }
  }

  async function createProject() {
    if (!user?.id || !projectForm.name.trim() || !projectForm.account_number.trim()) {
      setMessage("Project name and account number are required")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch('/api/developer/projects?user_id=?{user.id}', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          ...projectForm,
        }),
      })

      if (response.ok) {
        setMessage("Project created successfully!")
        setProjectForm({ name: "", description: "", webhook_url: "", database_url: "", account_number: "" })
        fetchProjects()
      } else {
        const error = await response.json()
        setMessage(error.error || "Error creating project")
      }
    } catch (error) {
      console.error("Project creation error:", error)
      setMessage("Failed to create project. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function createPaymentPlan() {
    if (!selectedProject || !planForm.external_id || !planForm.name || !planForm.amount) return

    setLoading(true)
    setMessage("")

    try {
      const amount = Number.parseFloat(planForm.amount)
      const friendcoins = Math.floor(amount)
      const friendshipFractions = Math.round((amount % 1) * 100)

      const response = await fetch("/api/developer/payment-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          project_id: selectedProject,
          external_id: planForm.external_id,
          name: planForm.name,
          description: planForm.description,
          amount_friendcoins: friendcoins,
          amount_friendship_fractions: friendshipFractions,
        }),
      })

      if (response.ok) {
        setMessage("Payment plan created successfully!")
        setPlanForm({ external_id: "", name: "", description: "", amount: "" })
        fetchPaymentPlans()
      } else {
        const error = await response.json()
        setMessage(error.error || "Error creating payment plan")
      }
    } catch (error) {
      console.error("Payment plan creation error:", error)
      setMessage("Failed to create payment plan. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setMessage("Copied to clipboard!")
    setTimeout(() => setMessage(""), 2000)
  }

  function toggleKeyVisibility(keyId: string) {
    setShowKeys((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }))
  }

  const selectedProjectData = projects.find((p) => p.id === selectedProject)

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Developer Portal</h1>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="payment-plans">Payment Plans</TabsTrigger>
              <TabsTrigger value="sdk">SDK</TabsTrigger>
              <TabsTrigger value="documentation">Documentation</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="h-5 w-5" />
                    <span>FriendCoin Payment System</span>
                  </CardTitle>
                  <CardDescription>
                    Stripe-like payment processing for FriendCoin - Connect your database and accept payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">How It Works</h4>
                      <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• Create a project with your database connection</li>
                        <li>• Define payment plans in your system</li>
                        <li>• Generate payment sessions via API</li>
                        <li>• Customers pay on FriendCoin's secure page</li>
                        <li>• Get validation codes for your database</li>
                        <li>• Receive payments in your account</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Features</h4>
                      <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• Your own database integration</li>
                        <li>• Secure payment processing</li>
                        <li>• Real-time webhooks</li>
                        <li>• Transaction validation</li>
                        <li>• Merchant branding in transactions</li>
                        <li>• JavaScript SDK included</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Project</CardTitle>
                  <CardDescription>
                    Set up a new project with database connection for payment processing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input
                        id="projectName"
                        placeholder="My E-commerce Store"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number *</Label>
                      <Input
                        id="accountNumber"
                        placeholder="Your FriendCoin account number"
                        value={projectForm.account_number}
                        onChange={(e) => setProjectForm({ ...projectForm, account_number: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">All payments will be transferred to this account</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
                      <Input
                        id="webhookUrl"
                        placeholder="https://yourapp.com/webhooks/friendcoin"
                        value={projectForm.webhook_url}
                        onChange={(e) => setProjectForm({ ...projectForm, webhook_url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="databaseUrl">Database URL (Optional)</Label>
                      <Input
                        id="databaseUrl"
                        placeholder="postgresql://user:pass@host:port/database"
                        value={projectForm.database_url}
                        onChange={(e) => setProjectForm({ ...projectForm, database_url: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of your project"
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    />
                  </div>

                  <Button
                    onClick={createProject}
                    disabled={loading || !projectForm.name.trim() || !projectForm.account_number.trim()}
                  >
                    {loading ? "Creating..." : "Create Project"}
                  </Button>

                  {message && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        message.includes("successfully") || message.includes("Copied")
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Projects</CardTitle>
                  <CardDescription>Manage your payment processing projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No projects yet</p>
                      <p className="text-sm">Create your first project to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projects.map((project) => (
                        <div key={project.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{project.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{project.description}</p>
                              {project.webhook_url && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  {project.webhook_url}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <div
                                className={`px-2 py-1 rounded-full text-xs ${
                                  project.is_active
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                }`}
                              >
                                {project.is_active ? "Active" : "Inactive"}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Label className="text-xs">API Key:</Label>
                              <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">
                                {showKeys[project.id]
                                  ? project.api_key
                                  : `${project.api_key.substring(0, 8)}${"•".repeat(24)}`}
                              </code>
                              <Button variant="outline" size="sm" onClick={() => toggleKeyVisibility(project.id)}>
                                {showKeys[project.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => copyToClipboard(project.api_key)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            {project.account_number && (
                              <div className="flex items-center space-x-2">
                                <Label className="text-xs">Account:</Label>
                                <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">
                                  {project.account_number}
                                </code>
                              </div>
                            )}
                            {project.database_url && (
                              <div className="flex items-center space-x-2">
                                <Label className="text-xs">Database:</Label>
                                <code className="flex-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono truncate">
                                  {project.database_url}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-plans" className="space-y-6">
              {projects.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">Create a project first to manage payment plans</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Create Payment Plan</CardTitle>
                      <CardDescription>Create payment plans that will be synced to your database</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="projectSelect">Project</Label>
                        <select
                          id="projectSelect"
                          value={selectedProject}
                          onChange={(e) => setSelectedProject(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="externalId">External ID</Label>
                          <Input
                            id="externalId"
                            placeholder="plan_premium_monthly"
                            value={planForm.external_id}
                            onChange={(e) => setPlanForm({ ...planForm, external_id: e.target.value })}
                          />
                          <p className="text-xs text-gray-500">Unique ID in your system</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="planAmount">Amount (f€)</Label>
                          <Input
                            id="planAmount"
                            placeholder="9.99"
                            type="number"
                            step="0.01"
                            value={planForm.amount}
                            onChange={(e) => setPlanForm({ ...planForm, amount: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="planName">Plan Name</Label>
                        <Input
                          id="planName"
                          placeholder="Premium Monthly Subscription"
                          value={planForm.name}
                          onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="planDescription">Description</Label>
                        <Textarea
                          id="planDescription"
                          placeholder="Monthly premium subscription with all features"
                          value={planForm.description}
                          onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                        />
                      </div>

                      <Button
                        onClick={createPaymentPlan}
                        disabled={
                          loading || !planForm.external_id || !planForm.name || !planForm.amount || !selectedProject
                        }
                      >
                        {loading ? "Creating..." : "Create Payment Plan"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Plans</CardTitle>
                      <CardDescription>Plans for {selectedProjectData?.name || "selected project"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {paymentPlans.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No payment plans yet</p>
                          <p className="text-sm">Create your first payment plan above</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {paymentPlans.map((plan) => (
                            <div key={plan.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold">{plan.name}</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">{plan.description}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    External ID: {plan.external_id}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold">
                                    {plan.amount_friendcoins}.
                                    {plan.amount_friendship_fractions.toString().padStart(2, "0")}f€
                                  </div>
                                  <div
                                    className={`px-2 py-1 rounded-full text-xs ${
                                      plan.is_active
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                    }`}
                                  >
                                    {plan.is_active ? "Active" : "Inactive"}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Created {new Date(plan.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="sdk" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>JavaScript SDK</CardTitle>
                  <CardDescription>Use our SDK to integrate FriendCoin payments into your application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Installation</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                      {`npm install @friendcoin/sdk
# or
<script src="https://friendcoin1.vercel.app/sdk.js"></script>`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Basic Usage</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                      {`import { FriendCoinSDK } from '@friendcoin/sdk'

const sdk = new FriendCoinSDK('your_api_key')

// Create a payment session
const session = await sdk.createPaymentSession({
  payment_plan_id: 'plan_premium_monthly',
  customer_email: 'customer@example.com',
  customer_name: 'John Doe',
  return_url: 'https://yourapp.com/success',
  metadata: { user_id: '123' }
})

// Redirect to payment page
window.location.href = session.payment_url`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Validate Payment</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                      {`// Validate a payment
const result = await sdk.validatePayment('validation_code_here')

if (result.valid) {
  console.log('Payment confirmed!', result.transaction)
} else {
  console.log('Payment not found or invalid')
}`}
                    </pre>
                  </div>

                  <Button
                    onClick={() =>
                      copyToClipboard(`import { FriendCoinSDK } from '@friendcoin/sdk'

const sdk = new FriendCoinSDK('your_api_key')

// Create a payment session
const session = await sdk.createPaymentSession({
  payment_plan_id: 'plan_premium_monthly',
  customer_email: 'customer@example.com',
  customer_name: 'John Doe',
  return_url: 'https://yourapp.com/success',
  metadata: { user_id: '123' }
})

// Redirect to payment page
window.location.href = session.payment_url`)
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SDK Example
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Documentation</CardTitle>
                  <CardDescription>Complete guide to integrating FriendCoin payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">1. Create Payment Session</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                      {`POST /api/payments/create-session
Authorization: Bearer your_api_key
Content-Type: application/json

{
  "payment_plan_id": "plan_premium_monthly",
  "customer_email": "customer@example.com",
  "customer_name": "John Doe",
  "return_url": "https://yourapp.com/success",
  "metadata": {
    "user_id": "123",
    "subscription_id": "sub_456"
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. Response</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                      {`{
  "success": true,
  "session_token": "ps_abc123...",
  "payment_url": "https://friendcoin1.vercel.app/pay/ps_abc123...",
  "expires_at": "2024-01-01T12:00:00Z"
}`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">3. Webhook Notification</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                      {`POST https://yourapp.com/webhooks/friendcoin
Content-Type: application/json
X-FriendCoin-Signature: sha256=...

{
  "event": "payment.completed",
  "session_token": "ps_abc123...",
  "validation_code": "vc_def456...",
  "amount": {
    "friendcoins": 9,
    "friendship_fractions": 99
  },
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe"
  },
  "metadata": {
    "user_id": "123",
    "subscription_id": "sub_456"
  }
}`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">4. Validate Payment</h4>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                      {`POST /api/payments/validate
Authorization: Bearer your_api_key
Content-Type: application/json

{
  "validation_code": "vc_def456..."
}`}
                    </pre>
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
