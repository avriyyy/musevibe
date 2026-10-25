import React from "react";
import Navbar from "@/components/layout/navbar";
import HeroSection from "@/components/hero/hero-section";
import WorkflowStages from "@/components/workflow/workflow-stages";
import WorkspacePreview from "@/components/workspace/workspace-preview";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#05060A] text-slate-200">
      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <HeroSection />

        {/* 5-Stage Workflow — ONE instance, numbered cards */}
        <WorkflowStages />

        {/* Workspace preview — single static preview, no 25+ controls */}
        <section
          id="workspace-preview"
          className="py-24 md:py-32 bg-[#080B10] border-t border-white/8"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#1E6BFF] mb-3">
                  Workspace
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Satu tempat untuk semua tahap.
                </h2>
                <p className="mt-3 text-base text-slate-400 leading-relaxed">
                  Pantau progres, tinjau hasil setiap tahap, dan ekspor kode —
                  semuanya dari satu layar.
                </p>
              </div>
              <Link href="/workspace">
                <Button size="lg" className="h-11 px-6 font-semibold shrink-0 group">
                  <span>Buka Workspace</span>
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>

            <WorkspacePreview />
          </div>
        </section>

        {/* CTA section — dark, 1 action */}
        <section className="py-24 md:py-32 border-t border-white/8 bg-[#05060A]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-balance">
              Siap memulai proyekmu?
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
              Buka workspace, tulis promptmu, dan biarkan MuseVibe mengurus
              sisanya.
            </p>
            <Link href="/workspace">
              <Button
                size="lg"
                className="h-12 px-10 text-base font-semibold group"
              >
                <span>Buka Workspace</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
