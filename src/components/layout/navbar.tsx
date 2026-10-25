"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#05060A]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060A]"
          aria-label="MuseVibe Beranda"
        >
          <div className="relative h-9 w-[54px] sm:h-10 sm:w-[60px] bg-black rounded-lg overflow-hidden shrink-0">
            <Image
              src="/logo-musevibe.jpg"
              alt="Logo resmi MuseVibe"
              fill
              sizes="60px"
              priority
              className="object-contain"
            />
          </div>
          <span className="font-bold text-base sm:text-lg text-white tracking-tight">
            MuseVibe
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a
            href="#workflow"
            className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] rounded-md px-1 py-0.5"
          >
            Workflow
          </a>
          <Link
            href="/workspace"
            className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] rounded-md px-1 py-0.5"
          >
            Workspace
          </Link>
        </nav>

        {/* 1 Main Action Button */}
        <div className="hidden md:flex items-center">
          <Link href="/workspace">
            <Button size="sm" className="font-semibold shadow-lg shadow-[#1E6BFF]/20 px-4">
              <span>Buka Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF]"
          aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#05060A] px-4 pt-3 pb-5 flex flex-col gap-3 text-sm font-medium text-slate-300">
          <a
            href="#workflow"
            onClick={() => setMobileMenuOpen(false)}
            className="py-2 hover:text-white transition-colors"
          >
            Workflow
          </a>
          <Link
            href="/workspace"
            onClick={() => setMobileMenuOpen(false)}
            className="py-2 hover:text-white transition-colors"
          >
            Workspace
          </Link>
          <div className="pt-2 border-t border-white/10">
            <Link href="/workspace" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full font-semibold">
                <span>Buka Workspace</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
