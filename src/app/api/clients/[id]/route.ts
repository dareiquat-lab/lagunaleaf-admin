import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  const [client] = await sql`
    SELECT c.*,
      COUNT(o.id) as total_orders,
      COALESCE(SUM(o.total), 0) as total_spent
    FROM clients c
    LEFT JOIN orders o ON o.client_id = c.id
    WHERE c.id = ${parseInt(id)}
    GROUP BY c.id
  `;

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orders = await sql`
    SELECT o.*, COUNT(oi.id) as items_count
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.client_id = ${parseInt(id)}
    GROUP BY o.id
    ORDER BY o.ordered_at DESC
  `;

  return NextResponse.json({ ...client, orders });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const sql = getDb();

  const [client] = await sql`
    UPDATE clients SET
      first_name = ${body.first_name},
      last_name = ${body.last_name},
      email = ${body.email || null},
      phone = ${body.phone || null},
      address = ${body.address || null},
      city = ${body.city || null},
      state = ${body.state || null},
      zip = ${body.zip || null},
      notes = ${body.notes || null},
      updated_at = NOW()
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  await sql`DELETE FROM clients WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ success: true });
}
