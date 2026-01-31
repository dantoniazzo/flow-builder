export type AIProvider = "anthropic" | "openai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: unknown;
}

export interface WorkflowContext {
  nodes: Array<{
    id: string;
    label: string;
    code: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>;
}

export interface CreateNodeInput {
  label: string;
  code: string;
  position?: { x: number; y: number };
}

export interface UpdateNodeInput {
  nodeId: string;
  label?: string;
  code?: string;
}

export interface ConnectNodesInput {
  sourceId: string;
  targetId: string;
  sourceHandle?: "top" | "bottom" | "left" | "right";
  targetHandle?: "top" | "bottom" | "left" | "right";
}

export interface DeleteNodeInput {
  nodeId: string;
}
