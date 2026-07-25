"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "@/components/ui/material-icon";
import { type ChatMessage, compareChatMessages } from "@/lib/chat";
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
  const editMessage = useChatStore((state) => state.editMessage);
  const setConversation = useChatStore((state) => state.setConversation);
  const greetingNonce = useChatStore((state) => state.greetingNonce);
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [greeting, setGreeting] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sortedMessages = [...messages].sort(compareChatMessages);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 24), 160);
    textarea.style.height = `${nextHeight}px`;
  }, [draft]);

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
  }, [messages, isSaving]);

  useEffect(() => {
    setEditingMessageId(null);
  }, [activeChatId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || isSaving) return;
    if (!draft) {
      toast.error("Text cannot be empty.");
      return;
    }

    const content = draft;
    setDraft("");

    try {
      await sendMessage(content, token);
    } catch (err) {
      setDraft(content);
      const message =
        err instanceof ApiError
          ? err.message
          : "Unable to save chat to history.";
      toast.error(message);
    }
  }

  const showWelcome =
    !activeChatId &&
    messages.length === 0 &&
    !isLoadingConversation &&
    !isSaving;
  const showConversation =
    messages.length > 0 || isLoadingConversation || isSaving;
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
          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-28">
            <h1 className="max-w-xl text-center text-3xl font-normal tracking-tight text-ink md:text-4xl">
              {renderGreeting(greeting, firstName)}
            </h1>
          </div>
        ) : null}

        {showConversation ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5">
              {isLoadingConversation && sortedMessages.length === 0 ? (
                <p className="text-sm text-ink-muted">Loading chat...</p>
              ) : null}
              {sortedMessages.map((message) => (
                <MessageBlock
                  key={message.id}
                  message={message}
                  isEditing={editingMessageId === message.id}
                  isSaving={isSaving}
                  token={token}
                  onStartEdit={() => setEditingMessageId(message.id)}
                  onCancelEdit={() => setEditingMessageId(null)}
                  onEditComplete={() => setEditingMessageId(null)}
                  onEditMessage={editMessage}
                />
              ))}
              {isSaving ? <TypingIndicator /> : null}
              <div ref={bottomRef} />
            </div>
          </div>
        ) : null}

        <div className="shrink-0 border-t border-gray-100 bg-white px-4 pt-3 pb-4 md:px-8">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-[600px] flex-col gap-2"
          >
            <div className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-3xl border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.08)] focus-within:border-brand/40 focus-within:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_40px_-16px_rgba(255,92,0,0.22)]">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask HealthAI"
                rows={1}
                disabled={isSaving}
                className="max-h-40 min-h-6 w-full resize-none overflow-y-auto bg-transparent py-1.5 text-sm leading-6 text-ink outline-none placeholder:text-ink-muted disabled:opacity-60"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />

              <button
                type="submit"
                disabled={isSaving || !draft.trim()}
                className={`mb-0.5 flex size-8 shrink-0 items-center justify-center self-end rounded-full text-white transition-colors ${
                  isSaving
                    ? "cursor-wait bg-brand"
                    : "cursor-pointer bg-brand hover:bg-[#e65300] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                }`}
                aria-label={isSaving ? "Sending message" : "Send message"}
              >
                {isSaving ? (
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <MaterialIcon name="arrow_upward" size={16} />
                )}
              </button>
            </div>

            <p className="text-center text-[11px] leading-4 text-ink-muted">
              HealthAI is AI and can make mistakes.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

function TypingIndicator() {
  return (
    <div
      className="flex max-w-[80%] flex-col items-start gap-1.5"
      aria-live="polite"
      aria-label="HealthAI is analyzing your claim"
    >
      <div className="inline-flex items-center gap-2 rounded-3xl rounded-bl-lg border border-orange-100 bg-[#ffefe6] px-4 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.2s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.1s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-brand" />
      </div>
      <p className="pl-1 text-[11px] text-ink-muted">Analyzing claim...</p>
    </div>
  );
}

function renderGreeting(greeting: string, firstName: string) {
  if (!firstName || !greeting.includes(firstName)) {
    return greeting;
  }

  const parts = greeting.split(firstName);
  return (
    <>
      {parts[0]}
      <span className="text-brand">{firstName}</span>
      {parts.slice(1).join(firstName)}
    </>
  );
}

