"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingBag,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { DashboardCard } from "@/components/dashboard-card";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueBarChart } from "@/components/analytics-charts";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DashboardStats, Order, Product, RevenueDataPoint } from "@/lib/types";

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [chartData, setChartData] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const today = now.toISOString().split("T")[0];

        const [summaryRes, ordersRes, productsRes, revenueRes] = await Promise.all([
          fetch(`/api/analytics/summary?from=${monthStart}&to=${today}`),
          fetch("/api/orders?limit=10"),
          fetch("/api/products?stock_status=low"),
          fetch(`/api/analytics/revenue?from=${monthStart}&to=${today}`),
        ]);

        const [summary, orders, products, revenue] = await Promise.all([
          summaryRes.json(),
          ordersRes.json(),
          productsRes.json(),
          revenueRes.json(),
        ]);

        const allProducts = await fetch("/api/products").then((r) => r.json());
        const allClients = await fetch("/api/clients").then((r) => r.json());

        setStats({
          total_products: allProducts.length,
          low_stock_items: products.length,
          monthly_orders: Number(summary.total_orders),
          monthly_revenue: Number(summary.total_revenue),
          monthly_profit: Number(summary.total_profit),
          total_clients: allClients.length,
        });
        setRecentOrders(orders);
        setLowStockProducts(products.slice(0, 5));
        setChartData(revenue);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <PageTransition className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Dashboard</h1>
        <p className="text-sm text-[#8A9A8E] mt-1">Welcome back — here&apos;s what&apos;s happening this month.</p>
      </div>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StaggerItem>
          <Link href="/dashboard/inventory" className="block">
            <DashboardCard
              title="Total Products"
              value={loading ? "—" : stats?.total_products ?? 0}
              icon={Package}
              subtitle="Active inventory items"
            />
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link href="/dashboard/inventory?stock_status=low" className="block">
            <DashboardCard
              title="Out of Stock"
              value={loading ? "—" : stats?.low_stock_items ?? 0}
              icon={AlertTriangle}
              variant={stats?.low_stock_items ? "warning" : "default"}
              subtitle={stats?.low_stock_items ? "Needs restocking" : "All items in stock"}
            />
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link href="/dashboard/orders" className="block">
            <DashboardCard
              title="Orders This Month"
              value={loading ? "—" : stats?.monthly_orders ?? 0}
              icon={ShoppingBag}
              subtitle="Total orders placed"
            />
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link href="/dashboard/analytics" className="block">
            <DashboardCard
              title="Revenue This Month"
              value={loading ? "—" : formatCurrency(stats?.monthly_revenue ?? 0)}
              icon={DollarSign}
              variant="success"
              subtitle="Total sales revenue"
            />
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link href="/dashboard/analytics" className="block">
            <DashboardCard
              title="Profit This Month"
              value={loading ? "—" : formatCurrency(stats?.monthly_profit ?? 0)}
              icon={TrendingUp}
              variant="success"
              subtitle="After cost of goods"
            />
          </Link>
        </StaggerItem>
        <StaggerItem>
          <Link href="/dashboard/clients" className="block">
            <DashboardCard
              title="Total Clients"
              value={loading ? "—" : stats?.total_clients ?? 0}
              icon={Users}
              subtitle="Registered clients"
            />
          </Link>
        </StaggerItem>
      </StaggerContainer>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Revenue vs. Profit</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : chartData.length > 0 ? (
            <RevenueBarChart data={chartData} />
          ) : (
            <div className="h-72 flex items-center justify-center">
              <p className="text-[#8A9A8E] text-sm">No revenue data for this month yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <Link href="/dashboard/orders" className="text-sm text-[#5A8A6E] hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : recentOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <ShoppingBag className="h-8 w-8 text-[#E8EDE9] mx-auto mb-3" />
                  <p className="text-sm text-[#8A9A8E]">No orders yet. Create your first order.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#E8EDE9]">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-[#8A9A8E]">Order</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Client</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#8A9A8E]">Date</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-[#8A9A8E]">Total</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-[#8A9A8E]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EDE9]">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-[#FAFAF8] transition-colors">
                          <td className="px-6 py-3">
                            <Link
                              href={`/dashboard/orders/${order.id}`}
                              className="font-medium text-[#5A8A6E] hover:underline"
                            >
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[#2D3B35]">
                            {order.client_name || "—"}
                          </td>
                          <td className="px-4 py-3 text-[#8A9A8E] whitespace-nowrap">
                            {formatDateTime(order.ordered_at)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-[#2D3B35]">
                            {formatCurrency(Number(order.total))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge type="order_status" value={order.status} />
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

        {/* Low Stock Alerts */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Low Stock Alerts</CardTitle>
                <Link href="/dashboard/inventory?stock_status=low" className="text-sm text-[#5A8A6E] hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><TableSkeleton rows={3} /></div>
              ) : lowStockProducts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#5A8A6E]/10 flex items-center justify-center mx-auto mb-3">
                    <Package className="h-5 w-5 text-[#5A8A6E]" />
                  </div>
                  <p className="text-sm text-[#8A9A8E]">All products are well-stocked!</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8EDE9]">
                  {lowStockProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#2D3B35] truncate">{p.name}</p>
                        <p className="text-xs text-[#8A9A8E]">{p.sku}</p>
                      </div>
                      <div className="ml-3 text-right">
                        <span className="text-sm font-semibold text-[#D4A853]">{p.stock_quantity}</span>
                        <p className="text-xs text-[#8A9A8E]">in stock</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
