"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Plus, Search, Edit2, Trash2, Package, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "@/components/product-form";
import { PageTransition } from "@/components/page-transition";
import { Product, Category } from "@/lib/types";
import { formatCurrency, calculateMargin, getMarginBg, cn } from "@/lib/utils";
import { toast } from "sonner";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [stockEdits, setStockEdits] = useState<Record<number, string>>({});

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter !== "all") params.set("category_id", categoryFilter);
    if (stockFilter !== "all") params.set("stock_status", stockFilter);
    const res = await fetch(`/api/products?${params}`);
    setProducts(await res.json());
    setLoading(false);
  }, [search, categoryFilter, stockFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  async function handleDelete(id: number) {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    toast.success("Product deleted");
    setDeleteId(null);
    fetchProducts();
  }

  async function adjustStock(product: Product, delta: number) {
    const newQty = Math.max(0, product.stock_quantity + delta);
    await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, stock_quantity: newQty }),
    });
    fetchProducts();
  }

  async function setStockDirectly(product: Product) {
    const val = parseInt(stockEdits[product.id] ?? "");
    if (isNaN(val) || val < 0) return;
    await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, stock_quantity: val }),
    });
    toast.success("Stock updated");
    setStockEdits((prev) => { const n = { ...prev }; delete n[product.id]; return n; });
    fetchProducts();
  }

  const isLowStock = (p: Product) => p.stock_quantity <= p.low_stock_threshold;

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Inventory</h1>
          <p className="text-sm text-[#8A9A8E] mt-1">{products.length} products total</p>
        </div>
        <Button onClick={() => { setEditProduct(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9A8E]" />
          <Input
            className="pl-9"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.icon} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8EDE9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8] border-b border-[#E8EDE9]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E] w-16">Image</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Category</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Cost</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Price</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Margin</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE9]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <Package className="h-10 w-10 text-[#E8EDE9] mx-auto mb-3" />
                    <p className="text-sm text-[#8A9A8E]">No products found. Add your first product.</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const margin = calculateMargin(Number(product.cost_price), Number(product.sale_price));
                  const low = isLowStock(product);
                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        "hover:bg-[#FAFAF8] transition-colors",
                        low && "bg-[#D4A853]/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F0F4F1] overflow-hidden flex items-center justify-center">
                          {product.image_url ? (
                            <Image src={product.image_url} alt={product.name} width={40} height={40} className="object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-[#A8C5B2]" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#2D3B35]">{product.name}</p>
                        {product.unit && <p className="text-xs text-[#8A9A8E]">{product.unit}</p>}
                      </td>
                      <td className="px-4 py-3 text-[#8A9A8E] font-mono text-xs">{product.sku || "—"}</td>
                      <td className="px-4 py-3 text-[#8A9A8E]">{product.category_name || "—"}</td>
                      <td className="px-4 py-3 text-right text-[#2D3B35]">{formatCurrency(Number(product.cost_price))}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#2D3B35]">{formatCurrency(Number(product.sale_price))}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", getMarginBg(margin))}>
                          {margin.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => adjustStock(product, -1)}
                            className="p-1 rounded-md hover:bg-[#F0F4F1] text-[#8A9A8E] transition-colors"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          {product.id in stockEdits ? (
                            <Input
                              type="number"
                              className="w-16 h-7 text-center text-sm"
                              value={stockEdits[product.id]}
                              onChange={(e) => setStockEdits((p) => ({ ...p, [product.id]: e.target.value }))}
                              onBlur={() => setStockDirectly(product)}
                              onKeyDown={(e) => e.key === "Enter" && setStockDirectly(product)}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => setStockEdits((p) => ({ ...p, [product.id]: product.stock_quantity.toString() }))}
                              className={cn("w-10 text-center text-sm font-semibold rounded px-1 hover:bg-[#F0F4F1] transition-colors",
                                low ? "text-[#D4A853]" : "text-[#2D3B35]"
                              )}
                            >
                              {product.stock_quantity}
                            </button>
                          )}
                          <button
                            onClick={() => adjustStock(product, 1)}
                            className="p-1 rounded-md hover:bg-[#F0F4F1] text-[#8A9A8E] transition-colors"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditProduct(product); setDialogOpen(true); }}
                            className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#5A8A6E] hover:bg-[#5A8A6E]/10 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(product.id)}
                            className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editProduct}
            onSuccess={() => { setDialogOpen(false); fetchProducts(); }}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8A9A8E]">
            Are you sure you want to delete this product? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
