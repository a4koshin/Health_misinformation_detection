"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldCheck, Brain, Globe, ArrowRight, Sparkles } from "lucide-react";

import { useAuth } from "@/store/auth-store";

const STATS = [
  { label: "Accuracy", value: "94%" },
  { label: "Somali Health Claims", value: "10K+" },
  { label: "Detection Speed", value: "<2s" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "NLP-Powered Analysis",
    description: "Fine-tuned transformer models trained on Somali health text for precise misinformation detection.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-Class Classification",
    description: "Distinguishes between misinformation, satire, and credible health information with high confidence.",
  },
  {
    icon: Globe,
    title: "Somali Language Native",
    description: "Built specifically for Somali text — not a translation. Understands cultural context and nuance.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/chat");
    }
  }, [isLoading, user, router]);

  if (isLoading || user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-gray-100 px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-black">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">HealthAI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-medium text-gray-500">
          <span className="size-1.5 rounded-full bg-black" />
          Powered by advanced NLP
        </div>

        <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-gray-900 md:text-6xl">
          Detect health misinformation{" "}
          <span className="text-black underline decoration-gray-300 underline-offset-4">
            in Somali text
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-base leading-relaxed text-gray-500 md:text-lg">
          AI-driven analysis that identifies and classifies misleading health claims — built natively for the Somali language.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-80"
          >
            Start detecting
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-gray-200 px-7 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            Sign in
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 divide-x divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
          {STATS.map(({ label, value }) => (
            <div key={label} className="px-8 py-5">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="mt-1 text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 px-6 py-20 md:px-12">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-all hover:border-gray-200 hover:bg-gray-100"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-black">
                <Icon className="size-5 text-white" />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
              <p className="text-xs leading-relaxed text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
