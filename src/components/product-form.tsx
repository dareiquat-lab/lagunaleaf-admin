"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";
import { Product, Category } from "@/lib/types";
import { generateSKU } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    category_id: product?.category_id?.toString() || "",
    description: product?.description || "",
    image_url: product?.image_url || "",
    cost_price: product?.cost_price?.toString() || "0",
    sale_price: product?.sale_price?.toString() || "0",
    stock_quantity: product?.stock_quantity?.toString() || "0",
    low_stock_threshold: product?.low_stock_threshold?.toString() || "10",
    unit: product?.unit || "",
    is_active: product?.is_active ?? true,
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.cost_price || parseFloat(form.cost_price) < 0) { toast.error("Cost price must be non-negative"); return; }
    if (!form.sale_price || parseFloat(form.sale_price) < 0) { toast.error("Sale price must be non-negative"); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        sku: form.sku || generateSKU(),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        cost_price: parseFloat(form.cost_price),
        sale_price: parseFloat(form.sale_price),
        stock_quantity: parseInt(form.stock_quantity),
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
        image_url: form.image_url || null,
      };

      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save product");

      toast.success(product ? "Product updated" : "Product created");
      onSuccess();
    } catch {
      toast.error("Failed to save product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Product name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU (auto-generated if blank)</Label>
          <Input
            id="sku"
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            placeholder="LL-XXXXX"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select
            value={form.category_id}
            onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Product description..."
            rows={2}
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label>Product Image</Label>
          <ImageUpload
            value={form.image_url || null}
            onChange={(url) => setForm((f) => ({ ...f, image_url: url || "" }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cost_price">Cost Price *</Label>
          <Input
            id="cost_price"
            type="number"
            step="0.01"
            min="0"
            value={form.cost_price}
            onChange={(e) => setForm((f) => ({ ...f, cost_price: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sale_price">Sale Price *</Label>
          <Input
            id="sale_price"
            type="number"
            step="0.01"
            min="0"
            value={form.sale_price}
            onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stock_quantity">Stock Quantity *</Label>
          <Input
            id="stock_quantity"
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
          <Input
            id="low_stock_threshold"
            type="number"
            min="0"
            value={form.low_stock_threshold}
            onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unit">Unit</Label>
          <Input
            id="unit"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="bottle, oz, pack..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Active</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
            <span className="text-sm text-[#8A9A8E]">{form.is_active ? "Active" : "Inactive"}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-[#E8EDE9]">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {product ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
