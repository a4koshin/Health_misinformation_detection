"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MediaRecorderModal } from "@/components/chat/media-recorder-modal";
import { LogoMark } from "@/components/marketing/logo";
import { MaterialIcon } from "@/components/ui/material-icon";
import { predictDataset } from "@/lib/admin";
import { type ChatMessage, compareChatMessages } from "@/lib/chat";
import { getConversation } from "@/lib/history";
import { ApiError } from "@/lib/api";
import { getRandomGreeting } from "@/lib/greetings";
import { transcribeMedia } from "@/lib/predict";
import { getDisplayName } from "@/lib/user";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Conversation, DatasetPredictionResponse } from "@/types/api";
import { cn } from "@/lib/utils";

const DATASET_ACCEPT =
  ".csv,.xlsx,.xlsm,.xls,.xltx,.xltm,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac";
const VIDEO_ACCEPT = "video/*,.mp4,.mov,.webm,.mkv,.avi";

const EXAMPLE_CLAIMS = [
  {
    label: "Reliable tip",
    text: "Tallaalka COVID-19 wuu ammaan yahay oo wuxuu yareeyaa khatarta cudurka.",
  },
  {
    label: "Risky claim",
    text: "Cudurka kansarka waxaa lagu daaweeyaa biyo diiran oo kaliya.",
  },
  {
    label: "Non-medical",
    text: "Shalay waxaan aaday suuqa oo waxaan soo iibsaday khudaar.",
  },
] as const;

