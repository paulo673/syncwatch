import { io, Socket } from "socket.io-client";
import { logger } from "@/shared/lib/logger";
import { debounce } from "@/shared/hooks/use-debounce";
import {
  injectChat,
  appendMessage,
  appendSystemEvent,
  renderMessages,
  updateTypingIndicator,
  setCurrentUser,
  type ChatMessage,
} from "@/features/chat";

// Configuration
const SERVER_URL = "http://localhost:3000";
const SYNC_TOLERANCE_SECONDS = 1;
const DEBOUNCE_DELAY_MS = 300;
const TYPING_EMIT_INTERVAL = 2000;
const TYPING_STOP_DELAY = 1000;

// State management
interface SyncState {
  socket: Socket | null;
  videoElement: HTMLVideoElement | null;
  roomId: string | null;
  username: string;
  isConnected: boolean;
  isRemoteAction: boolean;
  isBuffering: boolean;
  partnerBuffering: boolean;
  partnerLoading: boolean;
  isReady: boolean;
  lastEventTimestamp: number;
  chatMessages: ChatMessage[];
  typingUsers: Map<string, string>;
  isChatVisible: boolean;
  typingTimeout: ReturnType<typeof setTimeout> | null;
  lastTypingEmit: number;
}

const state: SyncState = {
  socket: null,
  videoElement: null,
  roomId: null,
  username: `User_${Math.random().toString(36).substring(2, 8)}`,
  isConnected: false,
  isRemoteAction: false,
  isBuffering: false,
  partnerBuffering: false,
  partnerLoading: false,
  isReady: false,
  lastEventTimestamp: 0,
  chatMessages: [],
  typingUsers: new Map(),
  isChatVisible: true,
  typingTimeout: null,
  lastTypingEmit: 0,
};

// Wrapper to execute actions without triggering local event listeners
function executeRemoteAction(action: () => void): void {
  state.isRemoteAction = true;
  action();
  setTimeout(() => {
    state.isRemoteAction = false;
  }, 100);
}

// Find the YouTube video element
function findVideoElement(): HTMLVideoElement | null {
  const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
  if (video) return video;
  return document.querySelector<HTMLVideoElement>("video");
}

