"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, ShoppingBag, ChevronDown, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Order } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_PILLS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:   "bg-[#D4A853]/15 text-[#D4A853]",
  completed: "bg-[#5A8A6E]/15 text-[#5A8A6E]",
  cancelled: "bg-[#D97B6C]/15 text-[#D97B6C]",
};

function InlineStatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => { e.stopPropagation(); onChange(e.target.value); }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "appearance-none pl-2 pr-5 py-0.5 rounded-full text-xs font-medium cursor-pointer border-0 outline-none",
          ORDER_STATUS_COLORS[value] ?? "bg-gray-100 text-gray-600"
        )}
        style={{ WebkitAppearance: "none" }}
      >
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 pointer-events-none opacity-60" />
    </div>
  );
}

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/orders?${params}`);
    setOrders(await res.json());
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function patchStatus(id: number, status: string) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: status as Order["status"] } : o)));
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      fetchOrders();
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/orders/${id}`, { method: "DELETE" });
    toast.success("Order deleted");
    setDeleteId(null);
    fetchOrders();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#2D3B35] tracking-tight">Orders</h1>
          {!loading && (
            <p className="text-sm text-[#8A9A8E] mt-0.5">{orders.length} {orders.length === 1 ? "order" : "orders"}</p>
          )}
        </div>
        <Link href="/staff/orders/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Search + Status filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A9A8E]" />
          <Input
            className="pl-9 bg-white"
            placeholder="Search by client name or order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {STATUS_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                statusFilter === pill.value
                  ? "bg-[#5A8A6E] text-white"
                  : "bg-white text-[#8A9A8E] hover:text-[#2D3B35] border border-[#E8EDE9]"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div className="bg-white rounded-xl border border-[#E8EDE9] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#E8EDE9]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24 ml-auto" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="h-10 w-10 text-[#E8EDE9] mx-auto mb-3" />
            <p className="text-sm text-[#8A9A8E]">No orders found.</p>
            <Link href="/staff/orders/new" className="text-sm text-[#5A8A6E] hover:underline mt-1 inline-block">
              Create an order →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF8] border-b border-[#E8EDE9]">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#8A9A8E]">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Date & Time</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EDE9]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/staff/orders/${order.id}`} className="group">
                        <p className="font-medium text-[#2D3B35] group-hover:text-[#5A8A6E] transition-colors flex items-center gap-1">
                          {order.client_name || "Walk-in"}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <p className="text-xs text-[#8A9A8E]">{order.order_number}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#8A9A8E] text-xs whitespace-nowrap">
                      {formatDateTime(order.ordered_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#2D3B35]">
                      {formatCurrency(Number(order.total))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <InlineStatusSelect
                        value={order.status}
                        onChange={(v) => patchStatus(order.id, v)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/staff/orders/${order.id}`}>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8A9A8E]">
            Are you sure you want to delete this order? This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
