import { useState, useCallback } from "react";
import { useSyncWatch } from "./hooks";
import {
  StatusIndicator,
  NoRoomSection,
  InRoomSection,
  LogsSection,
} from "./components";

export function App() {
  const {
    state,
    status,
    statusText: initialStatusText,
    isReady,
    createRoom,
    joinRoom,
    setUsername,
    copyRoomLink,
    copyRoomId,
    leaveRoom,
  } = useSyncWatch();

  const [statusText, setStatusText] = useState(initialStatusText);

  // Sync statusText with hook
  useState(() => {
    setStatusText(initialStatusText);
  });

  const handleCreateRoom = useCallback(
    async (username: string) => {
      if (username) {
        await setUsername(username);
      }
      const roomId = await createRoom();
      if (!roomId) {
        setStatusText("Failed to create room");
      }
    },
    [setUsername, createRoom]
  );

  const handleJoinRoom = useCallback(
    async (username: string, roomId: string) => {
      if (username) {
        await setUsername(username);
      }
      await joinRoom(roomId);
    },
    [setUsername, joinRoom]
  );

  const showNoRoom = status !== "in-room";
  const showInRoom = status === "in-room" && state?.roomId;

  return (
    <div className="sw-w-80 sw-min-h-[200px] sw-p-5 sw-bg-gradient-to-br sw-from-background sw-to-background-secondary sw-text-white">
      <h1 className="sw-text-2xl sw-font-bold sw-mb-2 sw-flex sw-items-center sw-gap-2">
        <span>🎬</span>
        <span>SyncWatch</span>
      </h1>
      <p className="sw-text-xs sw-text-white/50 sw-mb-5">
        Watch videos in sync with friends
      </p>

      <StatusIndicator status={status} statusText={statusText} />

      {showNoRoom && (
        <NoRoomSection
          isDisabled={!isReady}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          setStatusText={setStatusText}
        />
      )}

      {showInRoom && state?.roomId && (
        <InRoomSection
          roomId={state.roomId}
          onCopyLink={copyRoomLink}
          onCopyRoomId={copyRoomId}
          onLeaveRoom={leaveRoom}
        />
      )}

      <p className="sw-mt-5 sw-text-center sw-text-[11px] sw-text-white/30">
        Go to YouTube and open a video to start
      </p>

      <LogsSection />
    </div>
  );
}
