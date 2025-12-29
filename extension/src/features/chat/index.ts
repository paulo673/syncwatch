// Components
export * from "./components";

// Types
export * from "./chat.types";

// App
export { ChatApp, type ChatAppRef } from "./chat-app";

// Bootstrap (for content script injection)
export {
  injectChat,
  removeChat,
  appendMessage,
  appendSystemEvent,
  renderMessages,
  updateTypingIndicator,
  setCurrentUser,
  setChatVisibility,
  clearUnread,
} from "./bootstrap";
