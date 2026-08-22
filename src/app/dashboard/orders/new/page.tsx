"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderItemsEditor } from "@/components/order-items-editor";
import { PageTransition } from "@/components/page-transition";
import { Separator } from "@/components/ui/separator";
import { Client, OrderItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [taxMode, setTaxMode] = useState<"amount" | "percent">("amount");

  // Client fields — typed directly, with search suggestions for returning clients
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("");
  const [linkedClientId, setLinkedClientId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [form, setForm] = useState({
    ordered_at: format(now, "yyyy-MM-dd'T'HH:mm"),
    status: "pending",
    payment_method: "cash",
    payment_status: "unpaid",
    discount: "0",
    tax: "0",
    notes: "",
  });

  // Search for existing clients as user types name
  useEffect(() => {
    const query = `${firstName} ${lastName}`.trim();
    if (query.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data.slice(0, 5));
      if (data.length > 0) setShowSuggestions(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [firstName, lastName]);

  function selectExistingClient(c: Client) {
    setFirstName(c.first_name);
    setLastName(c.last_name);
    setPhone(c.phone || "");
    setLinkedClientId(c.id);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  // If user edits name after linking, unlink the client
  function handleNameChange(field: "first" | "last", value: string) {
    setLinkedClientId(null);
    if (field === "first") setFirstName(value);
    else setLastName(value);
  }

  const hasNaPrices = items.some((i) => i.price_na);
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const discount = parseFloat(form.discount) || 0;
  const taxValue = taxMode === "percent"
    ? (subtotal - discount) * (parseFloat(form.tax) || 0) / 100
    : parseFloat(form.tax) || 0;
  const computedTotal = Math.max(0, subtotal - discount + taxValue);

  // Allow admin to override the final total directly
  const [totalOverride, setTotalOverride] = useState<string | null>(null);
  const total = totalOverride !== null ? (parseFloat(totalOverride) || 0) : computedTotal;

  // When computed total changes (items/discount/tax), clear override
  useEffect(() => { setTotalOverride(null); }, [computedTotal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let clientId = linkedClientId;

      // If name is typed but no existing client linked, create one
      if (!clientId && firstName.trim()) {
        const clientRes = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: lastName.trim() || "—",
            phone: phone.trim() || null,
          }),
        });
        if (clientRes.ok) {
          const newClient = await clientRes.json();
          clientId = newClient.id;
        }
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          client_id: clientId,
          subtotal,
          discount,
          tax: taxValue,
          total,
          items: items.map(({ price_na: _na, ...item }) => item),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || `Save failed (${res.status})`);
        return;
      }

      const order = await res.json();
      toast.success("Order saved");
      router.push(`/dashboard/orders/${order.id}`);
    } catch (err) {
      toast.error("Network error — check your connection");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">New Order</h1>
          <p className="text-sm text-[#8A9A8E] mt-0.5">Create a new sales order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Client */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 relative">
                    <Label>First Name</Label>
                    <Input
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => handleNameChange("first", e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      autoComplete="off"
                    />
                    {/* Suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-[#E8EDE9] rounded-xl shadow-lg overflow-hidden"
                      >
                        <p className="text-[10px] text-[#8A9A8E] px-3 pt-2 pb-1 flex items-center gap-1">
                          <Search className="h-3 w-3" /> Existing clients
                        </p>
                        {suggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => selectExistingClient(c)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F0F4F1] text-left"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#5A8A6E]/10 flex items-center justify-center text-xs font-medium text-[#5A8A6E] shrink-0">
                              {c.first_name[0]}{c.last_name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#2D3B35]">{c.first_name} {c.last_name}</p>
                              <p className="text-xs text-[#8A9A8E]">{c.phone || c.email || ""}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name</Label>
                    <Input
                      placeholder="Smith"
                      value={lastName}
                      onChange={(e) => handleNameChange("last", e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                  />
                </div>
                {linkedClientId && (
                  <p className="text-xs text-[#5A8A6E] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5A8A6E] inline-block" />
                    Linked to existing client
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderItemsEditor items={items} onChange={setItems} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.ordered_at}
                    onChange={(e) => setForm((f) => ({ ...f, ordered_at: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="zelle">Zelle</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Payment Status</Label>
                  <Select value={form.payment_status} onValueChange={(v) => setForm((f) => ({ ...f, payment_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label>Discount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Tax</Label>
                    <button
                      type="button"
                      onClick={() => setTaxMode((m) => m === "amount" ? "percent" : "amount")}
                      className="text-xs text-[#5A8A6E] hover:underline"
                    >
                      {taxMode === "amount" ? "Switch to %" : "Switch to $"}
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      step={taxMode === "amount" ? "0.01" : "0.1"}
                      min="0"
                      value={form.tax}
                      onChange={(e) => setForm((f) => ({ ...f, tax: e.target.value }))}
                    />
                    <span className="text-sm text-[#8A9A8E] w-6">{taxMode === "percent" ? "%" : "$"}</span>
                  </div>
                </div>

                <Separator />

                {hasNaPrices && (
                  <div className="flex items-start gap-2 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/30 px-3 py-2 text-xs text-[#B8862A]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Some items have no price — set the total manually below.
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[#8A9A8E]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[#D97B6C]">
                      <span>Discount</span>
                      <span>−{formatCurrency(discount)}</span>
                    </div>
                  )}
                  {taxValue > 0 && (
                    <div className="flex justify-between text-[#8A9A8E]">
                      <span>Tax</span>
                      <span>{formatCurrency(taxValue)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-[#2D3B35]">Total</span>
                      {totalOverride !== null && (
                        <button
                          type="button"
                          onClick={() => setTotalOverride(null)}
                          className="ml-2 text-[10px] text-[#8A9A8E] hover:text-[#D97B6C] underline"
                        >
                          reset
                        </button>
                      )}
                    </div>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9A8E] text-sm pointer-events-none">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalOverride !== null ? totalOverride : computedTotal.toFixed(2)}
                        onChange={(e) => setTotalOverride(e.target.value)}
                        className="pl-6 h-8 text-right font-semibold text-[#2D3B35]"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Order notes..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </PageTransition>
  );
}
