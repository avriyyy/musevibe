import React from "react";
import Link from "next/link";
import { Terminal } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200/80 py-16 text-slate-600 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 pb-12 border-b border-slate-200">
          {/* Brand Col */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                MV
              </div>
              <span className="font-bold text-base text-slate-900 tracking-tight">
                MuseVibe
              </span>
            </Link>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Autonomous software synthesis framework built on Next.js 16 App
              Router, TypeScript, Three.js wireframes, and directed acyclic task
              graphs. Clean, deterministic development flow.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>

          {/* Workflow Col */}
          <div className="flex flex-col gap-2.5 text-xs">
            <span className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
              5-Stage Pipeline
            </span>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">
              01 Discovery
            </a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">
              02 PRD Studio
            </a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">
              03 Task Engine
            </a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">
              04 Design Studio
            </a>
            <a href="#workflow" className="hover:text-blue-600 transition-colors">
              05 Build-ready
            </a>
          </div>

          {/* Platform Col */}
          <div className="flex flex-col gap-2.5 text-xs">
            <span className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
              Platform
            </span>
            <Link href="/workspace" className="hover:text-blue-600 transition-colors">
              Workspace Shell
            </Link>
            <Link href="/api/health" target="_blank" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Terminal className="w-3 h-3 text-slate-400" />
              <span>Health Endpoint</span>
            </Link>
            <a href="#workspace-preview" className="hover:text-blue-600 transition-colors">
              Topology Canvas
            </a>
            <span className="text-slate-400">Turbopack Verified</span>
          </div>

          {/* Tech Stack Col */}
          <div className="flex flex-col gap-2.5 text-xs">
            <span className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
              Technology
            </span>
            <span className="text-slate-500">Next.js 16 App Router</span>
            <span className="text-slate-500">TypeScript 5.9</span>
            <span className="text-slate-500">Tailwind CSS v4</span>
            <span className="text-slate-500">Three.js + R3F + Drei</span>
            <span className="text-slate-500">@xyflow/react & Lenis</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>© 2026 MuseVibe Studio. Clean Meta-Style Architecture.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Deterministic Generation</span>
            <span>·</span>
            <span>WCAG AAA Accessible</span>
            <span>·</span>
            <Link href="/api/health" target="_blank" className="text-blue-600 hover:underline">
              Status JSON
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
