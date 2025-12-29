import { createServer } from "http";
import { Server, Socket } from "socket.io";

const PORT = process.env.PORT || 3000;

// Room state management
interface RoomState {
  videoUrl: string | null;
  currentTime: number;
  isPlaying: boolean;
  bufferingUsers: Set<string>;
  loadingUsers: Set<string>; // Users who are loading (page reload, initial join)
  lastUpdate: number;
}

interface UserInfo {
  roomId: string;
  username: string;
}

const rooms = new Map<string, RoomState>();
const users = new Map<string, UserInfo>();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

function getOrCreateRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      videoUrl: null,
      currentTime: 0,
      isPlaying: false,
      bufferingUsers: new Set(),
      loadingUsers: new Set(),
      lastUpdate: Date.now(),
    });
  }
  return rooms.get(roomId)!;
}

function getRoomUserCount(roomId: string): number {
  let count = 0;
  users.forEach((info) => {
    if (info.roomId === roomId) count++;
  });
  return count;
}

function isRoomBuffering(roomId: string): boolean {
  const room = rooms.get(roomId);
  return room ? room.bufferingUsers.size > 0 : false;
}

function isRoomLoading(roomId: string): boolean {
  const room = rooms.get(roomId);
  return room ? room.loadingUsers.size > 0 : false;
}

function isRoomWaiting(roomId: string): boolean {
  return isRoomBuffering(roomId) || isRoomLoading(roomId);
}

