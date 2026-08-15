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
  { value: "SomBERTb", label: "Prediction model" },
  { value: "2 labels", label: "Reliable / Non-Reliable" },
  { value: "3 roles", label: "User · Doctor · Admin" },
  { value: "Web + app", label: "Cross-platform access" },
];

const features = [
  {
    icon: "bolt",
    title: "Instant SomBERTb checks",
    description:
      "Paste a Somali health claim and get a Reliable or Non-Reliable verdict with an explanation.",
  },
  {
    icon: "health_and_safety",
    title: "Medical gatekeeper",
    description:
      "Non-medical text is filtered before classification, so SomBERTb only scores real health claims.",
  },
  {
    icon: "rate_review",
    title: "Doctor corrections",
    description:
      "Admins assign Non-Reliable claims to doctors. Rewrites appear on Corrections for the user.",
  },
  {
    icon: "event_available",
    title: "Appointments with EVC Plus",
    description:
      "After a correction, book a doctor’s published time slot and pay securely with Hormuud EVC Plus before the request is sent.",
  },
  {
    icon: "upload_file",
    title: "Dataset predictions",
    description:
      "Upload .txt, CSV, or Excel files and classify many claims in one run with per-row results.",
  },
  {
    icon: "monitoring",
    title: "Admin operations",
    description:
      "Manage users and doctors, assign reviews, and follow activity in the audit log.",
  },
];

const steps = [
  {
    icon: "edit_note",
    title: "Enter a claim",
    description:
      "Type or paste a Somali health statement from social media, WhatsApp, or the news.",
  },
  {
    icon: "neurology",
    title: "SomBERTb analyzes it",
    description:
      "A medical check runs first, then SomBERTb labels the claim Reliable or Non-Reliable.",
  },
  {
    icon: "verified",
    title: "Review or book help",
    description:
      "See the verdict and explanation. If Non-Reliable, a doctor can correct it and you can book a time — paid with EVC Plus.",
  },
];

const reasons = [
  {
    icon: "science",
    title: "Built for Somali health text",
    description:
      "SomBERTb is trained for Somali claims, with strict validation against empty, English, Arabic, or numeric-only input.",
  },
  {
    icon: "clinical_notes",
    title: "Human review when needed",
    description:
      "Non-Reliable results are not the end — doctors rewrite claims, and users can book a paid EVC Plus appointment for follow-up.",
  },
  {
    icon: "diversity_3",
    title: "Built for the community",
    description:
      "Designed around how health rumors travel in Somali-speaking communities, on web and mobile.",
  },
];

const testimonials = [
  {
    quote:
      "SomAI helped me check a viral claim in our family group chat within seconds. The Reliable / Non-Reliable label was easy to understand.",
    name: "Amina H.",
    role: "Community health volunteer",
  },
  {
    quote:
      "I use prediction and history to pre-screen Somali health stories. When something is Non-Reliable, the doctor rewrite is especially useful.",
    name: "Mohamed A.",
    role: "Journalism student",
  },
  {
    quote:
      "Dataset upload let us classify a full research file at once, and the doctor workflow closes the loop for claims that need human review.",
    name: "Dr. Layla O.",
    role: "Public health researcher",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <GlassHero />

      <PageSection>
        <Reveal>
          <GlassCard
            strong
            className="grid grid-cols-2 gap-8 px-8 py-10 lg:grid-cols-4"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-gradient-brand text-3xl font-normal tracking-tight sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm text-[#475569]">{stat.label}</p>
              </div>
            ))}
          </GlassCard>
        </Reveal>
      </PageSection>

      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
            Everything you need to verify Somali health claims
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#475569]">
            From one claim check to doctor corrections and EVC Plus appointments
            — SomAI covers the full workflow.
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

      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#475569]">
            From a suspicious claim to a clear verdict — and help when you need
            it.
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

      <PageSection>
        <Reveal>
          <GlassCard strong className="overflow-hidden p-8 sm:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
                  Why choose SomAI
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-[#475569]">
                  Harmful health rumors move fast. SomAI gives Somali speakers a
                  clear Reliable / Non-Reliable check, plus a path to a
                  reviewing doctor.
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

      <PageSection>
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
            Trusted by curious minds
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#475569]">
            Students, researchers, and community leaders use SomAI to check
            claims.
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

      <PageSection>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#475569]">
              Quick answers about SomBERTb, privacy, doctors, and datasets.
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

      <PageSection>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-[#ff5c00] px-8 py-14 text-center sm:px-12">
            <div className="absolute -top-20 -right-20 size-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ready to check your next Somali health claim?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/80">
                Create a free account, run a SomBERTb prediction, and follow
                Non-Reliable claims through doctor review when needed.
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
