import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();

  const rows = await sql`
    WITH normalized AS (
      SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.created_at,
        REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g') AS phone_norm
      FROM clients c
      WHERE c.phone IS NOT NULL AND TRIM(c.phone) != ''
    ),
    dup_norms AS (
      SELECT phone_norm FROM normalized
      WHERE phone_norm != ''
      GROUP BY phone_norm
      HAVING COUNT(*) > 1
    )
    SELECT
      n.id, n.first_name, n.last_name, n.email, n.phone, n.phone_norm, n.created_at,
      COUNT(o.id) AS total_orders,
      COALESCE(SUM(o.total), 0) AS total_spent,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id',           o.id,
            'order_number', o.order_number,
            'total',        o.total,
            'ordered_at',   o.ordered_at,
            'status',       o.status
          ) ORDER BY o.ordered_at DESC
        ) FILTER (WHERE o.id IS NOT NULL),
        '[]'::json
      ) AS orders
    FROM normalized n
    JOIN dup_norms d ON d.phone_norm = n.phone_norm
    LEFT JOIN orders o ON o.client_id = n.id
    GROUP BY n.id, n.first_name, n.last_name, n.email, n.phone, n.phone_norm, n.created_at
    ORDER BY n.phone_norm, n.created_at ASC
  `;

  const groups: Record<string, typeof rows> = {};
  for (const row of rows) {
    const key = row.phone_norm as string;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  return NextResponse.json(Object.values(groups));
}
