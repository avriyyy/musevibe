import AuthPageFrame from "@/components/AuthPageFrame";
import AuthForm from "@/components/AuthForm";

export default function SignInPage() {
  return (
    <AuthPageFrame>
      <AuthForm initialMode="sign-in" />
    </AuthPageFrame>
  );
}
