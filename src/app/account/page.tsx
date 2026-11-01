import AccountFrame from "@/components/AccountFrame";
import AuthForm from "@/components/AuthForm";

export default function AccountPage() {
  return (
    <AccountFrame
      active="account"
      title="Your MuseVibe account"
      description="Sign in, create an account, and manage where your workspaces are saved."
    >
      <AuthForm initialMode="sign-in" />
    </AccountFrame>
  );
}
