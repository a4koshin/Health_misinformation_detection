import type { Metadata } from "next";
import Link from "next/link";

import { GlassButton } from "@/components/glass/glass-button";
import { GlassCard } from "@/components/glass/glass-card";
import { Reveal } from "@/components/glass/reveal";
import { ContactForm } from "@/components/marketing/contact-form";
import { PageHeader, PageSection } from "@/components/marketing/page-shell";
import { MaterialIcon } from "@/components/ui/material-icon";

export const metadata: Metadata = {
  title: "Contact — HealthAI",
  description: "Get in touch with the HealthAI team.",
};

const contactMethods = [
  {
    icon: "mail",
    title: "Email",
    value: "hello@healthai.app",
    description: "For general questions and feedback.",
  },
  {
    icon: "school",
    title: "Research",
    value: "research@healthai.app",
    description: "For dataset access and academic collaboration.",
  },
  {
    icon: "support_agent",
    title: "Support",
    value: "support@healthai.app",
    description: "For account or technical issues.",
  },
];

export default function ContactPage() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <PageSection>
        <PageHeader
          badge="Contact"
          title={
            <>
              We&apos;d love to{" "}
              <span className="text-brand">hear from you</span>
            </>
          }
          description="Questions, feedback, or collaboration ideas — send us a message and we'll get back to you."
        />
      </PageSection>

      <PageSection>
        <Reveal>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <p className="text-sm font-semibold tracking-widest text-brand uppercase">
                Get in touch
              </p>
              <h2 className="mt-4 text-3xl font-normal tracking-tight text-ink sm:text-4xl">
                Talk to the team behind HealthAI
              </h2>
              <p className="mt-5 text-base leading-7 text-ink-muted">
                Whether you found a claim we should look at, want to use the
                dataset in your research, or just have feedback on the product
                — our inbox is open.
              </p>

              <div className="mt-9 space-y-7">
                {contactMethods.map((method) => (
                  <div key={method.title} className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <MaterialIcon name={method.icon} size={22} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        {method.title}
                      </h3>
                      <a
                        href={`mailto:${method.value}`}
                        className="mt-0.5 block text-sm font-medium text-brand transition-colors hover:text-brand-deep"
                      >
                        {method.value}
                      </a>
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        {method.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex items-center gap-3 border-t border-gray-200 pt-6">
                <MaterialIcon
                  name="schedule"
                  size={20}
                  className="text-brand"
                />
                <p className="text-sm text-ink-muted">
                  We usually reply within 1–2 business days.
                </p>
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -inset-4 rounded-[2rem] bg-brand/5"
                aria-hidden="true"
              />
              <GlassCard strong className="relative p-7 sm:p-10">
                <h2 className="text-xl font-normal text-ink">
                  Send a message
                </h2>
                <p className="mt-1 mb-7 text-sm text-ink-muted">
                  Fill in the form and we&apos;ll get back to you by email.
                </p>
                <ContactForm />
              </GlassCard>
            </div>
          </div>
        </Reveal>
      </PageSection>

      <PageSection>
        <Reveal>
          <div className="rounded-3xl border border-orange-100 bg-orange-50 px-6 py-14 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-normal tracking-tight text-ink sm:text-4xl">
              Looking for quick answers?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-muted">
              Most common questions about accuracy, language support, and
              privacy are already answered in the FAQ.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <GlassButton
                asChild
                size="lg"
                className="bg-brand bg-none hover:bg-[#e65300]"
              >
                <Link href="/faq">
                  Read the FAQ
                  <MaterialIcon name="arrow_forward" size={20} />
                </Link>
              </GlassButton>
              <GlassButton asChild variant="glass" size="lg">
                <Link href="/register">Create free account</Link>
              </GlassButton>
            </div>
          </div>
        </Reveal>
      </PageSection>
    </div>
  );
}
