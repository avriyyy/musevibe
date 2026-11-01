import AccountFrame from "@/components/AccountFrame";
import AuthForm from "@/components/AuthForm";

export default function SignInPage() {
  return (
    <AccountFrame
      active="account"
      title="Sign in to MuseVibe"
      description="Access your account-owned workspaces while keeping guest projects local to this browser."
    >
      <AuthForm initialMode="sign-in" />
    </AccountFrame>
  );
}
