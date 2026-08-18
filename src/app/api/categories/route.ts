import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const categories = await sql`
    SELECT c.*, COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
    GROUP BY c.id
    ORDER BY c.name ASC
  `;
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sql = getDb();

  const [category] = await sql`
    INSERT INTO categories (name, icon, description)
    VALUES (${body.name}, ${body.icon || null}, ${body.description || null})
    RETURNING *
  `;

  return NextResponse.json(category, { status: 201 });
}
