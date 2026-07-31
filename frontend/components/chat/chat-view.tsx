"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "@/components/ui/material-icon";
import { predictDataset } from "@/lib/admin";
import { type ChatMessage, compareChatMessages } from "@/lib/chat";
import { getConversation } from "@/lib/history";
import { ApiError } from "@/lib/api";
import { getRandomGreeting } from "@/lib/greetings";
import { getDisplayName } from "@/lib/user";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { DatasetPredictionResponse } from "@/types/api";

const DATASET_ACCEPT =
  ".csv,.xlsx,.xlsm,.xls,.xltx,.xltm,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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
  const [isUploadingDataset, setIsUploadingDataset] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<{
    filename: string;
    result: DatasetPredictionResponse;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sortedMessages = [...messages].sort(compareChatMessages);
  const isBusy = isSaving || isUploadingDataset;

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
  }, [messages, isSaving, isUploadingDataset, pendingUpload, datasetPreview]);

  useEffect(() => {
    setEditingMessageId(null);
    setDatasetPreview(null);
    setPendingUpload(null);
  }, [activeChatId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || isBusy) return;
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

  async function handleDatasetUpload(file: File) {
    if (!token || isBusy) return;

    setPendingUpload({ name: file.name, size: file.size });
    setDatasetPreview(null);
    setIsUploadingDataset(true);
    try {
      const result = await predictDataset(token, file);
      setDatasetPreview({ filename: file.name, result });
      toast.success(
        `Done — ${result.reliable_count} Reliable, ${result.misinformation_count} Misinformation.`,
      );
    } catch (error) {
      setPendingUpload(null);
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to process dataset.";
      toast.error(message);
    } finally {
      setIsUploadingDataset(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const showWelcome =
    !activeChatId &&
    messages.length === 0 &&
    !isLoadingConversation &&
    !isBusy &&
    !datasetPreview &&
    !pendingUpload;
  const showConversation =
    messages.length > 0 ||
    isLoadingConversation ||
    isBusy ||
    Boolean(datasetPreview) ||
    Boolean(pendingUpload);
  const displayName = user ? getDisplayName(user) : "there";
  const firstName = displayName.split(/\s+/)[0];

  useEffect(() => {
    if (showWelcome) {
      setGreeting(getRandomGreeting(firstName));
    }
  }, [showWelcome, firstName, greetingNonce]);

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-white pt-12 lg:pt-0">
      <div className="flex min-h-0 flex-1 flex-col">
        {showWelcome ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 pb-24 sm:px-6 sm:pb-28">
            <h1 className="max-w-xl text-center text-2xl font-normal tracking-tight text-ink sm:text-3xl md:text-4xl">
              {renderGreeting(greeting, firstName)}
            </h1>
          </div>
        ) : null}

        {showConversation ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-4 sm:py-6 md:px-8">
            <div className="mx-auto flex w-full max-w-[600px] flex-col gap-4 sm:gap-5">
              {isLoadingConversation && sortedMessages.length === 0 ? (
                <p className="text-sm text-ink-muted">Loading chat...</p>
              ) : null}
              {sortedMessages.map((message) => (
                <MessageBlock
                  key={message.id}
                  message={message}
                  isEditing={editingMessageId === message.id}
                  isSaving={isBusy}
                  token={token}
                  onStartEdit={() => setEditingMessageId(message.id)}
                  onCancelEdit={() => setEditingMessageId(null)}
                  onEditComplete={() => setEditingMessageId(null)}
                  onEditMessage={editMessage}
                />
              ))}
              {pendingUpload ? (
                <UploadedFileBubble
                  filename={pendingUpload.name}
                  size={pendingUpload.size}
                  isLoading={isUploadingDataset}
                />
              ) : null}
              {datasetPreview ? (
                <DatasetPredictionCard
                  filename={datasetPreview.filename}
                  result={datasetPreview.result}
                  onDismiss={() => {
                    setDatasetPreview(null);
                    setPendingUpload(null);
                  }}
                />
              ) : null}
              {isSaving || isUploadingDataset ? (
                <TypingIndicator
                  label={
                    isUploadingDataset
                      ? "Waa la baadhayaa faylka..."
                      : "Waa la baadhayaa..."
                  }
                />
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>
        ) : null}

        <div className="shrink-0 border-t border-gray-100 bg-white px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 md:px-8 md:pb-4">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-[600px] flex-col gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={DATASET_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleDatasetUpload(file);
                }
              }}
            />
            <div className="grid grid-cols-[auto_1fr_auto] items-end gap-2 rounded-3xl border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.08)] focus-within:border-brand/40 focus-within:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_40px_-16px_rgba(255,92,0,0.22)]">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                className="mb-0.5 flex size-8 shrink-0 cursor-pointer items-center justify-center self-end rounded-full text-ink-muted transition-colors hover:bg-[#ffefe6] hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Upload dataset to predict"
                title="Upload CSV or Excel dataset"
              >
                {isUploadingDataset ? (
                  <span className="size-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                ) : (
                  <MaterialIcon name="add" size={20} />
                )}
              </button>

              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask HealthAI"
                rows={1}
                disabled={isBusy}
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
                disabled={isBusy || !draft.trim()}
                className={`mb-0.5 flex size-8 shrink-0 items-center justify-center self-end rounded-full text-white transition-colors ${
                  isBusy
                    ? "cursor-wait bg-brand"
                    : "cursor-pointer bg-brand hover:bg-[#e65300] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                }`}
                aria-label={isBusy ? "Sending message" : "Send message"}
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

function TypingIndicator({
  label = "Waa la baadhayaa...",
}: {
  label?: string;
}) {
  return (
    <div
      className="flex max-w-[80%] flex-col items-start gap-1.5"
      aria-live="polite"
      aria-label={label}
    >
      <div className="inline-flex items-center gap-2 rounded-3xl rounded-bl-lg border border-orange-100 bg-[#ffefe6] px-4 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.2s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.1s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-brand" />
      </div>
      <p className="pl-1 text-[11px] text-ink-muted">{label}</p>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadedFileBubble({
  filename,
  size,
  isLoading,
}: {
  filename: string;
  size: number;
  isLoading?: boolean;
}) {
  const extension = filename.includes(".")
    ? filename.split(".").pop()?.toUpperCase()
    : "FILE";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex max-w-[85%] items-center gap-3 rounded-3xl rounded-br-lg bg-[#ffefe6] px-3.5 py-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
          <MaterialIcon name="description" size={22} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{filename}</p>
          <p className="text-[11px] text-ink-muted">
            {extension} · {formatFileSize(size)}
            {isLoading ? " · uploading..." : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function DatasetPredictionCard({
  filename,
  result,
  onDismiss,
}: {
  filename: string;
  result: DatasetPredictionResponse;
  onDismiss: () => void;
}) {
  const previewRows = result.results.slice(0, 5);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] leading-7 text-ink">
            Natiijada faylka <strong className="font-semibold">{filename}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-7 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50 hover:text-brand"
          aria-label="Dismiss dataset results"
        >
          <MaterialIcon name="close" size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-ink">
          {result.processed_rows}/{result.total_rows} processed
        </span>
        <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
          {result.reliable_count} Reliable
        </span>
        <span className="inline-flex items-center rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700">
          {result.misinformation_count} Non-Reliable
        </span>
        {result.error_count > 0 ? (
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-ink-muted">
            {result.error_count} errors
          </span>
        ) : null}
      </div>

      {previewRows.length > 0 ? (
        <ul className="space-y-2">
          {previewRows.map((row) => (
            <li
              key={`${row.row}-${row.text.slice(0, 24)}`}
              className="border-l-2 border-gray-300 py-0.5 pl-4"
            >
              <p className="line-clamp-2 text-sm leading-6 text-ink">{row.text}</p>
              <p
                className={`mt-1 text-[13px] font-semibold ${
                  row.prediction === "Reliable"
                    ? "text-emerald-700"
                    : row.prediction === "Misinformation" ||
                        row.prediction === "Non-Reliable"
                      ? "text-red-700"
                      : "text-ink-muted"
                }`}
              >
                {row.prediction ?? row.error ?? "Skipped"}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {result.results.length > previewRows.length ? (
        <p className="text-[11px] text-ink-muted">
          Showing first {previewRows.length} of {result.results.length} rows.
        </p>
      ) : null}
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
        <div className="max-w-[min(100%,80%)] rounded-3xl rounded-br-lg bg-[#ffefe6] px-3.5 py-2.5 text-sm leading-relaxed text-ink sm:px-4">
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
    <div className="flex w-full max-w-full flex-col items-start gap-1 sm:max-w-[680px]">
      <AssistantVerdict content={message.content} />
      <AssistantActions content={message.content} />
    </div>
  );
}

function AssistantVerdict({ content }: { content: string }) {
  const naturalReply = parseNaturalReply(content);
  if (naturalReply) {
    return <ChatGptStyleReply reply={naturalReply} />;
  }

  const isMisinformation =
    /misinformation|non[-\s]?reliable/i.test(content);
  const isReliable =
    !isMisinformation && /\breliable\b/i.test(content);

  if (!isMisinformation && !isReliable) {
    return (
      <div className="w-full text-[15px] leading-7 text-ink">
        {content}
      </div>
    );
  }

  const config = isReliable
    ? {
        icon: "verified",
        label: "Reliable",
        pillClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
      }
    : {
        icon: "report",
        label: "Non-Reliable",
        pillClass: "border-red-500/25 bg-red-500/10 text-red-700",
      };

  const topicMatch = content.match(
    /(?:Mowduuca:|mowduuca)\s*(.+?)\.?$/i,
  );
  const topic = topicMatch?.[1]?.trim();

  return (
    <div className="flex flex-col items-start gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.pillClass}`}
      >
        <MaterialIcon name={config.icon} size={15} />
        {config.label}
      </span>
      {isReliable && topic ? (
        <span className="inline-flex items-center rounded-full border border-orange-200 bg-[#ffefe6] px-2.5 py-1 text-xs font-medium text-[#cc4a00]">
          {topic}
        </span>
      ) : null}
    </div>
  );
}

type NaturalReply = {
  thanks: string;
  reliabilityPrompt: string;
  reliabilityAnswer: string;
  topicPrompt?: string;
  topicAnswer?: string;
};

function parseNaturalReply(content: string): NaturalReply | null {
  if (!/Waad ku mahadsantahay/i.test(content)) return null;

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  return {
    thanks: lines[0],
    reliabilityPrompt: lines[1],
    reliabilityAnswer: lines[2],
    topicPrompt: lines[3],
    topicAnswer: lines[4],
  };
}

function ChatGptStyleReply({ reply }: { reply: NaturalReply }) {
  return (
    <div className="w-full space-y-4 text-[15px] leading-7 text-ink">
      <p>{reply.thanks}</p>

      <div className="space-y-2">
        <p>{reply.reliabilityPrompt}</p>
        <blockquote className="border-l-2 border-gray-300 py-0.5 pl-4 font-semibold text-ink">
          {reply.reliabilityAnswer}
        </blockquote>
      </div>

      {reply.topicPrompt && reply.topicAnswer ? (
        <div className="space-y-2">
          <p>{reply.topicPrompt}</p>
          <blockquote className="border-l-2 border-gray-300 py-0.5 pl-4 font-semibold text-ink">
            {reply.topicAnswer}
          </blockquote>
        </div>
      ) : null}
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
