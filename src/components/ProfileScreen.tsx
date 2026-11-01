"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import LoadingSticker from "@/stickers/LoadingSticker";

function profileName(user: User) {
  const name = user.user_metadata?.full_name;
  return typeof name === "string" ? name : "";
}

function initials(value: string) {
  const parts = value.trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2);
  return (parts.map((part) => part[0]).join("") || "MV").toUpperCase();
}

export default function ProfileScreen() {
  const auth = useAuthSession();
  const [nameDraft, setNameDraft] = useState<{ userId: string; value: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const name = auth.user
    ? nameDraft?.userId === auth.user.id
      ? nameDraft.value
      : profileName(auth.user)
    : "";

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.user) return;
    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (normalizedName.length > 80) {
      setNotice({ kind: "error", text: "Keep your display name to 80 characters or fewer." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabaseBrowser().auth.updateUser({
        data: { ...auth.user.user_metadata, full_name: normalizedName },
      });
      if (error) throw error;
      setNameDraft({ userId: auth.user.id, value: normalizedName });
      setNotice({ kind: "success", text: "Your profile was updated." });
    } catch {
      setNotice({ kind: "error", text: "We could not save your profile. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  if (!auth.configured) {
    return <StateCard title="Profile unavailable" body="Supabase Auth is not configured in this deployment. You can still use a local guest workspace." />;
  }
  if (!auth.ready) {
    return <StateCard title="Loading profile" body="Checking your account session…"><LoadingSticker size={44} label="Checking account" /></StateCard>;
  }
  if (!auth.user) {
    return <StateCard title="Sign in to view your profile" body="Your profile belongs to your Supabase Auth account. Guest workspaces remain local to this browser."><Link href="/sign-in" className="inline-flex h-10 items-center rounded-full bg-meta px-4 text-[13px] font-semibold text-white hover:bg-meta-hover">Sign in</Link><Link href="/register" className="ml-2 inline-flex h-10 items-center rounded-full border border-white/15 px-4 text-[13px] text-[#d4d8e0] hover:bg-white/5">Create account</Link></StateCard>;
  }

  const title = name.trim() || auth.user.email || "MuseVibe member";
  const createdAt = Date.parse(auth.user.created_at);
  const joined = Number.isFinite(createdAt)
    ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(createdAt)
    : "—";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="rounded-3xl border border-white/10 bg-[#13151a] p-5 shadow-2xl sm:p-7">
        <div className="flex items-center gap-4 border-b border-white/10 pb-5">
          <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6962ff] to-[#b153d9] text-[17px] font-semibold text-white">{initials(title)}</span>
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold">{title}</h2>
            <p className="mt-1 truncate text-[13px] text-[#9aa0ae]">{auth.user.email ?? "Email unavailable"}</p>
          </div>
        </div>
        <form onSubmit={save} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">
            Display name
            <input type="text" name="full_name" autoComplete="name" maxLength={80} value={name} onChange={(event) => setNameDraft({ userId: auth.user!.id, value: event.target.value })} placeholder="How should MuseVibe address you?" className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none focus:border-[#8ab4ff]" />
            <span className="text-[11px] font-normal text-[#727b89]">Stored as profile metadata for display only; workspace access is still checked server-side.</span>
          </label>
          <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">
            Email address
            <input type="email" value={auth.user.email ?? ""} readOnly className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[14px] text-[#9aa0ae] outline-none" />
            <span className="text-[11px] font-normal text-[#727b89]">Email changes are managed by Supabase and are not enabled in this profile screen.</span>
          </label>
          {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={`text-[13px] ${notice.kind === "error" ? "text-[#ff9c9c]" : "text-[#9fe6bc]"}`}>{notice.text}</p>}
          <div><button type="submit" disabled={busy} className="flex h-10 items-center justify-center gap-2 rounded-full bg-meta px-5 text-[13px] font-semibold text-white hover:bg-meta-hover disabled:opacity-60">{busy ? <LoadingSticker size={22} label="Saving profile" /> : null}{busy ? "Saving…" : "Save profile"}</button></div>
        </form>
      </section>
      <aside className="rounded-3xl border border-white/10 bg-[#13151a] p-5">
        <h2 className="text-[14px] font-semibold">Account details</h2>
        <dl className="mt-4 space-y-4 text-[12px]">
          <div><dt className="text-[#7c8493]">Member since</dt><dd className="mt-1 text-[#d4d8e0]">{joined}</dd></div>
          <div><dt className="text-[#7c8493]">Sign-in method</dt><dd className="mt-1 text-[#d4d8e0]">Email and password</dd></div>
          <div><dt className="text-[#7c8493]">Workspace storage</dt><dd className="mt-1 leading-5 text-[#d4d8e0]">Account-owned workspaces sync to Neon. Guest projects stay in this browser.</dd></div>
        </dl>
        <Link href="/settings" className="mt-5 inline-flex text-[12px] font-medium text-[#bfc7d4] underline decoration-white/20 underline-offset-4 hover:text-white">Open settings</Link>
      </aside>
    </div>
  );
}

function StateCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-[#13151a] p-5 shadow-2xl sm:p-7"><h2 className="text-[17px] font-semibold">{title}</h2><p className="mt-2 text-[13px] leading-6 text-[#9aa0ae]">{body}</p>{children && <div className="mt-5">{children}</div>}</section>;
}
