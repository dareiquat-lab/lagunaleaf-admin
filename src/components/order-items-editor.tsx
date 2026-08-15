"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Product, OrderItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Trash2 } from "lucide-react";

interface OrderItemsEditorProps {
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
}

export function OrderItemsEditor({ items, onChange }: OrderItemsEditorProps) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);

  async function searchProducts(q: string) {
    setSearch(q);
    if (q.length < 1) { setProducts([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setProducts(data.slice(0, 10));
    } finally {
      setSearching(false);
    }
  }

  function addProduct(product: Product) {
    const existing = items.findIndex((i) => i.product_id === product.id);
    if (existing >= 0) {
      const updated = [...items];
      updated[existing] = {
        ...updated[existing],
        quantity: updated[existing].quantity + 1,
        subtotal: (updated[existing].quantity + 1) * updated[existing].unit_price,
      };
      onChange(updated);
    } else {
      onChange([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_cost: Number(product.cost_price),
          unit_price: Number(product.sale_price),
          subtotal: Number(product.sale_price),
        },
      ]);
    }
    setSearch("");
    setProducts([]);
    setShowSearch(false);
  }

  function updateItem(index: number, key: "quantity" | "unit_price", value: number) {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [key]: value,
      subtotal:
        key === "quantity"
          ? value * updated[index].unit_price
          : updated[index].quantity * value,
    };
    onChange(updated);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex gap-2">
          {showSearch ? (
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9A8E]" />
              <Input
                autoFocus
                className="pl-9"
                placeholder="Search products by name or SKU..."
                value={search}
                onChange={(e) => searchProducts(e.target.value)}
                onBlur={() => setTimeout(() => { setShowSearch(false); setProducts([]); setSearch(""); }, 200)}
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
          )}
        </div>

        {products.length > 0 && (
          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-[#E8EDE9] rounded-xl shadow-md overflow-hidden">
            {searching ? (
              <div className="p-3 text-sm text-[#8A9A8E] text-center">Searching...</div>
            ) : (
              products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F0F4F1] text-left transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-[#2D3B35]">{p.name}</p>
                    <p className="text-xs text-[#8A9A8E]">{p.sku} · Stock: {p.stock_quantity}</p>
                  </div>
                  <span className="text-sm font-medium text-[#5A8A6E]">{formatCurrency(Number(p.sale_price))}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="border border-[#E8EDE9] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8]">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#8A9A8E]">Product</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-[#8A9A8E] w-24">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-[#8A9A8E] w-28">Unit Price</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-[#8A9A8E] w-28">Subtotal</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE9]">
              {items.map((item, i) => (
                <tr key={i} className="bg-white">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-[#2D3B35]">{item.product_name}</p>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                      className="text-center h-8 w-20 mx-auto"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                      className="text-right h-8 w-24 ml-auto"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-[#2D3B35]">
                    {formatCurrency(item.subtotal)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && (
        <div className="border-2 border-dashed border-[#E8EDE9] rounded-xl p-8 text-center">
          <p className="text-sm text-[#8A9A8E]">No items added yet. Search for products above.</p>
        </div>
      )}
    </div>
  );
}
