import { useState, useCallback, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Input, Button } from "@/shared/components/ui";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  onTyping,
  disabled,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setMessage("");
    }
  }, [message, onSendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    onTyping();
  };

  return (
    <div className="sw:flex sw:gap-2 sw:p-3 sw:bg-white/5 sw:border-t sw:border-white/10 sw:shrink-0">
      <Input
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        maxLength={500}
        autoComplete="off"
        disabled={disabled}
        className="sw:flex-1"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="sw:rounded-full sw:w-9 sw:h-9 sw:bg-gradient-to-br sw:from-sky-500 sw:to-sky-600 sw:shrink-0"
        title="Send"
      >
        <Send className="sw:w-4 sw:h-4" />
      </Button>
    </div>
  );
}
