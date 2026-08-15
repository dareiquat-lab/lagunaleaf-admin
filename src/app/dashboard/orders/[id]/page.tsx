"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, Trash2, Printer, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { OrderItemsEditor } from "@/components/order-items-editor";
import { ClientForm } from "@/components/client-form";
import { PageTransition } from "@/components/page-transition";
import { Order, OrderItem, Client } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClientDialog, setNewClientDialog] = useState(false);
  const [taxMode, setTaxMode] = useState<"amount" | "percent">("amount");
  const [editForm, setEditForm] = useState({
    ordered_at: "",
    status: "pending",
    payment_method: "cash",
    payment_status: "unpaid",
    discount: "0",
    tax: "0",
    notes: "",
  });

  async function fetchOrder() {
    setLoading(true);
    const res = await fetch(`/api/orders/${params.id}`);
    if (!res.ok) { router.push("/dashboard/orders"); return; }
    const data = await res.json();
    setOrder(data);
    setEditItems(data.items || []);
    setEditForm({
      ordered_at: format(new Date(data.ordered_at), "yyyy-MM-dd'T'HH:mm"),
      status: data.status,
      payment_method: data.payment_method || "cash",
      payment_status: data.payment_status,
      discount: String(data.discount || 0),
      tax: String(data.tax || 0),
      notes: data.notes || "",
    });
    setLoading(false);
  }

  useEffect(() => { fetchOrder(); }, [params.id]);

  useEffect(() => {
    if (clientSearch.length > 0) {
      fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}`)
        .then((r) => r.json())
        .then(setClients);
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  const editSubtotal = editItems.reduce((sum, i) => sum + i.subtotal, 0);
  const editDiscount = parseFloat(editForm.discount) || 0;
  const editTaxValue = taxMode === "percent"
    ? (editSubtotal - editDiscount) * (parseFloat(editForm.tax) || 0) / 100
    : parseFloat(editForm.tax) || 0;
  const editTotal = Math.max(0, editSubtotal - editDiscount + editTaxValue);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          client_id: selectedClient?.id || order?.client_id,
          subtotal: editSubtotal,
          discount: editDiscount,
          tax: editTaxValue,
          total: editTotal,
          items: editItems,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Order updated");
      setEditOpen(false);
      fetchOrder();
    } catch {
      toast.error("Failed to update order");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await fetch(`/api/orders/${params.id}`, { method: "DELETE" });
    toast.success("Order deleted");
    router.push("/dashboard/orders");
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">{order.order_number}</h1>
            <p className="text-sm text-[#8A9A8E] mt-0.5">Placed {formatDateTime(order.ordered_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(order.items?.length ?? 0) === 0 ? (
                <p className="p-6 text-sm text-[#8A9A8E]">No items on this order.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#FAFAF8] border-b border-[#E8EDE9]">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-[#8A9A8E]">Product</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Qty</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Unit Cost</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Unit Price</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-[#8A9A8E]">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EDE9]">
                      {order.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-3 font-medium text-[#2D3B35]">{item.product_name}</td>
                          <td className="px-4 py-3 text-center text-[#8A9A8E]">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-[#8A9A8E]">{formatCurrency(Number(item.unit_cost))}</td>
                          <td className="px-4 py-3 text-right text-[#2D3B35]">{formatCurrency(Number(item.unit_price))}</td>
                          <td className="px-6 py-3 text-right font-medium text-[#2D3B35]">{formatCurrency(Number(item.subtotal))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Info */}
          {order.client_id && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Client</CardTitle>
                  <Link href={`/dashboard/clients/${order.client_id}`}>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-[#5A8A6E]">
                      <User className="h-3.5 w-3.5" />
                      View Profile
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#8A9A8E] text-xs mb-0.5">Name</p>
                    <p className="font-medium text-[#2D3B35]">{order.client_name}</p>
                  </div>
                  {(order as Order & { client_email?: string }).client_email && (
                    <div>
                      <p className="text-[#8A9A8E] text-xs mb-0.5">Email</p>
                      <p className="text-[#2D3B35]">{(order as Order & { client_email?: string }).client_email}</p>
                    </div>
                  )}
                  {(order as Order & { client_phone?: string }).client_phone && (
                    <div>
                      <p className="text-[#8A9A8E] text-xs mb-0.5">Phone</p>
                      <p className="text-[#2D3B35]">{(order as Order & { client_phone?: string }).client_phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#8A9A8E]">
                  <span>Order Date</span>
                  <span>{formatDate(order.ordered_at)}</span>
                </div>
                <div className="flex justify-between text-[#8A9A8E]">
                  <span>Created</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8A9A8E]">Order Status</span>
                <StatusBadge type="order_status" value={order.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8A9A8E]">Payment Status</span>
                <StatusBadge type="payment_status" value={order.payment_status} />
              </div>
              {order.payment_method && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8A9A8E]">Payment Method</span>
                  <span className="text-sm font-medium text-[#2D3B35] capitalize">{order.payment_method}</span>
                </div>
              )}
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#8A9A8E]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(order.subtotal))}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-[#D97B6C]">
                    <span>Discount</span>
                    <span>−{formatCurrency(Number(order.discount))}</span>
                  </div>
                )}
                {Number(order.tax) > 0 && (
                  <div className="flex justify-between text-[#8A9A8E]">
                    <span>Tax</span>
                    <span>{formatCurrency(Number(order.tax))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-[#2D3B35] text-base">
                  <span>Total</span>
                  <span>{formatCurrency(Number(order.total))}</span>
                </div>
              </div>
              {order.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-[#8A9A8E] mb-1">Notes</p>
                    <p className="text-sm text-[#2D3B35]">{order.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order {order.order_number}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Date & Time</Label>
                <Input type="datetime-local" value={editForm.ordered_at}
                  onChange={(e) => setEditForm((f) => ({ ...f, ordered_at: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
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
                <Select value={editForm.payment_method} onValueChange={(v) => setEditForm((f) => ({ ...f, payment_method: v }))}>
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
                <Select value={editForm.payment_status} onValueChange={(v) => setEditForm((f) => ({ ...f, payment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Discount ($)</Label>
                <Input type="number" step="0.01" min="0" value={editForm.discount}
                  onChange={(e) => setEditForm((f) => ({ ...f, discount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Tax</Label>
                  <button type="button" onClick={() => setTaxMode((m) => m === "amount" ? "percent" : "amount")}
                    className="text-xs text-[#5A8A6E] hover:underline">
                    {taxMode === "amount" ? "Switch to %" : "Switch to $"}
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <Input type="number" step={taxMode === "amount" ? "0.01" : "0.1"} min="0" value={editForm.tax}
                    onChange={(e) => setEditForm((f) => ({ ...f, tax: e.target.value }))} />
                  <span className="text-sm text-[#8A9A8E] w-6">{taxMode === "percent" ? "%" : "$"}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={editForm.notes} rows={3}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-[#8A9A8E]">
                  <span>Subtotal</span><span>{formatCurrency(editSubtotal)}</span>
                </div>
                {editDiscount > 0 && (
                  <div className="flex justify-between text-[#D97B6C]">
                    <span>Discount</span><span>−{formatCurrency(editDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-[#2D3B35]">
                  <span>Total</span><span>{formatCurrency(editTotal)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <Label>Order Items</Label>
              <OrderItemsEditor items={editItems} onChange={setEditItems} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-[#E8EDE9]">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8A9A8E]">
            Are you sure you want to delete order {order.order_number}? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

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
