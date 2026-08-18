import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

const CATEGORIES = [
  { name: "Sativa",  icon: "🌿" },
  { name: "Indica",  icon: "🍇" },
  { name: "Hybrid",  icon: "🌱" },
  { name: "Edibles", icon: "🍬" },
  { name: "Flower",  icon: "🌸" },
];

const PRODUCTS: { name: string; category: string; cost: number }[] = [
  { name: "Dime 2G Signature Line AIO - Strawberry Cough",                                     category: "Sativa",  cost: 22.00 },
  { name: "Dime 2G Signature Line AIO - Mango Diesel",                                         category: "Sativa",  cost: 22.00 },
  { name: "Dime 2G Signature Line AIO - Pink Lemon Haze",                                      category: "Hybrid",  cost: 22.00 },
  { name: "Dime 2G Signature Line AIO - Watermelon Kush",                                      category: "Hybrid",  cost: 22.00 },
  { name: "Wyld 100mg THC Gummies - Raspberry",                                                category: "Sativa",  cost: 13.50 },
  { name: "LYT 5G Magic Mushrooms Gummies - Ram Dass Raz",                                     category: "Edibles", cost: 19.00 },
  { name: "Camino 100mg THC/20mg CBN Gummies - Midnight Blueberry",                            category: "Edibles", cost: 14.50 },
  { name: "Camino 100mg THC/50mg THCV - Sours Tropical Burst",                                category: "Edibles", cost: 14.50 },
  { name: "Raw Garden 1G Live Resin AIO - Kimbo Cookies",                                      category: "Indica",  cost: 22.50 },
  { name: "Raw Garden 1G Live Resin AIO - Lemon Sour Diesel",                                  category: "Sativa",  cost: 22.50 },
  { name: "Aloha 2G THC Live Rosin Pen - Guava Kush",                                          category: "Indica",  cost: 18.00 },
  { name: "Aloha 2G THC Live Rosin Pen - Honolulu Haze",                                       category: "Sativa",  cost: 18.00 },
  { name: "Boutiq Switch 2G Live Diamonds AIO - Cherry Gelato x Permanent x Straw-Tangie",    category: "Hybrid",  cost: 18.00 },
  { name: "Flower (Pound) - Oreoz",                                                            category: "Flower",  cost: 725.00 },
  { name: "Flower (Pound) - Rainbow Inferno",                                                  category: "Flower",  cost: 900.00 },
  { name: "Flower (Pound) - Trop Cherries",                                                    category: "Flower",  cost: 750.00 },
];

async function upsertCategory(name: string, icon: string): Promise<number> {
  const existing = await sql`SELECT id FROM categories WHERE name = ${name} LIMIT 1`;
  if (existing.length > 0) return existing[0].id;
  const inserted = await sql`INSERT INTO categories (name, icon) VALUES (${name}, ${icon}) RETURNING id`;
  return inserted[0].id;
}

async function seed() {
  console.log("Upserting categories...");
  const catMap: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    catMap[cat.name] = await upsertCategory(cat.name, cat.icon);
    console.log(`  ✓ ${cat.name} → id ${catMap[cat.name]}`);
  }

  console.log("\nInserting products (skipping duplicates by name)...");
  let inserted = 0;
  let skipped  = 0;

  for (const p of PRODUCTS) {
    const catId = catMap[p.category];
    const existing = await sql`SELECT id FROM products WHERE name = ${p.name} LIMIT 1`;
    if (existing.length > 0) {
      console.log(`  → SKIP (exists) ${p.name}`);
      skipped++;
      continue;
    }
    const rows = await sql`
      INSERT INTO products (name, category_id, cost_price, sale_price, stock_quantity, is_active)
      VALUES (${p.name}, ${catId}, ${p.cost}, 0, 0, true)
      RETURNING id
    `;
    console.log(`  ✓ [${p.category}] ${p.name}  — $${p.cost}  (id ${rows[0].id})`);
    inserted++;
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped (already existed).`);
}

seed().catch((err) => { console.error(err); process.exit(1); });
