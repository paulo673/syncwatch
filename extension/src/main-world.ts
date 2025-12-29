// This script runs in the MAIN world and creates window.syncWatch
// It communicates with the content script via postMessage

// Export to make this a module (required for global augmentation)
export {};

interface SyncWatchAPI {
  joinRoom: (roomId: string) => void;
  createRoom: () => Promise<string>;
  getState: () => Promise<{
    isConnected: boolean;
    roomId: string | null;
    username: string;
    isBuffering: boolean;
    partnerBuffering: boolean;
  }>;
  setUsername: (name: string) => void;
}

declare global {
  interface Window {
    syncWatch: SyncWatchAPI;
  }
}

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
  }
};

console.log('[SyncWatch] API injected in MAIN world');
