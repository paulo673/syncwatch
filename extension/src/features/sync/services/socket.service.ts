import { io, Socket } from "socket.io-client";
import { logger } from "@/shared/lib/logger";

const SERVER_URL = "http://localhost:3000";

export interface SocketServiceOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private options: SocketServiceOptions = {};

  connect(options: SocketServiceOptions = {}): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.options = options;

    this.socket = io(SERVER_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      logger.info("SocketService", "Connected to server");
      this.options.onConnect?.();
    });

    this.socket.on("disconnect", () => {
      logger.info("SocketService", "Disconnected from server");
      this.options.onDisconnect?.();
    });

    this.socket.on("connect_error", (error) => {
      logger.error("SocketService", "Connection error", { message: error.message });
      this.options.onError?.(error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  emit<T>(event: string, data?: T): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on<T>(event: string, callback: (data: T) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string): void {
    this.socket?.off(event);
  }
}

// Singleton instance
export const socketService = new SocketService();
