import type { SystemEvent } from "../chat.types";

interface SystemMessageProps {
  event: SystemEvent;
}

const eventConfig = {
  join: { icon: "👋", getText: (name: string) => `${name} joined the room` },
  leave: { icon: "👋", getText: (name: string) => `${name} left the room` },
  play: { icon: "▶️", getText: (name: string) => `${name} resumed playback` },
  pause: { icon: "⏸️", getText: (name: string) => `${name} paused playback` },
};

export function SystemMessage({ event }: SystemMessageProps) {
  const config = eventConfig[event.type];

  return (
    <div className="sw-self-center sw-text-gray-500 sw-text-xs sw-italic sw-py-1 sw-text-center">
      <span className="sw-mr-1">{config.icon}</span>
      <span>{config.getText(event.username)}</span>
    </div>
  );
}