// Initialize socket connection
function initSocket(): Socket {
  const socket = io(SERVER_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[SyncWatch] Connected to server");
    state.isConnected = true;
    state.isReady = false;

    if (state.roomId) {
      joinRoom(state.roomId);
    }
  });

  socket.on("disconnect", () => {
    console.log("[SyncWatch] Disconnected from server");
    state.isConnected = false;
  });

  socket.on("connect_error", (error) => {
    console.error("[SyncWatch] Connection error:", error.message);
  });

  // Room state received on join
  socket.on("room_state", (data) => {
    console.log("[SyncWatch] Room state received:", data);
    if (state.videoElement && data.currentTime !== undefined) {
      const timeDiff = Math.abs(state.videoElement.currentTime - data.currentTime);
      if (timeDiff > SYNC_TOLERANCE_SECONDS) {
        executeRemoteAction(() => {
          state.videoElement!.currentTime = data.currentTime;
        });
      }

      if (data.isPlaying) {
        executeRemoteAction(() => {
          state.videoElement!.pause();
        });
      } else if (!data.isPlaying && !state.videoElement.paused) {
        executeRemoteAction(() => {
          state.videoElement!.pause();
        });
      }

      const signalReady = () => {
        if (!state.isReady && socket.connected) {
          state.isReady = true;
          socket.emit("user_ready");
          console.log("[SyncWatch] Signaled ready to server");
        }
      };

      if (state.videoElement.readyState >= 3) {
        signalReady();
      } else {
        const handleCanPlayThrough = () => {
          signalReady();
          state.videoElement!.removeEventListener("canplaythrough", handleCanPlayThrough);
        };
        state.videoElement.addEventListener("canplaythrough", handleCanPlayThrough);
        setTimeout(() => signalReady(), 3000);
      }
    }
  });

  // Play command from server
  socket.on("play", (data) => {
    console.log("[SyncWatch] Play command received:", data);
    if (!state.videoElement) return;

    const timeDiff = Math.abs(state.videoElement.currentTime - data.currentTime);

    executeRemoteAction(() => {
      if (timeDiff > SYNC_TOLERANCE_SECONDS) {
        state.videoElement!.currentTime = data.currentTime;
      }
      state.videoElement!.play();
    });

    if (data.username) {
      appendSystemEvent({
        type: 'play',
        username: data.username,
        timestamp: Date.now(),
      });
    }
  });

  // Pause command from server
  socket.on("pause", (data) => {
    console.log("[SyncWatch] Pause command received:", data);
    if (!state.videoElement) return;

    executeRemoteAction(() => {
      state.videoElement!.pause();
      if (Math.abs(state.videoElement!.currentTime - data.currentTime) > SYNC_TOLERANCE_SECONDS) {
        state.videoElement!.currentTime = data.currentTime;
      }
    });

    if (data.username) {
      appendSystemEvent({
        type: 'pause',
        username: data.username,
        timestamp: Date.now(),
      });
    }
  });

  // Seek command from server
  socket.on("seek", (data) => {
    console.log("[SyncWatch] Seek command received:", data);
    if (!state.videoElement) return;

    executeRemoteAction(() => {
      state.videoElement!.currentTime = data.currentTime;
    });
  });

  // Buffering events
  socket.on("buffering_start", (data) => {
    if (data.userId === socket.id) return;
    console.log(`[SyncWatch] Partner is buffering: ${data.username}`);
    state.partnerBuffering = true;

    if (state.videoElement && !state.videoElement.paused) {
      executeRemoteAction(() => {
        state.videoElement!.pause();
      });
    }
  });

  socket.on("buffering_end", (data) => {
    console.log(`[SyncWatch] Buffering ended for: ${data.username || "user"}`);
    if (data.bufferingCount === 0) {
      state.partnerBuffering = false;
    }
  });

  socket.on("resume_after_buffer", (data) => {
    console.log("[SyncWatch] All partners ready, resuming...");
    if (!state.videoElement) return;

    state.partnerBuffering = false;

    executeRemoteAction(() => {
      if (data.currentTime !== undefined) {
        const timeDiff = Math.abs(state.videoElement!.currentTime - data.currentTime);
        if (timeDiff > SYNC_TOLERANCE_SECONDS) {
          state.videoElement!.currentTime = data.currentTime;
        }
      }
      state.videoElement!.play();
    });
  });

  // User events
  socket.on("user_joined", (data) => {
    console.log(`[SyncWatch] ${data.username} joined the room. Users: ${data.userCount}`);
    appendSystemEvent({
      type: 'join',
      username: data.username,
      timestamp: Date.now(),
    });
  });

  socket.on("user_left", (data) => {
    console.log(`[SyncWatch] ${data.username} left the room. Users: ${data.userCount}`);
    appendSystemEvent({
      type: 'leave',
      username: data.username,
      timestamp: Date.now(),
    });
  });

  socket.on("user_loading", (data) => {
    if (data.userId === socket.id) return;
    console.log(`[SyncWatch] Partner is loading: ${data.username}`);
    state.partnerLoading = true;

    if (state.videoElement && !state.videoElement.paused) {
      executeRemoteAction(() => {
        state.videoElement!.pause();
      });
    }
  });

  socket.on("user_ready", (data) => {
    console.log(`[SyncWatch] ${data.username || "User"} is ready. Loading: ${data.loadingCount}`);
    if (data.loadingCount === 0) {
      state.partnerLoading = false;
    }
  });

  // Chat events
  socket.on("chat_history", (data: { messages: ChatMessage[] }) => {
    console.log(`[SyncWatch] Chat history received: ${data.messages.length} messages`);
    state.chatMessages = data.messages;
    window.postMessage({ type: 'SYNCWATCH_CHAT_HISTORY', messages: data.messages }, '*');

    setCurrentUser(socket.id || null, state.username);

    injectChatUIWithRetry(() => {
      renderMessages(data.messages);
    });
  });

  socket.on("chat_message", (message: ChatMessage) => {
    console.log(`[SyncWatch] Chat message: ${message.username}: ${message.text}`);
    state.chatMessages.push(message);
    if (state.chatMessages.length > 100) {
      state.chatMessages.shift();
    }
    window.postMessage({ type: 'SYNCWATCH_CHAT_MESSAGE', message }, '*');
    appendMessage(message);
  });

  // Typing indicators
  socket.on("typing_start", (data: { userId: string; username: string }) => {
    state.typingUsers.set(data.userId, data.username);
    const typingUsers = Array.from(state.typingUsers.values());
    window.postMessage({ type: 'SYNCWATCH_TYPING_UPDATE', typingUsers }, '*');
    updateTypingIndicator(typingUsers);
  });

  socket.on("typing_stop", (data: { userId: string }) => {
    state.typingUsers.delete(data.userId);
    const typingUsers = Array.from(state.typingUsers.values());
    window.postMessage({ type: 'SYNCWATCH_TYPING_UPDATE', typingUsers }, '*');
    updateTypingIndicator(typingUsers);
  });

  return socket;
}

