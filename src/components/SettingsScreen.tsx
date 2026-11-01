"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FALLBACK_MODELS, DEFAULT_MODEL, type AiModelOption } from "@/lib/models";
import { authFetch, supabaseBrowser } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { useCloudSyncStatus } from "@/lib/supabase/sync";
import { useVibe } from "@/lib/store";
import { authRedirectUrl } from "@/lib/supabase/redirect-url";
import LoadingSticker from "@/stickers/LoadingSticker";

export default function SettingsScreen() {
  const auth = useAuthSession();
  const syncStatus = useCloudSyncStatus();
  const [models, setModels] = useState<AiModelOption[]>(FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [modelsReady, setModelsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const workspaceCount = useVibe((state) => state.projects.filter((project) =>
    auth.user ? state.cloudOwnerByProject[project.id] === auth.user.id : false,
  ).length);

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      let available = FALLBACK_MODELS;
      let fallback = DEFAULT_MODEL;
      try {
        const response = await authFetch("/api/ai/models", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { models?: AiModelOption[]; default?: string };
          if (Array.isArray(data.models) && data.models.length) available = data.models;
          if (typeof data.default === "string" && available.some((entry) => entry.id === data.default)) fallback = data.default;
        }
      } catch {
        // Built-in model choices remain available without a remote AI provider.
      }
      if (!active) return;
      setModels(available);
      let saved = "";
      try {
        saved = window.localStorage.getItem("musevibe:model") ?? "";
      } catch {
        // Local storage may be unavailable in private browsing.
      }
      setSelectedModel(available.some((entry) => entry.id === saved) ? saved : fallback);
      setModelsReady(true);
    };
    void loadModels();
    return () => { active = false; };
  }, []);

  const selectModel = (value: string) => {
    if (!models.some((entry) => entry.id === value)) return;
    setSelectedModel(value);
    try {
      window.localStorage.setItem("musevibe:model", value);
      setNotice({ kind: "success", text: "Default model saved on this device." });
    } catch {
      setNotice({ kind: "error", text: "The model changed for this session but could not be saved in this browser." });
    }
  };

  const sendPasswordReset = async () => {
    if (!auth.user?.email) return;
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabaseBrowser().auth.resetPasswordForEmail(auth.user.email, {
        redirectTo: authRedirectUrl("/reset-password"),
      });
      if (error) throw error;
      setNotice({ kind: "success", text: "Password reset link sent. Check your inbox to continue." });
    } catch {
      setNotice({ kind: "error", text: "We could not send the reset email. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabaseBrowser().auth.signOut({ scope: "local" });
      if (error) throw error;
      setNotice({ kind: "success", text: "Signed out on this device. Saved browser data has not been changed." });
    } catch {
      setNotice({ kind: "error", text: "We could not sign out. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  if (!auth.configured) return <StateCard title="Account settings unavailable" body="Supabase Auth is not configured in this deployment. A verified account is required to use MuseVibe." />;
  if (!auth.ready) return <StateCard title="Loading settings" body="Checking your account session…"><LoadingSticker size={44} label="Checking account" /></StateCard>;
  if (!auth.user) return <StateCard title="Sign-in required" body="A verified account is required to view account settings." />;

  const syncLabel = syncStatus === "syncing" ? "Syncing" : syncStatus === "synced" ? "Up to date" : syncStatus === "error" ? "Needs attention" : "Waiting for connection";
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-[#13151a] p-5 shadow-2xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7c8493]">Account & security</p><h2 className="mt-2 text-[17px] font-semibold">{auth.user.email}</h2><p className="mt-1 text-[12px] text-[#9aa0ae]">Email and password sign-in</p></div>
          <Link href="/profile" className="rounded-full border border-white/15 px-3.5 py-2 text-[12px] font-medium text-[#d4d8e0] hover:bg-white/5">Edit profile</Link>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div><p className="text-[13px] font-medium text-[#e4e7ec]">Password</p><p className="mt-1 text-[11px] text-[#8c94a2]">Send a secure reset link to your account email.</p></div>
          <button type="button" onClick={() => void sendPasswordReset()} disabled={busy} className="h-9 rounded-full border border-white/15 px-3.5 text-[12px] font-medium text-[#d4d8e0] hover:bg-white/5 disabled:opacity-50">{busy ? "Sending…" : "Send reset link"}</button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#13151a] p-5 sm:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7c8493]">Workspace sync</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h2 className="text-[17px] font-semibold">{syncLabel}</h2><span className={`rounded-full px-3 py-1 text-[11px] ${syncStatus === "error" ? "bg-red-400/10 text-[#ff9c9c]" : syncStatus === "synced" ? "bg-emerald-400/10 text-[#9fe6bc]" : "bg-white/5 text-[#b4bbc7]"}`}>{workspaceCount} account {workspaceCount === 1 ? "workspace" : "workspaces"}</span></div>
        <p className="mt-3 max-w-3xl text-[13px] leading-6 text-[#9aa0ae]">Account-owned workspaces are stored in Neon and checked against your Supabase account on the server. A recovery copy stays on this device and is not uploaded automatically if it is not linked to your account.</p>
        <Link href="/projects" className="mt-4 inline-flex text-[12px] font-medium text-[#bfc7d4] underline decoration-white/20 underline-offset-4 hover:text-white">View projects</Link>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#13151a] p-5 sm:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7c8493]">Preferences</p><h2 className="mt-2 text-[17px] font-semibold">Default AI model</h2><p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#9aa0ae]">Choose the chat model preselected in the home composer. This preference is saved only in this browser.</p>
        <label className="mt-4 flex max-w-lg flex-col gap-2 text-[12px] font-medium text-[#d4d8e0]">Model
          <select aria-label="Default AI model" disabled={!modelsReady} value={selectedModel} onChange={(event) => selectModel(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[13px] text-white outline-none focus:border-[#8ab4ff] disabled:opacity-60">
            {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
          </select>
        </label>
      </section>

      {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-2xl border p-3 text-[12px] ${notice.kind === "error" ? "border-red-300/20 bg-red-300/[0.05] text-[#ff9c9c]" : "border-emerald-300/20 bg-emerald-300/[0.05] text-[#9fe6bc]"}`}>{notice.text}</p>}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#13151a] p-5 sm:px-7">
        <div><h2 className="text-[14px] font-semibold">Sign out</h2><p className="mt-1 text-[12px] text-[#9aa0ae]">This signs out this device only. Other sessions remain active.</p></div>
        <button type="button" onClick={() => void signOut()} disabled={busy} className="h-10 rounded-full border border-white/15 px-4 text-[13px] font-medium text-[#d4d8e0] hover:bg-white/5 disabled:opacity-50">{busy ? "Working…" : "Sign out on this device"}</button>
      </section>
    </div>
  );
}

function StateCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-[#13151a] p-5 shadow-2xl sm:p-7"><h2 className="text-[17px] font-semibold">{title}</h2><p className="mt-2 text-[13px] leading-6 text-[#9aa0ae]">{body}</p>{children && <div className="mt-5">{children}</div>}</section>;
}
