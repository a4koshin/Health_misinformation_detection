const GREETING_TEMPLATES = [
  (name: string) => `Ready to check a claim, ${name}?`,
  (name: string) => `Paste a Somali health claim, ${name}`,
  (name: string) => `Let's verify a claim, ${name}`,
  (name: string) => `What claim should we examine, ${name}?`,
] as const;

export function getRandomGreeting(firstName: string): string {
  const name = firstName.trim() || "there";
  const index = Math.floor(Math.random() * GREETING_TEMPLATES.length);
  return GREETING_TEMPLATES[index](name);
}
