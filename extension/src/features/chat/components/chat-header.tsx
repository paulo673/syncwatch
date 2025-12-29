import { X } from "lucide-react";
import { Button } from "@/shared/components/ui";

interface ChatHeaderProps {
  onClose: () => void;
}

export function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="sw-flex sw-items-center sw-justify-between sw-px-4 sw-py-3 sw-bg-white/5 sw-border-b sw-border-white/10 sw-shrink-0">
      <span className="sw-text-white sw-text-sm sw-font-semibold sw-flex sw-items-center sw-gap-2">
        SyncWatch Chat
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="sw-text-gray-400 hover:sw-text-white"
        title="Close"
      >
        <X className="sw-w-4 sw-h-4" />
      </Button>
    </div>
  );
}
