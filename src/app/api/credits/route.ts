import { NextResponse } from "next/server";
import { DAILY_CREDITS, PROJECT_CREATION_COST } from "@/lib/credits";
import { createNeonCreditRepository } from "@/lib/server/credit-repository";
import { getDatabaseConnectionString } from "@/lib/server/runtime-env";
import { requireWorkspaceUser, workspaceJson } from "@/lib/server/workspace-auth";

/** Current daily-credit balance for the signed-in account. */
export async function GET(req: Request) {
  const auth = await requireWorkspaceUser(req);
  if ("response" in auth) return auth.response;

  const connectionString = getDatabaseConnectionString();
  if (!connectionString) {
    return workspaceJson({ error: "Credit storage is not configured." }, 503);
  }

  try {
    const repository = createNeonCreditRepository(connectionString);
    const { balance, resetDate } = await repository.getBalanceWithReset(auth.user.id);
    const resetsAt = new Date(`${resetDate}T00:00:00Z`);
    resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);
    return NextResponse.json({
      balance,
      daily: DAILY_CREDITS,
      projectCost: PROJECT_CREATION_COST,
      resetDate,
      resetsAt: resetsAt.toISOString(),
    });
  } catch {
    return workspaceJson({ error: "Credit storage is unavailable." }, 503);
  }
}
