import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();

  const [employee] = await sql`SELECT * FROM employees WHERE id = ${parseInt(id)}`;
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const costs = await sql`
    SELECT * FROM employee_costs WHERE employee_id = ${parseInt(id)} ORDER BY paid_on DESC
  `;

  return NextResponse.json({ ...employee, costs });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const sql = getDb();

  const [employee] = await sql`
    UPDATE employees SET
      name           = ${body.name?.trim() || ""},
      role           = ${body.role?.trim() || null},
      pay_type       = ${body.pay_type || "hourly"},
      pay_rate       = ${body.pay_rate || 0},
      hours_per_week = ${body.hours_per_week ?? 40},
      is_active      = ${body.is_active ?? true},
      notes          = ${body.notes?.trim() || null},
      updated_at     = NOW()
    WHERE id = ${parseInt(id)}
    RETURNING *
  `;
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sql = getDb();
  await sql`DELETE FROM employees WHERE id = ${parseInt(id)}`;
  return NextResponse.json({ success: true });
}
