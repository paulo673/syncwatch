# Gemini Project: SyncWatch

## Project Overview

SyncWatch is a browser extension designed for synchronized video watching with friends, akin to Teleparty. The initial implementation targets YouTube.

The project is structured as a monorepo, comprising two main components:
- **`extension/`**: A Chrome browser extension built with TypeScript, React, and Vite, following the Manifest V3 specification.
- **`server/`**: A signaling server powered by Node.js and Socket.io to facilitate real-time communication between extension clients.

## Key Technologies

- **Frontend (Extension)**: TypeScript, React, Vite, Tailwind CSS
- **Backend (Server)**: Node.js, TypeScript, Socket.io
- **Build & Development**: `npm` workspaces, `concurrently`, `vite`, `tsx`

## Development Workflow

### Prerequisites
- Node.js v18+
- npm v9+

### 1. Installation

Install all dependencies for both the `server` and `extension` workspaces from the root directory:
```bash
npm install
```

### 2. Running the Development Environment

To run both the server and the extension build process simultaneously with hot-reloading, use the following command from the root directory:
```bash
npm run dev
```
This will:
1.  Start the signaling server at `http://localhost:3000`.
2.  Build the extension into the `extension/dist` directory and watch for changes.

### 3. Loading the Extension in Chrome

1.  Navigate to `chrome://extensions/`.
2.  Enable "Developer mode" in the top-right corner.
3.  Click "Load unpacked".
4.  Select the `extension/dist` directory.

## Available Scripts

The project uses `npm` workspaces. Commands can be run from the root directory.

| Command                 | Description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `npm run dev`           | Starts both the server and extension in development mode (with watch). |
| `npm run dev:server`    | Starts only the signaling server in development mode (`tsx`).    |
| `npm run dev:extension` | Builds the extension in development mode and watches for changes (`vite`). |
| `npm run build:server`  | Creates a production-ready build for the server (`tsc`).     |
| `npm run build:extension`| Creates a production-ready build for the extension (`vite build`). |

## Architectural Notes

- **Real-time Communication**: Client-server communication is handled via Socket.io. The server's primary role is to manage rooms and broadcast events.
- **State Synchronization**: The core logic resides in the content script (`extension/src/content/`). It uses a combination of event debouncing, an `isRemoteAction` flag to prevent event loops, and seeks to correct time differences greater than 1 second.
- **UI**: The extension popup is a React application, located in `extension/src/features/popup`.
