"use client";

/**
 * IDE workspace entry by query id. Renders the same workspace as
 * /project/[id]; that URL stays canonical for wizard and sidebar links.
 */

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import IdeWorkspace from "@/components/IdeWorkspace";

export default function IdePage() {
  return (
    <Suspense fallback={<OpeningIde />}>
      <IdeByQuery />
    </Suspense>
  );
}

function IdeByQuery() {
  const id = useSearchParams().get("id") ?? "";
  if (!id) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#0b0c10] px-5 text-center text-[#f5f6f8]">
        <div>
          <h1 className="text-[24px] font-semibold">No project selected</h1>
          <p className="mx-auto mt-2 max-w-sm text-[13px] text-[#9aa0ae]">
            Open the IDE with an id, for example /ide?id=your-project-id, or
            pick a project from the list.
          </p>
          <Link
            href="/projects"
            className="mt-6 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-[#0b0c10] hover:bg-white/90"
          >
            All projects
          </Link>
        </div>
      </div>
    );
  }
  return <IdeWorkspace key={id} projectId={id} />;
}

function OpeningIde() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-dvh place-items-center bg-[#0b0c10] text-[#f5f6f8]"
    >
      <span className="size-5 animate-pulse rounded-full bg-white/30" />
      <span className="sr-only">Opening the IDE</span>
    </div>
  );
}
