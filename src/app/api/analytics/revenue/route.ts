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

  const data = await sql`
    SELECT
      DATE(o.ordered_at) as date,
      COALESCE(SUM(o.total), 0) as revenue,
      COALESCE(SUM(o.total - COALESCE((
        SELECT SUM(oi.quantity * oi.unit_cost)
        FROM order_items oi WHERE oi.order_id = o.id
      ), 0)), 0) as profit
    FROM orders o
    WHERE o.ordered_at >= ${from}::date
      AND o.ordered_at < (${to}::date + INTERVAL '1 day')
      AND o.status != 'cancelled'
    GROUP BY DATE(o.ordered_at)
    ORDER BY date ASC
  `;

  return NextResponse.json(data);
}
