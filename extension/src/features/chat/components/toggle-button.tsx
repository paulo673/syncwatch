import { MessageCircle } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ToggleButtonProps {
  onClick: () => void;
  hasUnread: boolean;
  isChatOpen: boolean;
}

export function ToggleButton({
  onClick,
  hasUnread,
  isChatOpen,
}: ToggleButtonProps) {
  return (
    <div
      className={cn(
        "sw:fixed sw:top-[50px] sw:z-[9999]",
        "sw:w-[50px] sw:bg-black/50 sw:rounded",
        "sw:flex sw:flex-col sw:items-center",
        "sw:transition-all sw:duration-300",
        isChatOpen ? "sw:right-[350px]" : "sw:right-[30px]"
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          "sw:w-[50px] sw:h-[50px] sw:border-none sw:bg-transparent",
          "sw:text-white sw:cursor-pointer",
          "sw:flex sw:items-center sw:justify-center",
          "sw:transition-colors sw:duration-200",
          "sw:hover:bg-white/10",
          "sw:relative"
        )}
        title="Toggle Chat"
      >
        <MessageCircle className="sw:w-6 sw:h-6" />
        {hasUnread && (
          <span className="sw:absolute sw:top-2 sw:right-2 sw:w-2.5 sw:h-2.5 sw:bg-red-500 sw:rounded-full" />
        )}
      </button>
    </div>
  );
}
