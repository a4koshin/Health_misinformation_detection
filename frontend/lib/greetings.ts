const GREETING_TEMPLATES = [
  (name: string) => `Let's jump in, ${name}`,
  (name: string) => `What can I help with, ${name}`,
  (name: string) => `The mic is yours, ${name}`,
  (name: string) => `Your move, ${name}`,
  (name: string) => `What's the vibe, ${name}`,
  (name: string) => `Hi ${name}, what's the move?`,
  (name: string) => `What's next, ${name}`,
] as const;

export function getRandomGreeting(firstName: string): string {
  const name = firstName.trim() || "there";
  const index = Math.floor(Math.random() * GREETING_TEMPLATES.length);
  return GREETING_TEMPLATES[index](name);
}
