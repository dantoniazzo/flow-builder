import type { Node, Edge } from "@xyflow/react";

export interface CodeNodeData extends Record<string, unknown> {
  label: string;
  code: string;
  lastResult?: unknown;
  isExecuting?: boolean;
  error?: string;
}

export type CodeNode = Node<CodeNodeData, "code">;
export type FlowEdge = Edge;

export interface ExecutionResult {
  nodeId: string;
  result?: unknown;
  error?: string;
}
