import type { Socket } from "socket.io-client";

export interface SyncState {
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
}

export interface RoomState {
  currentTime: number;
  isPlaying: boolean;
  userCount: number;
}

export interface SyncEvent {
  currentTime: number;
  timestamp: number;
  username?: string;
}

export interface BufferingEvent {
  userId: string;
  username: string;
  bufferingCount?: number;
}

export interface UserEvent {
  userId?: string;
  username: string;
  userCount: number;
  loadingCount?: number;
}
