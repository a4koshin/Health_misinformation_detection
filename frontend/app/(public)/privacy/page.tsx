import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — HealthAI",
  description: "How HealthAI collects, uses, and protects your data.",
};

const sections = [
  {
    heading: "1. Information we collect",
    body: [
      "When you create an account we collect your email address, an optional full name, and a securely hashed password. We never store passwords in plain text.",
      "When you use the detection service we store the health claims you submit and the predictions returned, so you can access your personal history.",
    ],
  },
  {
    heading: "2. How we use your information",
    body: [
      "Your data is used solely to operate the service: authenticating you, saving your conversation history, and improving detection quality in aggregate.",
      "We do not sell your data, show you advertising, or share your personal information with third parties.",
    ],
  },
  {
    heading: "3. Data storage and security",
    body: [
      "All traffic between your browser and our servers is authenticated with signed JSON Web Tokens. Passwords are hashed with industry-standard algorithms before storage.",
      "Administrator access is role-restricted, and administrative actions are limited to account management and dataset analysis.",
    ],
  },
  {
    heading: "4. Your rights",
    body: [
      "You may update your profile information at any time from the Profile page.",
      "You may delete any conversation from your history. Deleting a conversation removes it permanently from our database.",
      "You may request full account deletion by contacting support.",
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
      "For privacy questions or data requests, contact us at privacy@healthai.app.",
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
      updated="July 21, 2026"
      sections={sections}
    />
  );
}
