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
      oi.product_id,
      oi.product_name,
      SUM(oi.subtotal) as revenue,
      SUM(oi.quantity * (oi.unit_price - oi.unit_cost)) as profit,
      CASE WHEN SUM(oi.subtotal) > 0
        THEN (SUM(oi.quantity * (oi.unit_price - oi.unit_cost)) / SUM(oi.subtotal)) * 100
        ELSE 0
      END as margin,
      SUM(oi.quantity) as quantity_sold
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.ordered_at >= ${from}::date
      AND o.ordered_at < (${to}::date + INTERVAL '1 day')
      AND o.status != 'cancelled'
    GROUP BY oi.product_id, oi.product_name
    ORDER BY revenue DESC
    LIMIT 10
  `;

  return NextResponse.json(data);
}
