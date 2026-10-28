"use client";

/**
 * Project workspace entry. The IDE itself lives in components/IdeWorkspace
 * so the /ide route can render the same workspace.
 */

import { Suspense } from "react";
import { useParams } from "next/navigation";
import IdeWorkspace from "@/components/IdeWorkspace";

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
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-dvh place-items-center bg-[#0b0c10] text-[#f5f6f8]"
    >
      <span className="size-5 animate-pulse rounded-full bg-white/30" />
      <span className="sr-only">Opening your project</span>
    </div>
  );
}