// Setup video event listeners
function setupVideoListeners(video: HTMLVideoElement): void {
  const emitPlay = debounce(() => {
    if (state.isRemoteAction || !state.socket || !state.isConnected) return;
    console.log("[SyncWatch] Emitting play event");
    state.socket.emit("play", {
      currentTime: video.currentTime,
      timestamp: Date.now(),
    });
  }, DEBOUNCE_DELAY_MS);

  const emitPause = debounce(() => {
    if (state.isRemoteAction || !state.socket || !state.isConnected) return;
    console.log("[SyncWatch] Emitting pause event");
    state.socket.emit("pause", {
      currentTime: video.currentTime,
      timestamp: Date.now(),
    });
  }, DEBOUNCE_DELAY_MS);

  const emitSeek = debounce(() => {
    if (state.isRemoteAction || !state.socket || !state.isConnected) return;
    console.log("[SyncWatch] Emitting seek event");
    state.socket.emit("seek", {
      currentTime: video.currentTime,
      timestamp: Date.now(),
    });
  }, DEBOUNCE_DELAY_MS);

  video.addEventListener("play", () => {
    if (state.isRemoteAction) return;
    emitPlay();
  });

  video.addEventListener("pause", () => {
    if (state.isRemoteAction) return;
    emitPause();
  });

  video.addEventListener("seeked", () => {
    if (state.isRemoteAction) return;
    emitSeek();
  });

  video.addEventListener("waiting", () => {
    if (state.isBuffering) return;
    state.isBuffering = true;
    console.log("[SyncWatch] Buffering started");
    if (state.socket && state.isConnected) {
      state.socket.emit("buffering_start");
    }
  });

  const handleBufferingEnd = () => {
    if (!state.isBuffering) return;
    state.isBuffering = false;
    console.log("[SyncWatch] Buffering ended");
    if (state.socket && state.isConnected) {
      state.socket.emit("buffering_end");
    }
  };

  video.addEventListener("canplay", handleBufferingEnd);
  video.addEventListener("playing", handleBufferingEnd);

  console.log("[SyncWatch] Video event listeners attached");
}

// Chat functions
function sendChatMessage(text: string): void {
  if (!state.socket || !state.isConnected || !state.roomId) return;

  const trimmedText = text.trim().slice(0, 500);
  if (!trimmedText) return;

  state.socket.emit("chat_message", {
    text: trimmedText,
    timestamp: Date.now(),
  });

  if (state.typingTimeout) {
    clearTimeout(state.typingTimeout);
    state.typingTimeout = null;
  }
  state.socket.emit("typing_stop");
}

