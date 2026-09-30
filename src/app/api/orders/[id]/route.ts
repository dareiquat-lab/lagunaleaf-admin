import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logActivity, actorFromSession } from "@/lib/activity";
import { resolveCustomItems } from "@/lib/orders";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  const [order] = await sql`
    SELECT o.*,
      c.first_name as client_first_name,
      c.last_name as client_last_name,
      c.email as client_email,
      c.phone as client_phone,
      c.address as client_address,
      c.city as client_city,
      c.state as client_state,
      c.zip as client_zip,
      CONCAT(c.first_name, ' ', c.last_name) as client_name
    FROM orders o
    LEFT JOIN clients c ON o.client_id = c.id
    WHERE o.id = ${parseInt(id)}
  `;

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await sql`
    SELECT * FROM order_items WHERE order_id = ${parseInt(id)} ORDER BY id ASC
  `;

  return NextResponse.json({ ...order, items });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const sql = getDb();
  const actor = actorFromSession(session);

  // Snapshot current state before making changes
  const [currentOrder] = await sql`SELECT status, order_number FROM orders WHERE id = ${parseInt(id)}`;
  if (!currentOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldItems = await sql`
    SELECT product_id, quantity FROM order_items
    WHERE order_id = ${parseInt(id)} AND product_id IS NOT NULL
  `;

  const wasCompleted = currentOrder.status === "completed";
  const willBeCompleted = body.status === "completed";

  // Restore inventory for old items if order was completed
  if (wasCompleted) {
    for (const item of oldItems) {
      await sql`UPDATE products SET stock_quantity = stock_quantity + ${item.quantity}, updated_at = NOW() WHERE id = ${item.product_id}`;
    }
  }

  const [order] = await sql`
    UPDATE orders SET
      client_id = ${body.client_id || null},
      status = ${body.status || "pending"},
      payment_method = ${body.payment_method || null},
      payment_status = ${body.payment_status || "unpaid"},
      subtotal = ${body.subtotal || 0},
      discount = ${body.discount || 0},
      tax = ${body.tax || 0},
      total = ${body.total || 0},
      notes = ${body.notes || null},
      ordered_at = ${body.ordered_at ? new Date(body.ordered_at).toISOString() : new Date().toISOString()},
      updated_at = NOW()
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve custom items and update order items
  const resolvedItems = body.items !== undefined
    ? await resolveCustomItems(body.items, actor, currentOrder.order_number)
    : null;

  if (resolvedItems !== null) {
    await sql`DELETE FROM order_items WHERE order_id = ${parseInt(id)}`;
    for (const item of resolvedItems) {
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_cost, unit_price, subtotal)
        VALUES (${parseInt(id)}, ${item.product_id || null}, ${item.product_name}, ${item.quantity}, ${item.unit_cost}, ${item.unit_price}, ${item.subtotal})
      `;
    }
  }

  // Deduct inventory for new items if order is now completed
  if (willBeCompleted && resolvedItems) {
    for (const item of resolvedItems) {
      if (item.product_id) {
        await sql`UPDATE products SET stock_quantity = stock_quantity - ${item.quantity}, updated_at = NOW() WHERE id = ${item.product_id}`;
      }
    }
  }

  const details: Record<string, unknown> = { order_number: currentOrder.order_number };
  if (wasCompleted !== willBeCompleted || currentOrder.status !== body.status) {
    details.old_status = currentOrder.status;
    details.new_status = body.status;
  }

  await logActivity({
    actor,
    action: wasCompleted !== willBeCompleted ? "order_status_changed" : "order_updated",
    entityType: "order",
    entityId: parseInt(id),
    entityLabel: currentOrder.order_number,
    details,
  });

  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const sql = getDb();
  const actor = actorFromSession(session);

  const fields: string[] = [];
  const allowed = ["status", "payment_status", "payment_method"];
  for (const key of allowed) {
    if (body[key] !== undefined) fields.push(key);
  }
  if (fields.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  // Handle inventory when status is changing
  let oldStatus: string | null = null;
  if (body.status !== undefined) {
    const [currentOrder] = await sql`SELECT status, order_number FROM orders WHERE id = ${parseInt(id)}`;
    if (currentOrder) {
      oldStatus = currentOrder.status;
      const wasCompleted = currentOrder.status === "completed";
      const willBeCompleted = body.status === "completed";

      if (wasCompleted !== willBeCompleted) {
        const items = await sql`
          SELECT product_id, quantity FROM order_items
          WHERE order_id = ${parseInt(id)} AND product_id IS NOT NULL
        `;
        if (wasCompleted) {
          for (const item of items) {
            await sql`UPDATE products SET stock_quantity = stock_quantity + ${item.quantity}, updated_at = NOW() WHERE id = ${item.product_id}`;
          }
        } else {
          for (const item of items) {
            await sql`UPDATE products SET stock_quantity = stock_quantity - ${item.quantity}, updated_at = NOW() WHERE id = ${item.product_id}`;
          }
        }
      }
    }
  }

  const [order] = await sql`
    UPDATE orders SET
      status         = COALESCE(${body.status         ?? null}, status),
      payment_status = COALESCE(${body.payment_status ?? null}, payment_status),
      payment_method = COALESCE(${body.payment_method ?? null}, payment_method),
      updated_at     = NOW()
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status !== undefined) {
    await logActivity({
      actor,
      action: "order_status_changed",
      entityType: "order",
      entityId: parseInt(id),
      entityLabel: order.order_number,
      details: { old_status: oldStatus, new_status: body.status },
    });
  }

  return NextResponse.json(order);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const actor = actorFromSession(session);

  const [orderToDelete] = await sql`SELECT status, order_number FROM orders WHERE id = ${parseInt(id)}`;

  if (orderToDelete?.status === "completed") {
    const items = await sql`
      SELECT product_id, quantity FROM order_items
      WHERE order_id = ${parseInt(id)} AND product_id IS NOT NULL
    `;
    for (const item of items) {
      await sql`UPDATE products SET stock_quantity = stock_quantity + ${item.quantity}, updated_at = NOW() WHERE id = ${item.product_id}`;
    }
  }

  await sql`DELETE FROM orders WHERE id = ${parseInt(id)}`;

  await logActivity({
    actor,
    action: "order_deleted",
    entityType: "order",
    entityId: parseInt(id),
    entityLabel: orderToDelete?.order_number ?? `#${id}`,
    details: { was_status: orderToDelete?.status ?? null },
  });

  return NextResponse.json({ success: true });
}
