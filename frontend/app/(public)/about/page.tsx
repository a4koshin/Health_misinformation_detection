import type { Metadata } from "next";
import Link from "next/link";

import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
import { Reveal } from "@/components/glass/reveal";
import { PageHeader, PageSection } from "@/components/marketing/page-shell";
import { MaterialIcon } from "@/components/ui/material-icon";

export const metadata: Metadata = {
  title: "About — SomAI",
  description:
    "Learn why SomAI exists and how SomBERTb helps Somali speakers verify health claims.",
};

const stats = [
  { value: "SomBERTb", label: "Prediction model" },
  { value: "2 labels", label: "Reliable / Non-Reliable" },
  { value: "3 roles", label: "User · Doctor · Admin" },
  { value: "100%", label: "Somali focused" },
];

const milestones = [
  {
    icon: "lightbulb",
    title: "The observation",
    description:
      "Health rumors spread through Somali WhatsApp groups and social feeds faster than facts can catch up — and few tools supported the language well.",
  },
  {
    icon: "dataset",
    title: "The research",
    description:
      "Labeled Somali health claims were used to train and evaluate models, leading to SomBERTb as the production classifier for Reliable vs Non-Reliable.",
  },
  {
    icon: "rocket_launch",
    title: "The product",
    description:
      "SomAI grew into a full platform: prediction, medical gatekeeping, history, doctor corrections, EVC Plus appointments, and admin operations — on web and mobile.",
  },
];

const values = [
  {
    icon: "public",
    title: "Community first",
    description:
      "Somali-speaking communities deserve health information they can trust. Everything we build starts there.",
  },
  {
    icon: "science",
    title: "Scientific rigor",
    description:
      "SomBERTb classifies claims with a transparent Reliable / Non-Reliable decision, plus explanations when available.",
  },
  {
    icon: "visibility",
    title: "Transparency",
    description:
      "We clearly state what the system can and cannot do. Predictions are decision support, never medical advice.",
  },
  {
    icon: "lock",
    title: "Privacy by design",
    description:
      "Your predictions belong to your account. Authentication and role-based access are built in from the start.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <PageSection>
        <PageHeader
          badge="About Us"
          title={
            <>
              Verifying Somali health claims,{" "}
              <span className="text-brand">one check at a time</span>
            </>
          }
          description="SomAI gives every Somali speaker a fast way to check health claims before they spread — powered by SomBERTb and backed by doctor review when needed."
        />
      </PageSection>

      <PageSection>
        <Reveal>
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <p className="text-sm font-semibold tracking-widest text-brand uppercase">
                Why we exist
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Better health decisions begin with trusted information
              </h2>
              <p className="mt-5 text-base leading-7 text-ink-muted">
                Misleading health claims travel quickly through social networks,
                especially when everyday tools do not support Somali well. SomAI
                was created to close that gap.
              </p>
              <p className="mt-4 text-base leading-7 text-ink-muted">
                We combine SomBERTb classification with medical filtering and a
                doctor workflow so anyone can check a claim — and get human help
                when a result is Non-Reliable.
              </p>
              <GlassButton
                asChild
                size="lg"
                className="mt-8 bg-brand bg-none hover:bg-[#e65300]"
              >
                <Link href="/how-it-works">
                  See how SomAI works
                  <MaterialIcon name="arrow_forward" size={20} />
                </Link>
              </GlassButton>
            </div>

            <div className="relative">
              <div
                className="absolute -inset-4 rounded-[2rem] bg-brand/5"
                aria-hidden="true"
              />
              <GlassCard
                strong
                className="relative overflow-hidden p-7 sm:p-10"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-white">
                  <MaterialIcon name="format_quote" size={25} />
                </span>
                <blockquote className="mt-7 text-2xl leading-snug font-normal tracking-tight text-ink sm:text-3xl">
                  Technology should make trusted health information easier to
                  reach, not harder to understand.
                </blockquote>
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <p className="font-semibold text-ink">The SomAI mission</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Built for Somali speakers, designed for everyone
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>
        </Reveal>
      </PageSection>

      <PageSection>
        <Reveal>
          <div className="grid overflow-hidden rounded-3xl bg-brand text-white md:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`px-6 py-8 text-center sm:py-10 ${
                  index > 0
                    ? "border-t border-white/20 md:border-t-0 md:border-l"
                    : ""
                }`}
              >
                <p className="text-4xl font-normal tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-white/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </PageSection>

      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Our journey
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            From research idea to working platform
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            A focused response to a real community need, developed one
            evidence-based step at a time.
          </p>
        </Reveal>
        <div className="relative grid gap-8 md:grid-cols-3 md:gap-6">
          <div
            className="absolute top-6 right-[16%] left-[16%] hidden h-px bg-gray-200 md:block"
            aria-hidden="true"
          />
          {milestones.map((milestone, index) => (
            <Reveal key={milestone.title} delay={index * 0.1}>
              <article className="relative text-center">
                <span className="relative mx-auto flex size-12 items-center justify-center rounded-full border-4 border-white bg-brand text-sm font-semibold text-white shadow-sm">
                  {index + 1}
                </span>
                <span className="mx-auto mt-6 flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <MaterialIcon name={milestone.icon} size={22} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">
                  {milestone.title}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-muted">
                  {milestone.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            What guides us
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Built around trust, clarity, and care
          </h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2">
          {values.map((value, index) => (
            <Reveal key={value.title} delay={(index % 2) * 0.08}>
              <GlassCard className="flex h-full items-start gap-5 p-6 sm:p-8">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <MaterialIcon name={value.icon} size={24} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {value.description}
                  </p>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <Reveal>
          <div className="rounded-3xl border border-orange-100 bg-orange-50 px-6 py-14 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Help stop misleading claims before they spread
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-muted">
              Create a free account and start checking Somali health claims with
              SomBERTb.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <GlassButton
                asChild
                size="lg"
                className="bg-brand bg-none hover:bg-[#e65300]"
              >
                <Link href="/register">
                  Start checking claims
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
