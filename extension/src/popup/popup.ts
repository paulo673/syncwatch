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
const copyRoomIdBtn = document.getElementById("copyRoomId") as HTMLButtonElement;
const leaveRoomBtn = document.getElementById("leaveRoom") as HTMLButtonElement;
const currentRoomIdEl = document.getElementById("currentRoomId") as HTMLParagraphElement;
const viewLogsBtn = document.getElementById("viewLogs") as HTMLButtonElement;

// State tracking
let isReady = false;
let currentTab: chrome.tabs.Tab | null = null;

// Get current tab
async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab || null;
  return currentTab;
}

// Check if tab is on YouTube video page
function isYouTubeVideoPage(tab: chrome.tabs.Tab | null): boolean {
  if (!tab?.url) return false;
  return tab.url.includes("youtube.com/watch");
}

// Check if SyncWatch is ready on the page
async function checkSyncWatchReady(): Promise<boolean> {
  const tab = await getCurrentTab();
  if (!tab?.id) return false;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN' as chrome.scripting.ExecutionWorld,
      func: () => {
        return typeof window.syncWatch !== 'undefined' && window.syncWatch !== null;
      },
    });
    return results[0]?.result === true;
  } catch {
    return false;
  }
}

// Execute in MAIN world - get state
async function getStateFromPage(): Promise<SyncWatchState | null> {
  const tab = await getCurrentTab();
  if (!tab?.id) return null;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN' as chrome.scripting.ExecutionWorld,
      func: () => {
        if (window.syncWatch) {
          return window.syncWatch.getState();
        }
        return null;
      },
    });
    return results[0]?.result as SyncWatchState | null;
  } catch (error) {
    console.error('[SyncWatch Popup] Error getting state:', error);
    return null;
  }
}

// Execute in MAIN world - set username
async function setUsernameOnPage(username: string): Promise<void> {
  const tab = await getCurrentTab();
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN' as chrome.scripting.ExecutionWorld,
      func: (name: string) => {
        if (window.syncWatch) {
          window.syncWatch.setUsername(name);
        }
      },
      args: [username],
    });
  } catch (error) {
    console.error('[SyncWatch Popup] Error setting username:', error);
  }
}

// Execute in MAIN world - create room
async function createRoomOnPage(): Promise<string | null> {
  const tab = await getCurrentTab();
  if (!tab?.id) return null;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN' as chrome.scripting.ExecutionWorld,
      func: () => {
        if (window.syncWatch) {
          return window.syncWatch.createRoom();
        }
        return null;
      },
    });
    return results[0]?.result as string | null;
  } catch (error) {
    console.error('[SyncWatch Popup] Error creating room:', error);
    return null;
  }
}

// Execute in MAIN world - join room
async function joinRoomOnPage(roomId: string): Promise<void> {
  const tab = await getCurrentTab();
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN' as chrome.scripting.ExecutionWorld,
      func: (id: string) => {
        if (window.syncWatch) {
          window.syncWatch.joinRoom(id);
        }
      },
      args: [roomId],
    });
  } catch (error) {
    console.error('[SyncWatch Popup] Error joining room:', error);
  }
}

// Update UI based on state
function updateUI(state: SyncWatchState | null): void {
  const tab = currentTab;

  // Not on YouTube video page
  if (!isYouTubeVideoPage(tab)) {
    statusDot.classList.remove("connected");
    statusText.textContent = "Not on YouTube video";
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    noRoomSection.classList.remove("hidden");
    inRoomSection.classList.add("hidden");
    return;
  }

  // On YouTube but SyncWatch not ready yet
  if (!state) {
    statusDot.classList.remove("connected");
    statusText.textContent = "Loading...";
    createRoomBtn.disabled = true;
    joinRoomBtn.disabled = true;
    noRoomSection.classList.remove("hidden");
    inRoomSection.classList.add("hidden");
    return;
  }

  // SyncWatch is ready
  isReady = true;

  if (state.isConnected) {
    statusDot.classList.add("connected");
    statusText.textContent = state.roomId ? `In room` : "Ready";
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
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
  }

  if (state.username) {
    usernameInput.value = state.username;
  }
}

// Refresh state from content script
async function refreshState(): Promise<void> {
  try {
    // Get current tab
    await getCurrentTab();

    // Check if on YouTube
    if (!isYouTubeVideoPage(currentTab)) {
      updateUI(null);
      return;
    }

    // Check if SyncWatch is ready
    const ready = await checkSyncWatchReady();
    if (!ready) {
      updateUI(null);
      return;
    }

    // Get state from SyncWatch
    const result = await getStateFromPage();
    updateUI(result);
  } catch {
    updateUI(null);
  }
}

