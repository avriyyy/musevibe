import AccountFrame from "@/components/AccountFrame";
import { ResetPasswordScreen } from "@/components/PasswordRecoveryScreens";

export default function ResetPasswordPage() {
  return (
    <AccountFrame
      active="account"
      title="Set a new password"
      description="Finish account recovery using the secure link sent to your email."
    >
      <ResetPasswordScreen />
    </AccountFrame>
  );
}
