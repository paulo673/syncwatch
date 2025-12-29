import {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { ChatContainer, ToggleButton } from "./components";
import type { ChatMessage, SystemEvent, ChatCallbacks } from "./chat.types";

// Imperative API for integration with content script
export interface ChatAppRef {
  appendMessage: (message: ChatMessage) => void;
  appendSystemEvent: (event: SystemEvent) => void;
  renderMessages: (messages: ChatMessage[]) => void;
  updateTypingIndicator: (users: string[]) => void;
  setCurrentUser: (socketId: string | null, username: string) => void;
  setChatVisibility: (visible: boolean) => void;
  clearUnread: () => void;
}

export const ChatApp = forwardRef<ChatAppRef, ChatCallbacks>(
  ({ onSendMessage, onTyping, onToggle }, ref) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [currentUsername, setCurrentUsername] = useState("");
    const [currentSocketId, setCurrentSocketId] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [hasUnread, setHasUnread] = useState(false);

    // Manage body class for YouTube layout adjustment
    useEffect(() => {
      if (isVisible) {
        document.body.classList.add("syncwatch-chat-open");
      } else {
        document.body.classList.remove("syncwatch-chat-open");
      }
    }, [isVisible]);

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      appendMessage: (message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
        // Mark as unread if chat is hidden and not own message
        if (!isVisible && message.userId !== currentSocketId) {
          setHasUnread(true);
        }
      },
      appendSystemEvent: (_event: SystemEvent) => {
        // System events are handled separately if needed
        // For now, we could add them as special messages
      },
      renderMessages: (newMessages: ChatMessage[]) => {
        setMessages(newMessages);
      },
      updateTypingIndicator: (users: string[]) => {
        setTypingUsers(users);
      },
      setCurrentUser: (socketId: string | null, username: string) => {
        setCurrentSocketId(socketId);
        setCurrentUsername(username);
      },
      setChatVisibility: (visible: boolean) => {
        setIsVisible(visible);
        if (visible) {
          setHasUnread(false);
        }
      },
      clearUnread: () => {
        setHasUnread(false);
      },
    }));

    const handleClose = useCallback(() => {
      setIsVisible(false);
      onToggle(false);
    }, [onToggle]);

    const handleToggle = useCallback(() => {
      const newVisible = !isVisible;
      setIsVisible(newVisible);
      if (newVisible) {
        setHasUnread(false);
      }
      onToggle(newVisible);
    }, [isVisible, onToggle]);

    return (
      <>
        <ChatContainer
          messages={messages}
          typingUsers={typingUsers}
          currentUsername={currentUsername}
          currentSocketId={currentSocketId}
          isVisible={isVisible}
          onClose={handleClose}
          onSendMessage={onSendMessage}
          onTyping={onTyping}
        />
        <ToggleButton
          onClick={handleToggle}
          hasUnread={hasUnread}
          isChatOpen={isVisible}
        />
      </>
    );
  }
);

ChatApp.displayName = "ChatApp";
