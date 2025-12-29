export interface SyncWatchState {
  isConnected: boolean;
  roomId: string | null;
  username: string;
  isBuffering: boolean;
  partnerBuffering: boolean;
}

export type PopupStatus = "disconnected" | "loading" | "not-youtube" | "ready" | "in-room";

export interface LogEntry {
  timestamp: number;
  level: number;
  context: string;
  message: string;
  data?: unknown;
}
