"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "@/components/ui/material-icon";
import { type ChatMessage } from "@/lib/chat";
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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
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
  }, [messages]);

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
    <main className="relative flex flex-1 flex-col overflow-hidden bg-[#FDFCFC]">
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
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-10">
              {isLoadingConversation && messages.length === 0 ? (
                <p className="text-sm text-[#444746]">Loading chat...</p>
              ) : null}
              {messages.map((message) => (
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
              <div ref={bottomRef} />
            </div>
          </div>
        ) : null}

        <div className="shrink-0 px-4 pb-4 pt-2 md:px-8">
          <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-[760px]"
          >
            <div className="flex items-end gap-2 rounded-[28px] bg-[#FFFFFF] px-4 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06)]">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask HealthAI"
                rows={1}
                disabled={isSaving}
                className="max-h-52 min-h-[24px] flex-1 resize-none overflow-y-auto bg-transparent py-1 text-base leading-6 text-[#1f1f1f] outline-none placeholder:text-[#444746] disabled:opacity-60"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />

              {draft ? (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#1f1f1f] text-white transition-colors hover:bg-[#333] disabled:opacity-60"
                  aria-label="Send message"
                >
                  <MaterialIcon name="arrow_upward" size={20} />
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
  onEditMessage: (messageId: string, content: string, token: string) => Promise<void>;
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
        <div className="max-w-[85%] rounded-[20px] bg-[#f0f4f9] px-4 py-3 text-[15px] leading-relaxed text-[#1f1f1f]">
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
    <div className="max-w-full">
      <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#1f1f1f]">
        {message.content}
      </div>
      <AssistantActions content={message.content} />
    </div>
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
  onEditMessage: (messageId: string, content: string, token: string) => Promise<void>;
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
      <div className="w-full rounded-[28px] border border-[#1a73e8] bg-[#FFFFFF] px-4 py-3">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={1}
          disabled={isSaving}
          className="max-h-52 min-h-[24px] w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-relaxed text-[#1f1f1f] outline-none disabled:opacity-60"
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

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="cursor-pointer text-sm text-[#1f1f1f] transition-opacity hover:opacity-70 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleUpdate()}
          disabled={!canUpdate}
          className="cursor-pointer rounded-full bg-[#e9eef6] px-5 py-2 text-sm text-[#444746] transition-colors hover:bg-[#dfe4ea] disabled:cursor-not-allowed disabled:opacity-50"
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
      <ActionIcon label="Copy" icon="content_copy" onClick={() => void handleCopy()} />
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
      <ActionIcon label="Copy" icon="content_copy" onClick={() => void handleCopy()} />
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
      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-[#5f6368] transition-colors hover:bg-[#f1f3f4] hover:text-[#202124] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <MaterialIcon name={icon} size={18} />
    </button>
  );
}
