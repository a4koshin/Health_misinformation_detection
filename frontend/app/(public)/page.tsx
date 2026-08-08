import Link from "next/link";

import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
import { GlassFeatureCard } from "@/components/glass/glass-feature-card";
import { GlassHero } from "@/components/glass/glass-hero";
import { Reveal } from "@/components/glass/reveal";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQ_ITEMS } from "@/components/marketing/faq-data";
import { PageSection } from "@/components/marketing/page-shell";
import { MaterialIcon } from "@/components/ui/material-icon";

const stats = [
  { value: "10K+", label: "Claims analyzed" },
  { value: "94%", label: "Model accuracy" },
  { value: "<1s", label: "Average response" },
  { value: "100%", label: "Somali focused" },
];

const features = [
  {
    icon: "bolt",
    title: "Instant detection",
    description:
      "Paste any Somali health claim and get a Reliable or Misinformation verdict in under a second.",
  },
  {
    icon: "language",
    title: "Somali-first NLP",
    description:
      "Purpose-built preprocessing and stopword handling tuned specifically for the Somali language.",
  },
  {
    icon: "history",
    title: "Conversation history",
    description:
      "Every check is saved to your private history so you can revisit, share, or delete past analyses.",
  },
  {
    icon: "shield_person",
    title: "Secure accounts",
    description:
      "JWT-protected authentication with role-based access keeps your data private and admin tools locked down.",
  },
  {
    icon: "upload_file",
    title: "Batch dataset analysis",
    description:
      "Admins can upload entire CSV datasets and classify thousands of claims in a single run.",
  },
  {
    icon: "monitoring",
    title: "Live dashboard",
    description:
      "Track users, detections, and the reliable-to-misinformation ratio from a real-time admin dashboard.",
  },
];

const steps = [
  {
    icon: "edit_note",
    title: "Enter a claim",
    description:
      "Type or paste a Somali health statement — anything you saw on social media, WhatsApp, or the news.",
  },
  {
    icon: "neurology",
    title: "AI analyzes it",
    description:
      "The text is cleaned, vectorized with TF-IDF, and classified by a trained Support Vector Machine.",
  },
  {
    icon: "verified",
    title: "Get a clear verdict",
    description:
      "You instantly see whether the claim is Reliable or Misinformation, saved to your history.",
  },
];

const reasons = [
  {
    icon: "science",
    title: "Research-grade model",
    description:
      "Trained and evaluated on a curated, labeled Somali health dataset using rigorous ML methodology.",
  },
  {
    icon: "block",
    title: "Strict input validation",
    description:
      "Non-Somali, numeric, or empty input is rejected with clear feedback, so results are never guesswork.",
  },
  {
    icon: "diversity_3",
    title: "Built for the community",
    description:
      "Designed around how health misinformation actually spreads in Somali-speaking communities.",
  },
];

