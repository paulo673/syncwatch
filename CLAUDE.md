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
│  ISOLATED World (content/index.ts)                          │
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

1. **Content script** (`extension/src/content/index.ts`) injects a `<script>` tag into the DOM
2. **Injected script** runs in MAIN world and creates `window.syncWatch` API
3. **Communication** between worlds uses `window.postMessage()`
4. **Popup** accesses the API via `chrome.scripting.executeScript({ world: 'MAIN' })`

### Extension Structure (Feature-Based)

```
extension/src/
├── features/                    # Feature modules
│   ├── chat/                    # Real-time chat feature
│   │   ├── components/          # React components
│   │   │   ├── chat-container.tsx
│   │   │   ├── chat-header.tsx
│   │   │   ├── chat-input.tsx
│   │   │   ├── chat-messages.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   ├── system-message.tsx
│   │   │   ├── toggle-button.tsx
│   │   │   ├── typing-indicator.tsx
│   │   │   └── index.ts         # Barrel export
│   │   ├── bootstrap.tsx        # React injection into YouTube page
│   │   ├── chat-app.tsx         # Main chat component
│   │   ├── chat.types.ts        # Chat-specific types
│   │   └── index.ts             # Public API
│   │
│   ├── popup/                   # Extension popup feature
│   │   ├── components/          # React components
│   │   │   ├── status-indicator.tsx
│   │   │   ├── no-room-section.tsx
│   │   │   ├── in-room-section.tsx
│   │   │   ├── logs-section.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── use-syncwatch.ts # Communication with content script
│   │   │   └── index.ts
│   │   ├── app.tsx              # Main popup component
│   │   ├── main.tsx             # React entry point
│   │   ├── popup.types.ts
│   │   └── index.html           # Popup HTML entry
│   │
│   └── sync/                    # Video synchronization feature
│       ├── services/
│       │   └── socket.service.ts # Socket.io client wrapper
│       ├── sync.types.ts        # Sync-specific types
│       └── index.ts
│
├── shared/                      # Shared code across features
│   ├── components/ui/           # Reusable UI components (shadcn pattern)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── index.ts
│   ├── hooks/                   # Shared React hooks
│   │   ├── use-debounce.ts
│   │   └── index.ts
│   ├── lib/                     # Utilities
│   │   ├── logger.ts            # Centralized logging
│   │   ├── utils.ts             # cn() and helpers
│   │   └── index.ts
│   └── styles/                  # Global styles
│       ├── globals.css          # Tailwind base + custom styles
│       └── youtube-overrides.css # YouTube layout adjustments
│
├── background/
│   └── index.ts                 # Service worker
├── content/
│   └── index.ts                 # Content script entry point
└── main-world.ts                # MAIN world script (window.syncWatch API)
```

### Tech Stack

- **React 18** - UI components with functional components and hooks
- **TailwindCSS** - Utility-first CSS with `sw-` prefix to avoid conflicts with YouTube
- **shadcn/ui pattern** - Component variants using `class-variance-authority`
- **TypeScript** - Strict typing throughout
- **Vite + CRXJS** - Build tooling with HMR support

### Code Patterns

**Barrel Exports:** Each folder has an `index.ts` that re-exports public APIs:
```typescript
// features/chat/components/index.ts
export { ChatContainer } from "./chat-container";
export { ChatHeader } from "./chat-header";
```

**Component Variants (shadcn pattern):**
```typescript
const buttonVariants = cva("sw-base-classes", {
  variants: {
    variant: { default: "...", secondary: "...", ghost: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

**CSS Isolation:** All Tailwind classes use `sw-` prefix:
```typescript
// tailwind.config.js
export default {
  prefix: "sw-",
  // ...
}
```

**React Injection (Content Script → YouTube):**
```typescript
// features/chat/bootstrap.tsx
import styles from "@/shared/styles/globals.css?inline";

export function injectChat(callbacks: ChatCallbacks) {
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.appendChild(style);

  const container = document.createElement("div");
  container.id = "syncwatch-root";
  document.body.appendChild(container);

  createRoot(container).render(<ChatApp {...callbacks} />);
}
```

**Imperative Handle (React ↔ Content Script):**
```typescript
// Expose methods to content script via ref
useImperativeHandle(ref, () => ({
  addMessage: (msg) => setMessages(prev => [...prev, msg]),
  setConnected: (val) => setIsConnected(val),
}));
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
