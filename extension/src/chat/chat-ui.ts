// Chat UI component for SyncWatch
// Injects a sidebar chat next to YouTube video player

interface ChatMessage {
  messageId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

// Get current socket ID from state
let currentSocketId: string | null = null;
let currentUsername: string = '';

// Track unread messages when chat is hidden
let hasUnreadMessages = false;

export function getChatCSS(): string {
  return `
    /* Chat Container - Sidebar */
    #syncwatch-chat-container {
      width: 320px;
      min-width: 320px;
      max-height: calc(100vh - 120px);
      position: sticky;
      top: 80px;
      margin-left: 24px;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 1000;
    }

    #syncwatch-chat-container.hidden {
      display: none;
    }

    .syncwatch-chat-panel {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 500px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    /* Chat Header */
    .syncwatch-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .syncwatch-chat-title {
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .syncwatch-minimize-btn {
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.2s, background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .syncwatch-minimize-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Messages Area */
    .syncwatch-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .syncwatch-chat-messages::-webkit-scrollbar {
      width: 6px;
    }

    .syncwatch-chat-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .syncwatch-chat-messages::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }

    .syncwatch-chat-messages::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Empty state */
    .syncwatch-chat-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-size: 13px;
      text-align: center;
      padding: 20px;
    }

    .syncwatch-chat-empty-icon {
      font-size: 32px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    /* Message Bubbles */
    .syncwatch-message {
      padding: 8px 12px;
      border-radius: 12px;
      max-width: 85%;
      word-wrap: break-word;
      animation: syncwatch-message-in 0.2s ease-out;
    }

    @keyframes syncwatch-message-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .syncwatch-message.own {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: #fff;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .syncwatch-message.other {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .syncwatch-message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      gap: 8px;
    }

    .syncwatch-message-username {
      font-size: 11px;
      font-weight: 600;
      color: #0ea5e9;
    }

    .syncwatch-message.own .syncwatch-message-username {
      color: rgba(255, 255, 255, 0.8);
    }

    .syncwatch-message-time {
      font-size: 10px;
      color: #888;
    }

    .syncwatch-message.own .syncwatch-message-time {
      color: rgba(255, 255, 255, 0.6);
    }

    .syncwatch-message-text {
      font-size: 13px;
      line-height: 1.4;
    }

    /* Typing Indicator */
    .syncwatch-typing-indicator {
      padding: 8px 12px;
      font-size: 12px;
      color: #888;
      font-style: italic;
      min-height: 28px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .syncwatch-typing-indicator:empty {
      display: none;
    }

    .syncwatch-typing-dots {
      display: inline-flex;
      gap: 3px;
      margin-left: 4px;
    }

    .syncwatch-typing-dot {
      width: 4px;
      height: 4px;
      background: #888;
      border-radius: 50%;
      animation: syncwatch-typing 1.4s infinite ease-in-out;
    }

    .syncwatch-typing-dot:nth-child(1) { animation-delay: 0s; }
    .syncwatch-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .syncwatch-typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes syncwatch-typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    /* Input Area */
    .syncwatch-chat-input-container {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .syncwatch-chat-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .syncwatch-chat-input:focus {
      border-color: #0ea5e9;
    }

    .syncwatch-chat-input::placeholder {
      color: #666;
    }

    .syncwatch-send-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.1s, opacity 0.2s;
      flex-shrink: 0;
    }

    .syncwatch-send-btn:hover {
      opacity: 0.9;
    }

    .syncwatch-send-btn:active {
      transform: scale(0.95);
    }

    .syncwatch-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Toggle Button (FAB) */
    .syncwatch-chat-toggle {
      position: fixed;
      right: 24px;
      bottom: 24px;
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: #fff;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 10000;
    }

    .syncwatch-chat-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(14, 165, 233, 0.5);
    }

    .syncwatch-chat-toggle.has-unread::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      width: 12px;
      height: 12px;
      background: #ff4444;
      border-radius: 50%;
      border: 2px solid #1a1a2e;
    }

    /* Not in room state */
    .syncwatch-chat-not-in-room {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #888;
      font-size: 13px;
      text-align: center;
      padding: 20px;
    }

    .syncwatch-chat-not-in-room-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  `;
}

export function getChatHTML(): string {
  return `
    <div class="syncwatch-chat-panel">
      <div class="syncwatch-chat-header">
        <span class="syncwatch-chat-title">SyncWatch Chat</span>
        <button class="syncwatch-minimize-btn" id="syncwatch-minimize" title="Minimize">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
      <div class="syncwatch-chat-messages" id="syncwatch-messages">
        <div class="syncwatch-chat-empty">
          <div class="syncwatch-chat-empty-icon">💬</div>
          <div>No messages yet.<br>Start the conversation!</div>
        </div>
      </div>
      <div class="syncwatch-typing-indicator" id="syncwatch-typing"></div>
      <div class="syncwatch-chat-input-container">
        <input
          type="text"
          class="syncwatch-chat-input"
          id="syncwatch-chat-input"
          placeholder="Type a message..."
          maxlength="500"
          autocomplete="off"
        >
        <button class="syncwatch-send-btn" id="syncwatch-send" title="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  `;
}

export function getToggleButtonHTML(): string {
  return `
    <button class="syncwatch-chat-toggle" id="syncwatch-chat-toggle" title="Toggle Chat">
      💬
    </button>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function appendMessage(message: ChatMessage): void {
  const container = document.getElementById('syncwatch-messages');
  if (!container) return;

  // Remove empty state if present
  const emptyState = container.querySelector('.syncwatch-chat-empty');
  if (emptyState) {
    emptyState.remove();
  }

  const isOwn = message.userId === currentSocketId;

  const messageEl = document.createElement('div');
  messageEl.className = `syncwatch-message ${isOwn ? 'own' : 'other'}`;
  messageEl.dataset.messageId = message.messageId;
  messageEl.innerHTML = `
    <div class="syncwatch-message-header">
      <span class="syncwatch-message-username">${escapeHtml(message.username)}</span>
      <span class="syncwatch-message-time">${formatTime(message.timestamp)}</span>
    </div>
    <div class="syncwatch-message-text">${escapeHtml(message.text)}</div>
  `;

  container.appendChild(messageEl);
  scrollToBottom();

  // Mark as unread if chat is hidden
  const chatContainer = document.getElementById('syncwatch-chat-container');
  if (chatContainer?.classList.contains('hidden') && !isOwn) {
    hasUnreadMessages = true;
    updateToggleButton();
  }
}

export function renderMessages(messages: ChatMessage[]): void {
  const container = document.getElementById('syncwatch-messages');
  if (!container) return;

  container.innerHTML = '';

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="syncwatch-chat-empty">
        <div class="syncwatch-chat-empty-icon">💬</div>
        <div>No messages yet.<br>Start the conversation!</div>
      </div>
    `;
    return;
  }