function MessageBlock({
  message,
  isEditing,
  isSaving,
  token,
  onStartEdit,
  onCancelEdit,
  onEditComplete,
  onEditMessage,
}: {
  message: ChatMessage;
  isEditing: boolean;
  isSaving: boolean;
  token: string | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditComplete: () => void;
  onEditMessage: (
    messageId: string,
    content: string,
    token: string,
  ) => Promise<void>;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    if (isEditing) {
      return (
        <UserMessageEditor
          message={message}
          isSaving={isSaving}
          token={token}
          onCancel={onCancelEdit}
          onComplete={onEditComplete}
          onEditMessage={onEditMessage}
        />
      );
    }

    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[80%] rounded-3xl rounded-br-lg bg-[#ffefe6] px-4 py-2.5 text-sm leading-relaxed text-ink">
          {message.content}
        </div>
        <UserActions
          content={message.content}
          onEdit={onStartEdit}
          disabled={isSaving}
        />
      </div>
    );
  }

  return (
    <div className="flex max-w-[80%] flex-col items-start gap-1">
      <AssistantVerdict content={message.content} />
      <AssistantActions content={message.content} />
    </div>
  );
}

function AssistantVerdict({ content }: { content: string }) {
  const isMisinformation = /misinformation/i.test(content);
  const isReliable = !isMisinformation && /reliable/i.test(content);

  if (!isMisinformation && !isReliable) {
    return (
      <div className="rounded-3xl rounded-bl-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {content}
      </div>
    );
  }

  const config = isReliable
    ? {
        icon: "verified",
        label: "Reliable",
        pillClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
        cardClass: "border-emerald-100 bg-emerald-50/60",
      }
    : {
        icon: "report",
        label: "Misinformation",
        pillClass: "border-red-500/25 bg-red-500/10 text-red-700",
        cardClass: "border-red-100 bg-red-50/60",
      };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.pillClass}`}
    >
      <MaterialIcon name={config.icon} size={15} />
      {config.label}
    </span>
  );
}

function UserMessageEditor({
  message,
  isSaving,
  token,
  onCancel,
  onComplete,
  onEditMessage,
}: {
  message: ChatMessage;
  isSaving: boolean;
  token: string | null;
  onCancel: () => void;
  onComplete: () => void;
  onEditMessage: (
    messageId: string,
    content: string,
    token: string,
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trimmedDraft = draft.trim();
  const canUpdate =
    Boolean(token) &&
    !isSaving &&
    trimmedDraft.length > 0 &&
    trimmedDraft !== message.content.trim();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
    textarea.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  async function handleUpdate() {
    if (!token || !canUpdate) return;

    try {
      await onEditMessage(message.id, trimmedDraft, token);
      toast.success("Message updated.");
      onComplete();
    } catch (err) {
      const messageText =
        err instanceof ApiError ? err.message : "Unable to update message.";
      toast.error(messageText);
    }
  }

  return (
    <div className="flex w-full max-w-[85%] flex-col items-end gap-3">
      <div className="w-full rounded-3xl border border-brand bg-white px-4 py-3">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={1}
          disabled={isSaving}
          className="max-h-52 min-h-[24px] w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-relaxed text-ink outline-none disabled:opacity-60"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
              return;
            }

            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void handleUpdate();
            }
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="cursor-pointer text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleUpdate()}
          disabled={!canUpdate}
          className="cursor-pointer rounded-full bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e65300] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {isSaving ? "Updating..." : "Update"}
        </button>
      </div>
    </div>
  );
}

function UserActions({
  content,
  onEdit,
  disabled,
}: {
  content: string;
  onEdit: () => void;
  disabled?: boolean;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Unable to copy.");
    }
  }

  function handleEdit() {
    if (disabled) return;
    onEdit();
  }

  return (
    <div className="flex items-center gap-0.5 pr-1">
      <ActionIcon
        label="Copy"
        icon="content_copy"
        onClick={() => void handleCopy()}
      />
      <ActionIcon
        label="Edit"
        icon="edit"
        onClick={handleEdit}
        disabled={disabled}
      />
    </div>
  );
}

function AssistantActions({ content }: { content: string }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Unable to copy.");
    }
  }

  return (
    <div className="mt-2 flex items-center gap-0.5">
      <ActionIcon
        label="Copy"
        icon="content_copy"
        onClick={() => void handleCopy()}
      />
    </div>
  );
}

function ActionIcon({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-7 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
    >
      <MaterialIcon name={icon} size={16} />
    </button>
  );
}
