"use client";

import Link from "next/link";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

function initials(name: string) {
  const letters = name.trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2);
  return (letters.map((part) => part[0]).join("") || "MV").toUpperCase();
}

export default function AccountShortcut() {
  const { user } = useAuthSession();
  const metadataName = user?.user_metadata?.full_name;
  const label = typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : user?.email ?? "Profile";

  if (user) {
    return (
      <Link
        href="/profile"
        aria-label={`Open profile for ${label}`}
        className="flex h-9 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 text-[12px] font-medium text-[#e5e7eb] hover:border-white/25 hover:bg-white/10"
      >
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold text-white">
          {initials(label)}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">Profile</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/sign-in" className="flex h-9 items-center rounded-full border border-white/15 px-3 text-[12px] font-medium text-[#d4d8e0] hover:bg-white/5 hover:text-white">
        Sign in
      </Link>
      <Link href="/register" className="flex h-9 items-center rounded-full bg-meta px-3.5 text-[12px] font-semibold text-white hover:bg-meta-hover">
        Create account
      </Link>
    </div>
  );
}
