"use client";

import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ApiError } from "@/lib/api";
import { formatRelativeTime } from "@/lib/chat";
import { deleteConversation } from "@/lib/history";
import { truncateText } from "@/lib/user";
import { cn } from "@/lib/utils";
import type { Detection } from "@/types/api";

type ChatHistoryItemProps = {
  item: Detection;
  isActive: boolean;
  token: string;
  variant?: "sidebar" | "search";
  onSelect: (id: string) => void;
  onDeleted: (id: string) => void;
};

export function ChatHistoryItem({
  item,
  isActive,
  token,
  variant = "sidebar",
  onSelect,
  onDeleted,
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

  async function handleDelete(event: Event) {
    event.preventDefault();

    try {
      await deleteConversation(token, item.id);
      toast.success("Chat deleted.");
      onDeleted(item.id);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Unable to delete chat.";
      toast.error(message);
    }
  }

  if (variant === "search") {
    return (
      <div
        className={cn(
          "group flex items-center gap-1 rounded-xl transition-colors hover:bg-[#f0f4f9]",
          isActive && "bg-[#e9eef6]",
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
      <ChatActionsMenu
        isActive={isActive}
        onShare={handleShare}
        onDelete={handleDelete}
      />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-0.5 rounded-full transition-colors hover:bg-[#e9eef6]",
        isActive && "bg-[#e9eef6]",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className={cn(
          "min-w-0 flex-1 cursor-pointer truncate py-2.5 pr-1 pl-4 text-left text-sm",
          isActive ? "font-medium text-[#1f1f1f]" : "text-[#444746]",
        )}
      >
        {truncateText(item.input_text, 28)}
      </button>
      <ChatActionsMenu
        isActive={isActive}
        onShare={handleShare}
        onDelete={handleDelete}
      />
    </div>
  );
}

function ChatActionsMenu({
  isActive,
  onShare,
  onDelete,
}: {
  isActive?: boolean;
  onShare: (event: Event) => void;
  onDelete: (event: Event) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#444746] opacity-0 transition-opacity hover:bg-[#dfe4ea] group-hover:opacity-100 data-[state=open]:opacity-100",
            isActive && "opacity-100",
          )}
          aria-label="Chat options"
        >
          <MaterialIcon name="more_vert" size={20} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={onShare}
        >
          <MaterialIcon name="share" size={18} />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onSelect={onDelete}
        >
          <MaterialIcon name="delete" size={18} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
