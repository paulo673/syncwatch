import { io, Socket } from "socket.io-client";
import { logger } from "./utils/logger";

// Configuration
const SERVER_URL = "http://localhost:3000";
const SYNC_TOLERANCE_SECONDS = 1;
const DEBOUNCE_DELAY_MS = 300;

// State management
interface SyncState {
  socket: Socket | null;
  videoElement: HTMLVideoElement | null;
  roomId: string | null;
  username: string;
  isConnected: boolean;
  isRemoteAction: boolean; // Flag to prevent event loops
  isBuffering: boolean;
  partnerBuffering: boolean;
  partnerLoading: boolean; // Partner is loading (page reload)
  isReady: boolean; // This user is ready to play
  lastEventTimestamp: number;
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
};

// Debounce utility to prevent rapid-fire events
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Wrapper to execute actions without triggering local event listeners
function executeRemoteAction(action: () => void): void {
  state.isRemoteAction = true;
  action();
  // Reset flag after a short delay to allow the event to propagate
  setTimeout(() => {
    state.isRemoteAction = false;
  }, 100);
}

// Find the YouTube video element
function findVideoElement(): HTMLVideoElement | null {
  // YouTube uses a video element inside the player
  const video = document.querySelector<HTMLVideoElement>("video.html5-main-video");
  if (video) return video;

  // Fallback: find any video element
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
    state.isReady = false; // Reset ready state on reconnect

    // Auto-join room if we have a room ID
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

      // Don't auto-play yet - wait for video to be ready, then emit user_ready
      // The server will coordinate resume_after_buffer when all users are ready
      if (data.isPlaying) {
        // Pause first, will resume when all are ready
        executeRemoteAction(() => {
          state.videoElement!.pause();
        });
      } else if (!data.isPlaying && !state.videoElement.paused) {
        executeRemoteAction(() => {
          state.videoElement!.pause();
        });
      }

      // Signal ready when video can play through
      const signalReady = () => {
        if (!state.isReady && socket.connected) {
          state.isReady = true;
          socket.emit("user_ready");
          console.log("[SyncWatch] Signaled ready to server");
        }
      };

      // Check if video is already ready to play
      if (state.videoElement.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
        signalReady();
      } else {
        // Wait for canplaythrough event
        const handleCanPlayThrough = () => {
          signalReady();
          state.videoElement!.removeEventListener("canplaythrough", handleCanPlayThrough);
        };
        state.videoElement.addEventListener("canplaythrough", handleCanPlayThrough);

        // Fallback: signal ready after 3 seconds even if video isn't fully loaded
        setTimeout(() => {
          signalReady();
        }, 3000);
      }
    }
  });

  // Play command from server
  socket.on("play", (data) => {
    console.log("[SyncWatch] Play command received:", data);
    if (!state.videoElement) return;

    const timeDiff = Math.abs(state.videoElement.currentTime - data.currentTime);

    executeRemoteAction(() => {
      // If time difference is greater than tolerance, seek first
      if (timeDiff > SYNC_TOLERANCE_SECONDS) {
        console.log(`[SyncWatch] Time diff ${timeDiff.toFixed(2)}s > ${SYNC_TOLERANCE_SECONDS}s, seeking...`);
        state.videoElement!.currentTime = data.currentTime;
      }
      state.videoElement!.play();
    });
  });

  // Pause command from server
  socket.on("pause", (data) => {
    console.log("[SyncWatch] Pause command received:", data);
    if (!state.videoElement) return;

    executeRemoteAction(() => {
      state.videoElement!.pause();
      // Sync time on pause as well
      if (Math.abs(state.videoElement!.currentTime - data.currentTime) > SYNC_TOLERANCE_SECONDS) {
        state.videoElement!.currentTime = data.currentTime;
      }
    });
  });

  // Seek command from server
  socket.on("seek", (data) => {
    console.log("[SyncWatch] Seek command received:", data);
    if (!state.videoElement) return;

    executeRemoteAction(() => {
      state.videoElement!.currentTime = data.currentTime;
    });
  });

  // Someone started buffering
  socket.on("buffering_start", (data) => {
    if (data.userId === socket.id) return; // Ignore our own buffering

    console.log(`[SyncWatch] Partner is buffering: ${data.username}`);
    state.partnerBuffering = true;

    if (state.videoElement && !state.videoElement.paused) {
      executeRemoteAction(() => {
        state.videoElement!.pause();
      });
      console.log("[SyncWatch] Paused - Waiting for partner...");
    }
  });

  // Someone finished buffering
  socket.on("buffering_end", (data) => {
    console.log(`[SyncWatch] Buffering ended for: ${data.username || "user"}`);

    if (data.bufferingCount === 0) {
      state.partnerBuffering = false;
    }
  });

  // Resume after everyone finished buffering
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

  // User joined notification
  socket.on("user_joined", (data) => {
    console.log(`[SyncWatch] ${data.username} joined the room. Users: ${data.userCount}`);
  });

  // User left notification
  socket.on("user_left", (data) => {
    console.log(`[SyncWatch] ${data.username} left the room. Users: ${data.userCount}`);
  });

  // Someone is loading (page reload or initial join)
  socket.on("user_loading", (data) => {
    if (data.userId === socket.id) return; // Ignore our own loading

    console.log(`[SyncWatch] Partner is loading: ${data.username}`);
    state.partnerLoading = true;

    // Pause while partner is loading
    if (state.videoElement && !state.videoElement.paused) {
      executeRemoteAction(() => {
        state.videoElement!.pause();
      });
      console.log("[SyncWatch] Paused - Waiting for partner to load...");
    }
  });

  // Someone finished loading
  socket.on("user_ready", (data) => {
    console.log(`[SyncWatch] ${data.username || "User"} is ready. Loading: ${data.loadingCount}`);

    if (data.loadingCount === 0) {
      state.partnerLoading = false;
    }
  });

  return socket;
}

