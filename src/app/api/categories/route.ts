import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const categories = await sql`SELECT * FROM categories ORDER BY name ASC`;
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
