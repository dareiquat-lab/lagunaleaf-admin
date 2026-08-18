import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateSKU } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("category_id");
  const stockStatus = searchParams.get("stock_status");

  const sql = getDb();

  let products;
  if (search || categoryId || stockStatus) {
    products = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (
        ${search ? sql`(p.name ILIKE ${"%" + search + "%"} OR p.sku ILIKE ${"%" + search + "%"})` : sql`TRUE`}
      )
      AND (${categoryId ? sql`p.category_id = ${parseInt(categoryId)}` : sql`TRUE`})
      AND (${stockStatus === "low" || stockStatus === "out" ? sql`p.stock_quantity = 0` : sql`TRUE`})
      ORDER BY p.created_at DESC
    `;
  } else {
    products = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `;
  }

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sql = getDb();

  const sku = body.sku || generateSKU();

  const [product] = await sql`
    INSERT INTO products (
      name, sku, category_id, description, image_url,
      cost_price, sale_price, stock_quantity, low_stock_threshold,
      unit, is_active
    ) VALUES (
      ${body.name}, ${sku}, ${body.category_id || null}, ${body.description || null},
      ${body.image_url || null}, ${body.cost_price}, ${body.sale_price},
      ${body.stock_quantity}, ${body.low_stock_threshold || 10},
      ${body.unit || null}, ${body.is_active ?? true}
    )
    RETURNING *
  `;

  return NextResponse.json(product, { status: 201 });
}
