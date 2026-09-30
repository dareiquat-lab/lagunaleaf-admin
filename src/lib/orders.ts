import { getDb } from "./db";
import { logActivity, ActivityActor } from "./activity";

interface RawItem {
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  subtotal: number;
}

/**
 * For each item without a product_id, look up or auto-create a matching product.
 * Returns a new array with product_ids filled in.
 */
export async function resolveCustomItems(
  items: RawItem[],
  actor: ActivityActor,
  orderNumber?: string
): Promise<RawItem[]> {
  const sql = getDb();
  const resolved = [...items];

  for (let i = 0; i < resolved.length; i++) {
    const item = resolved[i];
    if (item.product_id != null || !item.product_name?.trim()) continue;

    const [existing] = await sql`
      SELECT id FROM products
      WHERE LOWER(name) = LOWER(${item.product_name.trim()})
      LIMIT 1
    `;

    if (existing) {
      resolved[i] = { ...item, product_id: existing.id };
    } else {
      const [created] = await sql`
        INSERT INTO products (name, cost_price, sale_price, stock_quantity, is_active)
        VALUES (${item.product_name.trim()}, ${item.unit_cost || 0}, ${item.unit_price || 0}, 0, true)
        RETURNING id, name
      `;
      resolved[i] = { ...item, product_id: created.id };
      await logActivity({
        actor,
        action: "product_created",
        entityType: "product",
        entityId: created.id,
        entityLabel: created.name,
        details: { auto_created: true, via_order: orderNumber ?? null },
      });
    }
  }

  return resolved;
}
