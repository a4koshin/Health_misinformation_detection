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
        <p className="mb-3 text-center text-sm text-gray-500">{notice}</p>
      ) : null}
      <form onSubmit={onSubmit}>
        <div className="flex items-end gap-2 rounded-[28px] border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Add attachment"
          >
            <Plus className="size-5" />
          </button>
          <textarea
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="Ask anything"
            rows={1}
            className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent py-1.5 text-base leading-7 text-gray-900 outline-none placeholder:text-gray-400"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="button"
            className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Voice input"
          >
            <Mic className="size-5" />
          </button>
          <button
            type="submit"
            disabled={!message.trim()}
            aria-label="Send message"
            className={cn(
              "mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full transition-all",
              message.trim()
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "cursor-not-allowed bg-gray-200 text-gray-400",
            )}
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function QuickActions({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(prompt)}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Icon className="size-4 text-gray-500" />
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
    if (!message.trim()) {
      return;
    }
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
          <h1 className="mb-8 text-center text-[28px] font-normal tracking-tight text-gray-900 md:text-[32px]">
            Ready when you are.
          </h1>
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
