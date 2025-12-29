import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface InRoomSectionProps {
  roomId: string;
  onCopyLink: () => Promise<void>;
  onCopyRoomId: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
}

export function InRoomSection({
  roomId,
  onCopyLink,
  onCopyRoomId,
  onLeaveRoom,
}: InRoomSectionProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);

  const handleCopyLink = async () => {
    await onCopyLink();
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCopyRoomId = async () => {
    await onCopyRoomId();
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  return (
    <div className="sw-space-y-4">
      <div className="sw-bg-primary/10 sw-border sw-border-primary/30 sw-rounded-lg sw-p-3">
        <label className="sw-block sw-text-xs sw-text-white/50 sw-mb-1">
          Room ID
        </label>
        <div className="sw-flex sw-items-center sw-gap-2">
          <p className="sw-font-mono sw-text-xs sw-text-primary">{roomId}</p>
          <button
            onClick={handleCopyRoomId}
            className="sw-p-1 sw-rounded sw-text-white/50 hover:sw-text-primary hover:sw-bg-primary/15 sw-transition-colors"
            title="Copy Room ID"
          >
            {idCopied ? (
              <Check className="sw-w-3.5 sw-h-3.5 sw-text-green-400" />
            ) : (
              <Copy className="sw-w-3.5 sw-h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="sw-flex sw-gap-2">
        <Button onClick={handleCopyLink} className="sw-flex-1">
          {linkCopied ? "Copied!" : "Copy Link"}
        </Button>
        <Button variant="secondary" onClick={onLeaveRoom} className="sw-flex-1">
          Leave Room
        </Button>
      </div>
    </div>
  );
}
