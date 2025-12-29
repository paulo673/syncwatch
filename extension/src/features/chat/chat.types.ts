export interface ChatMessage {
  messageId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface SystemEvent {
  type: "join" | "leave" | "play" | "pause";
  username: string;
  timestamp: number;
}

export interface ChatState {
  messages: ChatMessage[];
  typingUsers: string[];
  isConnected: boolean;
  currentUsername: string;
  currentSocketId: string | null;
}

export interface ChatCallbacks {
  onSendMessage: (text: string) => void;
  onTyping: () => void;
  onToggle: (visible: boolean) => void;
}