  messages.forEach(message => {
    const isOwn = message.userId === currentSocketId;

    const messageEl = document.createElement('div');
    messageEl.className = `syncwatch-message ${isOwn ? 'own' : 'other'}`;
    messageEl.dataset.messageId = message.messageId;
    messageEl.innerHTML = `
      <div class="syncwatch-message-header">
        <span class="syncwatch-message-username">${escapeHtml(message.username)}</span>
        <span class="syncwatch-message-time">${formatTime(message.timestamp)}</span>
      </div>
      <div class="syncwatch-message-text">${escapeHtml(message.text)}</div>
    `;

    container.appendChild(messageEl);
  });

  scrollToBottom();
}

export function updateTypingIndicator(typingUsers: string[]): void {
  const indicator = document.getElementById('syncwatch-typing');
  if (!indicator) return;

  // Filter out current user
  const others = typingUsers.filter(name => name !== currentUsername);

  if (others.length === 0) {
    indicator.innerHTML = '';
  } else if (others.length === 1) {
    indicator.innerHTML = `
      <span>${escapeHtml(others[0])} is typing</span>
      <span class="syncwatch-typing-dots">
        <span class="syncwatch-typing-dot"></span>
        <span class="syncwatch-typing-dot"></span>
        <span class="syncwatch-typing-dot"></span>
      </span>
    `;
  } else if (others.length === 2) {
    indicator.innerHTML = `
      <span>${escapeHtml(others[0])} and ${escapeHtml(others[1])} are typing</span>
      <span class="syncwatch-typing-dots">
        <span class="syncwatch-typing-dot"></span>
        <span class="syncwatch-typing-dot"></span>
        <span class="syncwatch-typing-dot"></span>
      </span>
    `;
  } else {
    indicator.innerHTML = `
      <span>${others.length} people are typing</span>
      <span class="syncwatch-typing-dots">
        <span class="syncwatch-typing-dot"></span>
        <span class="syncwatch-typing-dot"></span>
        <span class="syncwatch-typing-dot"></span>
      </span>
    `;
  }
}

