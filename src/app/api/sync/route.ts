import { NextResponse } from "next/server";
import { neonSql } from "@/lib/neon/db";
import { getSupabaseUserId } from "@/lib/neon/auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProjectRow = {
  id: string;
  name: string;
  idea: string;
  created_at: string | null;
  workspace_state: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** GET: list this user's projects (atomic snapshots) from Neon. */
export async function GET(req: Request) {
  const userId = await getSupabaseUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required.", code: "unauthorized" }, { status: 401 });
  }

  let sql;
  try {
    sql = neonSql();
  } catch {
    return NextResponse.json(
      { error: "Neon database is not configured.", code: "neon_not_configured" },
      { status: 503 },
    );
  }

  const rows = (await sql`
    select id, name, idea, created_at, workspace_state
    from public.projects
    where owner_id = ${userId}
    order by created_at desc
    limit 500
  `) as ProjectRow[];

  return NextResponse.json({ projects: rows });
}

/** POST: upsert one workspace snapshot, owned by the caller only. */
export async function POST(req: Request) {
  const userId = await getSupabaseUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required.", code: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "invalid_json" },
      { status: 400 },
    );
  }
  const snapshot = isRecord(body) ? body.snapshot : undefined;
  const project = isRecord(snapshot) ? snapshot.project : undefined;
  if (
    !isRecord(snapshot) ||
    !isRecord(project) ||
    typeof project.id !== "string" ||
    !UUID_PATTERN.test(project.id) ||
    typeof project.name !== "string" ||
    typeof project.idea !== "string" ||
    typeof project.createdAt !== "string"
  ) {
    return NextResponse.json(
      { error: "Snapshot must contain a valid project.", code: "invalid_snapshot" },
      { status: 400 },
    );
  }

  let sql;
  try {
    sql = neonSql();
  } catch {
    return NextResponse.json(
      { error: "Neon database is not configured.", code: "neon_not_configured" },
      { status: 503 },
    );
  }

  // Never overwrite another user's project, even if the id collides.
  const existing = (await sql`
    select owner_id from public.projects where id = ${project.id}
  `) as { owner_id: string }[];
  if (existing.length > 0 && existing[0].owner_id !== userId) {
    return NextResponse.json(
      { error: "This project belongs to another account.", code: "forbidden" },
      { status: 403 },
    );
  }

  await sql`
    insert into public.projects (id, owner_id, name, idea, created_at, updated_at, workspace_state)
    values (${project.id}, ${userId}, ${project.name}, ${project.idea}, ${project.createdAt}, now(), ${JSON.stringify(snapshot)}::jsonb)
    on conflict (id) do update set
      name = excluded.name,
      idea = excluded.idea,
      updated_at = now(),
      workspace_state = excluded.workspace_state
  `;

  return NextResponse.json({ ok: true });
}
