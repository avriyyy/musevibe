import { requireWorkspaceUser } from "@/lib/server/workspace-auth";
import { createWorkspaceApi } from "@/lib/server/workspace-api";
import { createNeonCreditRepository } from "@/lib/server/credit-repository";
import { createNeonWorkspaceRepository } from "@/lib/server/workspace-repository";
import { getDatabaseConnectionString } from "@/lib/server/runtime-env";

const handlers = createWorkspaceApi({
  authenticate: requireWorkspaceUser,
  repository: () => {
    const connectionString = getDatabaseConnectionString();
    return connectionString ? createNeonWorkspaceRepository(connectionString) : null;
  },
  credits: () => {
    const connectionString = getDatabaseConnectionString();
    return connectionString ? createNeonCreditRepository(connectionString) : null;
  },
});

export const POST = handlers.create;
