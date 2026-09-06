import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { keep_id, merge_ids } = await req.json();
  if (!keep_id || !Array.isArray(merge_ids) || merge_ids.length === 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sql = getDb();

  await sql`
    UPDATE orders SET client_id = ${keep_id}
    WHERE client_id = ANY(${merge_ids}::int[])
  `;

  await sql`
    DELETE FROM clients WHERE id = ANY(${merge_ids}::int[])
  `;

  return NextResponse.json({ success: true });
}
