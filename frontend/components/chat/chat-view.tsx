"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getHistory } from "@/lib/history";
import { useAuth } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import type { Detection } from "@/types/api";

export function ChatView() {
  const { token } = useAuth();
  const activeChatId = useChatStore((state) => state.activeChatId);
  const [message, setMessage] = useState("");
  const [activeChat, setActiveChat] = useState<Detection | null>(null);

  useEffect(() => {
    let active = true;

    async function loadActiveChat() {
      if (!token || !activeChatId) {
        if (active) {
          setActiveChat(null);
        }
        return;
      }

      try {
        const history = await getHistory(token);
        const selected =
          history.find((item) => item.id === activeChatId) ?? null;
        if (active) {
          setActiveChat(selected);
        }
      } catch {
        if (active) {
          setActiveChat(null);
        }
      }
    }

    void loadActiveChat();

    return () => {
      active = false;
    };
  }, [activeChatId, token]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    toast.info("Detection is coming soon. Your message was not sent yet.");
    setMessage("");
  }

  const isNewChat = activeChatId === null;

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
        {isNewChat ? (
          <div className="mb-10 max-w-lg text-center">
            <h1 className="text-2xl font-medium tracking-tight text-foreground md:text-3xl">
              Ready when you are.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Paste a health claim or ask a question in Somali or English.
            </p>
          </div>
        ) : (
          <div className="mb-10 w-full max-w-2xl space-y-3 px-2">
            <p className="text-sm leading-relaxed text-foreground">
              {activeChat?.input_text ?? "Chat not found."}
            </p>
            {activeChat?.label ? (
              <p className="text-xs text-muted-foreground">
                {activeChat.label}
                {activeChat.confidence != null
                  ? ` · ${Math.round(activeChat.confidence * 100)}%`
                  : ""}
              </p>
            ) : null}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-2xl items-end gap-2 border rounded-full px-4 py-2 border-gray-200"
        >
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask anything about health claims..."
            rows={1}
            className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent py-1 text-base leading-7 text-foreground outline-none placeholder:text-muted-foreground"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon-sm"
            variant="ghost"
            disabled={!message.trim()}
            className={cn(
              "shrink-0 rounded-full",
              message.trim() && "bg-#00bfbf text-background hover:bg-foreground",
            )}
            aria-label="Send message"
          >
            <ArrowUp className="size-4" />
          </Button>
        </form>
      </div>
    </main>
  );
}
