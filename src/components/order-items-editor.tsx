"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Product, OrderItem, Category } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Trash2, LayoutGrid, PenLine } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderItemsEditorProps {
  items: OrderItem[];
  onChange: (items: OrderItem[]) => void;
}

export function OrderItemsEditor({ items, onChange }: OrderItemsEditorProps) {
  // ── Search mode ──────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);

  // ── Browse dialog ────────────────────────────────────────────────────
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseSearch, setBrowseSearch] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [browseCat, setBrowseCat] = useState<number | "all">("all");
  const [loadingBrowse, setLoadingBrowse] = useState(false);

  // ── Custom item ──────────────────────────────────────────────────────
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customPriceNa, setCustomPriceNa] = useState(false);

  // Search products (autocomplete)
  async function searchProducts(q: string) {
    setSearch(q);
    if (q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}`);
      setSearchResults((await res.json()).slice(0, 10));
    } finally {
      setSearching(false);
    }
  }

  // Load all products + categories for browse dialog
  async function openBrowse() {
    setBrowseOpen(true);
    if (allProducts.length > 0) return;
    setLoadingBrowse(true);
    const [pr, cr] = await Promise.all([
      fetch("/api/products?limit=500").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setAllProducts(pr);
    setCategories(cr);
    setLoadingBrowse(false);
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
      onChange([...items, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_cost: Number(product.cost_price),
        unit_price: Number(product.sale_price),
        subtotal: Number(product.sale_price),
      }]);
    }
    // Close search dropdown but keep browse open
    setSearch(""); setSearchResults([]); setShowSearch(false);
  }

  function addCustomItem() {
    if (!customName.trim()) return;
    if (!customPriceNa) {
      const price = parseFloat(customPrice);
      if (isNaN(price) || price < 0) return;
    }
    const price = customPriceNa ? 0 : (parseFloat(customPrice) || 0);
    onChange([...items, {
      product_id: null,
      product_name: customName.trim(),
      quantity: 1,
      unit_cost: 0,
      unit_price: price,
      subtotal: price,
      price_na: customPriceNa || undefined,
    }]);
    setCustomName("");
    setCustomPrice("");
    setCustomPriceNa(false);
  }

  function updateItem(index: number, key: "quantity" | "unit_price" | "product_name" | "price_na", value: string | number | boolean) {
    const updated = [...items];
    if (key === "product_name") {
      updated[index] = { ...updated[index], product_name: value as string };
    } else if (key === "price_na") {
      const na = value as boolean;
      updated[index] = {
        ...updated[index],
        price_na: na || undefined,
        ...(na ? { unit_price: 0, subtotal: 0 } : {}),
      };
    } else {
      const num = Number(value);
      updated[index] = {
        ...updated[index],
        [key]: num,
        subtotal: key === "quantity"
          ? num * updated[index].unit_price
          : updated[index].quantity * num,
      };
    }
    onChange(updated);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  // Filtered products for browse dialog
  const browseFiltered = allProducts.filter((p) => {
    const matchCat = browseCat === "all" || p.category_id === browseCat;
    const matchSearch = !browseSearch || p.name.toLowerCase().includes(browseSearch.toLowerCase()) || (p.sku || "").toLowerCase().includes(browseSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-3">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        {showSearch ? (
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9A8E]" />
            <Input
              autoFocus
              className="pl-9 h-9"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => searchProducts(e.target.value)}
              onBlur={() => setTimeout(() => { setShowSearch(false); setSearchResults([]); setSearch(""); }, 180)}
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#E8EDE9] rounded-xl shadow-lg overflow-hidden">
                {searching ? (
                  <p className="p-3 text-sm text-[#8A9A8E] text-center">Searching…</p>
                ) : (
                  searchResults.map((p) => (
                    <button key={p.id} type="button" onMouseDown={() => addProduct(p)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F0F4F1] text-left transition-colors">
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
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowSearch(true)}>
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
        )}

        <Button type="button" variant="outline" size="sm" onClick={openBrowse}>
          <LayoutGrid className="h-3.5 w-3.5" />
          Browse All
        </Button>
      </div>

      {/* ── Items table ─────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="border border-[#E8EDE9] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8]">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#8A9A8E]">Item</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-[#8A9A8E] w-20">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-[#8A9A8E] w-28">Price</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-[#8A9A8E] w-24">Subtotal</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE9]">
              {items.map((item, i) => (
                <tr key={i} className="bg-white">
                  <td className="px-4 py-2">
                    <Input
                      value={item.product_name}
                      onChange={(e) => updateItem(i, "product_name", e.target.value)}
                      className="h-8 border-transparent hover:border-[#E8EDE9] focus:border-[#5A8A6E] bg-transparent"
                    />
                    {!item.product_id && (
                      <span className="text-[10px] text-[#8A9A8E] ml-1">custom</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number" min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                      className="text-center h-8 w-16 mx-auto"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {item.price_na ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-sm text-[#8A9A8E] italic">N/A</span>
                        <button type="button" onClick={() => updateItem(i, "price_na", false)}
                          className="text-[10px] text-[#5A8A6E] hover:underline">
                          set
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number" step="0.01" min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                          className="text-right h-8 w-20"
                        />
                        <button type="button" onClick={() => updateItem(i, "price_na", true)}
                          className="text-[10px] text-[#8A9A8E] hover:text-[#D97B6C] hover:underline shrink-0">
                          N/A
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-[#2D3B35]">
                    {item.price_na ? <span className="text-[#8A9A8E]">—</span> : formatCurrency(item.subtotal)}
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => removeItem(i)}
                      className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Custom item quick-add ────────────────────────────────────── */}
      <div className="flex gap-2 items-center">
        <PenLine className="h-4 w-4 text-[#8A9A8E] shrink-0" />
        <Input
          placeholder="Custom item description…"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
          className="h-9 flex-1"
        />
        {customPriceNa ? (
          <div className="flex items-center gap-1.5 w-28 shrink-0">
            <span className="text-sm text-[#8A9A8E] italic flex-1 text-right">N/A</span>
            <button type="button" onClick={() => setCustomPriceNa(false)}
              className="text-[10px] text-[#5A8A6E] hover:underline">
              set $
            </button>
          </div>
        ) : (
          <div className="relative w-28 shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9A8E] text-sm pointer-events-none">$</span>
            <Input
              type="number" step="0.01" min="0"
              placeholder="0.00"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomItem()}
              className="pl-6 h-9"
            />
          </div>
        )}
        <button type="button" onClick={() => setCustomPriceNa((v) => !v)}
          className={`text-[10px] shrink-0 hover:underline ${customPriceNa ? "text-[#D97B6C]" : "text-[#8A9A8E]"}`}>
          {customPriceNa ? "has price" : "N/A"}
        </button>
        <Button type="button" size="sm" variant="outline" onClick={addCustomItem}
          disabled={!customName.trim() || (!customPriceNa && !customPrice)}
          className="shrink-0">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-[#8A9A8E] text-center py-2">
          No items — search, browse, or add a custom item above. You can also save with no items.
        </p>
      )}

      {/* ── Browse dialog ────────────────────────────────────────────── */}
      <Dialog open={browseOpen} onOpenChange={setBrowseOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#E8EDE9]">
            <DialogTitle>Browse Products</DialogTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9A8E]" />
              <Input
                autoFocus
                className="pl-9"
                placeholder="Search products…"
                value={browseSearch}
                onChange={(e) => setBrowseSearch(e.target.value)}
              />
            </div>
          </DialogHeader>

          {/* Category filter */}
          <div className="px-6 py-3 border-b border-[#E8EDE9] flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setBrowseCat("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${browseCat === "all" ? "bg-[#5A8A6E] text-white" : "bg-[#F0F4F1] text-[#8A9A8E] hover:text-[#2D3B35]"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setBrowseCat(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${browseCat === c.id ? "bg-[#5A8A6E] text-white" : "bg-[#F0F4F1] text-[#8A9A8E] hover:text-[#2D3B35]"}`}
              >
                {c.icon && <span>{c.icon}</span>}
                {c.name}
              </button>
            ))}
          </div>

          {/* Product list */}
          <div className="flex-1 overflow-y-auto">
            {loadingBrowse ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : browseFiltered.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#8A9A8E]">No products found.</div>
            ) : (
              <div className="divide-y divide-[#E8EDE9]">
                {browseFiltered.map((p) => {
                  const inOrder = items.findIndex((i) => i.product_id === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between px-6 py-3 hover:bg-[#FAFAF8] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#2D3B35] text-sm">{p.name}</p>
                        <p className="text-xs text-[#8A9A8E]">
                          {p.sku && <span>{p.sku} · </span>}
                          Stock: {p.stock_quantity}
                          {p.category_name && <span> · {p.category_name}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="font-semibold text-[#5A8A6E] text-sm">{formatCurrency(Number(p.sale_price))}</span>
                        {inOrder >= 0 ? (
                          <div className="flex items-center gap-1">
                            <button type="button"
                              onClick={() => { const u = [...items]; u[inOrder] = { ...u[inOrder], quantity: Math.max(1, u[inOrder].quantity - 1), subtotal: Math.max(1, u[inOrder].quantity - 1) * u[inOrder].unit_price }; onChange(u); }}
                              className="w-7 h-7 rounded-lg bg-[#E8EDE9] text-[#2D3B35] hover:bg-[#5A8A6E]/20 font-bold text-sm flex items-center justify-center">−</button>
                            <span className="w-6 text-center text-sm font-medium">{items[inOrder].quantity}</span>
                            <button type="button"
                              onClick={() => addProduct(p)}
                              className="w-7 h-7 rounded-lg bg-[#5A8A6E] text-white hover:bg-[#4A7A5E] font-bold text-sm flex items-center justify-center">+</button>
                          </div>
                        ) : (
                          <Button type="button" size="sm" onClick={() => addProduct(p)} className="h-8 px-3 text-xs">
                            <Plus className="h-3.5 w-3.5" />
                            Select
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E8EDE9] flex items-center justify-between">
            <span className="text-sm text-[#8A9A8E]">{items.length} item{items.length !== 1 ? "s" : ""} in order</span>
            <Button type="button" onClick={() => setBrowseOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
