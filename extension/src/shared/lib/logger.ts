// Centralized logging system for SyncWatch extension

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private minLevel: LogLevel = LogLevel.DEBUG;

  constructor() {
    // Load existing logs from storage
    this.loadLogs();

    // Capture unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Global Error Handler', event.error?.message || event.message, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection', event.reason?.message || String(event.reason), {
          reason: event.reason,
          stack: event.reason?.stack,
        });
      });
    }
  }

  private async loadLogs(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['syncwatch_logs']);
        if (result.syncwatch_logs) {
          this.logs = result.syncwatch_logs;
        }
      }
    } catch (error) {
      console.error('[Logger] Failed to load logs:', error);
    }
  }

  private async saveLogs(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ syncwatch_logs: this.logs });
      }
    } catch (error) {
      console.error('[Logger] Failed to save logs:', error);
    }
  }

  private log(level: LogLevel, context: string, message: string, data?: unknown): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context,
      message,
      data,
      stack: level >= LogLevel.ERROR ? new Error().stack : undefined,
    };

    this.logs.push(entry);

    // Keep only the last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Save to storage
    this.saveLogs();

    // Also log to console
    const levelName = LogLevel[level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[SyncWatch][${timestamp}][${levelName}][${context}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data);
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data);
        if (entry.stack) console.error('Stack:', entry.stack);
        break;
    }
  }

  debug(context: string, message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, context, message, data);
  }

  info(context: string, message: string, data?: unknown): void {
    this.log(LogLevel.INFO, context, message, data);
  }

  warn(context: string, message: string, data?: unknown): void {
    this.log(LogLevel.WARN, context, message, data);
  }

  error(context: string, message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, context, message, data);
  }

  async getLogs(filter?: { level?: LogLevel; context?: string; limit?: number }): Promise<LogEntry[]> {
    let filtered = this.logs;

    if (filter?.level !== undefined) {
      const minLevel = filter.level;
      filtered = filtered.filter((log) => log.level >= minLevel);
    }

    if (filter?.context) {
      const contextFilter = filter.context;
      filtered = filtered.filter((log) => log.context.includes(contextFilter));
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    await this.saveLogs();
  }

  async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  async downloadLogs(): Promise<void> {
    const logsJson = await this.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `syncwatch-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// Global logger instance
export const logger = new Logger();

// Expose to window for easy access from console
if (typeof window !== 'undefined') {
  (window as unknown as { syncWatchLogger: Logger }).syncWatchLogger = logger;
}
