import { RegisterForm } from "@/components/auth/register-form";
import { GuestRoute } from "@/components/auth/guest-route";

export default function RegisterPage() {
  return (
    <GuestRoute>
      <RegisterForm />
    </GuestRoute>
  );
}
