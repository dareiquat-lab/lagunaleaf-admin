"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderItemsEditor } from "@/components/order-items-editor";
import { ClientForm } from "@/components/client-form";
import { PageTransition } from "@/components/page-transition";
import { Separator } from "@/components/ui/separator";
import { Client, OrderItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClientDialog, setNewClientDialog] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [taxMode, setTaxMode] = useState<"amount" | "percent">("amount");

  const now = new Date();
  const defaultDate = format(now, "yyyy-MM-dd'T'HH:mm");

  const [form, setForm] = useState({
    ordered_at: defaultDate,
    status: "pending",
    payment_method: "cash",
    payment_status: "unpaid",
    discount: "0",
    tax: "0",
    notes: "",
  });

  useEffect(() => {
    if (clientSearch.length > 0) {
      fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}`)
        .then((r) => r.json())
        .then(setClients);
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const discount = parseFloat(form.discount) || 0;
  const taxValue = taxMode === "percent"
    ? (subtotal - discount) * (parseFloat(form.tax) || 0) / 100
    : parseFloat(form.tax) || 0;
  const total = Math.max(0, subtotal - discount + taxValue);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Add at least one product to the order");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          client_id: selectedClient?.id || null,
          subtotal,
          discount,
          tax: taxValue,
          total,
          items,
        }),
      });
      if (!res.ok) throw new Error("Failed to create order");
      const order = await res.json();
      toast.success("Order created successfully");
      router.push(`/dashboard/orders/${order.id}`);
    } catch {
      toast.error("Failed to create order");
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
                {selectedClient ? (
                  <div className="flex items-center justify-between p-3 bg-[#F0F4F1] rounded-xl">
                    <div>
                      <p className="font-medium text-[#2D3B35]">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </p>
                      <p className="text-sm text-[#8A9A8E]">
                        {[selectedClient.email, selectedClient.phone].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedClient(null)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9A8E]" />
                      <Input
                        className="pl-9"
                        placeholder="Search client by name or email..."
                        value={clientSearch}
                        onChange={(e) => { setClientSearch(e.target.value); setShowClientSearch(true); }}
                        onFocus={() => setShowClientSearch(true)}
                        onBlur={() => setTimeout(() => setShowClientSearch(false), 200)}
                      />
                      {showClientSearch && clients.length > 0 && (
                        <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-[#E8EDE9] rounded-xl shadow-md overflow-hidden">
                          {clients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onMouseDown={() => {
                                setSelectedClient(client);
                                setClientSearch("");
                                setShowClientSearch(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F0F4F1] text-left"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#5A8A6E]/10 flex items-center justify-center text-sm font-medium text-[#5A8A6E]">
                                {client.first_name[0]}{client.last_name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{client.first_name} {client.last_name}</p>
                                <p className="text-xs text-[#8A9A8E]">{client.email || client.phone || "No contact info"}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewClientDialog(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Create new client
                    </Button>
                  </div>
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

                {/* Totals */}
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
                  <div className="flex justify-between font-semibold text-[#2D3B35] text-base">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
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

      {/* New Client Dialog */}
      <Dialog open={newClientDialog} onOpenChange={setNewClientDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            onSuccess={(client) => {
              setSelectedClient(client);
              setNewClientDialog(false);
            }}
            onCancel={() => setNewClientDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
