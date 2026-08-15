import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("payment_status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") || "100");

  const sql = getDb();

  const orders = await sql`
    SELECT o.*,
      c.first_name as client_first_name,
      c.last_name as client_last_name,
      CONCAT(c.first_name, ' ', c.last_name) as client_name,
      COUNT(oi.id) as items_count
    FROM orders o
    LEFT JOIN clients c ON o.client_id = c.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE (
      ${search ? sql`(o.order_number ILIKE ${"%" + search + "%"} OR CONCAT(c.first_name, ' ', c.last_name) ILIKE ${"%" + search + "%"})` : sql`TRUE`}
    )
    AND (${status ? sql`o.status = ${status}` : sql`TRUE`})
    AND (${paymentStatus ? sql`o.payment_status = ${paymentStatus}` : sql`TRUE`})
    AND (${from ? sql`o.ordered_at >= ${from}::timestamp` : sql`TRUE`})
    AND (${to ? sql`o.ordered_at <= ${to}::timestamp` : sql`TRUE`})
    GROUP BY o.id, c.first_name, c.last_name
    ORDER BY o.ordered_at DESC
    LIMIT ${limit}
  `;

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sql = getDb();

  const orderNumber = generateOrderNumber();

  const [order] = await sql`
    INSERT INTO orders (
      order_number, client_id, status, payment_method, payment_status,
      subtotal, discount, tax, total, notes, ordered_at
    ) VALUES (
      ${orderNumber}, ${body.client_id || null}, ${body.status || "pending"},
      ${body.payment_method || null}, ${body.payment_status || "unpaid"},
      ${body.subtotal || 0}, ${body.discount || 0}, ${body.tax || 0},
      ${body.total || 0}, ${body.notes || null},
      ${body.ordered_at ? new Date(body.ordered_at).toISOString() : new Date().toISOString()}
    )
    RETURNING *
  `;

  if (body.items && body.items.length > 0) {
    for (const item of body.items) {
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_cost, unit_price, subtotal)
        VALUES (${order.id}, ${item.product_id || null}, ${item.product_name}, ${item.quantity}, ${item.unit_cost}, ${item.unit_price}, ${item.subtotal})
      `;
    }
  }

  return NextResponse.json(order, { status: 201 });
}
