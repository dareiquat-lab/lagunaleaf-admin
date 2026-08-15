"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, ShoppingBag, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { PageTransition } from "@/components/page-transition";
import { Order } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (paymentFilter !== "all") params.set("payment_status", paymentFilter);
    const res = await fetch(`/api/orders?${params}`);
    setOrders(await res.json());
    setLoading(false);
  }, [search, statusFilter, paymentFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function handleDelete(id: number) {
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    toast.success("Order deleted");
    setDeleteId(null);
    fetchOrders();
  }

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Orders</h1>
          <p className="text-sm text-[#8A9A8E] mt-1">{orders.length} orders found</p>
        </div>
        <Link href="/dashboard/orders/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9A8E]" />
          <Input
            className="pl-9"
            placeholder="Search by order # or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All payments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8EDE9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8] border-b border-[#E8EDE9]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8A9A8E]">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Date & Time</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Items</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Subtotal</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Discount</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Tax</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Payment</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Pay Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDE9]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <ShoppingBag className="h-10 w-10 text-[#E8EDE9] mx-auto mb-3" />
                    <p className="text-sm text-[#8A9A8E]">No orders found.</p>
                    <Link href="/dashboard/orders/new" className="text-sm text-[#5A8A6E] hover:underline mt-1 inline-block">
                      Create the first order →
                    </Link>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-medium text-[#5A8A6E] hover:underline flex items-center gap-1"
                      >
                        {order.order_number}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#2D3B35]">{order.client_name || "—"}</td>
                    <td className="px-4 py-3 text-[#8A9A8E] whitespace-nowrap">{formatDateTime(order.ordered_at)}</td>
                    <td className="px-4 py-3 text-center text-[#2D3B35]">{order.items_count ?? 0}</td>
                    <td className="px-4 py-3 text-right text-[#2D3B35]">{formatCurrency(Number(order.subtotal))}</td>
                    <td className="px-4 py-3 text-right text-[#D97B6C]">
                      {Number(order.discount) > 0 ? `-${formatCurrency(Number(order.discount))}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[#8A9A8E]">
                      {Number(order.tax) > 0 ? formatCurrency(Number(order.tax)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#2D3B35]">{formatCurrency(Number(order.total))}</td>
                    <td className="px-4 py-3 text-[#8A9A8E] capitalize">{order.payment_method || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge type="payment_status" value={order.payment_status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge type="order_status" value={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <button className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#5A8A6E] hover:bg-[#5A8A6E]/10 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteId(order.id)}
                          className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8A9A8E]">
            Are you sure you want to delete this order? This action cannot be undone.
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
