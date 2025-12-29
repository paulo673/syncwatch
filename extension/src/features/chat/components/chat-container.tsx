import { cn } from "@/shared/lib/utils";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import type { ChatMessage } from "../chat.types";

interface ChatContainerProps {
  messages: ChatMessage[];
  typingUsers: string[];
  currentUsername: string;
  currentSocketId: string | null;
  isVisible: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onTyping: () => void;
}

export function ChatContainer({
  messages,
  typingUsers,
  currentUsername,
  currentSocketId,
  isVisible,
  onClose,
  onSendMessage,
  onTyping,
}: ChatContainerProps) {
  return (
    <div
      className={cn(
        "sw-w-80 sw-h-full sw-fixed sw-top-0 sw-right-0 sw-bottom-0",
        "sw-flex sw-flex-col sw-z-[9999999999]",
        "sw-bg-gradient-to-br sw-from-background sw-to-background-secondary",
        "sw-transition-transform sw-duration-200 sw-ease-out",
        "sw-select-text sw-cursor-auto",
        !isVisible && "sw-translate-x-full sw-pointer-events-none"
      )}
    >
      <ChatHeader onClose={onClose} />
      <ChatMessages
        messages={messages}
        currentUsername={currentUsername}
        currentSocketId={currentSocketId}
      />
      <TypingIndicator
        typingUsers={typingUsers}
        currentUsername={currentUsername}
      />
      <ChatInput onSendMessage={onSendMessage} onTyping={onTyping} />
    </div>
  );
}
