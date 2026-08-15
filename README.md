# Laguna Leaf Wellness Center — Admin Portal

Internal business management system for Laguna Leaf Wellness Center. Built with Next.js 15, Neon PostgreSQL, and Vercel Blob.

## Features

- **Dashboard** — KPI cards, revenue/profit chart, recent orders, low-stock alerts
- **Inventory** — Full product CRUD with image uploads, stock adjustments, margin tracking
- **Orders** — Create/manage orders with line items, client association, discounts & tax
- **Clients** — Client profiles with order history and spend tracking
- **Analytics** — Revenue/profit charts, top products, orders by status
- **Settings** — Category management, admin account info

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **UI**: Custom components + Radix UI primitives
- **Database**: Neon PostgreSQL (`@neondatabase/serverless`)
- **Auth**: NextAuth.js v5 (credentials provider)
- **Storage**: Vercel Blob (product images)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Dates**: date-fns
- **Toasts**: Sonner

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd lagunaleafwellnesscenter
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the values in `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random 32-char secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` locally) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token from dashboard |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password |

### 3. Generate admin password hash

```bash
node -e "const b=require('bcryptjs');console.log(b.hashSync('yourpassword',12))"
```

Paste the output as `ADMIN_PASSWORD_HASH` in `.env.local`.

### 4. Run database migrations

```bash
npx tsx src/scripts/migrate.ts
```

This creates all tables and seeds the 10 default product categories.

### 5. Start development server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the login page.

## Deployment (Vercel)

1. Push your code to GitHub
2. Connect the repo to Vercel
3. Add all environment variables in Vercel Dashboard → Settings → Environment Variables
4. Set `NEXTAUTH_URL` to your Vercel deployment URL (e.g., `https://yourapp.vercel.app`)
5. Deploy

The app deploys with zero configuration — no `vercel.json` needed.

### Running migrations on Neon

After setting up your Neon database and adding `DATABASE_URL`, run migrations locally pointing at your production Neon DB:

```bash
npx tsx src/scripts/migrate.ts
```

## Environment Variables Reference

```bash
# Neon PostgreSQL — get from neon.tech dashboard
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# NextAuth — generate: openssl rand -base64 32
NEXTAUTH_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXTAUTH_URL=https://yourapp.vercel.app

# Vercel Blob — get from vercel.com/dashboard/stores
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

# Admin login credentials
ADMIN_EMAIL=admin@lagunaleaf.com
ADMIN_PASSWORD_HASH=$2b$12$...
```
