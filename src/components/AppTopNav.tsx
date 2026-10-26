import Link from "next/link";

export interface NavItem {
  label: string;
  href: string;
}

export function AppTopNav({
  items,
  selected,
  actionHref,
  actionLabel,
}: {
  items: NavItem[];
  selected?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="h-14 flex items-center gap-6 px-5 bg-white border-b border-line sticky top-0 z-10">
      <Link href="/" className="text-[17px] font-bold tracking-tight text-ink">
        MuseVibe
      </Link>
      <nav className="flex items-center gap-1" aria-label="Navigasi MuseVibe">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={selected === i.href ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-[14px] font-medium ${
              selected === i.href ? "bg-wash text-ink" : "text-muted hover:bg-wash hover:text-ink"
            }`}
          >
            {i.label}
          </Link>
        ))}
      </nav>
      {actionHref ? (
        <Link
          href={actionHref}
          className="ml-auto px-[22px] py-2.5 rounded-full bg-meta text-white text-[14px] font-medium hover:bg-meta-hover active:bg-meta-pressed"
        >
          {actionLabel}
        </Link>
      ) : null}
    </header>
  );
}