function handleTyping(): void {
  if (!state.socket || !state.isConnected || !state.roomId) return;

  const now = Date.now();

  if (now - state.lastTypingEmit > TYPING_EMIT_INTERVAL) {
    state.socket.emit("typing_start");
    state.lastTypingEmit = now;
  }

  if (state.typingTimeout) {
    clearTimeout(state.typingTimeout);
  }

  state.typingTimeout = setTimeout(() => {
    state.socket?.emit("typing_stop");
    state.typingTimeout = null;
  }, TYPING_STOP_DELAY);
}

// Room functions
function leaveRoom(): void {
  if (state.socket && state.roomId) {
    state.socket.disconnect();
  }
  state.roomId = null;
  state.chatMessages = [];
  state.typingUsers.clear();
  chrome.storage.local.remove(['activeRoom']);
}

function joinRoom(roomId: string): void {
  if (!state.socket || !state.isConnected) {
    console.error("[SyncWatch] Cannot join room: not connected");
    return;
  }

  state.roomId = roomId;

  chrome.storage.local.set({
    activeRoom: {
      roomId,
      url: window.location.href,
      timestamp: Date.now()
    }
  });

  state.socket.emit("join_room", {
    roomId,
    username: state.username,
    videoUrl: window.location.href,
  });

  console.log(`[SyncWatch] Joining room: ${roomId}`);
}

function createRoom(): string {
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  joinRoom(roomId);
  return roomId;
}

// Background message listener
function setupBackgroundMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'JOIN_ROOM':
        if (message.roomId) {
          state.roomId = message.roomId;
          if (state.socket && state.isConnected) {
            joinRoom(message.roomId);
          }
          sendResponse({ success: true });
        } else {
          sendResponse({ error: 'No roomId provided' });
        }
        break;

      case 'CREATE_ROOM':
        if (state.socket && state.isConnected) {
          const newRoomId = createRoom();
          sendResponse({ success: true, roomId: newRoomId });
        } else {
          sendResponse({ error: 'Not connected yet' });
        }
        break;

      case 'GET_STATE':
        sendResponse({
          isConnected: state.isConnected,
          roomId: state.roomId,
          username: state.username,
          isBuffering: state.isBuffering,
          partnerBuffering: state.partnerBuffering,
          partnerLoading: state.partnerLoading,
          isReady: state.isReady,
        });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
    return true;
  });

  console.log("[SyncWatch] Background message listener registered");
}

// API interface
interface SyncWatchAPI {
  joinRoom: (roomId: string) => void;
  createRoom: () => string;
  getState: () => {
    isConnected: boolean;
    roomId: string | null;
    username: string;
    isBuffering: boolean;
    partnerBuffering: boolean;
    partnerLoading: boolean;
    isReady: boolean;
    socketId: string | null;
  };
  setUsername: (name: string) => void;
}

// Message listener for MAIN world
function setupMessageListener(api: SyncWatchAPI): void {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    const { type, roomId, username, text, visible } = event.data;

    switch (type) {
      case 'SYNCWATCH_JOIN_ROOM':
        api.joinRoom(roomId);
        break;

      case 'SYNCWATCH_CREATE_ROOM':
        const newRoomId = api.createRoom();
        window.postMessage({ type: 'SYNCWATCH_ROOM_CREATED', roomId: newRoomId }, '*');
        break;

      case 'SYNCWATCH_GET_STATE':
        const currentState = api.getState();
        window.postMessage({ type: 'SYNCWATCH_STATE', state: currentState }, '*');
        break;

      case 'SYNCWATCH_SET_USERNAME':
        api.setUsername(username);
        break;

      case 'SYNCWATCH_SEND_CHAT':
        sendChatMessage(text);
        break;

      case 'SYNCWATCH_TYPING':
        handleTyping();
        break;

      case 'SYNCWATCH_GET_CHAT_MESSAGES':
        window.postMessage({ type: 'SYNCWATCH_CHAT_HISTORY', messages: state.chatMessages }, '*');
        break;

      case 'SYNCWATCH_TOGGLE_CHAT':
        state.isChatVisible = visible !== undefined ? visible : !state.isChatVisible;
        window.postMessage({ type: 'SYNCWATCH_CHAT_VISIBILITY', visible: state.isChatVisible }, '*');
        break;

      case 'SYNCWATCH_GET_SOCKET_ID':
        window.postMessage({ type: 'SYNCWATCH_SOCKET_ID', socketId: state.socket?.id || null }, '*');
        break;

      case 'SYNCWATCH_LEAVE_ROOM':
        leaveRoom();
        break;
    }
  });

  logger.info("Content Script", "Message listener setup for MAIN world communication");
}

