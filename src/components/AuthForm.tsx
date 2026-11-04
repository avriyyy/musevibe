"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getPostAuthDestination } from "@/lib/auth-routes";
import { isSupabaseAuthConfigured, supabaseBrowser } from "@/lib/supabase/client";

type Mode = "sign-in" | "create-account";

function friendlyAuthError(message: string): string {
  const lowered = message.toLowerCase();
  if (lowered.includes("invalid login") || lowered.includes("invalid credentials")) {
    return "That email and password don't match. Try again or reset your password.";
  }
  if (lowered.includes("already registered") || lowered.includes("already exists")) {
    return "This email already has an account. Sign in instead.";
  }
  if (lowered.includes("password")) {
    return "Use a password with at least 8 characters.";
  }
  if (lowered.includes("rate") || lowered.includes("too many")) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  if (lowered.includes("confirm") || lowered.includes("not confirmed")) {
    return "Check your inbox for the confirmation email first, then sign in.";
  }
  return message;
}

export default function AuthForm({
  initialMode,
}: {
  initialMode: Mode;
}) {
  const router = useRouter();
  const headingId = "auth-heading";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(friendlyAuthError(signInError.message));
          return;
        }
        router.push(getPostAuthDestination(window.location.search));
        return;
      }
      const { data: signUpData, error: signUpError } = await supabaseBrowser().auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(friendlyAuthError(signUpError.message));
        return;
      }
      if (!signUpData.session) {
        setNotice("Account created. Check your inbox for the confirmation email, then sign in.");
        return;
      }
      router.push(getPostAuthDestination(window.location.search));
    } catch (unknown) {
      setError(
        unknown instanceof Error && unknown.message
          ? friendlyAuthError(unknown.message)
          : "Could not reach the auth service. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  if (!isSupabaseAuthConfigured()) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#12141a] p-6 text-center text-[14px] text-[#c9cdd6]">
        <h1 id={headingId} className="text-[18px] font-semibold text-white">
          Sign-in is unavailable
        </h1>
        <p className="mt-2">
          This build has no Supabase Auth configuration. Add the public URL and
          key to sign in.
        </p>
      </div>
    );
  }

  const isRegister = mode === "create-account";

  return (
    <div>
      <h1 id={headingId} className="text-[22px] font-semibold text-white">
        {isRegister ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-2 text-[14px] leading-6 text-[#9aa0ae]">
        {isRegister
          ? "Enter your email and a password. New accounts start with 10 free credits a day."
          : "Enter your account email and password."}
      </p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-[#d4d8e0]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-white/10 bg-[#0b0c10] px-3.5 text-[14px] text-white placeholder:text-[#5b6472] focus:border-white/30 focus:outline-none"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-[13px] font-medium text-[#d4d8e0]">
              Password
            </label>
            {!isRegister && (
              <Link
                href="/forgot-password"
                className="text-[13px] font-medium text-[#bfc7d4] underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={isRegister ? "At least 8 characters" : "Your password"}
            className="h-11 w-full rounded-xl border border-white/10 bg-[#0b0c10] px-3.5 text-[14px] text-white placeholder:text-[#5b6472] focus:border-white/30 focus:outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="text-[13px] leading-5 text-[#ff9d9d]">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-[13px] leading-5 text-[#9fe6bc]">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-full bg-white text-[14px] font-semibold text-[#0b0c10] hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? (isRegister ? "Creating…" : "Signing in…") : isRegister ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#9aa0ae]">
        {isRegister ? "Already have an account? " : "New to MuseVibe? "}
        <Link
          href={isRegister ? "/sign-in" : "/register"}
          onClick={() => switchMode(isRegister ? "sign-in" : "create-account")}
          className="font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
