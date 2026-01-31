import { createClient, type LiveMap, type LiveList, type JsonObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Create the LiveBlocks client
// In production, use an auth endpoint. For development, we use a public key.
const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY || "pk_dev_placeholder",
});

// JSON-serializable node data for LiveBlocks storage
export interface LiveNodeData extends JsonObject {
  label: string;
  code: string;
  lastResult?: JsonObject | string | number | boolean | null;
  isExecuting?: boolean;
  error?: string;
}

// Storage node type
export interface LiveNode extends JsonObject {
  id: string;
  position: { x: number; y: number };
  data: LiveNodeData;
  type: string;
}

// Storage edge type
export interface LiveEdge extends JsonObject {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

// Define the storage schema for our room
type Storage = {
  nodes: LiveMap<string, LiveNode>;
  edges: LiveList<LiveEdge>;
};

// Define presence for showing collaborator cursors
type Presence = {
  cursor: { x: number; y: number } | null;
  selectedNodeId: string | null;
};

// Room event types (for broadcasting execution events, etc.)
type RoomEvent = {
  type: "EXECUTION_STARTED" | "EXECUTION_COMPLETED" | "EXECUTION_ERROR";
  nodeId: string;
  result?: string;
  error?: string;
};

// User metadata
type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
  };
};

// Create the room context with typed hooks
export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useOthers,
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
  useSelf,
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);