type UploadKind = "dataset" | "audio" | "video";

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
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    name: string;
    size: number;
    kind: UploadKind;
  } | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<{
    filename: string;
    result: DatasetPredictionResponse;
  } | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [recorderKind, setRecorderKind] = useState<"audio" | "video" | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const datasetInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const sortedMessages = [...messages].sort(compareChatMessages);
  const isBusy = isSaving || isUploading;

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
  }, [messages, isSaving, isUploading, pendingUpload, datasetPreview]);

  useEffect(() => {
    setEditingMessageId(null);
    setDatasetPreview(null);
    setPendingUpload(null);
    setAttachMenuOpen(false);
    setRecorderOpen(false);
    setRecorderKind(null);
  }, [activeChatId]);

  useEffect(() => {
    if (!attachMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target as Node)
      ) {
        setAttachMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setAttachMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [attachMenuOpen]);

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
    if (file.size === 0) {
      toast.error("The uploaded file is empty. Add claim text and try again.");
      return;
    }

    setPendingUpload({ name: file.name, size: file.size, kind: "dataset" });
    setDatasetPreview(null);
    setIsUploading(true);
    try {
      const result = await predictDataset(token, file);
      setDatasetPreview({ filename: file.name, result });
      useChatStore.setState((state) => ({
        historyRevision: state.historyRevision + 1,
      }));
      toast.success(
        `Done — ${result.reliable_count} Reliable, ${result.misinformation_count} Non-Reliable.`,
      );
    } catch (error) {
      setPendingUpload(null);
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to process dataset.";
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (datasetInputRef.current) {
        datasetInputRef.current.value = "";
      }
    }
  }

  async function handleMediaUpload(file: File, kind: "audio" | "video") {
    if (!token || isBusy) return;

    setPendingUpload({ name: file.name, size: file.size, kind });
    setIsUploading(true);
    try {
      // Somali ASR only — user must press Send to predict.
      const { transcribed_text } = await transcribeMedia(token, file, kind);
      const claim = (transcribed_text || "").trim();
      if (!claim) {
        toast.error(`No speech could be transcribed from that ${kind} file.`);
        setPendingUpload(null);
        return;
      }
      setDraft(claim);
      setPendingUpload(null);
      toast.success(
        "Somali transcript ready — review the text, then press Send.",
      );
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (error) {
      setPendingUpload(null);
      const message =
        error instanceof ApiError
          ? error.message
          : `Unable to transcribe ${kind} file.`;
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (kind === "audio" && audioInputRef.current) {
        audioInputRef.current.value = "";
      }
      if (kind === "video" && videoInputRef.current) {
        videoInputRef.current.value = "";
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
    <main className="prediction-workspace relative flex flex-1 flex-col overflow-hidden pt-12 lg:pt-0">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,92,0,0.08),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(255,138,77,0.06),_transparent_45%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        aria-hidden="true"
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {showWelcome ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 pb-28 sm:px-6 sm:pb-32">
            <div className="flex w-full max-w-2xl flex-col items-center text-center">
              <div className="mb-6 animate-[fade-up_0.5s_ease-out]">
                <LogoMark className="h-16 sm:h-20" />
              </div>
              <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-brand uppercase animate-[fade-up_0.55s_ease-out]">
                Claim verification
              </p>
              <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl animate-[fade-up_0.6s_ease-out]">
                {renderGreeting(greeting, firstName)}
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-ink-muted sm:text-[15px] animate-[fade-up_0.65s_ease-out]">
                Type a Somali health claim, or attach audio/video to transcribe
                first — then press Send for Reliable / Non-Reliable.
              </p>

              <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-3 animate-[fade-up_0.7s_ease-out]">
                {EXAMPLE_CLAIMS.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setDraft(example.text);
                      requestAnimationFrame(() => textareaRef.current?.focus());
                    }}
                    className="group cursor-pointer rounded-2xl border border-black/5 bg-white/80 px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[0_12px_28px_-18px_rgba(255,92,0,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="text-[11px] font-semibold tracking-wide text-brand uppercase">
                      {example.label}
                    </span>
                    <span className="mt-1.5 line-clamp-3 block text-[13px] leading-5 text-ink">
                      {example.text}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] text-ink-muted animate-[fade-up_0.75s_ease-out]">
                <PipelineChip icon="shield" label="Medical gate" />
                <span className="text-ink/20">→</span>
                <PipelineChip icon="verified" label="Reliability" />
              </div>
            </div>
          </div>
        ) : null}

        {showConversation ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-4 sm:py-6 md:px-8">
            <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 sm:gap-6">
              {isLoadingConversation && sortedMessages.length === 0 ? (
                <div className="rounded-2xl border border-black/5 bg-white/80 px-4 py-6 text-sm text-ink-muted shadow-sm backdrop-blur-sm">
                  Loading claim analysis...
                </div>
              ) : null}
              {sortedMessages.map((message, index) => (
                <MessageBlock
                  key={message.id}
                  message={message}
                  conversation={
                    message.role === "assistant" ? activeConversation : null
                  }
                  isEditing={editingMessageId === message.id}
                  isSaving={isBusy}
                  token={token}
                  onStartEdit={() => setEditingMessageId(message.id)}
                  onCancelEdit={() => setEditingMessageId(null)}
                  onEditComplete={() => setEditingMessageId(null)}
                  onEditMessage={editMessage}
                  animate={index >= sortedMessages.length - 2}
                />
              ))}
              {pendingUpload ? (
                <UploadedFileBubble
                  filename={pendingUpload.name}
                  size={pendingUpload.size}
                  kind={pendingUpload.kind}
                  isLoading={isUploading}
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
              {isSaving || isUploading ? (
                <TypingIndicator
                  label={
                    isUploading
                      ? pendingUpload?.kind === "audio"
                        ? "Transcribing audio to Somali…"
                        : pendingUpload?.kind === "video"
                          ? "Transcribing video to Somali…"
                          : "Checking dataset…"
                      : "Checking your claim…"
                  }
                />
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>
        ) : null}

        <div className="relative shrink-0 px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 md:px-8 md:pb-5">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-[680px] flex-col gap-2"
          >
            <input
              ref={datasetInputRef}
              type="file"
              accept={DATASET_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleDatasetUpload(file);
              }}
            />
            <input
              ref={audioInputRef}
              type="file"
              accept={AUDIO_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleMediaUpload(file, "audio");
              }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept={VIDEO_ACCEPT}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleMediaUpload(file, "video");
              }}
            />
            <div
              ref={attachMenuRef}
              className="relative overflow-hidden rounded-[1.75rem] border border-black/5 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-24px_rgba(15,23,42,0.28)] backdrop-blur-md focus-within:border-brand/35 focus-within:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_48px_-20px_rgba(255,92,0,0.35)]"
            >
              {attachMenuOpen ? (
                <div className="absolute bottom-[calc(100%+12px)] left-0 right-0 z-30 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                  <div className="p-1.5">
                    <AttachMenuAction
                      icon="videocam"
                      iconTone="text-[#2563eb]"
                      label="Upload video"
                      description="Transcribe to Somali text"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        videoInputRef.current?.click();
                      }}
                    />
                    <AttachMenuAction
                      icon="audio_file"
                      iconTone="text-[#7c3aed]"
                      label="Upload audio"
                      description="Transcribe to Somali text"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        audioInputRef.current?.click();
                      }}
                    />
                    <AttachMenuAction
                      icon="video_camera_front"
                      iconTone="text-[#ea580c]"
                      label="Record video"
                      description="Transcribe, then Send to check"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        setRecorderKind("video");
                        setRecorderOpen(true);
                      }}
                    />
                    <AttachMenuAction
                      icon="mic"
                      iconTone="text-[#db2777]"
                      label="Record audio"
                      description="Transcribe, then Send to check"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        setRecorderKind("audio");
                        setRecorderOpen(true);
                      }}
                    />
                    <AttachMenuAction
                      icon="upload_file"
                      iconTone="text-[#0f766e]"
                      label="Upload dataset"
                      description="Batch check CSV or Excel"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        datasetInputRef.current?.click();
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 border-b border-black/[0.04] px-4 py-2.5">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
                  Somali health claim
                </p>
                <ComposerIconButton
                  label={attachMenuOpen ? "Close attach menu" : "Open attach menu"}
                  title="Attach audio, video, or dataset"
                  icon={attachMenuOpen ? "close" : "add"}
                  disabled={isBusy}
                  loading={isUploading}
                  onClick={() => setAttachMenuOpen((open) => !open)}
                />
              </div>

              <div className="grid grid-cols-[1fr_auto] items-end gap-2 px-3 pb-3 pt-2">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Geli sheegasho caafimaad… / Paste a health claim"
                  rows={2}
                  disabled={isBusy}
                  className="max-h-40 min-h-[52px] w-full resize-none overflow-y-auto bg-transparent px-1 py-1.5 text-[15px] leading-6 text-ink outline-none placeholder:text-ink-muted/70 disabled:opacity-60"
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
                  className={cn(
                    "mb-0.5 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium text-white transition-colors",
                    isBusy
                      ? "cursor-wait bg-brand"
                      : "cursor-pointer bg-brand hover:bg-[#e65300] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400",
                  )}
                  aria-label={isBusy ? "Analyzing claim" : "Analyze claim"}
                >
                  {isSaving ? (
                    <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <MaterialIcon name="send" size={18} />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-center text-[11px] leading-4 text-ink-muted">
              Audio/video transcribe to Somali first — press Send to check the
              claim. Always confirm serious health decisions with a clinician.
            </p>
          </form>
        </div>
      </div>

      <MediaRecorderModal
        open={recorderOpen}
        kind={recorderKind}
        onOpenChange={(open) => {
          setRecorderOpen(open);
          if (!open) setRecorderKind(null);
        }}
        onCapture={(file, kind) => {
          void handleMediaUpload(file, kind);
        }}
      />
    </main>
  );
}

function PipelineChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-2.5 py-1 font-medium text-ink shadow-sm backdrop-blur-sm">
      <MaterialIcon name={icon} size={14} className="text-brand" />
      {label}
    </span>
  );
}

function TypingIndicator({
  label = "Waa la baadhayaa sheegashada...",
}: {
  label?: string;
}) {
  return (
    <div
      className="flex flex-col items-start gap-2 animate-[fade-up_0.35s_ease-out]"
      aria-live="polite"
      aria-label={label}
    >
      <div className="inline-flex items-center gap-3 rounded-2xl border border-brand/15 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-brand/10 text-brand">
          <MaterialIcon name="progress_activity" size={18} className="animate-spin" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">Analyzing claim</p>
          <p className="text-[12px] text-ink-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadIcon(kind: UploadKind) {
  if (kind === "audio") return "mic";
  if (kind === "video") return "videocam";
  return "description";
}

function AttachMenuAction({
  icon,
  iconTone,
  label,
  description,
  onClick,
}: {
  icon: string;
  iconTone?: string;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/[0.04]"
    >
      <span
        className={`flex size-6 shrink-0 items-center justify-center ${iconTone ?? "text-ink"}`}
      >
        <MaterialIcon name={icon} size={18} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#0d0d0d]">
        {label}
        <span className="ml-1.5 text-[12px] font-normal text-[#8e8e93]">
          {description}
        </span>
      </span>
    </button>
  );
}

function ComposerIconButton({
  label,
  title,
  icon,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  title: string;
  icon: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-[#ffefe6] hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={label}
      title={title}
    >
      {loading ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      ) : (
        <MaterialIcon name={icon} size={20} />
      )}
    </button>
  );
}

function UploadedFileBubble({
  filename,
  size,
  kind = "dataset",
  isLoading,
}: {
  filename: string;
  size: number;
  kind?: UploadKind;
  isLoading?: boolean;
}) {
  const extension = filename.includes(".")
    ? filename.split(".").pop()?.toUpperCase()
    : "FILE";
  const loadingLabel =
    kind === "dataset" ? "processing..." : "transcribing…";

  return (
    <div className="flex flex-col items-end gap-1 animate-[fade-up_0.35s_ease-out]">
      <div className="flex max-w-[min(100%,88%)] items-center gap-3 rounded-2xl border border-brand/15 bg-[#ffefe6] px-3.5 py-3 shadow-sm">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
          <MaterialIcon name={uploadIcon(kind)} size={22} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{filename}</p>
          <p className="text-[11px] text-ink-muted">
            {extension} · {formatFileSize(size)}
            {isLoading ? ` · ${loadingLabel}` : ""}
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
    <div className="w-full overflow-hidden rounded-3xl border border-black/5 bg-white/90 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.25)] backdrop-blur-sm animate-[fade-up_0.4s_ease-out]">
      <div className="flex items-start justify-between gap-3 border-b border-black/[0.04] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">
            Dataset analysis
          </p>
          <p className="mt-1 truncate text-sm font-medium text-ink">{filename}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-orange-50 hover:text-brand"
          aria-label="Dismiss dataset results"
        >
          <MaterialIcon name="close" size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-5">
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
        <ul className="space-y-0 border-t border-black/[0.04] px-4 py-2 sm:px-5">
          {previewRows.map((row) => (
            <li
              key={`${row.row}-${row.text.slice(0, 24)}`}
              className="border-b border-black/[0.04] py-3 last:border-b-0"
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
        <p className="border-t border-black/[0.04] px-4 py-3 text-[11px] text-ink-muted sm:px-5">
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
  conversation,
  isEditing,
  isSaving,
  token,
  onStartEdit,
  onCancelEdit,
  onEditComplete,
  onEditMessage,
  animate = false,
}: {
  message: ChatMessage;
  conversation?: Conversation | null;
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
  animate?: boolean;
}) {
  const isUser = message.role === "user";
  const shellClass = animate ? "animate-[fade-up_0.4s_ease-out]" : "";

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
      <div className={cn("flex flex-col items-stretch gap-2", shellClass)}>
        <div className="rounded-3xl border border-black/5 bg-white/90 px-4 py-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.3)] backdrop-blur-sm sm:px-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
              Submitted claim
            </p>
            <UserActions
              content={message.content}
              onEdit={onStartEdit}
              disabled={isSaving}
            />
          </div>
          <p className="text-[15px] leading-7 text-ink">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col items-stretch gap-2", shellClass)}>
      <AssistantVerdict content={message.content} conversation={conversation} />
      <AssistantActions content={message.content} />
    </div>
  );
}

function resolveVerdictLabel(
  content: string,
  conversation?: Conversation | null,
): {
  label: string;
  confidence: number | null;
  isMedical: boolean;
} {
  const rawLabel = conversation?.label || conversation?.somali_status || null;
  if (rawLabel) {
    const normalized =
      /misinformation|non[-\s]?reliable/i.test(rawLabel)
        ? "Non-Reliable"
        : /non[-\s]?medical/i.test(rawLabel)
          ? "Non-medical"
          : rawLabel;
    return {
      label: normalized,
      confidence:
        conversation?.label_confidence ?? conversation?.confidence ?? null,
      isMedical:
        conversation?.is_medical ??
        !/non[-\s]?medical/i.test(normalized),
    };
  }

  if (/ma aha mid caafimaad|non[-\s]?medical/i.test(content)) {
    return {
      label: "Non-medical",
      confidence: null,
      isMedical: false,
    };
  }

  const isMisinformation = /misinformation|non[-\s]?reliable/i.test(content);
  const isReliable = !isMisinformation && /\breliable\b/i.test(content);

  return {
    label: isReliable ? "Reliable" : isMisinformation ? "Non-Reliable" : "Result",
    confidence: null,
    isMedical: isReliable || isMisinformation,
  };
}

function AssistantVerdict({
  content,
  conversation,
}: {
  content: string;
  conversation?: Conversation | null;
}) {
  const verdict = resolveVerdictLabel(content, conversation);

  return (
    <VerdictPanel
      label={verdict.label}
      confidence={verdict.confidence}
      message={content}
      isMedical={verdict.isMedical}
    />
  );
}

function VerdictPanel({
  label,
  confidence,
  message,
  isMedical,
}: {
  label: string;
  confidence?: number | null;
  message: string;
  isMedical?: boolean;
}) {
  const displayLabel =
    label === "Misinformation" ? "Non-Reliable" : label || "Result";
  const tone =
    displayLabel === "Reliable"
      ? {
          icon: "verified",
          shell: "border-emerald-500/20 from-emerald-500/[0.08] to-white",
          pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800",
          bar: "bg-emerald-500",
          title: "Reliable health claim",
        }
      : displayLabel === "Non-Reliable"
        ? {
            icon: "report",
            shell: "border-red-500/20 from-red-500/[0.08] to-white",
            pill: "border-red-500/25 bg-red-500/10 text-red-800",
            bar: "bg-red-500",
            title: "Non-reliable claim",
          }
        : {
            icon: "info",
            shell: "border-slate-300/60 from-slate-100 to-white",
            pill: "border-slate-200 bg-slate-50 text-slate-700",
            bar: "bg-slate-400",
            title: isMedical === false ? "Not a medical claim" : "Analysis result",
          };

  const pct =
    confidence != null &&
    Number.isFinite(confidence) &&
    displayLabel !== "Non-medical" &&
    !(confidence === 0 && isMedical === false)
      ? Math.round(Math.min(Math.max(confidence, 0), 1) * 100)
      : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border bg-gradient-to-b shadow-[0_12px_32px_-20px_rgba(15,23,42,0.28)]",
        tone.shell,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
            Verdict
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold",
                tone.pill,
              )}
            >
              <MaterialIcon name={tone.icon} size={16} />
              {displayLabel}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-ink">{tone.title}</p>
        </div>

        {pct != null ? (
          <div className="min-w-[120px] rounded-2xl border border-black/5 bg-white/80 px-3 py-2">
            <p className="text-[11px] font-medium text-ink-muted">Confidence</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ink">
              {pct}%
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", tone.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-4 py-4 sm:px-5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
          Somali explanation
        </p>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-ink">
          {message}
        </p>
      </div>
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
