import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions — SomAI",
  description: "The terms and conditions for using SomAI.",
};

const sections = [
  {
    heading: "1. Acceptance of terms",
    body: [
      "By creating an account or using SomAI you agree to these Terms & Conditions and our Privacy Policy. If you do not agree, please do not use the service.",
    ],
  },
  {
    heading: "2. Description of the service",
    body: [
      "SomAI is an AI-assisted tool that classifies Somali-language health claims as Reliable or Non-Reliable using SomBERTb, with optional doctor corrections and appointment booking paid via Hormuud EVC Plus.",
      "The service is provided for informational and educational purposes. It is a research project and is offered free of charge.",
    ],
  },
  {
    heading: "3. Not medical advice",
    body: [
      "SomAI does not provide medical advice, diagnosis, or treatment. Predictions are automated classifications of text and can be wrong. Doctor corrections and appointments are supportive, not a substitute for in-person clinical care.",
      "Always consult a qualified healthcare professional for medical decisions. Never disregard professional advice because of a SomAI result.",
    ],
  },
  {
    heading: "4. Acceptable use",
    body: [
      "You agree not to misuse the service, including attempting to access other users' data, overloading the system with automated requests, or using the service to generate or spread misleading health claims.",
      "Administrator and doctor features may only be used by authorized accounts for legitimate platform management and clinical review.",
      "Appointment payments are processed through Hormuud EVC Plus. You are responsible for using a number you control and for approving or declining payment prompts on your device.",
    ],
  },
  {
    heading: "5. Accounts",
    body: [
      "You are responsible for keeping your credentials confidential and for all activity under your account. Notify us immediately of any unauthorized use.",
      "We may suspend accounts that violate these terms or threaten the integrity of the service.",
    ],
  },
  {
    heading: "6. Intellectual property",
    body: [
      "The SomAI application, models, and branding are the intellectual property of the project team. You retain ownership of the text you submit.",
    ],
  },
  {
    heading: "7. Limitation of liability",
    body: [
      "The service is provided 'as is' without warranties of any kind. To the maximum extent permitted by law, we are not liable for any damages arising from use of, or reliance on, the service or its predictions.",
    ],
  },
  {
    heading: "8. Changes to these terms",
    body: [
      "We may revise these terms as the project evolves. Continued use of the service after changes take effect constitutes acceptance of the new terms.",
    ],
  },
  {
    heading: "9. Contact",
    body: ["Questions about these terms? Contact legal@somai.app."],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      badge="Legal"
      title={
        <>
          Terms &amp; <span className="text-gradient-brand">Conditions</span>
        </>
      }
      updated="August 15, 2026"
      sections={sections}
    />
  );
}
