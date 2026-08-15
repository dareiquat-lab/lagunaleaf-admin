import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sql = getDb();

  const costs = await sql`
    SELECT ec.*, e.name as employee_name
    FROM employee_costs ec
    JOIN employees e ON e.id = ec.employee_id
    WHERE (${from ? sql`ec.paid_on >= ${from}::date` : sql`TRUE`})
      AND (${to ? sql`ec.paid_on <= ${to}::date` : sql`TRUE`})
    ORDER BY ec.paid_on DESC
  `;

  return NextResponse.json(costs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.employee_id || !body.amount) {
    return NextResponse.json({ error: "employee_id and amount are required" }, { status: 400 });
  }

  const sql = getDb();
  const [cost] = await sql`
    INSERT INTO employee_costs (employee_id, amount, paid_on, notes)
    VALUES (
      ${body.employee_id},
      ${body.amount},
      ${body.paid_on || new Date().toISOString().split("T")[0]},
      ${body.notes?.trim() || null}
    )
    RETURNING *
  `;
  return NextResponse.json(cost, { status: 201 });
}
