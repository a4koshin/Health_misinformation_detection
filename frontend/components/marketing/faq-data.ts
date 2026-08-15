export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What does SomAI actually do?",
    answer:
      "SomAI checks Somali-language health claims with SomBERTb and labels them Reliable or Non-Reliable. Non-medical text is filtered out first. Non-Reliable claims can be assigned to a doctor for a rewrite, and users can book a follow-up appointment paid with Hormuud EVC Plus.",
  },
  {
    question: "Which languages are supported?",
    answer:
      "The detection model is trained for Somali text. Input that is empty, mostly numbers, English, or Arabic is rejected so results stay trustworthy.",
  },
  {
    question: "What model powers the prediction?",
    answer:
      "SomBERTb classifies medical claims as Reliable or Non-Reliable. A medical gatekeeper (Cerebras / Groq) first checks whether the text is health-related. Predictions are decision support, not medical advice.",
  },
  {
    question: "Is my history private?",
    answer:
      "Yes. Your predictions are linked to your account and protected by authentication. Users cannot delete history records; admins can deactivate or reactivate them when needed.",
  },
  {
    question: "Can I analyze a whole dataset at once?",
    answer:
      "Yes. You can upload a .txt, CSV, or Excel file and run batch predictions, with per-row Reliable / Non-Reliable results.",
  },
  {
    question: "What happens when a claim is Non-Reliable?",
    answer:
      "An admin can assign it to a doctor. The doctor rewrites the claim, you see the correction on Corrections, and you can book one of the doctor’s available times — paying with EVC Plus before the appointment request is sent.",
  },
  {
    question: "How do I pay for an appointment?",
    answer:
      "Appointments are paid with Hormuud EVC Plus. Enter your 61xxxxxxx number when booking, approve the PIN prompt on your phone, and the appointment request is created only after payment succeeds.",
  },
  {
    question: "Is SomAI a replacement for a doctor?",
    answer:
      "No. SomAI helps you spot potentially misleading health claims and connect with a reviewing doctor. It does not diagnose conditions or replace professional medical care.",
  },
];
