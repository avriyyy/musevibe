"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authRedirectUrl } from "@/lib/supabase/redirect-url";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import LoadingSticker from "@/stickers/LoadingSticker";

type Mode = "sign-in" | "create-account";
type Notice = { kind: "success" | "error"; text: string } | null;

function friendlyAuthError(error: unknown, mode: Mode) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (mode === "sign-in" && message.includes("invalid login credentials")) {
    return "Email or password is incorrect. Check them and try again.";
  }
  if (mode === "sign-in" && message.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the confirmation link.";
  }
  if (message.includes("password") && (message.includes("least") || message.includes("weak"))) {
    return "Choose a stronger password and try again.";
  }
  if (message.includes("fetch") || message.includes("network")) {
    return "Could not reach the account service. Check your connection and try again.";
  }
  return mode === "create-account"
    ? "We could not complete registration with those details. Review them and try again."
    : "We could not complete sign-in. Please try again.";
}

export default function AuthForm({ initialMode }: { initialMode: Mode }) {
  const auth = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    if (initialMode === "create-account" && password !== confirmPassword) {
      setNotice({ kind: "error", text: "The passwords do not match." });
      return;
    }

    setBusy(true);
    try {
      const client = supabaseBrowser();
      if (initialMode === "sign-in") {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setNotice({ kind: "success", text: "Signed in. Opening your workspace…" });
      } else {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authRedirectUrl("/sign-in?next=%2F") },
        });
        if (error) throw error;
        setNotice({
          kind: "success",
          text: data.session
            ? "Your account is ready. Opening your workspace…"
            : "If this address can be registered, a confirmation link is on its way. Check your inbox to continue.",
        });
      }
    } catch (error) {
      setNotice({ kind: "error", text: friendlyAuthError(error, initialMode) });
    } finally {
      setBusy(false);
    }
  };

  if (!auth.configured) {
    return (
      <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.05] p-5 shadow-2xl sm:p-7">
        <h1 className="text-[20px] font-semibold">Sign-in is unavailable</h1>
        <p className="mt-2 text-[13px] leading-6 text-[#b8bdc8]">This deployment is missing its public Supabase Auth URL or key. App access requires a configured account.</p>
      </section>
    );
  }

  if (auth.user) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#13151a] p-5 shadow-2xl sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7ee2a8]">Signed in</p>
        <h1 className="mt-2 break-all text-[20px] font-semibold tracking-tight">{auth.user.email ?? "Your account"}</h1>
        <p className="mt-3 text-[13px] leading-6 text-[#9aa0ae]">Opening your workspace…</p>
      </section>
    );
  }

  const isSignIn = initialMode === "sign-in";
  return (
    <section className="rounded-3xl border border-white/10 bg-[#13151a] p-5 shadow-2xl sm:p-7">
      <div className="mb-5 grid grid-cols-2 rounded-full border border-white/10 bg-black/20 p-1" aria-label="Account action">
        <Link href="/sign-in" aria-current={isSignIn ? "page" : undefined} className={`flex h-9 items-center justify-center rounded-full text-[13px] font-medium transition-colors ${isSignIn ? "bg-white text-black" : "text-[#9aa0ae] hover:text-white"}`}>Sign in</Link>
        <Link href="/register" aria-current={!isSignIn ? "page" : undefined} className={`flex h-9 items-center justify-center rounded-full text-[13px] font-medium transition-colors ${!isSignIn ? "bg-white text-black" : "text-[#9aa0ae] hover:text-white"}`}>Create account</Link>
      </div>
      <h1 className="text-[20px] font-semibold tracking-tight">{isSignIn ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-[13px] leading-6 text-[#9aa0ae]">{isSignIn ? "Sign in to continue to MuseVibe." : "Register with your email and password to get started."}</p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">
          Email address
          <input type="email" name="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none transition focus:border-[#8ab4ff]" />
        </label>
        <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">
          Password
          <input type="password" name="password" autoComplete={isSignIn ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none transition focus:border-[#8ab4ff]" />
        </label>
        {!isSignIn && <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">Confirm password<input type="password" name="confirm-password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none transition focus:border-[#8ab4ff]" /></label>}
        {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={`text-[13px] leading-5 ${notice.kind === "error" ? "text-[#ff9c9c]" : "text-[#9fe6bc]"}`}>{notice.text}</p>}
        <button type="submit" disabled={busy} className="mt-1 flex h-11 items-center justify-center gap-2 rounded-full bg-meta px-5 text-[14px] font-semibold text-white hover:bg-meta-hover disabled:cursor-wait disabled:opacity-60">
          {busy ? <LoadingSticker size={26} label={isSignIn ? "Signing in" : "Creating account"} /> : null}
          {busy ? isSignIn ? "Signing in…" : "Creating account…" : isSignIn ? "Sign in" : "Create account"}
        </button>
      </form>
      {isSignIn && <Link href="/forgot-password" className="mt-4 inline-flex text-[12px] text-[#aeb6c4] underline decoration-white/20 underline-offset-4 hover:text-white">Forgot your password?</Link>}
      <p className="mt-5 text-[11px] leading-5 text-[#77808e]">A verified account is required to enter MuseVibe.</p>
    </section>
  );
}
