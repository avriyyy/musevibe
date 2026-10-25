"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
const HeroWireframe = dynamic(() => import("./hero-wireframe"), { ssr: false });
import { ArrowRight, ChevronDown } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-8 pb-16 overflow-hidden bg-[#05060A]">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(30,107,255,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 50%, transparent 100%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center gap-6">
        {/* Logo */}
        <div className="relative h-16 w-24 sm:h-20 sm:w-28 bg-black rounded-2xl overflow-hidden shadow-lg shadow-black/40 border border-white/10">
          <Image
            src="/logo-musevibe.jpg"
            alt="Logo MuseVibe"
            fill
            sizes="112px"
            priority
            className="object-contain"
          />
        </div>

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>MuseVibe v1.0 · Siap digunakan</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight text-balance">
          Dari{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #1E6BFF 0%, #7C3AED 50%, #F472B6 100%)",
            }}
          >
            prompt
          </span>{" "}
          jadi produk,
          <br className="hidden sm:block" /> dalam satu alur.
        </h1>

        {/* Subheadline — plain language, no jargon */}
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed text-balance">
          Tulis apa yang ingin kamu buat. MuseVibe mengubahnya menjadi
          spesifikasi, rencana kerja, desain, dan kode — langkah demi langkah.
        </p>

        {/* Max 2 CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Link href="/workspace">
            <Button
              size="lg"
              className="h-12 px-8 text-base font-semibold w-full sm:w-auto group"
            >
              <span>Buka Workspace</span>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <a href="#workflow">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-7 text-base w-full sm:w-auto"
            >
              Lihat cara kerja
            </Button>
          </a>
        </div>
      </div>

      {/* Three.js wireframe hero visual */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <HeroWireframe />
        <p className="mt-3 text-center text-sm text-slate-500">Prompt &rarr; Spesifikasi &rarr; Rencana Kerja &rarr; Desain &rarr; Kode</p>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-500 animate-bounce">
        <ChevronDown className="w-5 h-5" />
      </div>
    </section>
  );
}
