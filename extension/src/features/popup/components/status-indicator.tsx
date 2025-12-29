import { cn } from "@/shared/lib/utils";
import type { PopupStatus } from "../popup.types";

interface StatusIndicatorProps {
  status: PopupStatus;
  statusText: string;
}

export function StatusIndicator({ status, statusText }: StatusIndicatorProps) {
  const isConnected = status === "ready" || status === "in-room";

  return (
    <div className="sw-flex sw-items-center sw-gap-2 sw-p-3 sw-bg-white/5 sw-rounded-lg sw-mb-4">
      <div
        className={cn(
          "sw-w-2.5 sw-h-2.5 sw-rounded-full sw-transition-colors",
          isConnected ? "sw-bg-green-400" : "sw-bg-red-400"
        )}
      />
      <span className="sw-text-sm sw-text-white/90">{statusText}</span>
    </div>
  );
}
