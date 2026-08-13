"use client";

import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MaterialIcon } from "@/components/ui/material-icon";
import { formatRelativeTime } from "@/lib/chat";
import { truncateText } from "@/lib/user";
import { cn } from "@/lib/utils";
import type { Detection } from "@/types/api";

type ChatHistoryItemProps = {
  item: Detection;
  isActive: boolean;
  token: string;
  variant?: "sidebar" | "search";
  onSelect: (id: string) => void;
  onDeleted?: (id: string) => void;
};

export function ChatHistoryItem({
  item,
  isActive,
  variant = "sidebar",
  onSelect,
}: ChatHistoryItemProps) {
  async function handleShare(event: Event) {
    event.preventDefault();

    const shareData = {
      title: truncateText(item.input_text, 80),
      text: item.input_text,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(item.input_text);
      toast.success("Chat copied to clipboard.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      toast.error("Unable to share this chat.");
    }
  }

  const actions = (
    <ChatActionsMenu isActive={isActive} onShare={handleShare} />
  );

  if (variant === "search") {
    return (
      <div
        className={cn(
          "group flex items-center gap-1 rounded-xl transition-colors hover:bg-orange-50",
          isActive && "bg-[#ffefe6]",
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(item.id)}
          className="min-w-0 flex-1 cursor-pointer px-3 py-2.5 text-left"
        >
          <span className="block truncate text-sm text-[#1f1f1f]">
            {truncateText(item.input_text, 56)}
          </span>
          <span className="mt-0.5 block text-xs text-[#444746]">
            {formatRelativeTime(item.created_at)}
            {item.message_count && item.message_count > 1
              ? ` · ${item.message_count} messages`
              : ""}
          </span>
        </button>
        {actions}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-0.5 rounded-full transition-colors hover:bg-orange-50",
        isActive && "bg-[#ffefe6]",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className={cn(
          "min-w-0 flex-1 cursor-pointer truncate py-2 pr-1 pl-3.5 text-left text-[13px]",
          isActive ? "font-medium text-[#1f1f1f]" : "text-[#444746]",
        )}
      >
        {truncateText(item.input_text, 24)}
      </button>
      {actions}
    </div>
  );
}

function ChatActionsMenu({
  isActive,
  onShare,
}: {
  isActive?: boolean;
  onShare: (event: Event) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#444746] opacity-0 transition-opacity hover:bg-orange-100 hover:text-brand group-hover:opacity-100 data-[state=open]:opacity-100",
            isActive && "opacity-100",
          )}
          aria-label="Chat options"
        >
          <MaterialIcon name="more_vert" size={20} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem className="cursor-pointer" onSelect={onShare}>
          <MaterialIcon name="share" size={18} />
          Share
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