// Setup video event listeners
function setupVideoListeners(video: HTMLVideoElement): void {
  // Debounced emit functions to prevent spam
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

  // Play event
  video.addEventListener("play", () => {
    if (state.isRemoteAction) {
      console.log("[SyncWatch] Ignoring remote-triggered play event");
      return;
    }
    emitPlay();
  });

  // Pause event
  video.addEventListener("pause", () => {
    if (state.isRemoteAction) {
      console.log("[SyncWatch] Ignoring remote-triggered pause event");
      return;
    }
    emitPause();
  });

  // Seeking event (when user drags the progress bar)
  video.addEventListener("seeked", () => {
    if (state.isRemoteAction) {
      console.log("[SyncWatch] Ignoring remote-triggered seek event");
      return;
    }
    emitSeek();
  });

  // Buffering start (waiting event)
  video.addEventListener("waiting", () => {
    if (state.isBuffering) return; // Already buffering

    state.isBuffering = true;
    console.log("[SyncWatch] Buffering started");

    if (state.socket && state.isConnected) {
      state.socket.emit("buffering_start");
    }
  });

  // Buffering end (canplay or playing events)
  const handleBufferingEnd = () => {
    if (!state.isBuffering) return; // Wasn't buffering

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

// Join a room
function joinRoom(roomId: string): void {
  if (!state.socket || !state.isConnected) {
    console.error("[SyncWatch] Cannot join room: not connected");
    return;
  }

  state.roomId = roomId;

  // Persist room to chrome.storage for reconnection after reload
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

// Create a new room
function createRoom(): string {
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  joinRoom(roomId);
  return roomId;
}

// Setup listener for messages from background script (chrome.runtime)
// This must be called immediately to catch early messages (e.g., auto-join from URL)
function setupBackgroundMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'JOIN_ROOM':
        if (message.roomId) {
          console.log(`[SyncWatch] Received JOIN_ROOM from background: ${message.roomId}`);
          // Store roomId in state - will auto-join when socket connects
          state.roomId = message.roomId;
          // If already connected, join immediately
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
    return true; // Keep channel open for async response
  });

  console.log("[SyncWatch] Background message listener registered");
}

// Setup message listener to communicate with MAIN world script (main-world.ts)
// The MAIN world script is injected via manifest.json with "world": "MAIN"
// This avoids CSP violations that occur with inline script injection
function setupMessageListener(api: SyncWatchAPI): void {
  // Listen for messages from MAIN world
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;

    const { type, roomId, username } = event.data;

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
    }
  });

  logger.info("Content Script", "Message listener setup for MAIN world communication");
}

// Check for stored room and auto-reconnect
async function checkStoredRoom(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['activeRoom'], (result) => {
      if (result.activeRoom && result.activeRoom.roomId) {
        // Check if this is the same video URL (base URL without params)
        const storedUrl = new URL(result.activeRoom.url);
        const currentUrl = new URL(window.location.href);

        // Compare video ID for YouTube
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

// Initialize SyncWatch
function init(): void {
  console.log("[SyncWatch] Initializing...");
  logger.info("Content Script", "Initializing SyncWatch", { url: window.location.href });

  // Register background message listener immediately to catch auto-join from URL
  setupBackgroundMessageListener();

  // Wait for video element to be available
  const checkForVideo = setInterval(async () => {
    const video = findVideoElement();
    if (video) {
      clearInterval(checkForVideo);
      state.videoElement = video;
      console.log("[SyncWatch] Video element found");
      logger.info("Content Script", "Video element found");

      // Check for stored room before initializing socket
      const storedRoomId = await checkStoredRoom();
      if (storedRoomId && !state.roomId) {
        state.roomId = storedRoomId;
        console.log(`[SyncWatch] Will auto-reconnect to room: ${storedRoomId}`);
      }

      // Initialize socket connection
      state.socket = initSocket();

      // Setup video listeners
      setupVideoListeners(video);

      // Expose API to window for popup/background script communication
      // IMPORTANT: We need to expose this in the MAIN world, not ISOLATED world
      // So we inject a script tag that has access to the page's window object

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
        }),
        setUsername: (name: string) => {
          state.username = name;
        },
      };

      // Expose in ISOLATED world (for content script access)
      (window as unknown as { syncWatch: SyncWatchAPI }).syncWatch = api;

      // Setup listener to communicate with MAIN world script
      // The MAIN world script (main-world.ts) is injected via manifest.json
      setupMessageListener(api);

      console.log("[SyncWatch] Ready! Use window.syncWatch.createRoom() or window.syncWatch.joinRoom('roomId')");
      logger.info("Content Script", "SyncWatch API ready and exposed to window");
    }
  }, 500);

  // Timeout after 30 seconds
  setTimeout(() => {
    clearInterval(checkForVideo);
    if (!state.videoElement) {
      console.log("[SyncWatch] No video element found after 30 seconds");
      logger.warn("Content Script", "No video element found after 30 seconds", { url: window.location.href });
    }
  }, 30000);
}

// API interface for external communication
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
  };
  setUsername: (name: string) => void;
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
