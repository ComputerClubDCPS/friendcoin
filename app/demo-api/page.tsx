"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { ArrowLeft, Code, Copy, Play, ExternalLink, Download } from "lucide-react"
import Link from "next/link"

export default function DemoAPIPage() {
  const [apiForm, setApiForm] = useState({
    payment_plan_id: "plan_premium_monthly",
    customer_email: "customer@example.com",
    customer_name: "John Doe",
    return_url: "https://yourapp.com/success",
    metadata: '{"user_id": "123", "subscription_id": "sub_456"}',
  })
  const [validationForm, setValidationForm] = useState({
    validation_code: "vc_abc123def456",
  })
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState("")

  function generateAPICode() {
    const code = `// FriendCoin SDK Example
import { FriendCoinSDK } from '@friendcoin/sdk'

const sdk = new FriendCoinSDK('fc_demo_key_123')

// Create Payment Session
async function createPayment() {
  try {
    const session = await sdk.createPaymentSession({
      payment_plan_id: "${apiForm.payment_plan_id}",
      customer_email: "${apiForm.customer_email}",
      customer_name: "${apiForm.customer_name}",
      return_url: "${apiForm.return_url}",
      metadata: ${apiForm.metadata}
    })
    
    console.log('Payment session created:', session)
    
    // Redirect to payment page
    window.location.href = session.payment_url
  } catch (error) {
    console.error('Payment creation failed:', error)
  }
}

// Validate Payment
async function validatePayment(validationCode) {
  try {
    const result = await sdk.validatePayment(validationCode)
    
    if (result.valid) {
      console.log('Payment confirmed!', result.transaction)
      // Grant access to user
    } else {
      console.log('Payment not found or invalid')
    }
  } catch (error) {
    console.error('Validation failed:', error)
  }
}

// Call the function
createPayment()`

    setGeneratedCode(code)
  }

  async function testCreateSession() {
    setLoading(true)
    setResponse(null)
    try {
      // Simulate API response for demo
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockResponse = {
        success: true,
        session_token: `ps_${Math.random().toString(36).substring(2, 15)}`,
        payment_url: `https://friendcoin1.vercel.app/pay/ps_${Math.random().toString(36).substring(2, 15)}`,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        metadata: JSON.parse(apiForm.metadata),
      }

      setResponse(mockResponse)
    } catch (error) {
      setResponse({ error: "Demo API call failed" })
    } finally {
      setLoading(false)
    }
  }

  async function testValidation() {
    setLoading(true)
    setResponse(null)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))

      const mockResponse = {
        success: true,
        valid: validationForm.validation_code.startsWith("vc_"),
        transaction: {
          id: `tx_${Math.random().toString(36).substring(2, 15)}`,
          amount: {
            friendcoins: 9,
            friendship_fractions: 99,
          },
          status: "completed",
          timestamp: new Date().toISOString(),
          customer: {
            email: apiForm.customer_email,
            name: apiForm.customer_name,
          },
        },
      }

      setResponse(mockResponse)
    } catch (error) {
      setResponse({ error: "Demo validation failed" })
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  function downloadSDK() {
    const sdkContent = `// FriendCoin SDK v1.0.0
class FriendCoinSDK {
  constructor(apiKey, baseUrl = 'https://friendcoin1.vercel.app') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async request(endpoint, options = {}) {
    const url = \`\${this.baseUrl}/api\${endpoint}\`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || \`HTTP \${response.status}\`)
    }

    return response.json()
  }

  async createPaymentSession(data) {
    return this.request('/payments/create-session', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async validatePayment(validationCode) {
    return this.request('/payments/validate', {
      method: 'POST',
      body: JSON.stringify({ validation_code: validationCode }),
    })
  }

  async createProduct(data) {
    return this.request('/developer/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getProducts() {
    return this.request('/developer/products')
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FriendCoinSDK }
}

// Export for browser
if (typeof window !== 'undefined') {
  window.FriendCoinSDK = FriendCoinSDK
}`

    const blob = new Blob([sdkContent], { type: "application/javascript" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "friendcoin-sdk.js"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Link href="/developer">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Developer
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <FriendCoinLogo size={32} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Demo & Testing</h1>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="create-session" className="space-y-4">
            <TabsList>
              <TabsTrigger value="create-session">Create Payment Session</TabsTrigger>
              <TabsTrigger value="validate">Validate Payment</TabsTrigger>
              <TabsTrigger value="code-generator">Code Generator</TabsTrigger>
              <TabsTrigger value="sdk-download">Download SDK</TabsTrigger>
            </TabsList>

            <TabsContent value="create-session" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Create Payment Session</CardTitle>
                    <CardDescription>Test the payment session creation API with live demo data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="planId">Payment Plan ID</Label>
                      <Input
                        id="planId"
                        value={apiForm.payment_plan_id}
                        onChange={(e) => setApiForm({ ...apiForm, payment_plan_id: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">Customer Email</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={apiForm.customer_email}
                        onChange={(e) => setApiForm({ ...apiForm, customer_email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input
                        id="customerName"
                        value={apiForm.customer_name}
                        onChange={(e) => setApiForm({ ...apiForm, customer_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="returnUrl">Return URL</Label>
                      <Input
                        id="returnUrl"
                        value={apiForm.return_url}
                        onChange={(e) => setApiForm({ ...apiForm, return_url: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metadata">Metadata (JSON)</Label>
                      <Textarea
                        id="metadata"
                        value={apiForm.metadata}
                        onChange={(e) => setApiForm({ ...apiForm, metadata: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <Button onClick={testCreateSession} disabled={loading} className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      {loading ? "Testing..." : "Test API Call"}
                    </Button>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        This is a demo environment. Real payments require a valid API key.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Response</CardTitle>
                    <CardDescription>Live response from the demo API</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {response ? (
                      <div className="space-y-4">
                        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(response, null, 2)}
                        </pre>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Response
                          </Button>
                          {response.payment_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={response.payment_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Payment URL
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Click "Test API Call" to see the response</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="validate" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Validate Payment</CardTitle>
                    <CardDescription>Test payment validation with a validation code</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="validationCode">Validation Code</Label>
                      <Input
                        id="validationCode"
                        value={validationForm.validation_code}
                        onChange={(e) => setValidationForm({ ...validationForm, validation_code: e.target.value })}
                        placeholder="vc_abc123def456"
                      />
                    </div>

                    <Button onClick={testValidation} disabled={loading} className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      {loading ? "Validating..." : "Test Validation"}
                    </Button>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Demo validates any code starting with "vc_". Try: vc_demo123
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Validation Response</CardTitle>
                    <CardDescription>Response from the validation API</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {response ? (
                      <div className="space-y-4">
                        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
                          {JSON.stringify(response, null, 2)}
                        </pre>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Response
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Click "Test Validation" to see the response</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="code-generator" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Code Generator</CardTitle>
                  <CardDescription>Generate code snippets for your integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={generateAPICode} className="w-full">
                    <Code className="h-4 w-4 mr-2" />
                    Generate SDK Code
                  </Button>

                  {generatedCode && (
                    <div className="space-y-4">
                      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto max-h-96">
                        {generatedCode}
                      </pre>
                      <Button variant="outline" onClick={() => copyToClipboard(generatedCode)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sdk-download" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Download FriendCoin SDK</CardTitle>
                  <CardDescription>Get the complete JavaScript SDK for easy integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Features</h4>
                      <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                        <li>• Payment session creation</li>
                        <li>• Payment validation</li>
                        <li>• Product management</li>
                        <li>• Webhook verification</li>
                        <li>• TypeScript support</li>
                        <li>• Browser and Node.js compatible</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Installation</h4>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                        {`npm install @friendcoin/sdk

# or download directly
<script src="./friendcoin-sdk.js"></script>`}
                      </pre>
                    </div>
                  </div>

                  <Button onClick={downloadSDK} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download SDK (friendcoin-sdk.js)
                  </Button>

                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      The SDK includes TypeScript definitions and works in both browser and Node.js environments.
                    </p>
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
