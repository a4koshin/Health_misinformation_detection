import type { Metadata } from "next";
import Link from "next/link";

import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassFeatureCard } from "@/components/glass/glass-feature-card";
import { Reveal } from "@/components/glass/reveal";
import { PageHeader, PageSection } from "@/components/marketing/page-shell";
import { MaterialIcon } from "@/components/ui/material-icon";

export const metadata: Metadata = {
  title: "Features — HealthAI",
  description:
    "Explore HealthAI's features: instant Somali claim detection, history, dashboards, and batch dataset analysis.",
};

const coreFeatures = [
  {
    icon: "bolt",
    title: "Instant claim detection",
    description:
      "Submit any Somali health claim and receive a Reliable or Misinformation verdict in under a second, powered by a trained SVM classifier.",
  },
  {
    icon: "language",
    title: "Somali-first NLP pipeline",
    description:
      "Text cleaning, stopword removal, and TF-IDF vectorization tuned specifically for Somali — with strict rejection of unsupported languages.",
  },
  {
    icon: "chat",
    title: "Conversational interface",
    description:
      "A familiar chat experience: ask, get a verdict, and keep the conversation going with follow-up claims.",
  },
  {
    icon: "history",
    title: "Private history",
    description:
      "Every analysis is stored in your personal history. Search, revisit, share, or delete conversations at any time.",
  },
  {
    icon: "shield_person",
    title: "Secure authentication",
    description:
      "JWT-based sessions, password reset by email, and role-based access control protect every account.",
  },
  {
    icon: "block",
    title: "Smart input validation",
    description:
      "Empty, numeric, special-character, Arabic, or English input is rejected with a clear, specific message.",
  },
];

const workflowHighlights = [
  {
    icon: "chat_bubble",
    title: "Ask in plain Somali",
    description: "Type the claim exactly as you heard it — no special format.",
  },
  {
    icon: "speed",
    title: "Verdict in under a second",
    description: "The model classifies the claim instantly, with no queue.",
  },
  {
    icon: "folder_shared",
    title: "Everything saved privately",
    description: "Your checks live in your history, ready to revisit anytime.",
  },
];

const adminFeatures = [
  {
    icon: "monitoring",
    title: "Admin dashboard",
    description:
      "Real-time counts of users, admins, detections, and the reliable-to-misinformation split.",
  },
  {
    icon: "group",
    title: "User management",
    description:
      "Full CRUD over accounts: create users, promote admins, reset passwords, and remove accounts safely.",
  },
  {
    icon: "upload_file",
    title: "Batch dataset predictions",
    description:
      "Upload a CSV of claims and classify every row at once, with per-row results and error reporting.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <PageSection>
        <PageHeader
          badge="Features"
          title={
            <>
              Powerful tools,{" "}
              <span className="text-brand">beautifully simple</span>
            </>
          }
          description="From one-off claim checks to full dataset audits, HealthAI covers the entire misinformation detection workflow."
        />
      </PageSection>

      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Core platform
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Everything you need to verify a claim
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            Six capabilities that work together, from the moment you type a
            claim to the moment you get a verdict.
          </p>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {coreFeatures.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.06}>
              <GlassFeatureCard {...feature} className="h-full" />
            </Reveal>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <Reveal>
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <p className="text-sm font-semibold tracking-widest text-brand uppercase">
                Built for everyday use
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Checking a claim feels like sending a message
              </h2>
              <p className="mt-5 text-base leading-7 text-ink-muted">
                No forms, no jargon, no waiting. HealthAI wraps a production
                machine learning pipeline in a chat experience anyone can use —
                so verifying a claim is as easy as forwarding it.
              </p>
              <GlassButton
                asChild
                size="lg"
                className="mt-8 bg-brand bg-none hover:bg-[#e65300]"
              >
                <Link href="/how-it-works">
                  See how it works
                  <MaterialIcon name="arrow_forward" size={20} />
                </Link>
              </GlassButton>
            </div>

            <div className="relative">
              <div
                className="absolute -inset-4 rounded-[2rem] bg-brand/5"
                aria-hidden="true"
              />
              <GlassCard strong className="relative space-y-6 p-7 sm:p-10">
                {workflowHighlights.map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <MaterialIcon name={item.icon} size={22} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </GlassCard>
            </div>
          </div>
        </Reveal>
      </PageSection>

      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            For administrators
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Complete control for your team
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            Administrators get an operations suite for managing the platform,
            its users, and large-scale analysis jobs.
          </p>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {adminFeatures.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.08}>
              <GlassCard className="h-full p-6 sm:p-8">
                <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-brand text-white">
                  <MaterialIcon name={feature.icon} size={24} />
                </span>
                <h3 className="mb-2 text-lg font-semibold text-ink">
                  {feature.title}
                </h3>
                <p className="text-sm leading-6 text-ink-muted">
                  {feature.description}
                </p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <Reveal>
          <div className="rounded-3xl border border-orange-100 bg-orange-50 px-6 py-14 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Ready to try it yourself?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-muted">
              Create a free account and put every one of these features to work
              in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <GlassButton
                asChild
                size="lg"
                className="bg-brand bg-none hover:bg-[#e65300]"
              >
                <Link href="/register">
                  Create free account
                  <MaterialIcon name="arrow_forward" size={20} />
                </Link>
              </GlassButton>
              <GlassButton asChild variant="glass" size="lg">
                <Link href="/contact">Contact us</Link>
              </GlassButton>
            </div>
          </div>
        </Reveal>
      </PageSection>
    </div>
  );
}
