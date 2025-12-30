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
