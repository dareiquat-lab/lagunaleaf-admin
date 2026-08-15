import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  const [product] = await sql`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ${parseInt(id)}
  `;

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const sql = getDb();

  const [product] = await sql`
    UPDATE products SET
      name = ${body.name},
      sku = ${body.sku || null},
      category_id = ${body.category_id || null},
      description = ${body.description || null},
      image_url = ${body.image_url || null},
      cost_price = ${body.cost_price},
      sale_price = ${body.sale_price},
      stock_quantity = ${body.stock_quantity},
      low_stock_threshold = ${body.low_stock_threshold || 10},
      unit = ${body.unit || null},
      is_active = ${body.is_active ?? true},
      updated_at = NOW()
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  await sql`DELETE FROM products WHERE id = ${parseInt(id)}`;

  return NextResponse.json({ success: true });
}
