import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const employees = await sql`
    SELECT e.*,
      COALESCE(SUM(ec.amount), 0) as total_paid,
      COUNT(ec.id) as cost_count
    FROM employees e
    LEFT JOIN employee_costs ec ON ec.employee_id = e.id
    WHERE ${activeOnly ? sql`e.is_active = true` : sql`TRUE`}
    GROUP BY e.id
    ORDER BY e.name ASC
  `;

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const sql = getDb();
  const [employee] = await sql`
    INSERT INTO employees (name, role, pay_type, pay_rate, hours_per_week, notes)
    VALUES (
      ${body.name.trim()},
      ${body.role?.trim() || null},
      ${body.pay_type || "hourly"},
      ${body.pay_rate || 0},
      ${body.hours_per_week ?? 40},
      ${body.notes?.trim() || null}
    )
    RETURNING *
  `;
  return NextResponse.json(employee, { status: 201 });
}
