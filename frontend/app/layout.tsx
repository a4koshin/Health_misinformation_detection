import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthInitializer } from "@/components/providers/AuthInitializer";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Health Misinformation Detection",
  description:
    "A machine learning and NLP-based system designed to detect and classify health-related misinformation in Somali text, helping improve access to reliable health information.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white font-sans text-gray-900">
        <AuthInitializer>{children}</AuthInitializer>
      </body>
    </html>
  );
}
