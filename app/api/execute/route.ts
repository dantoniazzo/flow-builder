import { NextRequest, NextResponse } from "next/server";

interface LiveNodeData {
  label: string;
  code: string;
  icon?: string;
  lastResult?: unknown;
  isExecuting?: boolean;
  error?: string;
}

interface LiveNode {
  id: string;
  position: { x: number; y: number };
  data: LiveNodeData;
  type: string;
}

interface LiveEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

interface NodeExecutionResult {
  nodeId: string;
  nodeLabel: string;
  result?: unknown;
  error?: string;
}

interface StorageData {
  nodes: Map<string, LiveNode>;
  edges: LiveEdge[];
}

// Execute a single node's code
async function executeNodeCode(code: string, input: unknown): Promise<unknown> {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction(
    "input",
    "fetch",
    `
    "use strict";
    ${code}
  `
  );
  return await fn(input, fetch);
}

// Get room storage using Liveblocks REST API (read-only)
async function getStorageDocument(roomId: string): Promise<StorageData> {
  const response = await fetch(
    `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(roomId)}/storage`,
    {
      headers: {
        Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get storage: ${response.statusText}`);
  }

  const data = await response.json();

  const nodesData = data.data?.nodes?.data || {};
  const edgesData = data.data?.edges?.data || [];

  const nodes = new Map<string, LiveNode>();
  for (const [key, value] of Object.entries(nodesData)) {
    nodes.set(key, value as LiveNode);
  }

  return {
    nodes,
    edges: edgesData as LiveEdge[],
  };
}

// This endpoint executes a single node and returns the result
// The client is responsible for updating Liveblocks UI state
export async function POST(request: NextRequest) {
  try {
    const { roomId, nodeId, input } = await request.json();

    if (!roomId || !nodeId) {
      return NextResponse.json(
        { error: "roomId and nodeId are required" },
        { status: 400 }
      );
    }

    // Get the current room storage
    const storage = await getStorageDocument(roomId);
    const node = storage.nodes.get(nodeId);

    if (!node) {
      return NextResponse.json(
        { error: `Node ${nodeId} not found` },
        { status: 404 }
      );
    }

    // Execute the node's code
    let result: unknown;
    let error: string | undefined;

    try {
      result = await executeNodeCode(node.data.code, input);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    // Serialize the result
    const serializedResult =
      result !== undefined ? JSON.parse(JSON.stringify(result)) : undefined;

    const nodeResult: NodeExecutionResult = {
      nodeId,
      nodeLabel: node.data.label,
      result: serializedResult,
      error,
    };

    // Get children nodes for the client to know what to execute next
    const children = storage.edges
      .filter((edge) => edge.source === nodeId)
      .map((edge) => edge.target);

    return NextResponse.json({
      success: !error,
      nodeResult,
      children,
    });
  } catch (error) {
    console.error("Node execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
