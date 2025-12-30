import { cn } from "@/shared/lib/utils";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import type { ChatMessage } from "../chat.types";
import { usePlayerHeight } from "../hooks/use-player-height";

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
  // TODO: Re-enable after testing - see docs/TAILWIND_FIX.md
  const playerDimensions = usePlayerHeight();
  //const playerDimensions = null as { height: number; top: number } | null; // Temporarily disabled for testing

  // Calculate inline styles for dynamic positioning aligned with YouTube player
  const containerStyle = playerDimensions
    ? {
        height: `${playerDimensions.height}px`,
        top: `${playerDimensions.top}px`,
        border: '1px solid red'
      }
    : {
        height: "100vh",
        top: 0,
      };

  return (
    <div
      className={cn(
        "sw:w-80 sw:fixed sw:right-0",
        "sw:flex sw:flex-col sw:z-[9999999999]",
        "sw:bg-purple-900",
        "sw:transition-transform sw:duration-200 sw:ease-out",
        "sw:select-text sw:cursor-auto",
        "sw:border sw:border-purple-700",
        !isVisible && "sw:translate-x-full sw:pointer-events-none"
      )}
      style={containerStyle}
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
