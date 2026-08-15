import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — SomAI",
  description: "How SomAI collects, uses, and protects your data.",
};

const sections = [
  {
    heading: "1. Information we collect",
    body: [
      "When you create an account we collect your email address, an optional full name, and a securely hashed password. We never store passwords in plain text.",
      "When you use the detection service we store the health claims you submit and the predictions returned, so you can access your personal history. Doctor profiles, corrections, availability, appointments, and EVC Plus payment references (such as payer number and transaction ids) are stored when those features are used.",
    ],
  },
  {
    heading: "2. How we use your information",
    body: [
      "Your data is used solely to operate the service: authenticating you, saving prediction history, enabling doctor review and appointments, processing EVC Plus appointment payments, and improving detection quality in aggregate.",
      "We do not sell your data, show you advertising, or share your personal information with third parties except as needed to run core providers (for example LLM gatekeeper APIs) under our control.",
    ],
  },
  {
    heading: "3. Data storage and security",
    body: [
      "All traffic between your client and our servers is authenticated with signed JSON Web Tokens. Passwords are hashed with industry-standard algorithms before storage.",
      "Administrator and doctor access is role-restricted. Administrative actions may include account management, review assignment, audit logging, and dataset analysis.",
    ],
  },
  {
    heading: "4. Your rights",
    body: [
      "You may update your profile information at any time from Settings.",
      "Prediction history is retained for your account. Users cannot permanently delete history records from the app; administrators may deactivate or reactivate records when needed. You may request full account deletion by contacting support.",
    ],
  },
  {
    heading: "5. Cookies and local storage",
    body: [
      "We use browser local storage to keep you signed in between visits. We do not use tracking cookies or third-party analytics that identify you personally.",
    ],
  },
  {
    heading: "6. Changes to this policy",
    body: [
      "We may update this policy as the service evolves. Material changes will be announced in the application before they take effect.",
    ],
  },
  {
    heading: "7. Contact",
    body: [
      "For privacy questions or data requests, contact us at privacy@somai.app.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      badge="Legal"
      title={
        <>
          Privacy <span className="text-gradient-brand">Policy</span>
        </>
      }
      updated="August 15, 2026"
      sections={sections}
    />
  );
}
