"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useUser } from "@stackframe/stack"
import { Loader2, Plus, Package, Edit, Trash2, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Product {
  id: string
  name: string
  description: string
  price_friendcoins: number
  price_friendship_fractions: number
  product_type: string
  webhook_url: string | null
  is_active: boolean
  created_at: string
}

export default function DeveloperProductsPage() {
  const user = useUser()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_friendcoins: "",
    price_friendship_fractions: "",
    product_type: "one_time",
    webhook_url: "",
    is_active: true,
  })

  useEffect(() => {
    if (user) {
      fetchProducts()
    }
  }, [user])

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/developer/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price_friendcoins: "",
      price_friendship_fractions: "",
      product_type: "one_time",
      webhook_url: "",
      is_active: true,
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch("/api/developer/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price_friendcoins: Number.parseInt(formData.price_friendcoins) || 0,
          price_friendship_fractions: Number.parseInt(formData.price_friendship_fractions) || 0,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Product Created!",
          description: data.message,
        })
        setShowCreateDialog(false)
        resetForm()
        fetchProducts()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create product",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price_friendcoins: product.price_friendcoins.toString(),
      price_friendship_fractions: product.price_friendship_fractions.toString(),
      product_type: product.product_type,
      webhook_url: product.webhook_url || "",
      is_active: product.is_active,
    })
    setShowEditDialog(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    setCreating(true)

    try {
      const response = await fetch(`/api/developer/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price_friendcoins: Number.parseInt(formData.price_friendcoins) || 0,
          price_friendship_fractions: Number.parseInt(formData.price_friendship_fractions) || 0,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Product Updated!",
          description: "Product has been updated successfully",
        })
        setShowEditDialog(false)
        setEditingProduct(null)
        resetForm()
        fetchProducts()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update product",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return

    try {
      const response = await fetch(`/api/developer/products/${productId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Product Deleted",
          description: data.message,
        })
        fetchProducts()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete product",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      })
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to access developer tools</h1>
        </div>
      </div>
    )
  }

  const ProductForm = ({
    onSubmit,
    isEditing = false,
  }: { onSubmit: (e: React.FormEvent) => void; isEditing?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Product Name
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price_friendcoins" className="block text-sm font-medium mb-1">
            Price (FriendCoins)
          </label>
          <Input
            id="price_friendcoins"
            type="number"
            min="0"
            value={formData.price_friendcoins}
            onChange={(e) => setFormData({ ...formData, price_friendcoins: e.target.value })}
            required
          />
        </div>

        <div>
          <label htmlFor="price_friendship_fractions" className="block text-sm font-medium mb-1">
            Price (Fractions)
          </label>
          <Input
            id="price_friendship_fractions"
            type="number"
            min="0"
            max="99"
            value={formData.price_friendship_fractions}
            onChange={(e) => setFormData({ ...formData, price_friendship_fractions: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="product_type" className="block text-sm font-medium mb-1">
          Product Type
        </label>
        <Select
          value={formData.product_type}
          onValueChange={(value) => setFormData({ ...formData, product_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one_time">One-time Purchase</SelectItem>
            <SelectItem value="subscription">Subscription</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="webhook_url" className="block text-sm font-medium mb-1">
          Webhook URL (Optional)
        </label>
        <Input
          id="webhook_url"
          type="url"
          placeholder="https://your-app.com/webhook"
          value={formData.webhook_url}
          onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <label htmlFor="is_active" className="text-sm font-medium">
          Active
        </label>
      </div>

      <Button type="submit" disabled={creating} className="w-full">
        {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
        {isEditing ? "Update Product" : "Create Product"}
      </Button>
    </form>
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Developer Products</h1>
          <p className="text-muted-foreground">Manage your FriendCoin products and subscriptions</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
              <DialogDescription>Add a new product to your FriendCoin marketplace</DialogDescription>
            </DialogHeader>
            <ProductForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No products created yet</p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Product</DialogTitle>
                  <DialogDescription>Add a new product to your FriendCoin marketplace</DialogDescription>
                </DialogHeader>
                <ProductForm onSubmit={handleCreate} />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription className="mt-1">{product.description}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-2xl font-bold">
                    {product.price_friendcoins}.{product.price_friendship_fractions.toString().padStart(2, "0")}f€
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{product.product_type.replace("_", " ")}</Badge>
                  </div>

                  {product.webhook_url && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      Webhook configured
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(product.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update your product details</DialogDescription>
          </DialogHeader>
          <ProductForm onSubmit={handleUpdate} isEditing />
        </DialogContent>
      </Dialog>
    </div>
  )
}
