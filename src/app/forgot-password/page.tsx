import AccountFrame from "@/components/AccountFrame";
import { ForgotPasswordScreen } from "@/components/PasswordRecoveryScreens";

export default function ForgotPasswordPage() {
  return (
    <AccountFrame
      active="account"
      title="Recover your account"
      description="Request a secure password reset link by email."
    >
      <ForgotPasswordScreen />
    </AccountFrame>
  );
}
