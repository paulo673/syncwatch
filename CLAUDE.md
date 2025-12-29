# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SyncWatch is a Chrome extension (Manifest V3) for synchronized video watching on YouTube. It uses Socket.io for real-time communication between users in the same "room".

## Build & Development Commands

```bash
# Run everything (server + extension with hot-reload)
npm run dev

# Individual components
npm run dev:server       # Socket.io server on localhost:3000
npm run dev:extension    # Extension with vite watch mode

# Production builds
npm run build:server
npm run build:extension
```

After building, load the extension from `extension/dist` in `chrome://extensions/` (Developer Mode).

## Architecture

### Component Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│  YouTube Page                                                │
│                                                              │
│  MAIN World (window.syncWatch)                              │
│      ↕ postMessage                                          │
│  ISOLATED World (content.ts)                                │
│      ↕ Socket.io                                            │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│  Socket.io Server (server/src/index.ts)                     │
│  - Room management                                           │
│  - Event broadcasting (play/pause/seek/buffering)           │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Pattern: MAIN World Injection

Content scripts run in ISOLATED world and cannot expose APIs to the page's `window`. SyncWatch solves this by:

1. **Content script** (`extension/src/content.ts`) injects a `<script>` tag into the DOM
2. **Injected script** runs in MAIN world and creates `window.syncWatch` API
3. **Communication** between worlds uses `window.postMessage()`
4. **Popup** (`extension/src/popup/popup.ts`) accesses the API via `chrome.scripting.executeScript({ world: 'MAIN' })`

The injection function is `injectScriptToMainWorld()` in `content.ts`.

### Extension Structure

```
extension/src/
├── content.ts       # Video sync logic, Socket.io client, MAIN world injection
├── background.ts    # Service worker, URL parameter detection for auto-join
├── popup/           # Extension popup UI
└── utils/logger.ts  # Centralized logging with chrome.storage persistence
```

### Sync Protocol

**Constants:**
- `SYNC_TOLERANCE_SECONDS = 1` - Time diff threshold before forcing seek
- `DEBOUNCE_DELAY_MS = 300` - Debounce for play/pause/seek events

**Anti-loop mechanism:** `isRemoteAction` flag prevents feedback loops when applying remote commands.

**Buffering coordination:** When any user buffers, all pause. Server tracks buffering users and emits `resume_after_buffer` when all are ready.

### Socket.io Events

**Client → Server:** `join_room`, `play`, `pause`, `seek`, `buffering_start`, `buffering_end`

**Server → Client:** `room_state`, `play`, `pause`, `seek`, `buffering_start`, `buffering_end`, `resume_after_buffer`, `user_joined`, `user_left`

## Debugging

**Chrome DevTools MCP** and **Playwright MCP** are configured for this project.

**Logger access in YouTube tab console:**
```javascript
window.syncWatchLogger.getLogs({ limit: 20 })  // Recent logs
window.syncWatchLogger.getLogs({ level: 3 })   // Errors only
window.syncWatchLogger.downloadLogs()          // Export as JSON
```

**Check if API is injected:**
```javascript
console.log(window.syncWatch)  // Should show {joinRoom, createRoom, getState, setUsername}
await window.syncWatch.getState()  // Note: async due to postMessage bridge
```

## Workspaces

This is an npm workspaces monorepo:
- `extension/` - Chrome extension (Vite + CRXJS)
- `server/` - Socket.io server (Node.js + tsx)
