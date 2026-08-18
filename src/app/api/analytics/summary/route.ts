import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(new Date().setDate(1)).toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date().toISOString().split("T")[0];

  const sql = getDb();

  const [summary] = await sql`
    SELECT
      COALESCE(SUM(o.total), 0) as total_revenue,
      COALESCE(SUM(
        o.total - COALESCE((
          SELECT SUM(oi.quantity * oi.unit_cost)
          FROM order_items oi WHERE oi.order_id = o.id
        ), 0)
      ), 0) as total_profit,
      COUNT(o.id) as total_orders,
      CASE WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total), 0) / COUNT(o.id) ELSE 0 END as average_order_value
    FROM orders o
    WHERE o.ordered_at >= ${from}::date
      AND o.ordered_at < (${to}::date + INTERVAL '1 day')
      AND o.status != 'cancelled'
  `;

  const [laborRow] = await sql`
    SELECT COALESCE(SUM(amount), 0) as total_labor_costs
    FROM employee_costs
    WHERE paid_on >= ${from}::date
      AND paid_on <= ${to}::date
  `;

  const ordersByStatus = await sql`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE ordered_at >= ${from}::date
      AND ordered_at < (${to}::date + INTERVAL '1 day')
    GROUP BY status
  `;

  const totalLabor = Number(laborRow.total_labor_costs);
  const grossProfit = Number(summary.total_profit);

  return NextResponse.json({
    ...summary,
    total_labor_costs: totalLabor,
    net_profit: grossProfit - totalLabor,
    orders_by_status: ordersByStatus,
  });
}
