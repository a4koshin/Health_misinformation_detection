import type { Metadata } from "next";
import "./globals.css";

import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "HealthAI — Sign in",
  description:
    "Detect and classify health-related misinformation in Somali text.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
