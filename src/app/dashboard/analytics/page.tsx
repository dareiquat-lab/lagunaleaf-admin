"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RevenueLineChart,
  TopProductsChart,
  OrdersStatusChart,
} from "@/components/analytics-charts";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition";
import { DashboardCard } from "@/components/dashboard-card";
import { AnalyticsSummary, RevenueDataPoint, TopProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, ShoppingBag, BarChart3 } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

type DateRange = "week" | "month" | "last_month" | "custom";

function getRange(range: DateRange, customFrom: string, customTo: string) {
  const now = new Date();
  switch (range) {
    case "week":
      return { from: format(subDays(now, 7), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
    case "month":
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: format(startOfMonth(lm), "yyyy-MM-dd"), to: format(endOfMonth(lm), "yyyy-MM-dd") };
    }
    case "custom":
      return { from: customFrom, to: customTo };
  }
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { from, to } = getRange(range, customFrom, customTo);
    const qs = `from=${from}&to=${to}`;
    try {
      const [summaryRes, revenueRes, topRes] = await Promise.all([
        fetch(`/api/analytics/summary?${qs}`),
        fetch(`/api/analytics/revenue?${qs}`),
        fetch(`/api/analytics/top-products?${qs}`),
      ]);
      const [s, r, t] = await Promise.all([summaryRes.json(), revenueRes.json(), topRes.json()]);
      setSummary(s);
      setRevenueData(r);
      setTopProducts(t);
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rangeButtons: { label: string; value: DateRange }[] = [
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "Last Month", value: "last_month" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#2D3B35] tracking-tight">Analytics</h1>
        <p className="text-sm text-[#8A9A8E] mt-1">Business performance overview</p>
      </div>

      {/* Date Range */}
      <div className="flex flex-wrap items-center gap-2">
        {rangeButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={range === btn.value ? "default" : "outline"}
            size="sm"
            onClick={() => setRange(btn.value)}
          >
            {btn.label}
          </Button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-40 h-8"
            />
            <span className="text-[#8A9A8E] text-sm">to</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-40 h-8"
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <DashboardCard
            title="Total Revenue"
            value={loading ? "—" : formatCurrency(Number(summary?.total_revenue ?? 0))}
            icon={DollarSign}
            variant="success"
          />
        </StaggerItem>
        <StaggerItem>
          <DashboardCard
            title="Total Profit"
            value={loading ? "—" : formatCurrency(Number(summary?.total_profit ?? 0))}
            icon={TrendingUp}
            variant="success"
          />
        </StaggerItem>
        <StaggerItem>
          <DashboardCard
            title="Total Orders"
            value={loading ? "—" : Number(summary?.total_orders ?? 0)}
            icon={ShoppingBag}
          />
        </StaggerItem>
        <StaggerItem>
          <DashboardCard
            title="Avg Order Value"
            value={loading ? "—" : formatCurrency(Number(summary?.average_order_value ?? 0))}
            icon={BarChart3}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Revenue & Profit Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue & Profit Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : revenueData.length > 0 ? (
            <RevenueLineChart data={revenueData} />
          ) : (
            <div className="h-72 flex items-center justify-center">
              <p className="text-sm text-[#8A9A8E]">No data for the selected period.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : topProducts.length > 0 ? (
              <TopProductsChart data={topProducts} metric="revenue" />
            ) : (
              <div className="h-72 flex items-center justify-center">
                <p className="text-sm text-[#8A9A8E]">No product data available.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products by Margin */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Products by Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-72 w-full" />
            ) : topProducts.length > 0 ? (
              <TopProductsChart data={topProducts} metric="margin" />
            ) : (
              <div className="h-72 flex items-center justify-center">
                <p className="text-sm text-[#8A9A8E]">No product data available.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-60 w-full" />
            ) : summary?.orders_by_status && summary.orders_by_status.length > 0 ? (
              <OrdersStatusChart data={summary.orders_by_status} />
            ) : (
              <div className="h-60 flex items-center justify-center">
                <p className="text-sm text-[#8A9A8E]">No orders in selected period.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
