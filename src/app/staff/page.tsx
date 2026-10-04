"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Plus, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Order } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { format } from "date-fns";

export default function StaffDashboard() {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [monthCount, setMonthCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

        const [recentRes, todayRes, monthRes] = await Promise.all([
          fetch("/api/orders?limit=8"),
          fetch(`/api/orders?from=${today}`),
          fetch(`/api/orders?from=${monthStart}`),
        ]);

        const [recent, todayData, monthData] = await Promise.all([
          recentRes.json(),
          todayRes.json(),
          monthRes.json(),
        ]);

        setRecentOrders(recent);
        setTodayOrders(todayData);
        setMonthCount(monthData.length);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#8A9A8E] mt-1">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <Link href="/staff/orders/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#E8EDE9] p-5">
          <p className="text-xs text-[#8A9A8E] font-medium">Today&apos;s Orders</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-semibold text-[#2D3B35] mt-1">{todayOrders.length}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#E8EDE9] p-5">
          <p className="text-xs text-[#8A9A8E] font-medium">Today&apos;s Revenue</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <p className="text-2xl font-semibold text-[#5A8A6E] mt-1">{formatCurrency(todayRevenue)}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-[#E8EDE9] p-5 col-span-2 lg:col-span-1">
          <p className="text-xs text-[#8A9A8E] font-medium">Orders This Month</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-semibold text-[#2D3B35] mt-1">{monthCount ?? 0}</p>
          )}
        </div>
      </div>

      {/* Today's orders */}
      {!loading && todayOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#5A8A6E]" />
                Today&apos;s Orders
              </CardTitle>
              <Link href="/staff/orders" className="text-sm text-[#5A8A6E] hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[#E8EDE9] bg-[#FAFAF8]">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[#8A9A8E]">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Time</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EDE9]">
                  {todayOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-[#2D3B35]">{order.client_name || "Walk-in"}</p>
                        <p className="text-xs text-[#8A9A8E]">{order.order_number}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#8A9A8E] whitespace-nowrap">
                        {formatDateTime(order.ordered_at)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#2D3B35]">
                        {formatCurrency(Number(order.total))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge type="order_status" value={order.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/staff/orders/${order.id}`}>
                          <button className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#5A8A6E] hover:bg-[#5A8A6E]/10 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[#8A9A8E]" />
              Recent Orders
            </CardTitle>
            <Link href="/staff/orders" className="text-sm text-[#5A8A6E] hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="h-8 w-8 text-[#E8EDE9] mx-auto mb-3" />
              <p className="text-sm text-[#8A9A8E]">No orders yet.</p>
              <Link href="/staff/orders/new" className="text-sm text-[#5A8A6E] hover:underline mt-1 inline-block">
                Create the first one →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[#E8EDE9] bg-[#FAFAF8]">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[#8A9A8E]">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Date & Time</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EDE9]">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-[#2D3B35]">{order.client_name || "Walk-in"}</p>
                        <p className="text-xs text-[#8A9A8E]">{order.order_number}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#8A9A8E] whitespace-nowrap">
                        {formatDateTime(order.ordered_at)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#2D3B35]">
                        {formatCurrency(Number(order.total))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge type="order_status" value={order.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/staff/orders/${order.id}`}>
                          <button className="p-1.5 rounded-md text-[#8A9A8E] hover:text-[#5A8A6E] hover:bg-[#5A8A6E]/10 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
