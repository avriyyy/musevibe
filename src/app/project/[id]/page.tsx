"use client";

/**
 * Project workspace entry. The IDE itself lives in components/IdeWorkspace
 * so the /ide route can render the same workspace.
 */

import { Suspense } from "react";
import { useParams } from "next/navigation";
import IdeWorkspace from "@/components/IdeWorkspace";
import { WorkspaceSkeleton } from "@/components/LoadingState";

export default function ProjectPage() {
  return (
    <Suspense fallback={<OpeningProject />}>
      <ProjectView />
    </Suspense>
  );
}

function ProjectView() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  if (!id) return <OpeningProject />;
  return <IdeWorkspace key={id} projectId={id} />;
}

function OpeningProject() {
  return <WorkspaceSkeleton label="Opening your project" />;
}
