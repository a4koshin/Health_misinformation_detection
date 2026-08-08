import { GlassCard } from "@/components/glass/glass-card";
import { Reveal } from "@/components/glass/reveal";
import { PageHeader, PageSection } from "@/components/marketing/page-shell";

export type LegalSection = {
  heading: string;
  body: string[];
};

export function LegalPage({
  badge,
  title,
  updated,
  sections,
}: {
  badge: string;
  title: React.ReactNode;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="space-y-14">
      <PageSection>
        <PageHeader badge={badge} title={title} description={`Last updated: ${updated}`} />
      </PageSection>

      <PageSection>
        <Reveal className="mx-auto max-w-3xl">
          <GlassCard strong className="space-y-8 p-8 sm:p-10">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="mb-3 text-lg font-semibold text-[#0f172a]">
                  {section.heading}
                </h2>
                <div className="space-y-3">
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 40)}
                      className="text-sm leading-relaxed text-[#475569]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </GlassCard>
        </Reveal>
      </PageSection>
    </div>
  );
}
