import type { CodeNode, FlowEdge } from "../types";
import type { LiveNodeData } from "../liveblocks/liveblocks.config";

type UpdateNodeCallback = (
  nodeId: string,
  updates: Partial<LiveNodeData>
) => void;

export interface NodeExecutionResult {
  nodeId: string;
  nodeLabel: string;
  result?: unknown;
  error?: string;
}

export interface FlowExecutionResult {
  success: boolean;
  results: NodeExecutionResult[];
}

export async function executeNode(
  code: string,
  input: unknown
): Promise<unknown> {
  // Create an async function from the code string
  // This allows top-level await in node code
  // The function receives 'input' as a parameter and can return a value
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction(
    "input",
    `
    "use strict";
    ${code}
  `
  );

  // Execute the async function with the input
  return await fn(input);
}

export async function executeFlow(
  startNodeId: string,
  nodes: CodeNode[],
  edges: FlowEdge[],
  updateNode: UpdateNodeCallback
): Promise<FlowExecutionResult> {
  const results: NodeExecutionResult[] = [];
  const visited = new Set<string>();
  let hasError = false;

  // Build adjacency list for traversal
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = adjacency.get(edge.source) || [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
  }

  // Get node by ID
  const getNode = (id: string) => nodes.find((n) => n.id === id);

  // Execute a node and its children sequentially
  async function executeNodeAndChildren(
    nodeId: string,
    input: unknown
  ): Promise<void> {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = getNode(nodeId);
    if (!node) return;

    // Mark node as executing
    updateNode(nodeId, { isExecuting: true, error: undefined });

    let result: unknown;
    let error: string | undefined;

    try {
      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Execute the node's code
      result = await executeNode(node.data.code, input);

      results.push({ nodeId, nodeLabel: node.data.label, result });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      results.push({ nodeId, nodeLabel: node.data.label, error });
      hasError = true;
    }

    // Serialize the result for storage (must be JSON-compatible)
    const serializedResult = result !== undefined ? JSON.parse(JSON.stringify(result)) : undefined;

    // Update node with result or error
    updateNode(nodeId, {
      isExecuting: false,
      lastResult: serializedResult,
      error,
    });

    // If there was an error, stop execution
    if (error) return;

    // Execute connected nodes sequentially
    const children = adjacency.get(nodeId) || [];
    for (const childId of children) {
      await executeNodeAndChildren(childId, result);
    }
  }

  // Start execution from the start node
  await executeNodeAndChildren(startNodeId, undefined);

  return {
    success: !hasError,
    results,
  };
}

// Helper to find start nodes (nodes with no incoming edges)
export function findStartNodes(
  nodes: CodeNode[],
  edges: FlowEdge[]
): CodeNode[] {
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  return nodes.filter((n) => !nodesWithIncoming.has(n.id));
}

// Check if a specific node is a start node
export function isStartNode(nodeId: string, edges: FlowEdge[]): boolean {
  return !edges.some((e) => e.target === nodeId);
}
