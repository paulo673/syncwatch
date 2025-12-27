import { io, Socket } from "socket.io-client";

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
      if (data.isPlaying && state.videoElement.paused) {
        executeRemoteAction(() => {
          state.videoElement!.play();
        });
      } else if (!data.isPlaying && !state.videoElement.paused) {
        executeRemoteAction(() => {
          state.videoElement!.pause();
        });
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

// Initialize SyncWatch
function init(): void {
  console.log("[SyncWatch] Initializing...");

  // Wait for video element to be available
  const checkForVideo = setInterval(() => {
    const video = findVideoElement();
    if (video) {
      clearInterval(checkForVideo);
      state.videoElement = video;
      console.log("[SyncWatch] Video element found");

      // Initialize socket connection
      state.socket = initSocket();

      // Setup video listeners
      setupVideoListeners(video);

      // Expose API to window for popup/background script communication
      (window as unknown as { syncWatch: SyncWatchAPI }).syncWatch = {
        joinRoom,
        createRoom,
        getState: () => ({
          isConnected: state.isConnected,
          roomId: state.roomId,
          username: state.username,
          isBuffering: state.isBuffering,
          partnerBuffering: state.partnerBuffering,
        }),
        setUsername: (name: string) => {
          state.username = name;
        },
      };

      console.log("[SyncWatch] Ready! Use window.syncWatch.createRoom() or window.syncWatch.joinRoom('roomId')");
    }
  }, 500);

  // Timeout after 30 seconds
  setTimeout(() => {
    clearInterval(checkForVideo);
    if (!state.videoElement) {
      console.log("[SyncWatch] No video element found after 30 seconds");
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
  };
  setUsername: (name: string) => void;
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
