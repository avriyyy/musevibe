"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { supabaseBrowser } from "@/lib/supabase/client";
import LoadingSticker from "@/stickers/LoadingSticker";

type Mode = "sign-in" | "create-account";
type Notice = { kind: "success" | "error"; text: string } | null;

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("invalid login credentials")) {
    return "Email or password is incorrect. Check them and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the confirmation link.";
  }
  if (message.includes("already registered")) {
    return "This email already has an account. Sign in instead.";
  }
  if (message.includes("password") && message.includes("least")) {
    return "Choose a longer password and try again.";
  }
  if (message.includes("fetch") || message.includes("network")) {
    return "Could not reach the account service. Check your connection and try again.";
  }
  return "We could not complete that account request. Please try again.";
}

export default function AccountPage() {
  const { user, ready, configured } = useAuthSession();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (mode === "create-account" && password !== confirmPassword) {
      setNotice({ kind: "error", text: "The passwords do not match." });
      return;
    }

    setBusy(true);
    try {
      const client = supabaseBrowser();
      if (mode === "sign-in") {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setNotice({
          kind: "success",
          text: "You are signed in. Your projects remain stored in this browser; cloud sync is not enabled yet.",
        });
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/account` },
        });
        if (error) throw error;
        setNotice({
          kind: "success",
          text: data.session
            ? "Your account is ready. Your projects remain stored in this browser; cloud sync is not enabled yet."
            : "Check your inbox for a confirmation link to finish creating your account.",
        });
      }
    } catch (error) {
      setNotice({ kind: "error", text: friendlyAuthError(error) });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabaseBrowser().auth.signOut();
      if (error) throw error;
      setNotice({ kind: "success", text: "You are signed out. Your local projects are still available in this browser." });
    } catch (error) {
      setNotice({ kind: "error", text: friendlyAuthError(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0c10] px-4 py-10 text-[#f5f6f8]">
      <section className="w-full max-w-[440px] rounded-[28px] border border-white/10 bg-[#13151a] p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-[15px] font-semibold tracking-tight hover:text-white">
            MuseVibe
          </Link>
          <Link href="/projects" className="text-[13px] text-[#9aa0ae] hover:text-white">
            Back to workspace
          </Link>
        </div>

        {!configured ? (
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Account sign-in is unavailable</h1>
            <p className="mt-3 text-[14px] leading-6 text-[#9aa0ae]">
              Supabase Auth is not configured in this build. You can keep using MuseVibe as a local workspace.
            </p>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center py-10 text-center">
            <LoadingSticker size={72} label="Checking account session" />
            <p className="mt-4 text-[14px] text-[#9aa0ae]">Checking your account…</p>
          </div>
        ) : user ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7ee2a8]">Account connected</p>
            <h1 className="mt-2 break-all text-[22px] font-semibold tracking-tight">{user.email ?? "Signed-in account"}</h1>
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[13px] leading-6 text-[#b5bbc6]">
              Sign-in is optional. Projects are still saved in this browser and are not synced to your account yet.
            </p>
            {notice && (
              <p role={notice.kind === "error" ? "alert" : "status"} className={`mt-4 text-[13px] ${notice.kind === "error" ? "text-[#ff9c9c]" : "text-[#9fe6bc]"}`}>
                {notice.text}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/projects" className="flex h-11 flex-1 items-center justify-center rounded-full bg-meta px-5 text-[14px] font-semibold text-white hover:bg-meta-hover">
                Open projects
              </Link>
              <button type="button" onClick={signOut} disabled={busy} className="h-11 rounded-full border border-white/15 px-5 text-[14px] font-medium text-[#d4d8e0] hover:bg-white/5 disabled:opacity-50">
                {busy ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-[22px] font-semibold tracking-tight">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-[13px] leading-6 text-[#9aa0ae]">
              {mode === "sign-in" ? "Sign in to your optional MuseVibe account." : "Create an account with your email and a password."}
            </p>

            <div className="mt-6 grid grid-cols-2 rounded-full border border-white/10 bg-black/20 p-1" aria-label="Account action">
              {(["sign-in", "create-account"] as const).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  aria-pressed={mode === nextMode}
                  onClick={() => {
                    setMode(nextMode);
                    setNotice(null);
                  }}
                  className={`h-9 rounded-full text-[13px] font-medium transition-colors ${mode === nextMode ? "bg-white text-black" : "text-[#9aa0ae] hover:text-white"}`}
                >
                  {nextMode === "sign-in" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none transition focus:border-[#8ab4ff]"
                />
              </label>
              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">
                Password
                <input
                  type="password"
                  name="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none transition focus:border-[#8ab4ff]"
                />
              </label>
              {mode === "create-account" && (
                <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">
                  Confirm password
                  <input
                    type="password"
                    name="confirm-password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none transition focus:border-[#8ab4ff]"
                  />
                </label>
              )}
              {notice && (
                <p role={notice.kind === "error" ? "alert" : "status"} className={`text-[13px] leading-5 ${notice.kind === "error" ? "text-[#ff9c9c]" : "text-[#9fe6bc]"}`}>
                  {notice.text}
                </p>
              )}
              <button type="submit" disabled={busy} className="mt-1 flex h-11 items-center justify-center gap-2 rounded-full bg-meta px-5 text-[14px] font-semibold text-white hover:bg-meta-hover disabled:cursor-wait disabled:opacity-60">
                {busy ? <LoadingSticker size={26} label={mode === "sign-in" ? "Signing in" : "Creating account"} /> : null}
                {busy ? mode === "sign-in" ? "Signing in…" : "Creating account…" : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[12px] leading-5 text-[#9aa0ae]">
              Signing in is optional. Your projects stay saved in this browser and are not synced to your account yet.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