const testimonials = [
  {
    quote:
      "HealthAI helped me debunk a viral claim in our family group chat within seconds. The verdict was clear and easy to share.",
    name: "Amina H.",
    role: "Community health volunteer",
  },
  {
    quote:
      "As a journalism student, I use it to pre-screen Somali health stories before quoting them. It has become part of my workflow.",
    name: "Mohamed A.",
    role: "Journalism student",
  },
  {
    quote:
      "The batch dataset feature let us classify our entire research corpus overnight. The dashboard makes reporting effortless.",
    name: "Dr. Layla O.",
    role: "Public health researcher",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <GlassHero />

      {/* Statistics */}
      <PageSection>
        <Reveal>
          <GlassCard strong className="grid grid-cols-2 gap-8 px-8 py-10 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-gradient-brand text-4xl font-normal tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-[#475569]">{stat.label}</p>
              </div>
            ))}
          </GlassCard>
        </Reveal>
      </PageSection>

      {/* Features */}
      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
            Everything you need to fight misinformation
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#475569]">
            A complete toolkit for verifying Somali health claims, from
            one-off checks to full dataset audits.
          </p>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.06}>
              <GlassFeatureCard {...feature} className="h-full" />
            </Reveal>
          ))}
        </div>
      </PageSection>

      {/* How it works */}
      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#475569]">
            From a suspicious claim to a confident verdict in three steps.
          </p>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.1}>
              <GlassCard className="relative h-full p-7">
                <span className="absolute top-6 right-6 text-5xl font-normal text-[#ff5c00]/10">
                  {index + 1}
                </span>
                <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#ff5c00] text-white shadow-[0_10px_24px_-10px_rgba(255,92,0,0.7)]">
                  <MaterialIcon name={step.icon} size={24} />
                </span>
                <h3 className="mb-2 text-lg font-semibold text-[#0f172a]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#475569]">
                  {step.description}
                </p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </PageSection>

      {/* Why choose HealthAI */}
      <PageSection>
        <Reveal>
          <GlassCard strong className="overflow-hidden p-8 sm:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
                  Why choose HealthAI
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-[#475569]">
                  Misinformation spreads faster than facts. HealthAI gives
                  Somali speakers a scientific, transparent way to verify
                  health claims before they spread.
                </p>
                <GlassButton asChild size="lg" className="mt-8">
                  <Link href="/about">
                    Learn more about us
                    <MaterialIcon name="arrow_forward" size={20} />
                  </Link>
                </GlassButton>
              </div>
              <div className="space-y-4">
                {reasons.map((reason) => (
                  <div
                    key={reason.title}
                    className="glass flex items-start gap-4 rounded-2xl p-5"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#ff5c00]/10 text-[#ff5c00]">
                      <MaterialIcon name={reason.icon} size={22} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[#0f172a]">
                        {reason.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#475569]">
                        {reason.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </PageSection>

      {/* Testimonials */}
      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
            Trusted by curious minds
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#475569]">
            Students, researchers, and community leaders use HealthAI every day.
          </p>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 0.08}>
              <GlassCard className="flex h-full flex-col p-7">
                <MaterialIcon
                  name="format_quote"
                  size={32}
                  className="mb-4 text-[#ff8a4d]"
                />
                <p className="flex-1 text-sm leading-relaxed text-[#0f172a]">
                  {testimonial.quote}
                </p>
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-[#64748b]">{testimonial.role}</p>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </PageSection>

      {/* FAQ preview */}
      <PageSection>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#475569]">
              Quick answers about the model, privacy, and supported languages.
            </p>
            <GlassButton asChild variant="glass" size="md" className="mt-6">
              <Link href="/faq">
                View all FAQs
                <MaterialIcon name="arrow_forward" size={18} />
              </Link>
            </GlassButton>
          </Reveal>
          <Reveal delay={0.1}>
            <FaqAccordion items={FAQ_ITEMS.slice(0, 3)} />
          </Reveal>
        </div>
      </PageSection>

      {/* Contact CTA */}
      <PageSection>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-[#ff5c00] px-8 py-14 text-center sm:px-12">
            <div className="absolute -top-20 -right-20 size-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ready to stop misinformation in its tracks?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/80">
                Create a free account and start verifying Somali health claims
                today, or reach out with any questions.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <GlassButton
                  asChild
                  size="lg"
                  className="bg-white bg-none text-[#cc4a00] shadow-[0_16px_32px_-12px_rgba(15,23,42,0.4)] hover:bg-white/90"
                >
                  <Link href="/register">Create free account</Link>
                </GlassButton>
                <GlassButton
                  asChild
                  size="lg"
                  className="border border-white/40 bg-white/10 bg-none text-white backdrop-blur-xl hover:bg-white/20"
                >
                  <Link href="/contact">Contact us</Link>
                </GlassButton>
              </div>
            </div>
          </div>
        </Reveal>
      </PageSection>
    </div>
  );
}
