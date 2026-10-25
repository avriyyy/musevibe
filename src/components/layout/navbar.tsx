"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Terminal, ArrowRight, Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
            MV
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-slate-900 tracking-tight leading-none">
              MuseVibe
            </span>
            <span className="text-[10px] text-slate-500 font-mono tracking-tight leading-tight mt-0.5">
              Engine · Meta Style
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#workflow"
            className="hover:text-blue-600 transition-colors"
          >
            5-Stage Pipeline
          </a>
          <a
            href="#workspace-preview"
            className="hover:text-blue-600 transition-colors"
          >
            Workspace Shell
          </a>
          <Link
            href="/workspace"
            className="hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <span>Live Shell</span>
            <Badge variant="meta" className="text-[9px] px-1.5 py-0 h-4">
              Interactive
            </Badge>
          </Link>
          <Link
            href="/api/health"
            target="_blank"
            className="hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Health API</span>
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/api/health" target="_blank">
            <Button variant="ghost" size="sm" className="text-xs text-slate-600">
              API Status
            </Button>
          </Link>
          <Link href="/workspace">
            <Button size="sm" className="text-xs shadow-sm shadow-blue-500/10">
              <span>Open Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 flex flex-col gap-3 text-sm font-medium text-slate-700">
          <a
            href="#workflow"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 hover:text-blue-600"
          >
            5-Stage Pipeline
          </a>
          <a
            href="#workspace-preview"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 hover:text-blue-600"
          >
            Workspace Shell
          </a>
          <Link
            href="/workspace"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 hover:text-blue-600 flex items-center justify-between"
          >
            <span>Launch Workspace</span>
            <Badge variant="meta" className="text-[10px]">Active</Badge>
          </Link>
          <Link
            href="/api/health"
            target="_blank"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 hover:text-blue-600 flex items-center gap-1.5"
          >
            <Terminal className="w-4 h-4 text-slate-400" />
            <span>/api/health Endpoint</span>
          </Link>
          <div className="pt-2 border-t border-slate-100">
            <Link href="/workspace" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full text-xs">
                Launch Workspace
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
