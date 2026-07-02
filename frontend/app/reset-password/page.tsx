import { Suspense } from "react";

import { GuestRoute } from "@/components/auth/guest-route";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <GuestRoute>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </GuestRoute>
  );
}
