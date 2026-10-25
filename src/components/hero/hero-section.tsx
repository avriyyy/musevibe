"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import HeroFlowGraph from "./hero-flow-graph";
import { ArrowRight, Terminal, Sparkles, CheckCircle2, ShieldCheck, Cpu } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/60 via-white to-white">
      {/* Subtle Meta-style grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/60 text-blue-700 text-xs font-semibold shadow-xs hover:bg-blue-100/80 transition-colors mb-6 cursor-default">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>MuseVibe Engine v1.0</span>
            <span className="text-blue-300">|</span>
            <span className="font-normal text-blue-900">From Natural Prompt to Production TypeScript</span>
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl text-balance">
            Orchestrate software from{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
              Prompt to Code
            </span>{" "}
            in one continuous flow.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl text-balance leading-relaxed">
            A deterministic development engine combining autonomous PRD synthesis,
            graph-based task scheduling, token-driven design systems, and
            production-ready Next.js emission.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/workspace">
              <Button size="lg" className="h-12 px-7 text-base shadow-md shadow-blue-500/20 group">
                <span>Launch Workspace Shell</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            <a href="#workflow">
              <Button variant="outline" size="lg" className="h-12 px-6 text-base text-slate-700 bg-white hover:bg-slate-50">
                Explore 5-Stage Pipeline
              </Button>
            </a>

            <Link href="/api/health" target="_blank">
              <Button variant="ghost" size="lg" className="h-12 px-4 text-slate-500 hover:text-slate-900 text-sm">
                <Terminal className="w-4 h-4 mr-2" />
                /api/health
              </Button>
            </Link>
          </div>

          {/* Meta trust pills */}
          <div className="mt-10 pt-6 border-t border-slate-200/70 w-full max-w-3xl flex flex-wrap items-center justify-around gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>5 Autonomous Pipeline Stages</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>AST-Verified Type Safety</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Next.js 16 App Router Native</span>
            </div>
          </div>
        </div>

        {/* 3D Wireframe Canvas Hero Graph */}
        <div className="mt-12 md:mt-16">
          <HeroFlowGraph />
        </div>
      </div>
    </section>
  );
}
