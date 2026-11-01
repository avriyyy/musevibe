import Link from "next/link";
import type { ReactNode } from "react";

export type AccountSection = "profile" | "settings";

const sections: { href: string; id: AccountSection; label: string }[] = [
  { href: "/profile", id: "profile", label: "Profile" },
  { href: "/settings", id: "settings", label: "Settings" },
];

export default function AccountFrame({
  active,
  title,
  description,
  children,
}: {
  active: AccountSection;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-[#0b0c10] text-[#f5f6f8]">
      <header className="border-b border-white/10 bg-[#0b0c10]/90">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl bg-meta text-[11px] font-bold text-white">MV</span>
            MuseVibe
          </Link>
          <nav aria-label="Account navigation" className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-2 sm:w-auto">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                aria-current={active === section.id ? "page" : undefined}
                className={`shrink-0 rounded-full px-3 py-2 text-[13px] font-medium transition-colors ${active === section.id ? "bg-white/10 text-white" : "text-[#9aa0ae] hover:bg-white/5 hover:text-white"}`}
              >
                {section.label}
              </Link>
            ))}
          </nav>
          <Link href="/projects" className="ml-auto rounded-full border border-white/10 px-3.5 py-2 text-[12px] font-medium text-[#c9cdd6] hover:border-white/20 hover:bg-white/5 hover:text-white sm:ml-auto">
            Open workspace
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
        <div className="mb-7 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7c8493]">Account center</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight sm:text-[32px]">{title}</h1>
          <p className="mt-2 text-[14px] leading-6 text-[#9aa0ae]">{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
