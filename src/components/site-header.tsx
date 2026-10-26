import Image from "next/image";
import Link from "next/link";

export function SiteHeader({ aktif }: { aktif: "beranda" | "workspace" }) {
  return (
    <header className="bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="MuseVibe — beranda">
          <Image
            src="/logo-musevibe.jpg"
            alt="Logo MuseVibe"
            width={120}
            height={48}
            className="h-9 w-auto"
            priority
          />
          <span className="text-base font-bold tracking-tight">MuseVibe</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm" aria-label="Navigasi utama">
          <Link
            href="/"
            aria-current={aktif === "beranda" ? "page" : undefined}
            className={
              aktif === "beranda"
                ? "rounded-md bg-zinc-800 px-3 py-1.5 font-semibold text-white"
                : "rounded-md px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }
          >
            Beranda
          </Link>
          <Link
            href="/workspace"
            aria-current={aktif === "workspace" ? "page" : undefined}
            className={
              aktif === "workspace"
                ? "rounded-md bg-zinc-800 px-3 py-1.5 font-semibold text-white"
                : "rounded-md px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }
          >
            Workspace
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-4 text-xs text-zinc-500 sm:px-6">
        <p>MuseVibe — PRD generator (frontend step 1).</p>
        <p className="ml-auto">Demo frontend — generasi AI belum tersambung.</p>
      </div>
    </footer>
  );
}
