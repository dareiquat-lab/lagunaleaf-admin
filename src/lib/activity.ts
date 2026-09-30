import { getDb } from "./db";

export type ActivityActor = "admin" | "staff";

interface LogParams {
  actor: ActivityActor;
  action: string;
  entityType: string;
  entityId?: number | null;
  entityLabel?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logActivity(params: LogParams) {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO activity_log (actor, action, entity_type, entity_id, entity_label, details)
      VALUES (
        ${params.actor},
        ${params.action},
        ${params.entityType},
        ${params.entityId ?? null},
        ${params.entityLabel ?? null},
        ${params.details ? JSON.stringify(params.details) : null}
      )
    `;
  } catch {
    // Never fail the main request because of logging
  }
}

export function actorFromSession(session: { user?: unknown } | null): ActivityActor {
  return (session?.user as { role?: string })?.role === "staff" ? "staff" : "admin";
}
