"use client";

import { type ReactNode, useMemo } from "react";
import { LiveList, LiveMap } from "@liveblocks/client";
import { RoomProvider as LiveblocksRoomProvider, type LiveNode, type LiveEdge, type LiveExecutionRecord, type LiveChatMessage } from "./liveblocks.config";

interface Props {
  roomId: string;
  children: ReactNode;
}

// Generate a random color for the user
function getRandomColor() {
  const colors = [
    "#E57373", "#F06292", "#BA68C8", "#9575CD",
    "#7986CB", "#64B5F6", "#4FC3F7", "#4DD0E1",
    "#4DB6AC", "#81C784", "#AED581", "#DCE775",
    "#FFF176", "#FFD54F", "#FFB74D", "#FF8A65",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate a random user ID
function getUserId() {
  if (typeof window === "undefined") {
    return `user-${Math.random().toString(36).slice(2, 9)}`;
  }
  const stored = sessionStorage.getItem("flow-builder-user-id");
  if (stored) return stored;
  const id = `user-${Math.random().toString(36).slice(2, 9)}`;
  sessionStorage.setItem("flow-builder-user-id", id);
  return id;
}

export function RoomProviderWrapper({ roomId, children }: Props) {
  // Store user info for future presence features
  useMemo(() => getUserId(), []);
  useMemo(() => getRandomColor(), []);

  // Initial storage with default nodes
  const initialStorage = useMemo(
    () => ({
      nodes: new LiveMap<string, LiveNode>([
        [
          "n1",
          {
            id: "n1",
            position: { x: 100, y: 100 },
            data: {
              label: "Start",
              code: '// Start node\nreturn { message: "Hello from start!" };',
            },
            type: "code",
          },
        ],
        [
          "n2",
          {
            id: "n2",
            position: { x: 100, y: 250 },
            data: {
              label: "Process",
              code: "// Process the input\nconst result = input?.message + ' Processed!';\nreturn { result };",
            },
            type: "code",
          },
        ],
      ]),
      edges: new LiveList<LiveEdge>([{ id: "e1-2-bottom-top", source: "n1", target: "n2", sourceHandle: "bottom", targetHandle: "top" }]),
      executionHistory: new LiveList<LiveExecutionRecord>([]),
      chatMessages: new LiveList<LiveChatMessage>([]),
    }),
    []
  );

  return (
    <LiveblocksRoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selectedNodeId: null,
      }}
      initialStorage={initialStorage}
    >
      {children}
    </LiveblocksRoomProvider>
  );
}
