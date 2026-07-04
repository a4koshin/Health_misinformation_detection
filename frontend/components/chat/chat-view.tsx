"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Copy,
  MoreHorizontal,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";

import {
  formatMessageTime,
  type ChatMessage,
} from "@/lib/chat";
import { getConversation } from "@/lib/history";
import { ApiError } from "@/lib/api";
import { getRandomGreeting } from "@/lib/greetings";
import { getDisplayName } from "@/lib/user";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";

export function ChatView() {
  const { user, token } = useAuth();
  const activeChatId = useChatStore((state) => state.activeChatId);
  const activeConversation = useChatStore((state) => state.activeConversation);
  const messages = useChatStore((state) => state.messages);
  const isSaving = useChatStore((state) => state.isSaving);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const setConversation = useChatStore((state) => state.setConversation);
  const greetingNonce = useChatStore((state) => state.greetingNonce);
  const [draft, setDraft] = useState("");
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [greeting, setGreeting] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadActiveChat() {
      if (!token || !activeChatId) {
        if (active) {
          setConversation(null);
        }
        return;
      }

      if (activeConversation?.id === activeChatId) {
        return;
      }

      if (active) {
        setIsLoadingConversation(true);
      }

      try {
        const conversation = await getConversation(token, activeChatId);
        if (active) {
          setConversation(conversation);
        }
      } catch {
        if (active) {
          setConversation(null);
          toast.error("Unable to load this chat.");
        }
      } finally {
        if (active) {
          setIsLoadingConversation(false);
        }
      }
    }

    void loadActiveChat();

    return () => {
      active = false;
    };
  }, [activeChatId, activeConversation?.id, token, setConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || !token || isSaving) return;

    try {
      await sendMessage(draft, token);
      setDraft("");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to save chat to history.";
      toast.error(message);
    }
  }

  const showWelcome =
    !activeChatId && messages.length === 0 && !isLoadingConversation;
  const showConversation = messages.length > 0 || isLoadingConversation;
  const displayName = user ? getDisplayName(user) : "there";
  const firstName = displayName.split(/\s+/)[0];

  useEffect(() => {
    if (showWelcome) {
      setGreeting(getRandomGreeting(firstName));
    }
  }, [showWelcome, firstName, greetingNonce]);

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-white">
      <div className="flex min-h-0 flex-1 flex-col">
        {showWelcome ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-32">
            <h1 className="text-center text-4xl font-normal tracking-tight text-[#1f1f1f] md:text-5xl">
              {greeting}
            </h1>
          </div>
        ) : null}

        {showConversation ? (
          <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8">
              {isLoadingConversation && messages.length === 0 ? (
                <p className="text-sm text-[#444746]">Loading chat...</p>
              ) : null}
              {messages.map((message) => (
                <MessageBlock key={message.id} message={message} />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
        ) : null}

        <div className="shrink-0 px-4 pb-4 pt-2 md:px-8">
          <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-[760px]"
          >
            <div className="flex items-center gap-2 rounded-[28px] bg-[#f0f4f9] px-4 py-2 shadow-sm ring-1 ring-[#e3e3e3]/60">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask HealthAI"
                rows={1}
                disabled={isSaving}
                className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent py-0.5 text-base leading-6 text-[#1f1f1f] outline-none placeholder:text-[#444746] disabled:opacity-60"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />

              {draft.trim() ? (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#1f1f1f] text-white transition-colors hover:bg-[#333] disabled:opacity-60"
                  aria-label="Send message"
                >
                  <ArrowUp className="size-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>

            <p className="mt-3 text-center text-xs text-[#444746]">
              HealthAI is AI and can make mistakes.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

function MessageBlock({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[24px] bg-[#f0f4f9] px-5 py-3 text-[15px] leading-relaxed text-[#1f1f1f]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#1f1f1f]">
        {message.content}
      </div>
      <AssistantActions content={message.content} createdAt={message.createdAt} />
    </div>
  );
}

function AssistantActions({
  content,
  createdAt,
}: {
  content: string;
  createdAt?: string;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Unable to copy.");
    }
  }

  return (
    <div className="mt-3 flex items-center gap-1">
      <ActionIcon label="Good response" icon={ThumbsUp} />
      <ActionIcon label="Bad response" icon={ThumbsDown} />
      <ActionIcon label="Copy" icon={Copy} onClick={() => void handleCopy()} />
      <ActionIcon label="Share" icon={Share2} />
      <ActionIcon label="More" icon={MoreHorizontal} />
      {createdAt ? (
        <span className="ml-2 text-[11px] text-[#444746]">
          {formatMessageTime(createdAt)}
        </span>
      ) : null}
    </div>
  );
}

function ActionIcon({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-[#444746] transition-colors hover:bg-[#f0f4f9]"
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </button>
  );
}
