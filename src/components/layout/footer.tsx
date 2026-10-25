import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Terminal } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#05060A] border-t border-white/10 py-12 text-slate-400 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-white/10">
          {/* Brand */}
          <div className="flex flex-col gap-3 max-w-sm">
            <Link
              href="/"
              className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] rounded-lg"
              aria-label="MuseVibe Beranda"
            >
              <div className="relative h-8 w-12 bg-black rounded-lg overflow-hidden shrink-0">
                <Image
                  src="/logo-musevibe.jpg"
                  alt="Logo resmi MuseVibe"
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-base text-white tracking-tight">
                MuseVibe
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Dari prompt jadi produk — dalam satu alur yang terstruktur.
            </p>
          </div>

          {/* Quick Links */}
          <nav className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-sm">
            <a
              href="#workflow"
              className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] rounded px-1"
            >
              Cara Kerja
            </a>
            <Link
              href="/workspace"
              className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] rounded px-1"
            >
              Workspace
            </Link>
            <Link
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF] rounded px-1"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="font-mono text-xs">/api/health</span>
            </Link>
          </nav>
        </div>

        {/* Bottom */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 MuseVibe. Hak cipta dilindungi.</p>
          <p>Prompt → Spesifikasi → Tugas → Desain → Kode</p>
        </div>
      </div>
    </footer>
  );
}
