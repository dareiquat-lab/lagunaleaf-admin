import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const sql = getDb();

  const [category] = await sql`
    UPDATE categories SET name = ${body.name}, icon = ${body.icon || null}, description = ${body.description || null}
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;

  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  await sql`DELETE FROM categories WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ success: true });
}
