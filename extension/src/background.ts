// SyncWatch Background Service Worker (Manifest V3)

// Store active room information
interface RoomInfo {
  roomId: string;
  tabId: number;
  url: string;
}

let activeRoom: RoomInfo | null = null;

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("[SyncWatch] Extension installed:", details.reason);

  if (details.reason === "install") {
    // First time installation
    chrome.storage.local.set({
      username: `User_${Math.random().toString(36).substring(2, 8)}`,
      serverUrl: "http://localhost:3000",
    });
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[SyncWatch] Message received:", message);

  switch (message.type) {
    case "GET_STATE":
      sendResponse({
        activeRoom,
        tabId: sender.tab?.id,
      });
      break;

    case "SET_ROOM":
      activeRoom = {
        roomId: message.roomId,
        tabId: sender.tab?.id || 0,
        url: sender.tab?.url || "",
      };
      // Store in chrome.storage for persistence
      chrome.storage.local.set({ activeRoom });
      sendResponse({ success: true });
      break;

    case "CLEAR_ROOM":
      activeRoom = null;
      chrome.storage.local.remove("activeRoom");
      sendResponse({ success: true });
      break;

    case "GET_ROOM_LINK":
      if (activeRoom) {
        const shareUrl = `${activeRoom.url}?syncwatch_room=${activeRoom.roomId}`;
        sendResponse({ shareUrl });
      } else {
        sendResponse({ error: "No active room" });
      }
      break;

    case "INJECT_CONTENT_SCRIPT":
      if (message.tabId) {
        chrome.scripting.executeScript({
          target: { tabId: message.tabId },
          files: ["src/content.ts"],
        });
        sendResponse({ success: true });
      }
      break;

    default:
      sendResponse({ error: "Unknown message type" });
  }

  return true; // Keep the message channel open for async response
});

// Listen for tab updates to detect YouTube navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    (tab.url.includes("youtube.com/watch") || tab.url.includes("youtube.com/embed"))
  ) {
    console.log("[SyncWatch] YouTube video page detected:", tab.url);

    // Check if there's a room parameter in the URL
    try {
      const url = new URL(tab.url);
      const roomId = url.searchParams.get("syncwatch_room");

      if (roomId) {
        // Auto-join the room
        chrome.tabs.sendMessage(tabId, {
          type: "JOIN_ROOM",
          roomId,
        });
      }
    } catch {
      console.error("[SyncWatch] Error parsing URL");
    }
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeRoom && activeRoom.tabId === tabId) {
    activeRoom = null;
    chrome.storage.local.remove("activeRoom");
    console.log("[SyncWatch] Active room cleared (tab closed)");
  }
});

// Handle keyboard commands (shortcuts)
chrome.commands?.onCommand.addListener((command) => {
  console.log("[SyncWatch] Command received:", command);

  switch (command) {
    case "create-room":
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "CREATE_ROOM" });
        }
      });
      break;

    case "copy-room-link":
      if (activeRoom) {
        const shareUrl = `${activeRoom.url}?syncwatch_room=${activeRoom.roomId}`;
        // Note: Clipboard API requires user gesture in MV3
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "COPY_TO_CLIPBOARD",
              text: shareUrl,
            });
          }
        });
      }
      break;
  }
});

console.log("[SyncWatch] Background service worker started");
