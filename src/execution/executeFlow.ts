import type { CodeNode, FlowEdge, ExecutionResult } from "../types";
import type { LiveNodeData } from "../liveblocks/liveblocks.config";

type UpdateNodeCallback = (
  nodeId: string,
  updates: Partial<LiveNodeData>
) => void;

export async function executeNode(
  code: string,
  input: unknown
): Promise<unknown> {
  // Create a function from the code string
  // The function receives 'input' as a parameter and can return a value
  const fn = new Function(
    "input",
    `
    "use strict";
    ${code}
  `
  );

  // Execute the function with the input
  const result = fn(input);

  // Handle both sync and async results
  return result instanceof Promise ? await result : result;
}

export async function executeFlow(
  startNodeId: string,
  nodes: CodeNode[],
  edges: FlowEdge[],
  updateNode: UpdateNodeCallback
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  const visited = new Set<string>();

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

      results.push({ nodeId, result });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      results.push({ nodeId, error });
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

  return results;
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
