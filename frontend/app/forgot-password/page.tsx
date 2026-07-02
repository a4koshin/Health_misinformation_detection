import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { GuestRoute } from "@/components/auth/guest-route";

export default function ForgotPasswordPage() {
  return (
    <GuestRoute>
      <ForgotPasswordForm />
    </GuestRoute>
  );
}
