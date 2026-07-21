export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What does HealthAI actually do?",
    answer:
      "HealthAI analyzes Somali-language health claims and classifies them as Reliable or Misinformation using a machine learning model trained on curated health content.",
  },
  {
    question: "Which languages are supported?",
    answer:
      "The detection model is trained specifically for Somali text. Input in other languages, such as English or Arabic, is politely rejected with a clear message so results stay trustworthy.",
  },
  {
    question: "How accurate are the predictions?",
    answer:
      "The underlying SVM model was trained and evaluated on a labeled Somali health dataset with strong validation scores. Still, predictions are decision support, not medical advice.",
  },
  {
    question: "Is my chat history private?",
    answer:
      "Yes. Your conversations are linked to your personal account, protected by authentication, and only visible to you. You can delete any conversation at any time.",
  },
  {
    question: "Can I analyze a whole dataset at once?",
    answer:
      "Administrators can upload a CSV dataset and run batch predictions across every row, with a full per-row breakdown of results.",
  },
  {
    question: "Is HealthAI a replacement for a doctor?",
    answer:
      "No. HealthAI helps you spot potentially misleading health claims, but it does not diagnose conditions or replace professional medical guidance.",
  },
];
