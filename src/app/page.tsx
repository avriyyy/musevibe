import React from "react";
import Navbar from "@/components/layout/navbar";
import HeroSection from "@/components/hero/hero-section";
import WorkflowStages from "@/components/workflow/workflow-stages";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Terminal,
  Activity,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* Hero Section with Interactive 3D Flow Graph */}
        <HeroSection />

        {/* 5-Stage Pipeline Section */}
        <WorkflowStages />

        {/* Shell Workspace Preview Section */}
        <section
          id="workspace-preview"
          className="py-20 md:py-28 bg-slate-50/70 border-t border-slate-200/80"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-3">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Developer Workspace Shell</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
                  A unified cockpit for every stage of synthesis.
                </h2>
                <p className="mt-3 text-base text-slate-600 leading-relaxed">
                  Experience the interactive topology graph powered by{" "}
                  <code className="text-blue-700 font-mono text-xs bg-blue-50 px-1.5 py-0.5 rounded">
                    @xyflow/react
                  </code>
                  . Inspect code emissions, PRD documents, and task streams in
                  real time.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href="/workspace">
                  <Button size="lg" className="shadow-md shadow-blue-500/10">
                    <span>Open Fullscreen Workspace</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Embedded Shell Component */}
            <WorkspaceShell isFullScreen={false} />
          </div>
        </section>

        {/* Meta Style Tech Architecture Grid */}
        <section className="py-20 md:py-24 bg-white border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <Badge variant="outline" className="mb-3 text-xs">
                Under The Hood
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Rigorous foundations for mission-critical code.
              </h2>
              <p className="mt-3 text-slate-600 text-base">
                Engineered from first principles with modern web standards and zero
                legacy overhead.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-7 rounded-3xl border border-slate-200/90 bg-slate-50/50 flex flex-col gap-3 transition-all hover:bg-white hover:shadow-md hover:border-slate-300">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Next.js 16 & Turbopack Native
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Emits clean React 19 Server and Client components with App
                  Router file conventions, strictly typed layouts, and zero-config
                  Turbopack compatibility.
                </p>
                <div className="mt-auto pt-4 border-t border-slate-200/60 text-xs font-mono text-slate-500">
                  ✓ Verified against Next 16 build targets
                </div>
              </div>

              <div className="p-7 rounded-3xl border border-slate-200/90 bg-slate-50/50 flex flex-col gap-3 transition-all hover:bg-white hover:shadow-md hover:border-slate-300">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  3D Wireframe & Flow Topology
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Three.js + R3F wireframe geometry visualizes the pipeline
                  in 3D space, seamlessly paired with @xyflow/react node canvas
                  for developer orchestration.
                </p>
                <div className="mt-auto pt-4 border-t border-slate-200/60 text-xs font-mono text-slate-500">
                  ✓ WebGL 2.0 with smooth 60fps damping
                </div>
              </div>

              <div className="p-7 rounded-3xl border border-slate-200/90 bg-slate-50/50 flex flex-col gap-3 transition-all hover:bg-white hover:shadow-md hover:border-slate-300">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Continuous AST Verification
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every stage is mathematically validated against schema bounds,
                  ensuring no syntax errors, no circular dependencies, and complete
                  type safety before export.
                </p>
                <div className="mt-auto pt-4 border-t border-slate-200/60 text-xs font-mono text-slate-500">
                  ✓ TypeScript 5.9 strict: PASS
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner (Meta clean style) */}
        <section className="py-16 md:py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to scaffold your application with MuseVibe?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-blue-100 max-w-2xl leading-relaxed">
              Launch the workspace shell, configure your prompt, and watch the
              5-stage autonomous pipeline emit production-ready code.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/workspace">
                <Button
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 border-white text-base font-semibold shadow-lg shadow-black/10 h-12 px-7"
                >
                  <span>Launch Workspace</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/api/health" target="_blank">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-transparent border-white/40 text-white hover:bg-white/10 text-base h-12 px-6"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  <span>Inspect Health Status</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
