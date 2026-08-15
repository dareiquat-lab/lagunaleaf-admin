import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

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

  if (body.items !== undefined) {
    await sql`DELETE FROM order_items WHERE order_id = ${parseInt(id)}`;
    for (const item of body.items) {
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_cost, unit_price, subtotal)
        VALUES (${parseInt(id)}, ${item.product_id || null}, ${item.product_name}, ${item.quantity}, ${item.unit_cost}, ${item.unit_price}, ${item.subtotal})
      `;
    }
  }

  return NextResponse.json(order);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  await sql`DELETE FROM orders WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ success: true });
}
