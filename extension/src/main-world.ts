// This script runs in the MAIN world and creates window.syncWatch
// It communicates with the content script via postMessage

// Export to make this a module (required for global augmentation)
export {};

interface ChatMessage {
  messageId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

interface SyncWatchAPI {
  joinRoom: (roomId: string) => void;
  createRoom: () => Promise<string>;
  getState: () => Promise<{
    isConnected: boolean;
    roomId: string | null;
    username: string;
    isBuffering: boolean;
    partnerBuffering: boolean;
    socketId: string | null;
  }>;
  setUsername: (name: string) => void;
  // Chat methods
  sendChatMessage: (text: string) => void;
  notifyTyping: () => void;
  getChatMessages: () => Promise<ChatMessage[]>;
  toggleChat: (visible?: boolean) => void;
  getSocketId: () => Promise<string | null>;
  onChatMessage: (callback: (message: ChatMessage) => void) => void;
  onChatHistory: (callback: (messages: ChatMessage[]) => void) => void;
  onTypingUpdate: (callback: (typingUsers: string[]) => void) => void;
  onChatVisibility: (callback: (visible: boolean) => void) => void;
}

declare global {
  interface Window {
    syncWatch: SyncWatchAPI;
  }
}

// Callback storage for chat events
const chatMessageCallbacks: ((message: ChatMessage) => void)[] = [];
const chatHistoryCallbacks: ((messages: ChatMessage[]) => void)[] = [];
const typingUpdateCallbacks: ((typingUsers: string[]) => void)[] = [];
const chatVisibilityCallbacks: ((visible: boolean) => void)[] = [];

// Listen for chat events from content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  switch (event.data?.type) {
    case 'SYNCWATCH_CHAT_MESSAGE':
      chatMessageCallbacks.forEach(cb => cb(event.data.message));
      break;
    case 'SYNCWATCH_CHAT_HISTORY':
      chatHistoryCallbacks.forEach(cb => cb(event.data.messages));
      break;
    case 'SYNCWATCH_TYPING_UPDATE':
      typingUpdateCallbacks.forEach(cb => cb(event.data.typingUsers));
      break;
    case 'SYNCWATCH_CHAT_VISIBILITY':
      chatVisibilityCallbacks.forEach(cb => cb(event.data.visible));
      break;
  }
});

// Create the API object in the MAIN world
(window as Window).syncWatch = {
  joinRoom: function(roomId: string) {
    window.postMessage({ type: 'SYNCWATCH_JOIN_ROOM', roomId }, '*');
  },

  createRoom: function() {
    window.postMessage({ type: 'SYNCWATCH_CREATE_ROOM' }, '*');
    return new Promise<string>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SYNCWATCH_ROOM_CREATED') {
          window.removeEventListener('message', handler);
          resolve(event.data.roomId);
        }
      };
      window.addEventListener('message', handler);
    });
  },

  getState: function() {
    return new Promise((resolve) => {
      window.postMessage({ type: 'SYNCWATCH_GET_STATE' }, '*');
      const handler = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SYNCWATCH_STATE') {
          window.removeEventListener('message', handler);
          resolve(event.data.state);
        }
      };
      window.addEventListener('message', handler);
    });
  },

  setUsername: function(name: string) {
    window.postMessage({ type: 'SYNCWATCH_SET_USERNAME', username: name }, '*');
  },

  // Chat methods
  sendChatMessage: function(text: string) {
    window.postMessage({ type: 'SYNCWATCH_SEND_CHAT', text }, '*');
  },

  notifyTyping: function() {
    window.postMessage({ type: 'SYNCWATCH_TYPING' }, '*');
  },

  getChatMessages: function() {
    return new Promise<ChatMessage[]>((resolve) => {
      window.postMessage({ type: 'SYNCWATCH_GET_CHAT_MESSAGES' }, '*');
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'SYNCWATCH_CHAT_HISTORY') {
          window.removeEventListener('message', handler);
          resolve(event.data.messages);
        }
      };
      window.addEventListener('message', handler);
    });
  },

  toggleChat: function(visible?: boolean) {
    window.postMessage({ type: 'SYNCWATCH_TOGGLE_CHAT', visible }, '*');
  },

  getSocketId: function() {
    return new Promise<string | null>((resolve) => {
      window.postMessage({ type: 'SYNCWATCH_GET_SOCKET_ID' }, '*');
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'SYNCWATCH_SOCKET_ID') {
          window.removeEventListener('message', handler);
          resolve(event.data.socketId);
        }
      };
      window.addEventListener('message', handler);
    });
  },

  onChatMessage: function(callback: (message: ChatMessage) => void) {
    chatMessageCallbacks.push(callback);
  },

  onChatHistory: function(callback: (messages: ChatMessage[]) => void) {
    chatHistoryCallbacks.push(callback);
  },

  onTypingUpdate: function(callback: (typingUsers: string[]) => void) {
    typingUpdateCallbacks.push(callback);
  },

  onChatVisibility: function(callback: (visible: boolean) => void) {
    chatVisibilityCallbacks.push(callback);
  }
};

console.log('[SyncWatch] API injected in MAIN world');
