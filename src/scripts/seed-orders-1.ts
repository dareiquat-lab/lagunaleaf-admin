import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

function orderNumber() {
  return "ORD-" + Date.now().toString(36).toUpperCase();
}

async function upsertClient(firstName: string, lastName: string, phone: string | null) {
  // Check by phone first, then by name
  if (phone) {
    const existing = await sql`SELECT id FROM clients WHERE phone = ${phone} LIMIT 1`;
    if (existing.length > 0) { console.log(`  → client exists (id ${existing[0].id})`); return existing[0].id; }
  }
  if (firstName) {
    const existing = await sql`SELECT id FROM clients WHERE first_name = ${firstName} AND last_name = ${lastName} LIMIT 1`;
    if (existing.length > 0) { console.log(`  → client exists (id ${existing[0].id})`); return existing[0].id; }
  }
  const [c] = await sql`
    INSERT INTO clients (first_name, last_name, phone)
    VALUES (${firstName || "Unknown"}, ${lastName || "—"}, ${phone})
    RETURNING id
  `;
  console.log(`  ✓ created client id ${c.id}`);
  return c.id;
}

async function findProduct(name: string): Promise<{ id: number; cost_price: number } | null> {
  const rows = await sql`SELECT id, cost_price FROM products WHERE name ILIKE ${"%" + name + "%"} LIMIT 1`;
  return rows.length > 0 ? rows[0] as { id: number; cost_price: number } : null;
}

async function createOrder(
  clientId: number,
  items: { name: string; qty: number; unit_price: number }[],
  total: number,
  notes: string | null,
  orderedAt: string
) {
  const on = orderNumber();
  let subtotal = 0;
  const itemRows = [];

  for (const item of items) {
    const product = await findProduct(item.name);
    const unitCost = product ? Number(product.cost_price) : 0;
    const itemSubtotal = item.qty * item.unit_price;
    subtotal += itemSubtotal;
    itemRows.push({
      product_id: product?.id || null,
      product_name: item.name,
      quantity: item.qty,
      unit_cost: unitCost,
      unit_price: item.unit_price,
      subtotal: itemSubtotal,
    });
  }

  const [order] = await sql`
    INSERT INTO orders (order_number, client_id, status, payment_status, subtotal, discount, tax, total, notes, ordered_at)
    VALUES (${on}, ${clientId}, 'completed', 'paid', ${subtotal}, 0, 0, ${total}, ${notes}, ${orderedAt})
    RETURNING id, order_number
  `;

  for (const item of itemRows) {
    await sql`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_cost, unit_price, subtotal)
      VALUES (${order.id}, ${item.product_id}, ${item.product_name}, ${item.quantity}, ${item.unit_cost}, ${item.unit_price}, ${item.subtotal})
    `;
  }

  console.log(`  ✓ created order ${order.order_number} (id ${order.id}) — total $${total}`);
  return order;
}

async function run() {
  // ── ORDER 1 ─────────────────────────────────────────────────────────────
  // No client name in message body — just phone 949-698-3192
  // Item: Aloha Live Rosin 2g Indica - Guava Kush, $85
  // Notes: Store pickup
  console.log("\nOrder 1 — unknown name, phone 949-698-3192");
  const client1 = await upsertClient("", "", "949-698-3192");
  await createOrder(
    client1,
    [{ name: "Aloha 2G THC Live Rosin Pen - Guava Kush", qty: 1, unit_price: 85 }],
    85,
    "Store pickup",
    new Date().toISOString()
  );

  // ── ORDER 2 ─────────────────────────────────────────────────────────────
  // Client: Jirasak Soukchareon, 714-609-9807
  // Items: CBX Super Mango Haze Sativa 3.5g $85, OG Kush Indica 1g $27, Diesel Cake Hybrid 1g $20
  // Total: $132
  console.log("\nOrder 2 — Jirasak Soukchareon, 714-609-9807");
  const client2 = await upsertClient("Jirasak", "Soukchareon", "714-609-9807");
  await createOrder(
    client2,
    [
      { name: "CBX Super Mango Haze Sativa 3.5g", qty: 1, unit_price: 85 },
      { name: "OG Kush Indica 1g",                qty: 1, unit_price: 27 },
      { name: "Diesel Cake Hybrid 1g",             qty: 1, unit_price: 20 },
    ],
    132,
    null,
    new Date().toISOString()
  );

  console.log("\nDone.");
}

run().catch((e) => { console.error(e); process.exit(1); });
