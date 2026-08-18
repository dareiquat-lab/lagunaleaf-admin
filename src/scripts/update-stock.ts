import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

// Stock quantities from both invoices combined
const STOCK: { name: string; qty: number }[] = [
  // Invoice 1
  { name: "Dime 2G Signature Line AIO - Strawberry Cough",                                   qty: 10 },
  { name: "Dime 2G Signature Line AIO - Mango Diesel",                                       qty: 10 },
  { name: "Dime 2G Signature Line AIO - Pink Lemon Haze",                                    qty: 7  },
  { name: "Dime 2G Signature Line AIO - Watermelon Kush",                                    qty: 7  },
  { name: "Wyld 100mg THC Gummies - Raspberry",                                              qty: 10 },
  { name: "LYT 5G Magic Mushrooms Gummies - Ram Dass Raz",                                   qty: 10 },
  { name: "Camino 100mg THC/20mg CBN Gummies - Midnight Blueberry",                          qty: 10 },
  { name: "Camino 100mg THC/50mg THCV - Sours Tropical Burst",                              qty: 10 },
  { name: "Raw Garden 1G Live Resin AIO - Kimbo Cookies",                                    qty: 5  },
  { name: "Raw Garden 1G Live Resin AIO - Lemon Sour Diesel",                                qty: 10 },
  { name: "Aloha 2G THC Live Rosin Pen - Guava Kush",                                        qty: 24 }, // 12 (inv1) + 12 (inv2)
  { name: "Aloha 2G THC Live Rosin Pen - Honolulu Haze",                                     qty: 12 },
  { name: "Boutiq Switch 2G Live Diamonds AIO - Cherry Gelato x Permanent x Straw-Tangie",  qty: 10 },
  { name: "Flower (Pound) - Oreoz",                                                          qty: 1  },
  { name: "Flower (Pound) - Rainbow Inferno",                                                qty: 1  },
  { name: "Flower (Pound) - Trop Cherries",                                                  qty: 1  },
  // Invoice 2
  { name: "Flower (Half Pound) - Super Mango Haze",                                          qty: 1  },
  { name: "2000mg THC Sticky Nano Gummies - Berry Punch",                                    qty: 12 },
  { name: "2000mg THC Sticky Nano Gummies - PAWG",                                           qty: 12 },
  { name: "Stiiizy 40's Infused Prerolls Multipack 2.5G - Strawberry Cough",                qty: 10 },
  { name: "Stiiizy 40's Infused Prerolls Multipack 2.5G - Skywalker OG",                    qty: 10 },
  { name: "Stiiizy 40's Infused Prerolls Multipack 2.5G - Orange Sunset",                   qty: 10 },
  { name: "Raw Garden 1G Live Resin AIO - Wedding Cake",                                     qty: 5  },
  { name: "Raw Garden 1G Live Resin AIO - Gelato Slushy",                                    qty: 5  },
  { name: "Stiiizy All In One THC Pen 1G - Super Lemon Haze",                               qty: 5  },
  { name: "Stiiizy All In One THC Pen 1G - Gelato",                                          qty: 5  },
  { name: "Stiiizy All In One THC Pen 1G - OG Kush",                                         qty: 5  },
  { name: "800mg THC Sticky Nano Gummies - Tropical Passion",                                qty: 12 },
  { name: "800mg THC Sticky Nano Gummies - Exotic Dragonfruit",                              qty: 12 },
];

async function run() {
  let updated = 0;
  let missing = 0;

  for (const item of STOCK) {
    const rows = await sql`
      UPDATE products SET stock_quantity = ${item.qty}, updated_at = NOW()
      WHERE name = ${item.name}
      RETURNING id, name, stock_quantity
    `;
    if (rows.length > 0) {
      console.log(`  ✓ ${rows[0].name}  → qty ${rows[0].stock_quantity}`);
      updated++;
    } else {
      console.warn(`  ✗ NOT FOUND: ${item.name}`);
      missing++;
    }
  }

  console.log(`\nDone. ${updated} updated, ${missing} not found.`);
}

run().catch((err) => { console.error(err); process.exit(1); });
