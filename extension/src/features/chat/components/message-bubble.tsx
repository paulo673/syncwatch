import { cn } from "@/shared/lib/utils";
import type { ChatMessage } from "../chat.types";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "sw-max-w-[85%] sw-rounded-xl sw-px-3 sw-py-2 sw-animate-message-in",
        isOwn
          ? "sw-self-end sw-bg-gradient-to-br sw-from-primary sw-to-primary-dark sw-text-white sw-rounded-br-sm"
          : "sw-self-start sw-bg-white/10 sw-text-white sw-rounded-bl-sm"
      )}
    >
      <div className="sw-flex sw-items-center sw-justify-between sw-gap-2 sw-mb-1">
        <span
          className={cn(
            "sw-text-xs sw-font-semibold",
            isOwn ? "sw-text-white/80" : "sw-text-primary"
          )}
        >
          {message.username}
        </span>
        <span
          className={cn(
            "sw-text-[10px]",
            isOwn ? "sw-text-white/60" : "sw-text-gray-500"
          )}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
      <p className="sw-text-sm sw-leading-relaxed sw-break-words">
        {message.text}
      </p>
    </div>
  );
}
