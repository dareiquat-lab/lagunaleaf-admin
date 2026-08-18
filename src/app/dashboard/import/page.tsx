"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileImage, FileText, Loader2, CheckCircle, AlertCircle, ShoppingBag, Package, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Mode = "order" | "invoice";
type Step = "upload" | "review" | "done";

interface ParsedOrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}
interface ParsedOrder {
  client: { first_name: string; last_name: string; phone: string | null };
  items: ParsedOrderItem[];
  notes: string | null;
  ordered_at: string | null;
}

interface ParsedInvoiceItem {
  name: string;
  category: string;
  quantity: number;
  unit_cost: number;
}
interface ParsedInvoice {
  supplier: string | null;
  items: ParsedInvoiceItem[];
}

export default function ImportPage() {
  const router = useRouter();
  const inputId = useRef(`import-upload-${Math.random().toString(36).slice(2)}`);
  const [mode, setMode] = useState<Mode>("order");
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Parsed results (editable)
  const [orderData, setOrderData] = useState<ParsedOrder | null>(null);
  const [invoiceData, setInvoiceData] = useState<ParsedInvoice | null>(null);

  function handleFileChange(f: File) {
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  async function parse() {
    if (!file) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      const res = await fetch("/api/ai-parse", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Parse failed");
      if (mode === "order") setOrderData(json.data as ParsedOrder);
      else setInvoiceData(json.data as ParsedInvoice);
      setStep("review");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to parse document");
    } finally {
      setParsing(false);
    }
  }

  // ── Commit order ─────────────────────────────────────────────────────────
  async function commitOrder() {
    if (!orderData) return;
    setCommitting(true);
    try {
      // 1. Create / find client
      let clientId: number | null = null;
      if (orderData.client.first_name) {
        const cRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: orderData.client.first_name,
            last_name: orderData.client.last_name || "—",
            phone: orderData.client.phone || null,
          }),
        });
        if (cRes.ok) clientId = (await cRes.json()).id;
      }

      // 2. Match items to products for cost lookup
      const productsRes = await fetch("/api/products");
      const products = await productsRes.json();

      const items = orderData.items.map((item) => {
        const match = products.find((p: { name: string; cost_price: number; id: number }) =>
          p.name.toLowerCase().includes(item.product_name.toLowerCase()) ||
          item.product_name.toLowerCase().includes(p.name.toLowerCase())
        );
        return {
          product_id: match?.id || null,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_cost: match ? Number(match.cost_price) : 0,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        };
      });

      const subtotal = items.reduce((s, i) => s + i.subtotal, 0);

      // 3. Create order
      const oRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          status: "pending",
          payment_status: "unpaid",
          subtotal,
          discount: 0,
          tax: 0,
          total: subtotal,
          notes: orderData.notes || null,
          ordered_at: orderData.ordered_at || new Date().toISOString(),
          items,
        }),
      });

      if (!oRes.ok) throw new Error("Failed to create order");
      const order = await oRes.json();
      toast.success("Order created successfully");
      setStep("done");
      setTimeout(() => router.push(`/dashboard/orders/${order.id}`), 1200);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to commit order");
    } finally {
      setCommitting(false);
    }
  }

  // ── Commit invoice ────────────────────────────────────────────────────────
  async function commitInvoice() {
    if (!invoiceData) return;
    setCommitting(true);
    try {
      // Get or create categories
      const catRes = await fetch("/api/categories");
      const categories: { id: number; name: string }[] = await catRes.json();
      const catMap: Record<string, number> = {};
      for (const c of categories) catMap[c.name.toLowerCase()] = c.id;

      let created = 0;
      let skipped = 0;

      for (const item of invoiceData.items) {
        const catName = item.category;
        let catId = catMap[catName.toLowerCase()];

        if (!catId) {
          const newCat = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: catName }),
          });
          if (newCat.ok) {
            const nc = await newCat.json();
            catId = nc.id;
            catMap[catName.toLowerCase()] = catId;
          }
        }

        // Check for existing product with same name
        const allProds = await fetch(`/api/products?search=${encodeURIComponent(item.name)}`);
        const existing = await allProds.json();
        const exactMatch = existing.find((p: { name: string }) =>
          p.name.toLowerCase() === item.name.toLowerCase()
        );

        if (exactMatch) {
          // Update stock quantity
          await fetch(`/api/products/${exactMatch.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...exactMatch, stock_quantity: exactMatch.stock_quantity + item.quantity }),
          });
          skipped++;
        } else {
          await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.name,
              category_id: catId || null,
              cost_price: item.unit_cost,
              sale_price: 0,
              stock_quantity: item.quantity,
            }),
          });
          created++;
        }
      }

      toast.success(`Done — ${created} new products, ${skipped} stock updated`);
      setStep("done");
      setTimeout(() => router.push("/dashboard/inventory"), 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to commit invoice");
    } finally {
      setCommitting(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setOrderData(null);
    setInvoiceData(null);
    setStep("upload");
  }

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">AI Import</h1>
        <p className="text-sm text-[#8A9A8E] mt-1">
          Upload a screenshot or PDF — Claude will extract the data and create records automatically
        </p>
      </div>

      {/* Mode selector */}
      {step === "upload" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("order")}
            className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
              mode === "order"
                ? "border-[#5A8A6E] bg-[#5A8A6E]/5"
                : "border-[#C4CFC6] bg-white hover:border-[#5A8A6E]/50"
            }`}
          >
            <div className={`p-3 rounded-xl ${mode === "order" ? "bg-[#5A8A6E]/15" : "bg-[#F4F6F5]"}`}>
              <ShoppingBag className={`h-6 w-6 ${mode === "order" ? "text-[#5A8A6E]" : "text-[#8A9A8E]"}`} />
            </div>
            <div className="text-center">
              <p className={`font-medium text-sm ${mode === "order" ? "text-[#5A8A6E]" : "text-[#2D3B35]"}`}>
                Order Screenshot
              </p>
              <p className="text-xs text-[#8A9A8E] mt-0.5">Chat, DM, or text order</p>
            </div>
          </button>
          <button
            onClick={() => setMode("invoice")}
            className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
              mode === "invoice"
                ? "border-[#5A8A6E] bg-[#5A8A6E]/5"
                : "border-[#C4CFC6] bg-white hover:border-[#5A8A6E]/50"
            }`}
          >
            <div className={`p-3 rounded-xl ${mode === "invoice" ? "bg-[#5A8A6E]/15" : "bg-[#F4F6F5]"}`}>
              <Package className={`h-6 w-6 ${mode === "invoice" ? "text-[#5A8A6E]" : "text-[#8A9A8E]"}`} />
            </div>
            <div className="text-center">
              <p className={`font-medium text-sm ${mode === "invoice" ? "text-[#5A8A6E]" : "text-[#2D3B35]"}`}>
                Supplier Invoice
              </p>
              <p className="text-xs text-[#8A9A8E] mt-0.5">Image or PDF invoice</p>
            </div>
          </button>
        </div>
      )}

      {/* Upload zone */}
      {step === "upload" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <label
              htmlFor={inputId.current}
              className="flex flex-col items-center gap-4 w-full h-52 rounded-xl border-2 border-dashed border-[#C4CFC6] cursor-pointer hover:border-[#5A8A6E] hover:bg-[#5A8A6E]/5 transition-all"
            >
              {preview ? (
                <div className="relative w-full h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-xl p-2" />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setFile(null); setPreview(null); }}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow border border-[#C4CFC6] text-[#8A9A8E] hover:text-[#D97B6C]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-2 justify-center h-full">
                  <FileText className="h-10 w-10 text-[#5A8A6E]" />
                  <p className="text-sm font-medium text-[#2D3B35]">{file.name}</p>
                  <p className="text-xs text-[#8A9A8E]">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 justify-center h-full">
                  <div className="p-4 rounded-full bg-[#5A8A6E]/10">
                    <Upload className="h-7 w-7 text-[#5A8A6E]" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm text-[#2D3B35]">
                      {mode === "order" ? "Upload order screenshot" : "Upload invoice"}
                    </p>
                    <p className="text-xs text-[#8A9A8E] mt-1">
                      {mode === "order" ? "JPG, PNG — chat/DM screenshot" : "JPG, PNG, or PDF invoice"}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs border border-[#C4CFC6] bg-white text-[#1C2A21] rounded-lg px-3 py-1.5 shadow-sm">
                    <FileImage className="h-3.5 w-3.5" /> Choose file
                  </span>
                </div>
              )}
            </label>
            <input
              id={inputId.current}
              type="file"
              accept={mode === "order" ? "image/*" : "image/*,application/pdf"}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
                e.target.value = "";
              }}
            />
            <Button
              className="w-full"
              onClick={parse}
              disabled={!file || parsing}
            >
              {parsing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analysing with Claude…</>
              ) : (
                <><Upload className="h-4 w-4" /> Extract Data</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── ORDER REVIEW ──────────────────────────────────────────────────── */}
      {step === "review" && mode === "order" && orderData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-[#2D3B35]">Review extracted order</p>
            <button onClick={reset} className="text-sm text-[#8A9A8E] hover:text-[#D97B6C]">← Start over</button>
          </div>

          {/* Client */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Client</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">First name</Label>
                <Input
                  value={orderData.client.first_name}
                  onChange={(e) => setOrderData((d) => d && ({ ...d, client: { ...d.client, first_name: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last name</Label>
                <Input
                  value={orderData.client.last_name}
                  onChange={(e) => setOrderData((d) => d && ({ ...d, client: { ...d.client, last_name: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={orderData.client.phone || ""}
                  onChange={(e) => setOrderData((d) => d && ({ ...d, client: { ...d.client, phone: e.target.value || null } }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {orderData.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-6 text-sm"
                    value={item.product_name}
                    onChange={(e) => setOrderData((d) => {
                      if (!d) return d;
                      const items = [...d.items];
                      items[i] = { ...items[i], product_name: e.target.value };
                      return { ...d, items };
                    })}
                    placeholder="Product name"
                  />
                  <div className="col-span-2 flex items-center gap-1">
                    <button onClick={() => setOrderData((d) => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], quantity: Math.max(1, items[i].quantity - 1) }; return { ...d, items }; })} className="p-1 rounded hover:bg-[#F0F4F1]"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => setOrderData((d) => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], quantity: items[i].quantity + 1 }; return { ...d, items }; })} className="p-1 rounded hover:bg-[#F0F4F1]"><Plus className="h-3 w-3" /></button>
                  </div>
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-[#8A9A8E] text-sm">$</span>
                    <Input
                      type="number"
                      className="text-sm"
                      value={item.unit_price}
                      onChange={(e) => setOrderData((d) => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], unit_price: parseFloat(e.target.value) || 0 }; return { ...d, items }; })}
                    />
                  </div>
                  <button onClick={() => setOrderData((d) => { if (!d) return d; return { ...d, items: d.items.filter((_, j) => j !== i) }; })} className="col-span-1 p-1 text-[#8A9A8E] hover:text-[#D97B6C]"><X className="h-4 w-4" /></button>
                </div>
              ))}
              <button
                onClick={() => setOrderData((d) => d && ({ ...d, items: [...d.items, { product_name: "", quantity: 1, unit_price: 0 }] }))}
                className="text-sm text-[#5A8A6E] hover:underline mt-1"
              >
                + Add item
              </button>
              <div className="pt-2 border-t border-[#E8EDE9] text-right text-sm font-medium text-[#2D3B35]">
                Total: {formatCurrency(orderData.items.reduce((s, i) => s + i.quantity * i.unit_price, 0))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {orderData.notes && (
            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-xs text-[#8A9A8E] mb-1">Notes from message</p>
                <p className="text-sm text-[#2D3B35]">{orderData.notes}</p>
              </CardContent>
            </Card>
          )}

          <Button className="w-full" onClick={commitOrder} disabled={committing}>
            {committing ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating order…</> : <><CheckCircle className="h-4 w-4" /> Create Order & Client</>}
          </Button>
        </div>
      )}

      {/* ── INVOICE REVIEW ────────────────────────────────────────────────── */}
      {step === "review" && mode === "invoice" && invoiceData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-[#2D3B35]">
              Review extracted invoice{invoiceData.supplier ? ` — ${invoiceData.supplier}` : ""}
            </p>
            <button onClick={reset} className="text-sm text-[#8A9A8E] hover:text-[#D97B6C]">← Start over</button>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{invoiceData.items.length} line items</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {invoiceData.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-5 text-sm"
                    value={item.name}
                    onChange={(e) => setInvoiceData((d) => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], name: e.target.value }; return { ...d, items }; })}
                    placeholder="Product name"
                  />
                  <Input
                    className="col-span-2 text-sm"
                    value={item.category}
                    onChange={(e) => setInvoiceData((d) => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], category: e.target.value }; return { ...d, items }; })}
                    placeholder="Category"
                  />
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-xs text-[#8A9A8E]">qty</span>
                    <Input
                      type="number"
                      className="text-sm"
                      value={item.quantity}
                      onChange={(e) => setInvoiceData((d) => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], quantity: parseInt(e.target.value) || 0 }; return { ...d, items }; })}
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-xs text-[#8A9A8E]">$</span>
                    <Input
                      type="number"
                      className="text-sm"
                      value={item.unit_cost}
                      onChange={(e) => setInvoiceData((d) => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], unit_cost: parseFloat(e.target.value) || 0 }; return { ...d, items }; })}
                    />
                  </div>
                  <button onClick={() => setInvoiceData((d) => { if (!d) return d; return { ...d, items: d.items.filter((_, j) => j !== i) }; })} className="col-span-1 p-1 text-[#8A9A8E] hover:text-[#D97B6C]"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={commitInvoice} disabled={committing}>
            {committing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : <><CheckCircle className="h-4 w-4" /> Import to Inventory</>}
          </Button>
        </div>
      )}

      {/* ── SUCCESS ───────────────────────────────────────────────────────── */}
      {step === "done" && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-[#5A8A6E]/10">
              <CheckCircle className="h-10 w-10 text-[#5A8A6E]" />
            </div>
            <p className="text-lg font-semibold text-[#2D3B35]">Import complete!</p>
            <p className="text-sm text-[#8A9A8E]">Redirecting…</p>
          </CardContent>
        </Card>
      )}

      {/* No API key warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/30 text-sm">
        <AlertCircle className="h-4 w-4 text-[#D4A853] mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-[#2D3B35]">Requires ANTHROPIC_API_KEY</p>
          <p className="text-[#8A9A8E] mt-0.5">
            Add <code className="bg-[#D4A853]/15 px-1 rounded">ANTHROPIC_API_KEY</code> to your Vercel environment variables and <code className="bg-[#D4A853]/15 px-1 rounded">.env.local</code> to enable AI parsing.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
