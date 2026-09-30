import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/utils";
import { logActivity, actorFromSession } from "@/lib/activity";
import { resolveCustomItems } from "@/lib/orders";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("payment_status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam) : null;

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
    ORDER BY COALESCE(c.first_name, 'zzz') ASC, COALESCE(c.last_name, '') ASC, o.ordered_at DESC
    ${limit !== null ? sql`LIMIT ${limit}` : sql``}
  `;

  return NextResponse.json(orders);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status");
  const paymentFilter = searchParams.get("payment_status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const body = await req.json();
  const sql = getDb();

  // Handle inventory for bulk status changes
  if (body.status !== undefined) {
    const filterClause = sql`
      WHERE (
        ${search
          ? sql`(order_number ILIKE ${"%" + search + "%"} OR EXISTS (
              SELECT 1 FROM clients c
              WHERE c.id = client_id
              AND CONCAT(c.first_name, ' ', c.last_name) ILIKE ${"%" + search + "%"}
            ))`
          : sql`TRUE`}
      )
      AND (${statusFilter  ? sql`status         = ${statusFilter}`  : sql`TRUE`})
      AND (${paymentFilter ? sql`payment_status = ${paymentFilter}` : sql`TRUE`})
      AND (${from ? sql`ordered_at >= ${from}::timestamp` : sql`TRUE`})
      AND (${to   ? sql`ordered_at <= ${to}::timestamp`   : sql`TRUE`})
    `;

    if (body.status === "completed") {
      const toComplete = await sql`SELECT id FROM orders ${filterClause} AND status != 'completed'`;
      for (const ord of toComplete) {
        const items = await sql`SELECT product_id, quantity FROM order_items WHERE order_id = ${ord.id} AND product_id IS NOT NULL`;
        for (const item of items) {
          await sql`UPDATE products SET stock_quantity = stock_quantity - ${item.quantity}, updated_at = NOW() WHERE id = ${item.product_id}`;
        }
      }
    } else {
      const toUnComplete = await sql`SELECT id FROM orders ${filterClause} AND status = 'completed'`;
      for (const ord of toUnComplete) {
        const items = await sql`SELECT product_id, quantity FROM order_items WHERE order_id = ${ord.id} AND product_id IS NOT NULL`;
        for (const item of items) {
          await sql`UPDATE products SET stock_quantity = stock_quantity + ${item.quantity}, updated_at = NOW() WHERE id = ${item.product_id}`;
        }
      }
    }
  }

  const updated = await sql`
    UPDATE orders SET
      status         = COALESCE(${body.status         ?? null}, status),
      payment_status = COALESCE(${body.payment_status ?? null}, payment_status),
      updated_at     = NOW()
    WHERE (
      ${search
        ? sql`(order_number ILIKE ${"%" + search + "%"} OR EXISTS (
            SELECT 1 FROM clients c
            WHERE c.id = client_id
            AND CONCAT(c.first_name, ' ', c.last_name) ILIKE ${"%" + search + "%"}
          ))`
        : sql`TRUE`}
    )
    AND (${statusFilter  ? sql`status         = ${statusFilter}`  : sql`TRUE`})
    AND (${paymentFilter ? sql`payment_status = ${paymentFilter}` : sql`TRUE`})
    AND (${from ? sql`ordered_at >= ${from}::timestamp` : sql`TRUE`})
    AND (${to   ? sql`ordered_at <= ${to}::timestamp`   : sql`TRUE`})
    RETURNING id
  `;

  return NextResponse.json({ updated: updated.length });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sql = getDb();
  const actor = actorFromSession(session);
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

  // Resolve custom items (auto-create products for any item without a product_id)
  const resolvedItems = body.items?.length > 0
    ? await resolveCustomItems(body.items, actor, orderNumber)
    : [];

  for (const item of resolvedItems) {
    await sql`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_cost, unit_price, subtotal)
      VALUES (${order.id}, ${item.product_id || null}, ${item.product_name}, ${item.quantity}, ${item.unit_cost}, ${item.unit_price}, ${item.subtotal})
    `;
  }

  // Deduct inventory when order is created as completed
  if (body.status === "completed") {
    for (const item of resolvedItems) {
      if (item.product_id) {
        await sql`UPDATE products SET stock_quantity = stock_quantity - ${item.quantity}, updated_at = NOW() WHERE id = ${item.product_id}`;
      }
    }
  }

  await logActivity({
    actor,
    action: "order_created",
    entityType: "order",
    entityId: order.id,
    entityLabel: orderNumber,
    details: {
      total: order.total,
      status: order.status,
      items_count: resolvedItems.length,
    },
  });

  return NextResponse.json(order, { status: 201 });
}
