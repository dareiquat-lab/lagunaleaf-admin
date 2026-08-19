"use client";

import { useState, useRef, useEffect } from "react";
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
  message_fingerprint?: string;
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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    fetch("/api/ai-parse/status").then(r => r.json()).then(d => setApiKeyMissing(!d.configured));
  }, []);

  const [ordersData, setOrdersData] = useState<ParsedOrder[]>([]);
  const [invoiceData, setInvoiceData] = useState<ParsedInvoice | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Record<number, string>>({});

  function addFiles(newFiles: File[]) {
    const updated = [...files, ...newFiles];
    setFiles(updated);
    setPreviews(updated.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
  }

  function removeFile(i: number) {
    const updated = files.filter((_, j) => j !== i);
    setFiles(updated);
    setPreviews(updated.map(f => f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
  }

  async function parse() {
    if (files.length === 0) return;
    setParsing(true);
    try {
      if (mode === "order") {
        const allOrders: ParsedOrder[] = [];
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("mode", "order");
          const res = await fetch("/api/ai-parse", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Parse failed");
          const parsed: ParsedOrder[] = Array.isArray(json.data?.orders) ? json.data.orders : [];
          allOrders.push(...parsed);
        }
        setOrdersData(allOrders);

        const warnings: Record<number, string> = {};
        for (let i = 0; i < allOrders.length; i++) {
          const o = allOrders[i];
          if (o.client.first_name) {
            const search = `${o.client.first_name} ${o.client.last_name}`.trim();
            const r = await fetch(`/api/orders?search=${encodeURIComponent(search)}&limit=5`);
            const recent = await r.json();
            const match = recent.find((x: { client_name?: string }) =>
              x.client_name?.toLowerCase().includes(o.client.first_name.toLowerCase())
            );
            if (match) warnings[i] = `Possible duplicate: ${match.client_name} (#${match.order_number})`;
          }
        }
        setDuplicateWarnings(warnings);

      } else {
        const allItems: ParsedInvoiceItem[] = [];
        let supplier: string | null = null;
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("mode", "invoice");
          const res = await fetch("/api/ai-parse", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Parse failed");
          const parsed = json.data as ParsedInvoice;
          if (!supplier && parsed.supplier) supplier = parsed.supplier;
          allItems.push(...(parsed.items || []));
        }
        setInvoiceData({ supplier, items: allItems });
      }
      setStep("review");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to parse document");
    } finally {
      setParsing(false);
    }
  }

  function updateOrder(idx: number, updater: (o: ParsedOrder) => ParsedOrder) {
    setOrdersData(prev => prev.map((o, i) => i === idx ? updater(o) : o));
  }

  function removeOrder(idx: number) {
    setOrdersData(prev => prev.filter((_, i) => i !== idx));
    setDuplicateWarnings(prev => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < idx) next[ki] = v;
        else if (ki > idx) next[ki - 1] = v;
      });
      return next;
    });
  }

  async function commitAllOrders() {
    if (ordersData.length === 0) return;
    setCommitting(true);
    try {
      const productsRes = await fetch("/api/products");
      const products = await productsRes.json();

      let successCount = 0;
      let lastOrderId: number | null = null;

      for (const orderData of ordersData) {
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
        lastOrderId = order.id;
        successCount++;
      }

      toast.success(`${successCount} order${successCount > 1 ? "s" : ""} created successfully`);
      setStep("done");
      setTimeout(
        () => router.push(lastOrderId && successCount === 1 ? `/dashboard/orders/${lastOrderId}` : "/dashboard/orders"),
        1200
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to commit orders");
    } finally {
      setCommitting(false);
    }
  }

  async function commitInvoice() {
    if (!invoiceData) return;
    setCommitting(true);
    try {
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

        const allProds = await fetch(`/api/products?search=${encodeURIComponent(item.name)}`);
        const existing = await allProds.json();
        const exactMatch = existing.find((p: { name: string }) =>
          p.name.toLowerCase() === item.name.toLowerCase()
        );

        if (exactMatch) {
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
    setFiles([]);
    setPreviews([]);
    setOrdersData([]);
    setInvoiceData(null);
    setDuplicateWarnings({});
    setStep("upload");
  }

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">AI Import</h1>
        <p className="text-sm text-[#8A9A8E] mt-1">
          Upload screenshots or PDFs — Claude extracts all orders or products automatically
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
            {files.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="relative group rounded-xl border border-[#C4CFC6] bg-[#F4F6F5] overflow-hidden"
                      style={{ width: 96, height: 96 }}
                    >
                      {previews[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previews[i]} alt={f.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                          <FileText className="h-7 w-7 text-[#5A8A6E]" />
                          <p className="text-[10px] text-[#8A9A8E] text-center leading-tight truncate w-full px-1">{f.name}</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 p-0.5 bg-white/90 rounded-full shadow text-[#8A9A8E] hover:text-[#D97B6C] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <label
                    htmlFor={inputId.current}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#C4CFC6] cursor-pointer hover:border-[#5A8A6E] hover:bg-[#5A8A6E]/5 transition-all text-[#8A9A8E]"
                    style={{ width: 96, height: 96 }}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px]">Add more</span>
                  </label>
                </div>
                <p className="text-xs text-[#8A9A8E]">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
              </div>
            ) : (
              <label
                htmlFor={inputId.current}
                className="flex flex-col items-center gap-4 w-full h-52 rounded-xl border-2 border-dashed border-[#C4CFC6] cursor-pointer hover:border-[#5A8A6E] hover:bg-[#5A8A6E]/5 transition-all"
              >
                <div className="flex flex-col items-center gap-3 justify-center h-full">
                  <div className="p-4 rounded-full bg-[#5A8A6E]/10">
                    <Upload className="h-7 w-7 text-[#5A8A6E]" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm text-[#2D3B35]">
                      {mode === "order" ? "Upload order screenshots" : "Upload invoices"}
                    </p>
                    <p className="text-xs text-[#8A9A8E] mt-1">
                      {mode === "order"
                        ? "JPG, PNG — multiple screenshots supported"
                        : "JPG, PNG, or PDF — multiple files supported"}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs border border-[#C4CFC6] bg-white text-[#1C2A21] rounded-lg px-3 py-1.5 shadow-sm">
                    <FileImage className="h-3.5 w-3.5" /> Choose files
                  </span>
                </div>
              </label>
            )}

            <input
              id={inputId.current}
              type="file"
              accept={mode === "order" ? "image/*" : "image/*,application/pdf"}
              multiple
              className="sr-only"
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                if (picked.length > 0) addFiles(picked);
                e.target.value = "";
              }}
            />

            <Button className="w-full" onClick={parse} disabled={files.length === 0 || parsing}>
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
      {step === "review" && mode === "order" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-[#2D3B35]">
              {ordersData.length} order{ordersData.length !== 1 ? "s" : ""} extracted — review before saving
            </p>
            <button onClick={reset} className="text-sm text-[#8A9A8E] hover:text-[#D97B6C]">← Start over</button>
          </div>

          {ordersData.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/30 text-sm">
              <AlertCircle className="h-4 w-4 text-[#D4A853] shrink-0" />
              <p className="text-[#2D3B35]">No orders found in the uploaded images. Try uploading different screenshots.</p>
            </div>
          )}

          {ordersData.map((order, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#2D3B35]">
                  Order {ordersData.length > 1 ? idx + 1 : ""}
                </span>
                {ordersData.length > 1 && (
                  <button onClick={() => removeOrder(idx)} className="text-xs text-[#8A9A8E] hover:text-[#D97B6C]">
                    Remove this order
                  </button>
                )}
              </div>

              {duplicateWarnings[idx] && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/30 text-sm">
                  <AlertCircle className="h-4 w-4 text-[#D4A853] mt-0.5 shrink-0" />
                  <p className="flex-1 text-[#2D3B35]">{duplicateWarnings[idx]}</p>
                  <button
                    onClick={() => setDuplicateWarnings(prev => { const n = { ...prev }; delete n[idx]; return n; })}
                    className="text-[#8A9A8E] hover:text-[#D97B6C]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {!order.client.first_name && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#5A8A6E]/8 border border-[#5A8A6E]/20 text-sm">
                  <AlertCircle className="h-4 w-4 text-[#5A8A6E] mt-0.5 shrink-0" />
                  <p className="text-[#5A8A6E]">No client name found in the message — enter it below.</p>
                </div>
              )}

              {/* Client */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Client</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">First name</Label>
                    <Input
                      value={order.client.first_name}
                      onChange={(e) => updateOrder(idx, o => ({ ...o, client: { ...o.client, first_name: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Last name</Label>
                    <Input
                      value={order.client.last_name}
                      onChange={(e) => updateOrder(idx, o => ({ ...o, client: { ...o.client, last_name: e.target.value } }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={order.client.phone || ""}
                      onChange={(e) => updateOrder(idx, o => ({ ...o, client: { ...o.client, phone: e.target.value || null } }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-6 text-sm"
                        value={item.product_name}
                        onChange={(e) => updateOrder(idx, o => {
                          const items = [...o.items];
                          items[i] = { ...items[i], product_name: e.target.value };
                          return { ...o, items };
                        })}
                        placeholder="Product name"
                      />
                      <div className="col-span-2 flex items-center gap-1">
                        <button
                          onClick={() => updateOrder(idx, o => { const items = [...o.items]; items[i] = { ...items[i], quantity: Math.max(1, items[i].quantity - 1) }; return { ...o, items }; })}
                          className="p-1 rounded hover:bg-[#F0F4F1]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateOrder(idx, o => { const items = [...o.items]; items[i] = { ...items[i], quantity: items[i].quantity + 1 }; return { ...o, items }; })}
                          className="p-1 rounded hover:bg-[#F0F4F1]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="col-span-3 flex items-center gap-1">
                        <span className="text-[#8A9A8E] text-sm">$</span>
                        <Input
                          type="number"
                          className="text-sm"
                          value={item.unit_price}
                          onChange={(e) => updateOrder(idx, o => {
                            const items = [...o.items];
                            items[i] = { ...items[i], unit_price: parseFloat(e.target.value) || 0 };
                            return { ...o, items };
                          })}
                        />
                      </div>
                      <button
                        onClick={() => updateOrder(idx, o => ({ ...o, items: o.items.filter((_, j) => j !== i) }))}
                        className="col-span-1 p-1 text-[#8A9A8E] hover:text-[#D97B6C]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateOrder(idx, o => ({ ...o, items: [...o.items, { product_name: "", quantity: 1, unit_price: 0 }] }))}
                    className="text-sm text-[#5A8A6E] hover:underline mt-1"
                  >
                    + Add item
                  </button>
                  <div className="pt-2 border-t border-[#E8EDE9] text-right text-sm font-medium text-[#2D3B35]">
                    Total: {formatCurrency(order.items.reduce((s, i) => s + i.quantity * i.unit_price, 0))}
                  </div>
                </CardContent>
              </Card>

              {order.notes && (
                <Card>
                  <CardContent className="py-3 px-4">
                    <p className="text-xs text-[#8A9A8E] mb-1">Notes</p>
                    <p className="text-sm text-[#2D3B35]">{order.notes}</p>
                  </CardContent>
                </Card>
              )}

              {idx < ordersData.length - 1 && (
                <div className="border-t-2 border-dashed border-[#C4CFC6] pt-2" />
              )}
            </div>
          ))}

          {ordersData.length > 0 && (
            <Button className="w-full" onClick={commitAllOrders} disabled={committing}>
              {committing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating orders…</>
              ) : (
                <><CheckCircle className="h-4 w-4" /> Create {ordersData.length} Order{ordersData.length > 1 ? "s" : ""} & Clients</>
              )}
            </Button>
          )}
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
                    onChange={(e) => setInvoiceData(d => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], name: e.target.value }; return { ...d, items }; })}
                    placeholder="Product name"
                  />
                  <Input
                    className="col-span-2 text-sm"
                    value={item.category}
                    onChange={(e) => setInvoiceData(d => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], category: e.target.value }; return { ...d, items }; })}
                    placeholder="Category"
                  />
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-xs text-[#8A9A8E]">qty</span>
                    <Input
                      type="number"
                      className="text-sm"
                      value={item.quantity}
                      onChange={(e) => setInvoiceData(d => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], quantity: parseInt(e.target.value) || 0 }; return { ...d, items }; })}
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="text-xs text-[#8A9A8E]">$</span>
                    <Input
                      type="number"
                      className="text-sm"
                      value={item.unit_cost}
                      onChange={(e) => setInvoiceData(d => { if (!d) return d; const items = [...d.items]; items[i] = { ...items[i], unit_cost: parseFloat(e.target.value) || 0 }; return { ...d, items }; })}
                    />
                  </div>
                  <button
                    onClick={() => setInvoiceData(d => { if (!d) return d; return { ...d, items: d.items.filter((_, j) => j !== i) }; })}
                    className="col-span-1 p-1 text-[#8A9A8E] hover:text-[#D97B6C]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={commitInvoice} disabled={committing}>
            {committing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
            ) : (
              <><CheckCircle className="h-4 w-4" /> Import to Inventory</>
            )}
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

      {apiKeyMissing && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/30 text-sm">
          <AlertCircle className="h-4 w-4 text-[#D4A853] mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-[#2D3B35]">Requires ANTHROPIC_API_KEY</p>
            <p className="text-[#8A9A8E] mt-0.5">
              Add <code className="bg-[#D4A853]/15 px-1 rounded">ANTHROPIC_API_KEY</code> to your Vercel environment variables and{" "}
              <code className="bg-[#D4A853]/15 px-1 rounded">.env.local</code> to enable AI parsing.
            </p>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
