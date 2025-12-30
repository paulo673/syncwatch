interface TypingIndicatorProps {
  typingUsers: string[];
  currentUsername: string;
}

export function TypingIndicator({
  typingUsers,
  currentUsername,
}: TypingIndicatorProps) {
  // Filter out current user
  const others = typingUsers.filter((name) => name !== currentUsername);

  if (others.length === 0) {
    return null;
  }

  let text = "";
  if (others.length === 1) {
    text = `${others[0]} is typing`;
  } else if (others.length === 2) {
    text = `${others[0]} and ${others[1]} are typing`;
  } else {
    text = `${others.length} people are typing`;
  }

  return (
    <div className="sw:px-3 sw:py-2 sw:text-xs sw:text-gray-500 sw:italic sw:flex sw:items-center sw:gap-1 sw:shrink-0">
      <span>{text}</span>
      <span className="sw:inline-flex sw:gap-1 sw:ml-1">
        <span className="sw:w-1 sw:h-1 sw:bg-gray-500 sw:rounded-full sw:animate-typing-dot [animation-delay:0s]" />
        <span className="sw:w-1 sw:h-1 sw:bg-gray-500 sw:rounded-full sw:animate-typing-dot [animation-delay:0.2s]" />
        <span className="sw:w-1 sw:h-1 sw:bg-gray-500 sw:rounded-full sw:animate-typing-dot [animation-delay:0.4s]" />
      </span>
    </div>
  );
}
