import React, { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import WorkspaceTabsLoader from "@/components/workspace/workspace-tabs-loader";

export const metadata: Metadata = {
  title: "Workspace — MuseVibe",
  description: "Workspace 5 tab MuseVibe: Prompt, Spesifikasi, Rencana Kerja, Desain, dan Kode.",
};

export default function WorkspacePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#05060A] text-slate-200">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-sm text-slate-500">Workspace / DuitKu</p>
          <h1 className="mt-1 text-3xl font-bold text-white tracking-tight">
            Proyek demo: DuitKu
          </h1>
          <p className="mt-2 text-base text-slate-400">
            Aplikasi pencatat keuangan pribadi. Satu contoh yang sama di semua tab.
          </p>
        </div>
        <Suspense fallback={<p className="text-slate-400">Memuat workspace…</p>}>
          <WorkspaceTabsLoader searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