// Create a new room
createRoomBtn.addEventListener("click", async () => {
  try {
    // Validate that we're ready
    if (!isReady) {
      statusText.textContent = "Please wait, loading...";
      await refreshState();
      if (!isReady) {
        statusText.textContent = "Not ready. Please reload the page.";
        return;
      }
    }

    // Disable button and show loading state
    createRoomBtn.disabled = true;
    const originalText = createRoomBtn.textContent;
    createRoomBtn.textContent = "Creating...";

    const username = usernameInput.value.trim();
    if (username) {
      await setUsernameOnPage(username);
    }

    const roomId = await createRoomOnPage();

    if (roomId) {
      console.log("[SyncWatch Popup] Room created:", roomId);
      await refreshState();
    } else {
      statusText.textContent = "Failed to create room";
      createRoomBtn.disabled = false;
      createRoomBtn.textContent = originalText;
    }
  } catch (error) {
    console.error("[SyncWatch Popup] Error creating room:", error);
    statusText.textContent = "Error creating room";
    createRoomBtn.disabled = false;
    createRoomBtn.textContent = "Create Room";
  }
});

// Join existing room
joinRoomBtn.addEventListener("click", async () => {
  try {
    const roomId = roomIdInput.value.trim();
    if (!roomId) {
      roomIdInput.focus();
      statusText.textContent = "Please enter a Room ID";
      return;
    }

    // Validate that we're ready
    if (!isReady) {
      statusText.textContent = "Please wait, loading...";
      await refreshState();
      if (!isReady) {
        statusText.textContent = "Not ready. Please reload the page.";
        return;
      }
    }

    // Disable button and show loading state
    joinRoomBtn.disabled = true;
    const originalText = joinRoomBtn.textContent;
    joinRoomBtn.textContent = "Joining...";

    const username = usernameInput.value.trim();
    if (username) {
      await setUsernameOnPage(username);
    }

    await joinRoomOnPage(roomId);
    console.log("[SyncWatch Popup] Joined room:", roomId);

    // Wait a bit for the join to process
    await new Promise(resolve => setTimeout(resolve, 500));
    await refreshState();

    joinRoomBtn.textContent = originalText;
  } catch (error) {
    console.error("[SyncWatch Popup] Error joining room:", error);
    statusText.textContent = "Error joining room";
    joinRoomBtn.disabled = false;
    joinRoomBtn.textContent = "Join Room";
  }
});

// Copy room link
copyLinkBtn.addEventListener("click", async () => {
  const state = await getStateFromPage();
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

// Copy room ID only
copyRoomIdBtn.addEventListener("click", async () => {
  const roomId = currentRoomIdEl.textContent;
  if (roomId && roomId !== "-") {
    await navigator.clipboard.writeText(roomId);
    copyRoomIdBtn.classList.add("copied");
    setTimeout(() => {
      copyRoomIdBtn.classList.remove("copied");
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

// View logs
viewLogsBtn.addEventListener("click", async () => {
  try {
    // Get logs from storage
    const result = await chrome.storage.local.get(['syncwatch_logs']);
    const logs = result.syncwatch_logs || [];

    if (logs.length === 0) {
      alert("No logs found");
      return;
    }

    // Format logs as text
    const logText = logs
      .slice(-50) // Last 50 logs
      .map((log: { timestamp: number; level: number; context: string; message: string; data?: unknown }) => {
        const date = new Date(log.timestamp).toISOString();
        const level = ['DEBUG', 'INFO', 'WARN', 'ERROR'][log.level] || 'UNKNOWN';
        const data = log.data ? `\n  Data: ${JSON.stringify(log.data)}` : '';
        return `[${date}] [${level}] [${log.context}]\n  ${log.message}${data}`;
      })
      .join('\n\n');

    // Create a new tab with logs
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url });

    // Also offer to download
    const download = confirm("Logs opened in new tab. Download as file?");
    if (download) {
      const a = document.createElement('a');
      const jsonBlob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      a.href = URL.createObjectURL(jsonBlob);
      a.download = `syncwatch-logs-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("[SyncWatch Popup] Error viewing logs:", error);
    alert("Failed to view logs");
  }
});

// Initialize with retry logic
async function initialize(): Promise<void> {
  await refreshState();

  // If not ready and on YouTube, retry a few times
  if (!isReady && currentTab && isYouTubeVideoPage(currentTab)) {
    console.log("[SyncWatch Popup] Waiting for SyncWatch to be ready...");

    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshState();
      if (isReady) {
        console.log("[SyncWatch Popup] SyncWatch is now ready!");
        break;
      }
    }

    if (!isReady) {
      console.warn("[SyncWatch Popup] SyncWatch not ready after retries");
      statusText.textContent = "Not ready - try reloading the page";
    }
  }
}

initialize();
