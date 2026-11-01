import AccountFrame from "@/components/AccountFrame";
import SettingsScreen from "@/components/SettingsScreen";

export default function SettingsPage() {
  return (
    <AccountFrame
      active="settings"
      title="Settings"
      description="Review account security, workspace sync, and this browser’s default AI model."
    >
      <SettingsScreen />
    </AccountFrame>
  );
}
