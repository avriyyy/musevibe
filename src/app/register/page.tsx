import AccountFrame from "@/components/AccountFrame";
import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <AccountFrame
      active="account"
      title="Create your MuseVibe account"
      description="Register with email and password to sync new workspaces across devices. Existing guest projects stay on this browser."
    >
      <AuthForm initialMode="create-account" />
    </AccountFrame>
  );
}
