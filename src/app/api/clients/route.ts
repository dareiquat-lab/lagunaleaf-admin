import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const sql = getDb();

  let clients;
  if (search) {
    clients = await sql`
      SELECT c.*,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_spent
      FROM clients c
      LEFT JOIN orders o ON o.client_id = c.id
      WHERE c.first_name ILIKE ${"%" + search + "%"}
        OR c.last_name ILIKE ${"%" + search + "%"}
        OR c.email ILIKE ${"%" + search + "%"}
        OR c.phone ILIKE ${"%" + search + "%"}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
  } else {
    clients = await sql`
      SELECT c.*,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_spent
      FROM clients c
      LEFT JOIN orders o ON o.client_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;
  }

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sql = getDb();

  const [client] = await sql`
    INSERT INTO clients (first_name, last_name, email, phone, address, city, state, zip, notes)
    VALUES (
      ${body.first_name}, ${body.last_name}, ${body.email || null},
      ${body.phone || null}, ${body.address || null}, ${body.city || null},
      ${body.state || null}, ${body.zip || null}, ${body.notes || null}
    )
    RETURNING *
  `;

  return NextResponse.json(client, { status: 201 });
}
