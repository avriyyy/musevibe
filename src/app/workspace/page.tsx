import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import WorkspaceFlow from "@/components/workspace-flow";

export const metadata: Metadata = {
  title: "Workspace PRD — MuseVibe",
  description:
    "Workspace PRD generator: ide, pertanyaan klarifikasi, draft, review per bagian, versi, dan Final.",
};

export default function WorkspacePage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <SiteHeader aktif="workspace" />
      <main className="flex-1">
        <WorkspaceFlow />
      </main>
      <SiteFooter />
    </div>
  );
}
