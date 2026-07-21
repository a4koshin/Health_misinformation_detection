import type { Metadata } from "next";
import Link from "next/link";

import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
import { Reveal } from "@/components/glass/reveal";
import { PageHeader, PageSection } from "@/components/marketing/page-shell";
import { MaterialIcon } from "@/components/ui/material-icon";

export const metadata: Metadata = {
  title: "How It Works — HealthAI",
  description:
    "See how HealthAI turns a Somali health claim into a clear Reliable or Misinformation verdict.",
};

const pipeline = [
  {
    icon: "edit_note",
    title: "You submit a claim",
    description:
      "Type or paste any Somali health statement into the chat — a WhatsApp forward, a social media post, or something you heard.",
  },
  {
    icon: "verified_user",
    title: "Input is validated",
    description:
      "The system checks that the text is genuine Somali. Empty, numeric, English, or Arabic input is rejected with a specific message.",
  },
  {
    icon: "cleaning_services",
    title: "Text is preprocessed",
    description:
      "The claim is lowercased, cleaned of noise, and stripped of Somali stopwords — exactly matching how the model was trained.",
  },
  {
    icon: "functions",
    title: "TF-IDF vectorization",
    description:
      "The cleaned text is transformed into a numerical vector using the same TF-IDF vocabulary the model learned from.",
  },
  {
    icon: "neurology",
    title: "SVM classification",
    description:
      "A trained Support Vector Machine draws the decision boundary and classifies the claim in milliseconds.",
  },
  {
    icon: "task_alt",
    title: "You get a verdict",
    description:
      "The prediction is decoded to a human-readable label — Reliable or Misinformation — and saved to your history.",
  },
];

const modelFacts = [
  {
    icon: "neurology",
    title: "Linear Support Vector Machine",
    description:
      "Chosen as the best performer among the models evaluated on the Somali health claims corpus.",
  },
  {
    icon: "functions",
    title: "TF-IDF features",
    description:
      "Claims are represented with the exact vocabulary and weighting learned during training.",
  },
  {
    icon: "sync",
    title: "Consistent preprocessing",
    description:
      "The same cleaning and stopword removal runs at training and inference, so results stay reproducible.",
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
          description="Under the hood, HealthAI runs a production machine learning pipeline. Here is exactly what happens when you press send."
        />
      </PageSection>

      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            The pipeline
          </p>
          <h2 className="mt-4 text-3xl font-normal tracking-tight text-ink sm:text-4xl">
            What happens when you press send
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            Every claim moves through the same six stages, from raw text to a
            clear verdict.
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
                <h3 className="relative mt-5 mb-2 text-lg font-normal text-ink">
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
              <h2 className="mt-4 text-3xl font-normal tracking-tight text-ink sm:text-4xl">
                The model behind the magic
              </h2>
              <p className="mt-5 text-base leading-7 text-ink-muted">
                HealthAI uses a Linear Support Vector Machine trained on a
                labeled corpus of Somali health claims, paired with TF-IDF
                features and a label encoder.
              </p>
              <p className="mt-4 text-base leading-7 text-ink-muted">
                The exact preprocessing used in training is replicated at
                inference time, so predictions stay consistent and
                reproducible.
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
            <h2 className="mx-auto max-w-2xl text-3xl font-normal tracking-tight text-ink sm:text-4xl">
              See the pipeline in action
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-muted">
              Create a free account and send your first Somali health claim
              through all six steps.
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
