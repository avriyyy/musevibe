import React from "react";
import type { Metadata } from "next";
import WorkspaceShell from "@/components/workspace/workspace-shell";

export const metadata: Metadata = {
  title: "Workspace Shell — MuseVibe",
  description: "Interactive graph and execution shell for the MuseVibe 5-stage development pipeline.",
};

export default function WorkspacePage() {
  return (
    <main className="min-h-screen bg-[#05060A] flex flex-col">
      <WorkspaceShell isFullScreen={true} />
    </main>
  );
}
