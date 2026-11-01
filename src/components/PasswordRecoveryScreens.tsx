"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authRedirectUrl } from "@/lib/supabase/redirect-url";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import LoadingSticker from "@/stickers/LoadingSticker";

export function ForgotPasswordScreen() {
  const auth = useAuthSession();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.configured) return;
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authRedirectUrl("/reset-password"),
      });
      if (error) throw error;
      setNotice({ kind: "success", text: "If that address has an account, a password reset link is on its way. Check your inbox." });
    } catch {
      setNotice({ kind: "error", text: "We could not send the reset email. Check the address and try again later." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-xl rounded-3xl border border-white/10 bg-[#13151a] p-5 shadow-2xl sm:p-7">
      <h2 className="text-[19px] font-semibold">Reset your password</h2>
      {!auth.configured ? (
        <p className="mt-3 text-[13px] leading-6 text-[#9aa0ae]">Supabase Auth is not configured in this deployment.</p>
      ) : (
        <>
          <p className="mt-2 text-[13px] leading-6 text-[#9aa0ae]">Enter the email address for your MuseVibe account. We will send a secure link if it can be used for password recovery.</p>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">Email address<input type="email" name="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none focus:border-[#8ab4ff]" /></label>
            {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={`text-[13px] leading-5 ${notice.kind === "error" ? "text-[#ff9c9c]" : "text-[#9fe6bc]"}`}>{notice.text}</p>}
            <button type="submit" disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-full bg-meta px-5 text-[14px] font-semibold text-white hover:bg-meta-hover disabled:opacity-60">{busy ? <LoadingSticker size={24} label="Sending reset email" /> : null}{busy ? "Sending…" : "Send reset link"}</button>
          </form>
        </>
      )}
      <Link href="/sign-in" className="mt-5 inline-flex text-[12px] text-[#bfc7d4] underline decoration-white/20 underline-offset-4 hover:text-white">Back to sign in</Link>
    </section>
  );
}

export function ResetPasswordScreen() {
  const auth = useAuthSession();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorText, setErrorText] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorText("");
    if (password !== confirmation) {
      setErrorText("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabaseBrowser().auth.updateUser({ password });
      if (error) throw error;
      setSaved(true);
    } catch {
      setErrorText("We could not update your password. Request a fresh reset link and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!auth.configured) {
    return <RecoveryCard title="Password reset is unavailable" body="Supabase Auth is not configured in this deployment." />;
  }
  if (!auth.ready) {
    return <RecoveryCard title="Verifying reset link" body="Checking the secure session from your email…"><LoadingSticker size={44} label="Verifying reset link" /></RecoveryCard>;
  }
  if (!auth.user) {
    return <RecoveryCard title="Reset link not verified" body="Open the most recent password reset email on this device, or request a new link. The link may have expired."><Link href="/forgot-password" className="inline-flex h-10 items-center rounded-full bg-meta px-4 text-[13px] font-semibold text-white hover:bg-meta-hover">Request another link</Link></RecoveryCard>;
  }
  if (saved) {
    return <RecoveryCard title="Password updated" body="Your password has been changed. You can continue to your profile."><Link href="/profile" className="inline-flex h-10 items-center rounded-full bg-meta px-4 text-[13px] font-semibold text-white hover:bg-meta-hover">Open profile</Link></RecoveryCard>;
  }

  return (
    <section className="max-w-xl rounded-3xl border border-white/10 bg-[#13151a] p-5 shadow-2xl sm:p-7">
      <h2 className="text-[19px] font-semibold">Choose a new password</h2>
      <p className="mt-2 text-[13px] leading-6 text-[#9aa0ae]">Resetting the password for {auth.user.email ?? "your account"}.</p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">New password<input type="password" name="new-password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none focus:border-[#8ab4ff]" /></label>
        <label className="flex flex-col gap-2 text-[13px] font-medium text-[#d4d8e0]">Confirm new password<input type="password" name="confirm-password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#0b0c10] px-3 text-[14px] text-white outline-none focus:border-[#8ab4ff]" /></label>
        {errorText && <p role="alert" className="text-[13px] text-[#ff9c9c]">{errorText}</p>}
        <button type="submit" disabled={busy} className="flex h-11 items-center justify-center gap-2 rounded-full bg-meta px-5 text-[14px] font-semibold text-white hover:bg-meta-hover disabled:opacity-60">{busy ? <LoadingSticker size={24} label="Updating password" /> : null}{busy ? "Updating…" : "Update password"}</button>
      </form>
    </section>
  );
}

function RecoveryCard({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return <section className="max-w-xl rounded-3xl border border-white/10 bg-[#13151a] p-5 shadow-2xl sm:p-7"><h2 className="text-[19px] font-semibold">{title}</h2><p className="mt-2 text-[13px] leading-6 text-[#9aa0ae]">{body}</p>{children && <div className="mt-5">{children}</div>}</section>;
}
