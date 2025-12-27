// Popup script for SyncWatch

interface SyncWatchState {
  isConnected: boolean;
  roomId: string | null;
  username: string;
  isBuffering: boolean;
  partnerBuffering: boolean;
}

// DOM Elements
const statusDot = document.getElementById("statusDot") as HTMLDivElement;
const statusText = document.getElementById("statusText") as HTMLSpanElement;
const noRoomSection = document.getElementById("noRoom") as HTMLDivElement;
const inRoomSection = document.getElementById("inRoom") as HTMLDivElement;
const usernameInput = document.getElementById("username") as HTMLInputElement;
const roomIdInput = document.getElementById("roomId") as HTMLInputElement;
const createRoomBtn = document.getElementById("createRoom") as HTMLButtonElement;
const joinRoomBtn = document.getElementById("joinRoom") as HTMLButtonElement;
const copyLinkBtn = document.getElementById("copyLink") as HTMLButtonElement;
const leaveRoomBtn = document.getElementById("leaveRoom") as HTMLButtonElement;
const currentRoomIdEl = document.getElementById("currentRoomId") as HTMLParagraphElement;

// Get current tab
async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// Send message to content script
async function sendToContent(message: object): Promise<unknown> {
  const tab = await getCurrentTab();
  if (!tab?.id) return null;

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id!, message, (response) => {
      resolve(response);
    });
  });
}

// Execute script in page context
async function executeInPage(func: string, ...args: unknown[]): Promise<unknown> {
  const tab = await getCurrentTab();
  if (!tab?.id) return null;

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: new Function(`return (${func})(...arguments)`) as () => unknown,
    args,
  });

  return results[0]?.result;
}

// Update UI based on state
function updateUI(state: SyncWatchState | null): void {
  if (!state) {
    statusDot.classList.remove("connected");
    statusText.textContent = "Not on YouTube";
    noRoomSection.classList.remove("hidden");
    inRoomSection.classList.add("hidden");
    return;
  }

  if (state.isConnected) {
    statusDot.classList.add("connected");
    statusText.textContent = state.roomId ? `In room` : "Connected";
  } else {
    statusDot.classList.remove("connected");
    statusText.textContent = "Connecting...";
  }

  if (state.roomId) {
    noRoomSection.classList.add("hidden");
    inRoomSection.classList.remove("hidden");
    currentRoomIdEl.textContent = state.roomId;
  } else {
    noRoomSection.classList.remove("hidden");
    inRoomSection.classList.add("hidden");
  }

  if (state.username) {
    usernameInput.value = state.username;
  }
}

// Refresh state from content script
async function refreshState(): Promise<void> {
  try {
    const result = await executeInPage(`
      () => {
        if (window.syncWatch) {
          return window.syncWatch.getState();
        }
        return null;
      }
    `);
    updateUI(result as SyncWatchState | null);
  } catch {
    updateUI(null);
  }
}

// Create a new room
createRoomBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  if (username) {
    await executeInPage(`(name) => window.syncWatch?.setUsername(name)`, username);
  }

  const roomId = await executeInPage(`() => window.syncWatch?.createRoom()`);
  if (roomId) {
    await refreshState();
  }
});

// Join existing room
joinRoomBtn.addEventListener("click", async () => {
  const roomId = roomIdInput.value.trim();
  if (!roomId) {
    roomIdInput.focus();
    return;
  }

  const username = usernameInput.value.trim();
  if (username) {
    await executeInPage(`(name) => window.syncWatch?.setUsername(name)`, username);
  }

  await executeInPage(`(id) => window.syncWatch?.joinRoom(id)`, roomId);
  await refreshState();
});

// Copy room link
copyLinkBtn.addEventListener("click", async () => {
  const state = (await executeInPage(`() => window.syncWatch?.getState()`)) as SyncWatchState | null;
  if (state?.roomId) {
    const tab = await getCurrentTab();
    const url = new URL(tab?.url || "");
    url.searchParams.set("syncwatch_room", state.roomId);

    await navigator.clipboard.writeText(url.toString());
    copyLinkBtn.textContent = "Copied!";
    setTimeout(() => {
      copyLinkBtn.textContent = "Copy Link";
    }, 2000);
  }
});

// Leave room
leaveRoomBtn.addEventListener("click", async () => {
  // Reload the page to disconnect
  const tab = await getCurrentTab();
  if (tab?.id) {
    chrome.tabs.reload(tab.id);
  }
  window.close();
});

// Load saved username
chrome.storage.local.get(["username"], (result) => {
  if (result.username) {
    usernameInput.value = result.username;
  }
});

// Save username on change
usernameInput.addEventListener("change", () => {
  chrome.storage.local.set({ username: usernameInput.value });
});

// Initialize
refreshState();
