"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { RevenueDataPoint, TopProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

const COLORS = ["#5A8A6E", "#A8C5B2", "#D4A853", "#D97B6C", "#8A9A8E", "#6B9E87"];

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8EDE9] rounded-xl p-3 shadow-md">
      <p className="text-xs font-medium text-[#8A9A8E] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function RevenueBarChart({ data }: { data: RevenueDataPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    date: format(new Date(d.date), "MMM d"),
    revenue: Number(d.revenue),
    profit: Number(d.profit),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE9" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8A9A8E" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#8A9A8E" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "#8A9A8E" }}
          formatter={(v) => <span className="text-[#8A9A8E] capitalize">{v}</span>}
        />
        <Bar dataKey="revenue" name="Revenue" fill="#5A8A6E" radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" name="Profit" fill="#A8C5B2" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueLineChart({ data }: { data: RevenueDataPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    date: format(new Date(d.date), "MMM d"),
    revenue: Number(d.revenue),
    profit: Number(d.profit),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE9" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8A9A8E" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#8A9A8E" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#5A8A6E"
          strokeWidth={2}
          dot={{ fill: "#5A8A6E", r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="profit"
          name="Profit"
          stroke="#A8C5B2"
          strokeWidth={2}
          dot={{ fill: "#A8C5B2", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TopProductsChart({ data, metric }: { data: TopProduct[]; metric: "revenue" | "margin" }) {
  const chartData = [...data]
    .sort((a, b) => Number(b[metric]) - Number(a[metric]))
    .slice(0, 10)
    .map((d) => ({
      name: d.product_name.length > 20 ? d.product_name.slice(0, 20) + "…" : d.product_name,
      value: Number(d[metric]),
    }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#8A9A8E" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => metric === "revenue" ? `$${v.toFixed(0)}` : `${v.toFixed(0)}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#2D3B35" }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip
          formatter={(value) =>
            metric === "revenue" ? formatCurrency(Number(value)) : `${Number(value).toFixed(1)}%`
          }
          contentStyle={{
            background: "white",
            border: "1px solid #E8EDE9",
            borderRadius: "12px",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="value" fill="#5A8A6E" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrdersStatusChart({ data }: { data: { status: string; count: number }[] }) {
  const formatted = data.map((d) => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: Number(d.count),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {formatted.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [`${value} orders`, ""]}
          contentStyle={{
            background: "white",
            border: "1px solid #E8EDE9",
            borderRadius: "12px",
            fontSize: "12px",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px" }}
          formatter={(v) => <span className="text-[#8A9A8E]">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
