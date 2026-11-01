import { requireWorkspaceUser } from "@/lib/server/workspace-auth";
import { createWorkspaceApi } from "@/lib/server/workspace-api";
import { createNeonWorkspaceRepository } from "@/lib/server/workspace-repository";
import { getDatabaseConnectionString } from "@/lib/server/runtime-env";

const handlers = createWorkspaceApi({
  authenticate: requireWorkspaceUser,
  repository: () => {
    const connectionString = getDatabaseConnectionString();
    return connectionString ? createNeonWorkspaceRepository(connectionString) : null;
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
