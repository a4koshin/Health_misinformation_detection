"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { GlassButton } from "@/components/glass/glass-button";
import {
  GlassInput,
  GlassLabel,
  GlassTextarea,
} from "@/components/glass/glass-input";

export function ContactForm() {
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setIsSending(true);
    // Simulate a short send delay; there is no contact endpoint yet.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSending(false);

    form.reset();
    toast.success("Message sent. We'll get back to you soon!");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <GlassLabel htmlFor="contact-name">Name</GlassLabel>
          <GlassInput
            id="contact-name"
            name="name"
            placeholder="Your name"
            required
          />
        </div>
        <div className="space-y-2">
          <GlassLabel htmlFor="contact-email">Email</GlassLabel>
          <GlassInput
            id="contact-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <GlassLabel htmlFor="contact-subject">Subject</GlassLabel>
        <GlassInput
          id="contact-subject"
          name="subject"
          placeholder="What is this about?"
          required
        />
      </div>

      <div className="space-y-2">
        <GlassLabel htmlFor="contact-message">Message</GlassLabel>
        <GlassTextarea
          id="contact-message"
          name="message"
          placeholder="Tell us more..."
          required
        />
      </div>

      <GlassButton
        type="submit"
        size="lg"
        disabled={isSending}
        className="w-full bg-brand bg-none hover:bg-[#e65300]"
      >
        {isSending ? "Sending..." : "Send message"}
      </GlassButton>
    </form>
  );
}
