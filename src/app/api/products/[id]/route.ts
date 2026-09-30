import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logActivity, actorFromSession } from "@/lib/activity";

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
  const actor = actorFromSession(session);

  const [before] = await sql`SELECT name, stock_quantity FROM products WHERE id = ${parseInt(id)}`;

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

  const details: Record<string, unknown> = {};
  if (before?.stock_quantity !== product.stock_quantity) {
    details.stock_before = before?.stock_quantity;
    details.stock_after = product.stock_quantity;
  }

  await logActivity({
    actor,
    action: "product_updated",
    entityType: "product",
    entityId: product.id,
    entityLabel: product.name,
    details: Object.keys(details).length ? details : null,
  });

  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  const actor = actorFromSession(session);

  const [product] = await sql`SELECT name FROM products WHERE id = ${parseInt(id)}`;
  await sql`DELETE FROM products WHERE id = ${parseInt(id)}`;

  await logActivity({
    actor,
    action: "product_deleted",
    entityType: "product",
    entityId: parseInt(id),
    entityLabel: product?.name ?? `Product #${id}`,
    details: null,
  });

  return NextResponse.json({ success: true });
}
