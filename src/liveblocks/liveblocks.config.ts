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

// Execution history types
export interface LiveExecutionResult extends JsonObject {
  nodeId: string;
  nodeLabel: string;
  result?: JsonObject | string | number | boolean | null;
  error?: string;
}

export interface LiveExecutionRecord extends JsonObject {
  id: string;
  startNodeId: string;
  startNodeLabel: string;
  startedAt: string; // ISO string for JSON compatibility
  completedAt?: string;
  status: "running" | "success" | "error";
  nodesExecuted: number;
  results: LiveExecutionResult[];
}

// Chat message types
export interface LiveToolCall extends JsonObject {
  name: string;
  input: JsonObject;
  result?: JsonObject | string | number | boolean | null;
}

export interface LiveChatMessage extends JsonObject {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolCalls?: LiveToolCall[];
}

// Define the storage schema for our room
type Storage = {
  nodes: LiveMap<string, LiveNode>;
  edges: LiveList<LiveEdge>;
  executionHistory: LiveList<LiveExecutionRecord>;
  chatMessages: LiveList<LiveChatMessage>;
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
