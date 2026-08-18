import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

const PRODUCTS: { name: string; category: string; cost: number }[] = [
  // Flower
  { name: "Flower (Half Pound) - Super Mango Haze",                          category: "Flower",  cost: 700.00 },
  // Edibles — 2000mg gummies
  { name: "2000mg THC Sticky Nano Gummies - Berry Punch",                    category: "Edibles", cost: 12.00 },
  { name: "2000mg THC Sticky Nano Gummies - PAWG",                           category: "Edibles", cost: 12.00 },
  // Pre-rolls — STIIIZY 40s 2.5G
  { name: "Stiiizy 40's Infused Prerolls Multipack 2.5G - Strawberry Cough", category: "Sativa",  cost: 18.50 },
  { name: "Stiiizy 40's Infused Prerolls Multipack 2.5G - Skywalker OG",     category: "Indica",  cost: 18.50 },
  { name: "Stiiizy 40's Infused Prerolls Multipack 2.5G - Orange Sunset",    category: "Hybrid",  cost: 18.50 },
  // Vape pens — Raw Garden 1G Live Resin
  { name: "Raw Garden 1G Live Resin AIO - Wedding Cake",                     category: "Hybrid",  cost: 22.50 },
  { name: "Raw Garden 1G Live Resin AIO - Gelato Slushy",                    category: "Hybrid",  cost: 22.50 },
  // Vape pens — STIIIZY All In One 1G
  { name: "Stiiizy All In One THC Pen 1G - Super Lemon Haze",               category: "Sativa",  cost: 19.50 },
  { name: "Stiiizy All In One THC Pen 1G - Gelato",                          category: "Hybrid",  cost: 19.50 },
  { name: "Stiiizy All In One THC Pen 1G - OG Kush",                         category: "Indica",  cost: 19.50 },
  // Edibles — 800mg gummies
  { name: "800mg THC Sticky Nano Gummies - Tropical Passion",                category: "Edibles", cost: 8.00 },
  { name: "800mg THC Sticky Nano Gummies - Exotic Dragonfruit",              category: "Edibles", cost: 8.00 },
  // NOTE: Aloha 2G Live Rosin Pen - Guava Kush already exists — skipped
];

async function seed() {
  // Build category map from existing rows
  const cats = await sql`SELECT id, name FROM categories`;
  const catMap: Record<string, number> = {};
  for (const c of cats) catMap[c.name] = c.id;

  console.log("Inserting products (skipping duplicates by name)...");
  let inserted = 0;
  let skipped  = 0;

  for (const p of PRODUCTS) {
    const catId = catMap[p.category];
    if (!catId) { console.error(`  ✗ Unknown category: ${p.category}`); continue; }

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

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
}

seed().catch((err) => { console.error(err); process.exit(1); });
