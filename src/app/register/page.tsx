import AuthPageFrame from "@/components/AuthPageFrame";
import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <AuthPageFrame>
      <AuthForm initialMode="create-account" />
    </AuthPageFrame>
  );
}
