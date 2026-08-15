"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, ShoppingBag, ExternalLink, CalendarIcon, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/page-transition";
import { Order } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Inline status select that looks like a badge
function InlineSelect({
  value,
  options,
  colorMap,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  colorMap: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none pl-2 pr-5 py-0.5 rounded-full text-xs font-medium cursor-pointer border-0 outline-none",
          colorMap[value] ?? "bg-gray-100 text-gray-600"
        )}
        style={{ WebkitAppearance: "none" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 pointer-events-none opacity-60" />
    </div>
  );
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:   "bg-[#D4A853]/15 text-[#D4A853]",
  completed: "bg-[#5A8A6E]/15 text-[#5A8A6E]",
  cancelled: "bg-[#D97B6C]/15 text-[#D97B6C]",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid:  "bg-[#D97B6C]/15 text-[#D97B6C]",
  partial: "bg-[#D4A853]/15 text-[#D4A853]",
  paid:    "bg-[#5A8A6E]/15 text-[#5A8A6E]",
};

const ORDER_STATUS_OPTIONS = [
  { value: "pending",   label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid",  label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid",    label: "Paid" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (paymentFilter !== "all") params.set("payment_status", paymentFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo + "T23:59:59");
    const res = await fetch(`/api/orders?${params}`);
    setOrders(await res.json());
    setLoading(false);
  }, [search, statusFilter, paymentFilter, dateFrom, dateTo]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const hasFilters = search || statusFilter !== "all" || paymentFilter !== "all" || dateFrom || dateTo;

  async function patchOrder(id: number, patch: Record<string, string>) {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      fetchOrders(); // revert
    }
  }

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
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9A8E]" />
            <Input
              className="pl-9"
              placeholder="Search by client name or order #..."
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

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-[#8A9A8E]" />
            <span className="text-sm text-[#8A9A8E]">From</span>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 h-9 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8A9A8E]">To</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 h-9 text-sm" />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-[#8A9A8E] hover:text-[#D97B6C] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8EDE9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8] border-b border-[#E8EDE9]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#8A9A8E]">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Date & Time</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Items</th>
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
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
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
                      <Link href={`/dashboard/orders/${order.id}`} className="group flex flex-col gap-0.5">
                        <span className="font-medium text-[#2D3B35] group-hover:text-[#5A8A6E] transition-colors flex items-center gap-1">
                          {order.client_name || "Walk-in"}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <span className="text-xs text-[#8A9A8E]">{order.order_number}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#8A9A8E] whitespace-nowrap">{formatDateTime(order.ordered_at)}</td>
                    <td className="px-4 py-3 text-center text-[#2D3B35]">{order.items_count ?? 0}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#2D3B35]">{formatCurrency(Number(order.total))}</td>
                    <td className="px-4 py-3 text-[#8A9A8E] capitalize">{order.payment_method || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <InlineSelect
                        value={order.payment_status}
                        options={PAYMENT_STATUS_OPTIONS}
                        colorMap={PAYMENT_STATUS_COLORS}
                        onChange={(v) => patchOrder(order.id, { payment_status: v })}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <InlineSelect
                        value={order.status}
                        options={ORDER_STATUS_OPTIONS}
                        colorMap={ORDER_STATUS_COLORS}
                        onChange={(v) => patchOrder(order.id, { status: v })}
                      />
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
