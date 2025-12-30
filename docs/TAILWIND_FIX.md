# Tailwind CSS Color and Chat Height Fixes

This document outlines the solutions for two issues encountered during development:
1. Tailwind CSS color classes not applying correctly due to specificity conflicts.
2. The chat container not matching the YouTube video player's height and position.

## 1. Tailwind CSS Color Fix (Specificity)

**Problem:**
Tailwind CSS utility classes, such as `sw:bg-zinc-900`, were not visually applying styles, particularly `background-color`, even though the prefix `sw:` was confirmed to be correct for Tailwind CSS v4.1. This suggested a CSS specificity conflict with YouTube's native styles.

**Solution:**
Configure the `important` option in `extension/tailwind.config.js` to scope all Tailwind utility classes under the `#syncwatch-root` selector. This increases specificity without resorting to `!important` on every single utility.

**Implementation:**

```javascript
// extension/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  important: "#syncwatch-root",
  // Prefix is configured via CSS: @import "tailwindcss" prefix(sw);
  theme: {
    extend: {
      // ... theme extensions
    },
  },
  plugins: [],
}
```

**How it works:**
- All generated Tailwind classes will be prefixed with `#syncwatch-root` in the CSS output
- Example: `.sw\:bg-zinc-900` becomes `#syncwatch-root .sw\:bg-zinc-900`
- This provides enough specificity to override YouTube's styles without inline `!important`

**Requirement:**
All React components must render inside a container with `id="syncwatch-root"`. This is already handled by `bootstrap.tsx`.

---

## 2. Dynamic Chat Positioning to Match YouTube Player

**Problem:**
The chat container was occupying the full browser height instead of matching the YouTube video player's dimensions and position. The goal is for the chat to:
- Match the player's height
- Align vertically with the player's top edge
- Resize dynamically when the player changes (fullscreen, theater mode, etc.)

**Solution:**
A custom React hook (`usePlayerHeight`) that:
1. Uses `ResizeObserver` to monitor the YouTube player element for size changes
2. Tracks the player's `top` position for vertical alignment
3. Implements a retry mechanism since YouTube is a SPA and the player may not exist immediately
4. Listens to scroll events to keep the position updated

**Implementation:**

### Hook: `extension/src/features/chat/hooks/use-player-height.ts`

```typescript
import { useState, useEffect, useCallback } from "react";
import { logger } from "@/shared/lib/logger";

const YOUTUBE_PLAYER_SELECTOR = "#movie_player";
const MAX_RETRY_ATTEMPTS = 10;
const RETRY_INTERVAL_MS = 500;

interface PlayerDimensions {
  height: number;
  top: number;
}

/**
 * Hook that observes the YouTube player element and returns its dimensions.
 * Uses ResizeObserver to track size changes and retries finding the element
 * since YouTube is a SPA and the player may not exist immediately.
 *
 * @returns PlayerDimensions | null - The player's height and top position, or null if not found
 */
export function usePlayerHeight(): PlayerDimensions | null {
  const [dimensions, setDimensions] = useState<PlayerDimensions | null>(null);

  const updateDimensions = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setDimensions({
      height: rect.height,
      top: rect.top + window.scrollY,
    });
  }, []);

  useEffect(() => {
    let attempts = 0;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let scrollHandler: (() => void) | null = null;

    const setupObserver = (playerElement: HTMLElement) => {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === playerElement) {
            updateDimensions(playerElement);
          }
        }
      });

      resizeObserver.observe(playerElement);

      // Also observe scroll to update top position
      scrollHandler = () => updateDimensions(playerElement);
      window.addEventListener("scroll", scrollHandler, { passive: true });

      // Set initial dimensions
      updateDimensions(playerElement);
      logger.debug("usePlayerHeight", "Observer attached to player element");
    };

    const tryFindPlayer = () => {
      const playerElement = document.querySelector<HTMLElement>(
        YOUTUBE_PLAYER_SELECTOR
      );

      if (playerElement) {
        setupObserver(playerElement);
        return;
      }

      attempts++;
      if (attempts < MAX_RETRY_ATTEMPTS) {
        logger.debug(
          "usePlayerHeight",
          `Player not found, retrying (${attempts}/${MAX_RETRY_ATTEMPTS})`
        );
        retryTimeoutId = setTimeout(tryFindPlayer, RETRY_INTERVAL_MS);
      } else {
        logger.warn(
          "usePlayerHeight",
          `YouTube player element not found after ${MAX_RETRY_ATTEMPTS} attempts`
        );
      }
    };

    tryFindPlayer();

    return () => {
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (scrollHandler) {
        window.removeEventListener("scroll", scrollHandler);
      }
    };
  }, [updateDimensions]);

  return dimensions;
}
```

### Component: `extension/src/features/chat/components/chat-container.tsx`

```typescript
export function ChatContainer({ /* props */ }: ChatContainerProps) {
  const playerDimensions = usePlayerHeight();

  // Calculate inline styles for dynamic positioning aligned with YouTube player
  const containerStyle = playerDimensions
    ? {
        height: `${playerDimensions.height}px`,
        top: `${playerDimensions.top}px`,
      }
    : {
        height: "100vh",
        top: 0,
      };

  return (
    <div
      className={cn(
        "sw:w-80 sw:fixed sw:right-0",
        "sw:flex sw:flex-col sw:z-[9999999999]",
        "sw:bg-zinc-900",
        "sw:transition-transform sw:duration-200 sw:ease-out",
        "sw:select-text sw:cursor-auto",
        "sw:border-l sw:border-zinc-700",
        !isVisible && "sw:translate-x-full sw:pointer-events-none"
      )}
      style={containerStyle}
    >
      {/* Chat components */}
    </div>
  );
}
```

**Key features:**
- **Retry mechanism**: Attempts to find the player up to 10 times with 500ms intervals
- **ResizeObserver**: Automatically updates dimensions when player resizes (e.g., theater mode)
- **Scroll listener**: Updates `top` position when user scrolls
- **Graceful fallback**: Uses `100vh` if player is not found
- **Proper cleanup**: Disconnects observer and removes event listeners on unmount

---

## Temporary: Hook Disabled for Testing

The `usePlayerHeight` hook is currently **disabled** in `chat-container.tsx` for testing purposes.

**Current state:**
```typescript
// TODO: Re-enable after testing - see docs/TAILWIND_FIX.md
// import { usePlayerHeight } from "../hooks/use-player-height";

// Inside component:
// const playerDimensions = usePlayerHeight();
const playerDimensions = null as { height: number; top: number } | null; // Temporarily disabled for testing
```

**To re-enable:**
1. Uncomment the import statement
2. Uncomment `const playerDimensions = usePlayerHeight();`
3. Remove `const playerDimensions = null;`

---

## Testing

To verify these fixes are working:

1. **Specificity fix**: Inspect the chat container in DevTools. The `background-color` should come from Tailwind classes, not be overridden by YouTube styles.

2. **Dynamic height**:
   - Toggle theater mode - chat should resize
   - Enter/exit fullscreen - chat should adjust
   - Scroll the page - chat should maintain alignment with player

3. **Retry mechanism**: Check console logs for debug messages showing retry attempts when navigating to a video page.
