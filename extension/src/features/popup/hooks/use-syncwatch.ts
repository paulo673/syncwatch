import { useState, useEffect, useCallback } from "react";
import type { SyncWatchState, PopupStatus } from "../popup.types";

interface UseSyncWatchReturn {
  state: SyncWatchState | null;
  status: PopupStatus;
  statusText: string;
  isReady: boolean;
  createRoom: () => Promise<string | null>;
  joinRoom: (roomId: string) => Promise<void>;
  setUsername: (username: string) => Promise<void>;
  copyRoomLink: () => Promise<void>;
  copyRoomId: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  refreshState: () => Promise<void>;
}

async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

function isYouTubeVideoPage(tab: chrome.tabs.Tab | null): boolean {
  if (!tab?.url) return false;
  return tab.url.includes("youtube.com/watch");
}

async function checkSyncWatchReady(tabId: number): Promise<boolean> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN" as chrome.scripting.ExecutionWorld,
      func: () => {
        return typeof window.syncWatch !== "undefined" && window.syncWatch !== null;
      },
    });
    return results[0]?.result === true;
  } catch {
    return false;
  }
}

async function getStateFromPage(tabId: number): Promise<SyncWatchState | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN" as chrome.scripting.ExecutionWorld,
      func: () => {
        if (window.syncWatch) {
          return window.syncWatch.getState();
        }
        return null;
      },
    });
    return results[0]?.result as SyncWatchState | null;
  } catch (error) {
    console.error("[SyncWatch Popup] Error getting state:", error);
    return null;
  }
}

export function useSyncWatch(): UseSyncWatchReturn {
  const [state, setState] = useState<SyncWatchState | null>(null);
  const [status, setStatus] = useState<PopupStatus>("loading");
  const [statusText, setStatusText] = useState("Loading...");
  const [isReady, setIsReady] = useState(false);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);

  const refreshState = useCallback(async () => {
    try {
      const tab = await getCurrentTab();
      setCurrentTab(tab);

      if (!isYouTubeVideoPage(tab)) {
        setState(null);
        setStatus("not-youtube");
        setStatusText("Not on YouTube video");
        setIsReady(false);
        return;
      }

      if (!tab?.id) {
        setState(null);
        setStatus("disconnected");
        setStatusText("No tab found");
        setIsReady(false);
        return;
      }

      const ready = await checkSyncWatchReady(tab.id);
      if (!ready) {
        setState(null);
        setStatus("loading");
        setStatusText("Loading...");
        setIsReady(false);
        return;
      }

      const pageState = await getStateFromPage(tab.id);
      setState(pageState);
      setIsReady(true);

      if (pageState?.isConnected) {
        if (pageState.roomId) {
          setStatus("in-room");
          setStatusText("In room");
        } else {
          setStatus("ready");
          setStatusText("Ready");
        }
      } else {
        setStatus("loading");
        setStatusText("Connecting...");
      }
    } catch {
      setState(null);
      setStatus("disconnected");
      setStatusText("Error");
      setIsReady(false);
    }
  }, []);

  const setUsername = useCallback(async (username: string) => {
    const tab = await getCurrentTab();
    if (!tab?.id) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN" as chrome.scripting.ExecutionWorld,
        func: (name: string) => {
          if (window.syncWatch) {
            window.syncWatch.setUsername(name);
          }
        },
        args: [username],
      });
      chrome.storage.local.set({ username });
    } catch (error) {
      console.error("[SyncWatch Popup] Error setting username:", error);
    }
  }, []);

  const createRoom = useCallback(async (): Promise<string | null> => {
    const tab = await getCurrentTab();
    if (!tab?.id) return null;

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN" as chrome.scripting.ExecutionWorld,
        func: () => {
          if (window.syncWatch) {
            return window.syncWatch.createRoom();
          }
          return null;
        },
      });
      const roomId = results[0]?.result as string | null;
      if (roomId) {
        await refreshState();
      }
      return roomId;
    } catch (error) {
      console.error("[SyncWatch Popup] Error creating room:", error);
      return null;
    }
  }, [refreshState]);

  const joinRoom = useCallback(async (roomId: string) => {
    const tab = await getCurrentTab();
    if (!tab?.id) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN" as chrome.scripting.ExecutionWorld,
        func: (id: string) => {
          if (window.syncWatch) {
            window.syncWatch.joinRoom(id);
          }
        },
        args: [roomId],
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await refreshState();
    } catch (error) {
      console.error("[SyncWatch Popup] Error joining room:", error);
    }
  }, [refreshState]);

  const copyRoomLink = useCallback(async () => {
    if (!state?.roomId || !currentTab?.url) return;
    const url = new URL(currentTab.url);
    url.searchParams.set("syncwatch_room", state.roomId);
    await navigator.clipboard.writeText(url.toString());
  }, [state?.roomId, currentTab?.url]);

  const copyRoomId = useCallback(async () => {
    if (!state?.roomId) return;
    await navigator.clipboard.writeText(state.roomId);
  }, [state?.roomId]);

  const leaveRoom = useCallback(async () => {
    const tab = await getCurrentTab();
    if (tab?.id) {
      chrome.tabs.reload(tab.id);
    }
    window.close();
  }, []);

  // Initialize with retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    const initialize = async () => {
      await refreshState();
    };

    const retryIfNeeded = async () => {
      await initialize();

      if (!isReady && status === "loading" && retryCount < maxRetries) {
        retryCount++;
        setTimeout(retryIfNeeded, 1000);
      } else if (!isReady && retryCount >= maxRetries) {
        setStatusText("Not ready - try reloading the page");
      }
    };

    retryIfNeeded();
  }, [refreshState, isReady, status]);

  return {
    state,
    status,
    statusText,
    isReady,
    createRoom,
    joinRoom,
    setUsername,
    copyRoomLink,
    copyRoomId,
    leaveRoom,
    refreshState,
  };
}