io.on("connection", (socket: Socket) => {
  console.log(`[Connection] User connected: ${socket.id}`);

  // Join a room
  socket.on(
    "join_room",
    (data: { roomId: string; username: string; videoUrl?: string }) => {
      const { roomId, username, videoUrl } = data;

      // Leave previous room if any
      const previousInfo = users.get(socket.id);
      if (previousInfo) {
        socket.leave(previousInfo.roomId);
        const prevRoom = rooms.get(previousInfo.roomId);
        if (prevRoom) {
          prevRoom.loadingUsers.delete(socket.id);
          prevRoom.bufferingUsers.delete(socket.id);
        }
        io.to(previousInfo.roomId).emit("user_left", {
          userId: socket.id,
          username: previousInfo.username,
        });
      }

      // Join new room
      socket.join(roomId);
      users.set(socket.id, { roomId, username });

      const room = getOrCreateRoom(roomId);
      const userCount = getRoomUserCount(roomId);

      // If this is the first user and they have a video URL, set it
      if (videoUrl && !room.videoUrl) {
        room.videoUrl = videoUrl;
      }

      // Add user to loading set - they need to signal ready before playback resumes
      // Only add to loading if there are other users in the room
      if (userCount > 1) {
        room.loadingUsers.add(socket.id);

        // Notify others that someone is loading (they should pause)
        socket.to(roomId).emit("user_loading", {
          userId: socket.id,
          username,
          loadingCount: room.loadingUsers.size,
        });

        console.log(
          `[Loading] Room ${roomId}: ${username} is loading. Total loading: ${room.loadingUsers.size}`
        );
      }

      // Send current room state to the joining user
      socket.emit("room_state", {
        roomId,
        videoUrl: room.videoUrl,
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
        userCount,
        isBuffering: isRoomBuffering(roomId),
        isLoading: isRoomLoading(roomId),
      });

      // Notify others in the room
      socket.to(roomId).emit("user_joined", {
        userId: socket.id,
        username,
        userCount,
      });

      console.log(
        `[Room] ${username} (${socket.id}) joined room: ${roomId}. Users: ${userCount}`
      );
    }
  );

  // Play event
  socket.on("play", (data: { currentTime: number; timestamp: number }) => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomId);
    if (!room) return;

    room.isPlaying = true;
    room.currentTime = data.currentTime;
    room.lastUpdate = Date.now();

    // Broadcast to all other users in the room
    socket.to(userInfo.roomId).emit("play", {
      currentTime: data.currentTime,
      timestamp: data.timestamp,
      initiatedBy: socket.id,
    });

    console.log(
      `[Play] Room ${userInfo.roomId}: Play at ${data.currentTime.toFixed(2)}s`
    );
  });

  // Pause event
  socket.on("pause", (data: { currentTime: number; timestamp: number }) => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomId);
    if (!room) return;

    room.isPlaying = false;
    room.currentTime = data.currentTime;
    room.lastUpdate = Date.now();

    socket.to(userInfo.roomId).emit("pause", {
      currentTime: data.currentTime,
      timestamp: data.timestamp,
      initiatedBy: socket.id,
    });

    console.log(
      `[Pause] Room ${userInfo.roomId}: Pause at ${data.currentTime.toFixed(2)}s`
    );
  });

  // Seek event
  socket.on("seek", (data: { currentTime: number; timestamp: number }) => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomId);
    if (!room) return;

    room.currentTime = data.currentTime;
    room.lastUpdate = Date.now();

    socket.to(userInfo.roomId).emit("seek", {
      currentTime: data.currentTime,
      timestamp: data.timestamp,
      initiatedBy: socket.id,
    });

    console.log(
      `[Seek] Room ${userInfo.roomId}: Seek to ${data.currentTime.toFixed(2)}s`
    );
  });

  // User is ready (finished loading after page load/reload)
  socket.on("user_ready", () => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomId);
    if (!room) return;

    room.loadingUsers.delete(socket.id);

    io.to(userInfo.roomId).emit("user_ready", {
      userId: socket.id,
      username: userInfo.username,
      loadingCount: room.loadingUsers.size,
    });

    console.log(
      `[Ready] Room ${userInfo.roomId}: ${userInfo.username} is ready. Total loading: ${room.loadingUsers.size}`
    );

    // If no one is loading or buffering anymore and video was playing, resume all
    if (!isRoomWaiting(userInfo.roomId) && room.isPlaying) {
      io.to(userInfo.roomId).emit("resume_after_buffer", {
        currentTime: room.currentTime,
      });
      console.log(
        `[Resume] Room ${userInfo.roomId}: All users ready, resuming playback`
      );
    }
  });

  // Buffering start event
  socket.on("buffering_start", () => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomId);
    if (!room) return;

    room.bufferingUsers.add(socket.id);

    // Notify all users in the room that someone is buffering
    io.to(userInfo.roomId).emit("buffering_start", {
      userId: socket.id,
      username: userInfo.username,
      bufferingCount: room.bufferingUsers.size,
    });

    console.log(
      `[Buffering] Room ${userInfo.roomId}: ${userInfo.username} started buffering. Total buffering: ${room.bufferingUsers.size}`
    );
  });

  // Buffering end event
  socket.on("buffering_end", () => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomId);
    if (!room) return;

    room.bufferingUsers.delete(socket.id);

    io.to(userInfo.roomId).emit("buffering_end", {
      userId: socket.id,
      username: userInfo.username,
      bufferingCount: room.bufferingUsers.size,
    });

    // If no one is waiting (buffering or loading) and video was playing, notify to resume
    if (!isRoomWaiting(userInfo.roomId) && room.isPlaying) {
      io.to(userInfo.roomId).emit("resume_after_buffer", {
        currentTime: room.currentTime,
      });
    }

    console.log(
      `[Buffering] Room ${userInfo.roomId}: ${userInfo.username} finished buffering. Total buffering: ${room.bufferingUsers.size}`
    );
  });

  // Sync request - for when a user wants to sync their position
  socket.on("sync_request", () => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomId);
    if (!room) return;

    socket.emit("sync_response", {
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
      timestamp: Date.now(),
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    const userInfo = users.get(socket.id);
    if (userInfo) {
      const room = rooms.get(userInfo.roomId);
      if (room) {
        room.bufferingUsers.delete(socket.id);
        room.loadingUsers.delete(socket.id);

        // If video was playing and no one is waiting anymore, resume
        // (but only if there are still users in the room)
        const remainingUsers = getRoomUserCount(userInfo.roomId) - 1;
        if (remainingUsers > 0 && !isRoomWaiting(userInfo.roomId) && room.isPlaying) {
          io.to(userInfo.roomId).emit("resume_after_buffer", {
            currentTime: room.currentTime,
          });
        }
      }

      io.to(userInfo.roomId).emit("user_left", {
        userId: socket.id,
        username: userInfo.username,
        userCount: getRoomUserCount(userInfo.roomId) - 1,
      });

      console.log(
        `[Disconnect] ${userInfo.username} (${socket.id}) left room: ${userInfo.roomId}`
      );

      // Clean up empty rooms
      if (getRoomUserCount(userInfo.roomId) - 1 === 0) {
        rooms.delete(userInfo.roomId);
        console.log(`[Room] Room ${userInfo.roomId} deleted (empty)`);
      }
    }

    users.delete(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   SyncWatch Server running on port ${PORT}      ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `);
});
