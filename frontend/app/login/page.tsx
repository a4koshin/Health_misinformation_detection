import { LoginForm } from "@/components/auth/login-form";
import { GuestRoute } from "@/components/auth/guest-route";

export default function LoginPage() {
  return (
    <GuestRoute>
      <LoginForm />
    </GuestRoute>
  );
}
