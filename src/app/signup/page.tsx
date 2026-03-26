import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <AuthForm mode="signup" />
    </div>
  );
}
