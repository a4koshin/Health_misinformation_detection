"use client";

import { ArrowUp, Plus } from "lucide-react";
import { FormEvent, useState } from "react";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { cn } from "@/lib/utils";

export function ChatComposer() {
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

  return (
    <div className="w-full max-w-[768px] px-4">
      {notice ? (
        <p className="mb-3 text-center text-sm text-[#6b6b6b]">{notice}</p>
      ) : null}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 rounded-[28px] border border-[#e5e5e5] bg-white px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#5d5d5d] transition-colors hover:bg-[#f4f4f4]"
            aria-label="Add attachment"
          >
            <Plus className="size-5" />
          </button>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask anything"
            rows={1}
            className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent py-1 text-base leading-7 text-[#0d0d0d] outline-none placeholder:text-[#8e8e8e]"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            aria-label="Send message"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              message.trim()
                ? "bg-[#0d0d0d] text-white hover:bg-[#2f2f2f]"
                : "cursor-not-allowed bg-[#f4f4f4] text-[#b4b4b4]",
            )}
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export function ChatGreeting() {
  return (
    <h1 className="px-4 text-center text-[32px] font-normal tracking-tight text-[#0d0d0d]">
      What&apos;s on the agenda today?
    </h1>
  );
}

export function ChatView() {
  return (
    <>
      <ChatHeader />
      <main className="flex flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 flex-col items-center justify-center gap-10 pb-16">
          <ChatGreeting />
          <ChatComposer />
        </div>
      </main>
    </>
  );
}
