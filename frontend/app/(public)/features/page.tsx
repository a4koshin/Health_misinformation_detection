import type { Metadata } from "next";
import Link from "next/link";

import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassFeatureCard } from "@/components/glass/glass-feature-card";
import { Reveal } from "@/components/glass/reveal";
import { PageHeader, PageSection } from "@/components/marketing/page-shell";
import { MaterialIcon } from "@/components/ui/material-icon";

export const metadata: Metadata = {
  title: "Features — SomAI",
  description:
    "Explore SomAI features: SomBERTb prediction, medical gatekeeper, doctor corrections, EVC Plus appointments, and batch dataset analysis.",
};

const coreFeatures = [
  {
    icon: "bolt",
    title: "SomBERTb claim detection",
    description:
      "Submit a Somali health claim and receive a Reliable or Non-Reliable verdict powered by the SomBERTb transformer model.",
  },
  {
    icon: "health_and_safety",
    title: "Medical gatekeeper",
    description:
      "Before classification, a medical check filters out non-health text so SomBERTb only scores real health claims.",
  },
  {
    icon: "rate_review",
    title: "Doctor corrections",
    description:
      "Admins assign Non-Reliable claims to doctors. Rewrites appear on Corrections so users see a clearer version.",
  },
  {
    icon: "event_available",
    title: "EVC Plus appointment booking",
    description:
      "Book a doctor’s published slot after a correction and pay with Hormuud EVC Plus before the request is created.",
  },
  {
    icon: "history",
    title: "Private prediction history",
    description:
      "Every analysis is stored on your account. Users can revisit results; admins can deactivate or reactivate records when needed.",
  },
  {
    icon: "shield_person",
    title: "Secure role-based access",
    description:
      "JWT sessions and User / Doctor / Admin roles protect prediction, review, and operations workflows.",
  },
];

const workflowHighlights = [
  {
    icon: "edit_note",
    title: "Ask in plain Somali",
    description: "Type the claim exactly as you heard it — no special format.",
  },
  {
    icon: "neurology",
    title: "SomBERTb classifies it",
    description:
      "After the medical gatekeeper, SomBERTb labels the claim Reliable or Non-Reliable.",
  },
  {
    icon: "clinical_notes",
    title: "Doctors close the loop",
    description:
      "Non-Reliable claims can be rewritten, then users book a follow-up and pay with EVC Plus.",
  },
];

const adminFeatures = [
  {
    icon: "monitoring",
    title: "Admin operations",
    description:
      "Manage users and doctors, assign Non-Reliable reviews, and follow activity in the audit log.",
  },
  {
    icon: "group",
    title: "Doctor verification",
    description:
      "Review doctor profiles and licenses, then enable them for corrections and availability.",
  },
  {
    icon: "upload_file",
    title: "Batch dataset predictions",
    description:
      "Upload .txt, CSV, or Excel and classify every row, with per-row Reliable / Non-Reliable results.",
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
          description="From one claim check to doctor review and EVC Plus appointments — SomAI covers the full Somali health claim workflow."
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
            Six capabilities that work together — from prediction to human
            review when a claim is Non-Reliable.
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
                Checking a claim stays simple
              </h2>
              <p className="mt-5 text-base leading-7 text-ink-muted">
                SomAI wraps SomBERTb, medical filtering, and doctor workflows in
                a clear prediction experience on web and mobile — so verifying a
                claim is as easy as pasting it.
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
            Administrators get tools for users, doctors, review assignment, and
            large-scale analysis jobs.
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
              Create a free account and put SomBERTb prediction and doctor
              workflows to work in minutes.
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
