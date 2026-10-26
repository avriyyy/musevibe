"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "plan", label: "Plan" },
  { key: "design", label: "Design" },
  { key: "code", label: "Code" },
] as const;

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const current = pathname.endsWith("/design") ? "design" : pathname.endsWith("/code") ? "code" : "plan";
  return (
    <nav className="flex items-center gap-1 border-b border-line bg-white rounded-t-xl px-3" aria-label="Project">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/projects/${projectId}/${t.key}`}
          aria-current={current === t.key ? "page" : undefined}
          className={`px-4 py-3 text-[14px] font-medium border-b-2 -mb-px ${
            current === t.key
              ? "text-meta border-meta"
              : "text-muted border-transparent hover:text-ink"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
