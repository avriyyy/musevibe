import AccountFrame from "@/components/AccountFrame";
import ProfileScreen from "@/components/ProfileScreen";

export default function ProfilePage() {
  return (
    <AccountFrame
      active="profile"
      title="Your profile"
      description="Manage the name shown in MuseVibe and review your account identity."
    >
      <ProfileScreen />
    </AccountFrame>
  );
}
