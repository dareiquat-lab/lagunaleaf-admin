import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Running migrations...");

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      icon VARCHAR(10),
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) UNIQUE,
      category_id INTEGER REFERENCES categories(id),
      description TEXT,
      image_url TEXT,
      cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,
      unit VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(30),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(50),
      zip VARCHAR(20),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      client_id INTEGER REFERENCES clients(id),
      status VARCHAR(50) DEFAULT 'pending',
      payment_method VARCHAR(50),
      payment_status VARCHAR(50) DEFAULT 'unpaid',
      subtotal DECIMAL(10,2) DEFAULT 0,
      discount DECIMAL(10,2) DEFAULT 0,
      tax DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) DEFAULT 0,
      notes TEXT,
      ordered_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost DECIMAL(10,2) NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(100),
      pay_type VARCHAR(20) NOT NULL DEFAULT 'hourly',
      pay_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
      hours_per_week DECIMAL(5,1) DEFAULT 40,
      is_active BOOLEAN DEFAULT true,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS employee_costs (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  console.log("Tables created successfully.");

  // Seed categories
  const existingCategories = await sql`SELECT COUNT(*) as count FROM categories`;
  if (Number(existingCategories[0].count) === 0) {
    const categories = [
      { name: "Supplements", icon: "💊", description: "Vitamins, minerals, and dietary supplements" },
      { name: "Tinctures", icon: "🧪", description: "Herbal liquid extracts and tinctures" },
      { name: "Teas & Herbs", icon: "🌿", description: "Herbal teas, loose leaf, and dried herbs" },
      { name: "Topicals", icon: "🧴", description: "Creams, salves, and topical applications" },
      { name: "Essential Oils", icon: "🌸", description: "Pure and blended essential oils" },
      { name: "CBD/Hemp", icon: "🌱", description: "CBD oils, hemp products, and extracts" },
      { name: "Mushrooms", icon: "🍄", description: "Medicinal mushrooms and fungi products" },
      { name: "Adaptogenics", icon: "⚡", description: "Adaptogenic herbs and stress-support products" },
      { name: "Skincare", icon: "✨", description: "Natural skincare and beauty products" },
      { name: "Accessories", icon: "🛠️", description: "Tools, accessories, and wellness supplies" },
    ];

    for (const cat of categories) {
      await sql`INSERT INTO categories (name, icon, description) VALUES (${cat.name}, ${cat.icon}, ${cat.description})`;
    }
    console.log("Categories seeded successfully.");
  }

  console.log("Migration complete!");
}

migrate().catch(console.error);