function scrollToBottom(): void {
  const container = document.getElementById('syncwatch-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function updateToggleButton(): void {
  const toggle = document.getElementById('syncwatch-chat-toggle');
  if (toggle) {
    toggle.classList.toggle('has-unread', hasUnreadMessages);
  }
}

export function setCurrentUser(socketId: string | null, username: string): void {
  currentSocketId = socketId;
  currentUsername = username;
}

export function clearUnread(): void {
  hasUnreadMessages = false;
  updateToggleButton();
}

export function injectChatUI(): boolean {
  // Check if already injected
  if (document.getElementById('syncwatch-chat-container')) {
    return true;
  }

  // Find YouTube's columns container
  const columnsContainer = document.querySelector('#columns');
  if (!columnsContainer) {
    console.log('[SyncWatch Chat] #columns not found, retrying...');
    return false;
  }

  // Find primary and secondary columns
  const primaryColumn = document.querySelector('#primary');
  const secondaryColumn = document.querySelector('#secondary');

  if (!primaryColumn || !secondaryColumn) {
    console.log('[SyncWatch Chat] Primary/secondary columns not found, retrying...');
    return false;
  }

  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.id = 'syncwatch-chat-container';
  chatContainer.innerHTML = getChatHTML();

  // Insert chat between primary and secondary
  columnsContainer.insertBefore(chatContainer, secondaryColumn);

  // Create toggle button
  const toggleButton = document.createElement('div');
  toggleButton.innerHTML = getToggleButtonHTML();
  document.body.appendChild(toggleButton.firstElementChild!);

  // Inject styles
  const style = document.createElement('style');
  style.id = 'syncwatch-chat-styles';
  style.textContent = getChatCSS();
  document.head.appendChild(style);

  console.log('[SyncWatch Chat] UI injected successfully');
  return true;
}

export function removeChatUI(): void {
  const container = document.getElementById('syncwatch-chat-container');
  const toggle = document.getElementById('syncwatch-chat-toggle');
  const styles = document.getElementById('syncwatch-chat-styles');

  container?.remove();
  toggle?.remove();
  styles?.remove();
}

export function setupChatEventListeners(
  onSendMessage: (text: string) => void,
  onTyping: () => void,
  onToggle: (visible: boolean) => void
): void {
  const input = document.getElementById('syncwatch-chat-input') as HTMLInputElement;
  const sendBtn = document.getElementById('syncwatch-send');
  const minimizeBtn = document.getElementById('syncwatch-minimize');
  const toggleBtn = document.getElementById('syncwatch-chat-toggle');
  const container = document.getElementById('syncwatch-chat-container');

  // Send message
  const sendMessage = () => {
    if (input?.value.trim()) {
      onSendMessage(input.value.trim());
      input.value = '';
    }
  };

  sendBtn?.addEventListener('click', sendMessage);

  // Send on Enter key
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Typing indicator
  input?.addEventListener('input', () => {
    onTyping();
  });

  // Minimize chat
  minimizeBtn?.addEventListener('click', () => {
    container?.classList.add('hidden');
    onToggle(false);
  });

  // Toggle button
  toggleBtn?.addEventListener('click', () => {
    const isHidden = container?.classList.contains('hidden');
    container?.classList.toggle('hidden');

    if (isHidden) {
      // Chat is now visible
      clearUnread();
      input?.focus();
    }

    onToggle(!isHidden ? false : true);
  });
}

export function setChatVisibility(visible: boolean): void {
  const container = document.getElementById('syncwatch-chat-container');
  if (container) {
    container.classList.toggle('hidden', !visible);
    if (visible) {
      clearUnread();
    }
  }
}
