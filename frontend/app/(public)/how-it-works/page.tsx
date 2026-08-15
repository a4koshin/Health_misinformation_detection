import type { Metadata } from "next";
import Link from "next/link";

import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
import { Reveal } from "@/components/glass/reveal";
import { PageHeader, PageSection } from "@/components/marketing/page-shell";
import { MaterialIcon } from "@/components/ui/material-icon";

export const metadata: Metadata = {
  title: "How It Works — SomAI",
  description:
    "See how SomAI turns a Somali health claim into a Reliable or Non-Reliable verdict with SomBERTb and doctor review.",
};

const pipeline = [
  {
    icon: "edit_note",
    title: "You submit a claim",
    description:
      "Type or paste a Somali health statement into Prediction — a WhatsApp forward, a social post, or something you heard.",
  },
  {
    icon: "verified_user",
    title: "Input is validated",
    description:
      "Empty, mostly numeric, English, or Arabic text is rejected so SomBERTb only sees suitable Somali input.",
  },
  {
    icon: "health_and_safety",
    title: "Medical gatekeeper",
    description:
      "A medical check (Cerebras / Groq) confirms the text is health-related before classification runs.",
  },
  {
    icon: "neurology",
    title: "SomBERTb classifies",
    description:
      "The SomBERTb transformer model scores the claim and returns Reliable or Non-Reliable.",
  },
  {
    icon: "menu_book",
    title: "Explanation & history",
    description:
      "You get a clear verdict with supporting explanation when available, and the result is saved to your history.",
  },
  {
    icon: "clinical_notes",
    title: "Doctor review when needed",
    description:
      "Non-Reliable claims can be assigned to a doctor for a rewrite. Users can then book a slot and pay with Hormuud EVC Plus.",
  },
];

const modelFacts = [
  {
    icon: "neurology",
    title: "SomBERTb classifier",
    description:
      "A transformer model trained for Somali health claims, producing Reliable or Non-Reliable labels.",
  },
  {
    icon: "health_and_safety",
    title: "Medical gatekeeper",
    description:
      "Non-medical text is filtered before SomBERTb runs, keeping predictions focused on health claims.",
  },
  {
    icon: "diversity_3",
    title: "Human-in-the-loop + EVC Plus",
    description:
      "Doctors correct Non-Reliable claims and publish availability. Users book follow-up help and pay with Hormuud EVC Plus.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <PageSection>
        <PageHeader
          badge="How It Works"
          title={
            <>
              From claim to verdict in{" "}
              <span className="text-brand">six steps</span>
            </>
          }
          description="Under the hood, SomAI runs SomBERTb with medical filtering and an optional doctor workflow. Here is what happens when you submit a claim."
        />
      </PageSection>

      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            The pipeline
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            What happens when you submit
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            Every claim moves through the same stages — from raw text to a clear
            verdict, with doctor help when needed.
          </p>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pipeline.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.07}>
              <GlassCard className="relative h-full overflow-hidden p-6 sm:p-8">
                <span
                  className="pointer-events-none absolute top-6 right-6 text-6xl leading-none font-extrabold tracking-tight text-brand/15 select-none sm:top-8 sm:right-8"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="relative flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <MaterialIcon name={item.icon} size={24} />
                </span>
                <h3 className="relative mt-5 mb-2 text-lg font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="text-sm leading-6 text-ink-muted">
                  {item.description}
                </p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <Reveal>
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <p className="text-sm font-semibold tracking-widest text-brand uppercase">
                Under the hood
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                The system behind the verdict
              </h2>
              <p className="mt-5 text-base leading-7 text-ink-muted">
                SomAI uses SomBERTb to classify Somali health claims as Reliable
                or Non-Reliable, after a medical gatekeeper confirms the text is
                health-related.
              </p>
              <p className="mt-4 text-base leading-7 text-ink-muted">
                Predictions are decision support — not a diagnosis. When a claim
                is Non-Reliable, doctors can rewrite it and users can book an
                appointment with EVC Plus payment for more guidance.
              </p>
              <GlassButton
                asChild
                size="lg"
                className="mt-8 bg-brand bg-none hover:bg-[#e65300]"
              >
                <Link href="/features">
                  Explore the features
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
                {modelFacts.map((fact) => (
                  <div key={fact.title} className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <MaterialIcon name={fact.icon} size={22} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        {fact.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        {fact.description}
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
        <Reveal>
          <div className="rounded-3xl border border-orange-100 bg-orange-50 px-6 py-14 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              See the pipeline in action
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-muted">
              Create a free account and send your first Somali health claim
              through SomBERTb.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <GlassButton
                asChild
                size="lg"
                className="bg-brand bg-none hover:bg-[#e65300]"
              >
                <Link href="/register">
                  Try it now
                  <MaterialIcon name="arrow_forward" size={20} />
                </Link>
              </GlassButton>
              <GlassButton asChild variant="glass" size="lg">
                <Link href="/faq">Read the FAQ</Link>
              </GlassButton>
            </div>
          </div>
        </Reveal>
      </PageSection>
    </div>
  );
}
