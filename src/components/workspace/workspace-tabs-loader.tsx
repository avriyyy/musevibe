import React from "react";
import WorkspaceTabs from "./workspace-tabs";
import type { TabId } from "./workspace-tabs";

const VALID: TabId[] = ["prompt", "spesifikasi", "rencana-kerja", "desain", "kode"];

export default async function WorkspaceTabsLoader({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const params = await searchParams;
  const initialTab: TabId = VALID.includes(params.tab as TabId) ? (params.tab as TabId) : "prompt";
  return <WorkspaceTabs syncUrl initialTab={initialTab} />;
}
