"use client";

import { ArrowUp, Mic, Plus, Stethoscope, FileText, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  {
    label: "Check a medical claim",
    icon: Stethoscope,
    prompt: "Is this medical claim accurate: ",
  },
  {
    label: "Analyze a health post",
    icon: FileText,
    prompt: "Analyze this health-related post for misinformation: ",
  },
  {
    label: "Verify a rumor",
    icon: ShieldCheck,
    prompt: "Help me verify this health rumor: ",
  },
] as const;

export function ChatComposer({
  message,
  onMessageChange,
  onSubmit,
  notice,
}: {
  message: string;
  onMessageChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  notice?: string;
}) {
  return (
    <div className="w-full max-w-3xl">
      {notice ? (
        <p className="mb-3 text-center text-sm text-gray-400">{notice}</p>
      ) : null}
      <form onSubmit={onSubmit}>
        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            className="mb-0.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
            aria-label="Add attachment"
          >
            <Plus className="size-5" />
          </button>
          <textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="Ask anything about health claims..."
            rows={1}
            className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent py-1.5 text-base leading-7 text-gray-900 outline-none placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="button"
            className="mb-0.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700"
            aria-label="Voice input"
          >
            <Mic className="size-5" />
          </button>
          <button
            type="submit"
            disabled={!message.trim()}
            aria-label="Send message"
            className={cn(
              "mb-0.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-all",
              message.trim()
                ? "bg-black text-white hover:opacity-80"
                : "cursor-not-allowed bg-gray-100 text-gray-300",
            )}
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function QuickActions({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(prompt)}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
        >
          <Icon className="size-4 text-gray-400" />
          {label}
        </button>
      ))}
    </div>
  );
}

export function ChatView() {
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    setNotice("Detection is coming soon. Your message was not sent yet.");
    setMessage("");
  }

  function handleQuickAction(prompt: string) {
    setMessage(prompt);
    setNotice("");
  }

  return (
    <>
      <ChatHeader />
      <main className="flex flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8">
          <h1 className="mb-2 text-center text-[28px] font-semibold tracking-tight text-gray-900 md:text-[32px]">
            Ready when you are.
          </h1>
          <p className="mb-8 text-sm text-gray-400">
            Paste a health claim or ask a question in Somali or English.
          </p>
          <ChatComposer
            message={message}
            onMessageChange={setMessage}
            onSubmit={handleSubmit}
            notice={notice}
          />
          <QuickActions onSelect={handleQuickAction} />
        </div>
      </main>
    </>
  );
}
