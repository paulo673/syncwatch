import { useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import type { ChatMessage } from "../chat.types";

interface ChatMessagesProps {
  messages: ChatMessage[];
  currentUsername: string;
  currentSocketId: string | null;
}

export function ChatMessages({
  messages,
  currentUsername,
  currentSocketId,
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const isOwnMessage = (message: ChatMessage): boolean => {
    if (currentSocketId && message.userId === currentSocketId) {
      return true;
    }
    if (currentUsername && message.username === currentUsername) {
      return true;
    }
    return false;
  };

  if (messages.length === 0) {
    return (
      <div className="sw-flex-1 sw-flex sw-flex-col sw-items-center sw-justify-center sw-text-gray-500 sw-text-sm sw-p-5">
        <MessageCircle className="sw-w-8 sw-h-8 sw-mb-3 sw-opacity-50" />
        <p className="sw-text-center">
          No messages yet.
          <br />
          Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="sw-flex-1 sw-overflow-y-auto sw-p-3 sw-flex sw-flex-col sw-gap-2"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.messageId}
          message={message}
          isOwn={isOwnMessage(message)}
        />
      ))}
    </div>
  );
}