// Chat UI injection with retry
let chatUIInjected = false;
let chatUICallbacks: (() => void)[] = [];

function injectChatUIWithRetry(onReady?: () => void): void {
  if (onReady) {
    chatUICallbacks.push(onReady);
  }

  if (chatUIInjected) {
    const callbacks = chatUICallbacks;
    chatUICallbacks = [];
    callbacks.forEach(cb => cb());
    return;
  }

  const tryInject = () => {
    const success = injectChat({
      onSendMessage: (text) => sendChatMessage(text),
      onTyping: () => handleTyping(),
      onToggle: (visible) => {
        state.isChatVisible = visible;
      },
    });

    if (success) {
      chatUIInjected = true;
      console.log('[SyncWatch] React Chat UI setup complete');

      const callbacks = chatUICallbacks;
      chatUICallbacks = [];
      callbacks.forEach(cb => cb());
    } else {
      setTimeout(tryInject, 500);
    }
  };

  if (!chatUIInjected && chatUICallbacks.length <= 1) {
    tryInject();
  }
}

// Check for stored room
async function checkStoredRoom(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['activeRoom'], (result) => {
      if (result.activeRoom && result.activeRoom.roomId) {
        const storedUrl = new URL(result.activeRoom.url);
        const currentUrl = new URL(window.location.href);

        const storedVideoId = storedUrl.searchParams.get('v');
        const currentVideoId = currentUrl.searchParams.get('v');

        if (storedVideoId && currentVideoId && storedVideoId === currentVideoId) {
          console.log(`[SyncWatch] Found stored room: ${result.activeRoom.roomId}`);
          resolve(result.activeRoom.roomId);
          return;
        }
      }
      resolve(null);
    });
  });
}

// Initialize
function init(): void {
  console.log("[SyncWatch] Initializing...");
  logger.info("Content Script", "Initializing SyncWatch", { url: window.location.href });

  setupBackgroundMessageListener();

  const checkForVideo = setInterval(async () => {
    const video = findVideoElement();
    if (video) {
      clearInterval(checkForVideo);
      state.videoElement = video;
      console.log("[SyncWatch] Video element found");
      logger.info("Content Script", "Video element found");

      const storedRoomId = await checkStoredRoom();
      if (storedRoomId && !state.roomId) {
        state.roomId = storedRoomId;
        console.log(`[SyncWatch] Will auto-reconnect to room: ${storedRoomId}`);
      }

      state.socket = initSocket();
      setupVideoListeners(video);

      const api: SyncWatchAPI = {
        joinRoom,
        createRoom,
        getState: () => ({
          isConnected: state.isConnected,
          roomId: state.roomId,
          username: state.username,
          isBuffering: state.isBuffering,
          partnerBuffering: state.partnerBuffering,
          partnerLoading: state.partnerLoading,
          isReady: state.isReady,
          socketId: state.socket?.id || null,
        }),
        setUsername: (name: string) => {
          state.username = name;
        },
      };

      (window as unknown as { syncWatch: SyncWatchAPI }).syncWatch = api;
      setupMessageListener(api);

      console.log("[SyncWatch] Ready!");
      logger.info("Content Script", "SyncWatch API ready");
    }
  }, 500);

  setTimeout(() => {
    clearInterval(checkForVideo);
    if (!state.videoElement) {
      console.log("[SyncWatch] No video element found after 30 seconds");
      logger.warn("Content Script", "No video element found after 30 seconds");
    }
  }, 30000);
}

// Start initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
