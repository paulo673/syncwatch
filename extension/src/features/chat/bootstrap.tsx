import { createRoot, type Root } from "react-dom/client";
import { createRef } from "react";
import { ChatApp, type ChatAppRef } from "./chat-app";
import type { ChatMessage, SystemEvent, ChatCallbacks } from "./chat.types";

// Import styles as inline CSS string
import tailwindStyles from "@/shared/styles/globals.css?inline";
import youtubeOverrides from "@/shared/styles/youtube-overrides.css?inline";

let root: Root | null = null;
const chatRef = createRef<ChatAppRef>();

export function injectChat(callbacks: ChatCallbacks): boolean {
  // Check if already injected
  if (document.getElementById("syncwatch-root")) {
    return true;
  }

  // Verify we're on a YouTube watch page with player
  const YOUTUBE_PLAYER_SELECTOR = "#ytd-player"
  const ytdPlayer = document.querySelector(YOUTUBE_PLAYER_SELECTOR);
  if (!ytdPlayer || !ytdPlayer.parentNode) {
    console.log(`[SyncWatch] ${YOUTUBE_PLAYER_SELECTOR} not found, retrying...`);
    return false;
  }

  // Inject all styles (Tailwind + YouTube overrides)
  const style = document.createElement("style");
  style.id = "syncwatch-styles";
  style.textContent = tailwindStyles + "\n" + youtubeOverrides;
  document.head.appendChild(style);

  // Create React root container
  const container = document.createElement("div");
  container.id = "syncwatch-root";
  ytdPlayer.parentNode.insertBefore(container, ytdPlayer.nextSibling);

  // Create React root and render
  root = createRoot(container);
  root.render(
    <ChatApp
      ref={chatRef}
      onSendMessage={callbacks.onSendMessage}
      onTyping={callbacks.onTyping}
      onToggle={callbacks.onToggle}
    />
  );

  // Add initial class to body
  document.body.classList.add("syncwatch-chat-open");

  console.log("[SyncWatch] Chat UI injected successfully");
  return true;
}

export function removeChat(): void {
  if (root) {
    root.unmount();
    root = null;
  }

  document.getElementById("syncwatch-root")?.remove();
  document.getElementById("syncwatch-styles")?.remove();
  document.body.classList.remove("syncwatch-chat-open");
}

// Exported methods to control chat from content script
export function appendMessage(message: ChatMessage): void {
  chatRef.current?.appendMessage(message);
}

export function appendSystemEvent(event: SystemEvent): void {
  chatRef.current?.appendSystemEvent(event);
}

export function renderMessages(messages: ChatMessage[]): void {
  chatRef.current?.renderMessages(messages);
}

export function updateTypingIndicator(users: string[]): void {
  chatRef.current?.updateTypingIndicator(users);
}

export function setCurrentUser(
  socketId: string | null,
  username: string
): void {
  chatRef.current?.setCurrentUser(socketId, username);
}

export function setChatVisibility(visible: boolean): void {
  chatRef.current?.setChatVisibility(visible);
}

export function clearUnread(): void {
  chatRef.current?.clearUnread();
}
