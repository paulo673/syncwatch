import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

interface NoRoomSectionProps {
  isDisabled: boolean;
  onCreateRoom: (username: string) => Promise<void>;
  onJoinRoom: (username: string, roomId: string) => Promise<void>;
  setStatusText: (text: string) => void;
}

export function NoRoomSection({
  isDisabled,
  onCreateRoom,
  onJoinRoom,
  setStatusText,
}: NoRoomSectionProps) {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["username"], (result) => {
      if (result.username) {
        setUsername(result.username);
      }
    });
  }, []);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    chrome.storage.local.set({ username: value });
  };

  const handleCreateRoom = async () => {
    if (isDisabled) {
      setStatusText("Please wait, loading...");
      return;
    }
    setIsCreating(true);
    try {
      await onCreateRoom(username);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setStatusText("Please enter a Room ID");
      return;
    }
    if (isDisabled) {
      setStatusText("Please wait, loading...");
      return;
    }
    setIsJoining(true);
    try {
      await onJoinRoom(username, roomId);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="sw-space-y-3">
      <div>
        <label className="sw-block sw-text-xs sw-text-white/50 sw-mb-1">
          Your Name
        </label>
        <Input
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          placeholder="Enter your name"
        />
      </div>

      <div>
        <label className="sw-block sw-text-xs sw-text-white/50 sw-mb-1">
          Room ID (optional)
        </label>
        <Input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter room ID to join"
        />
      </div>

      <div className="sw-flex sw-gap-2 sw-mt-4">
        <Button
          onClick={handleCreateRoom}
          disabled={isDisabled || isCreating}
          className="sw-flex-1"
        >
          {isCreating ? "Creating..." : "Create Room"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleJoinRoom}
          disabled={isDisabled || isJoining}
          className="sw-flex-1"
        >
          {isJoining ? "Joining..." : "Join Room"}
        </Button>
      </div>
    </div>
  );
}
