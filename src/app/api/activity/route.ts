import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const actor = searchParams.get("actor");
  const entityType = searchParams.get("entity_type");
  const limit = Math.min(parseInt(searchParams.get("limit") || "150"), 500);

  const sql = getDb();

  const logs = await sql`
    SELECT * FROM activity_log
    WHERE (${actor ? sql`actor = ${actor}` : sql`TRUE`})
    AND (${entityType ? sql`entity_type = ${entityType}` : sql`TRUE`})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return NextResponse.json(logs);
}
