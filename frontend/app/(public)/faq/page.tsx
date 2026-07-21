import type { Metadata } from "next";
import Link from "next/link";

import { GlassButton } from "@/components/glass/glass-button";
import { Reveal } from "@/components/glass/reveal";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FAQ_ITEMS } from "@/components/marketing/faq-data";
import { PageHeader, PageSection } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "FAQ — HealthAI",
  description:
    "Frequently asked questions about HealthAI's Somali health misinformation detection.",
};

export default function FaqPage() {
  return (
    <div className="space-y-16">
      <PageSection>
        <PageHeader
          badge="FAQ"
          title={
            <>
              Frequently asked{" "}
              <span className="text-gradient-brand">questions</span>
            </>
          }
          description="Everything you need to know about the model, supported languages, privacy, and more."
        />
      </PageSection>

      <PageSection>
        <Reveal className="mx-auto max-w-3xl">
          <FaqAccordion items={FAQ_ITEMS} />
        </Reveal>
      </PageSection>

      <PageSection>
        <Reveal className="text-center">
          <p className="text-[#475569]">Still have questions?</p>
          <GlassButton asChild size="lg" className="mt-4">
            <Link href="/contact">Contact us</Link>
          </GlassButton>
        </Reveal>
      </PageSection>
    </div>
  );
}
