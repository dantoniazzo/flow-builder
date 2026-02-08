import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";

// Initialize Liveblocks client
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

interface LiveNodeData {
  label: string;
  code: string;
  executionMode?: "server" | "client";
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

interface ExecutionResult {
  nodeId: string;
  nodeLabel: string;
  result?: unknown;
  error?: string;
}

interface ExecutionRecord {
  id: string;
  startNodeId: string;
  startNodeLabel: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "success" | "error";
  nodesExecuted: number;
  results: ExecutionResult[];
}

// Execute a single node's code on the server
async function executeNodeCode(
  code: string,
  input: unknown
): Promise<unknown> {
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

// Get storage data from Liveblocks using REST API (for reading)
async function getStorageData(roomId: string): Promise<{
  nodes: Map<string, LiveNode>;
  edges: LiveEdge[];
}> {
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

// Update a node's data using mutateStorage for real-time sync
async function updateNodeInStorage(
  roomId: string,
  nodeId: string,
  updates: Partial<LiveNodeData>
): Promise<void> {
  try {
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodes = root.get("nodes") as any;
      if (nodes && typeof nodes.get === "function") {
        // Get the current node as a plain object
        const currentNode = nodes.get(nodeId);
        if (currentNode) {
          // Create updated node with merged data
          const updatedData = { ...currentNode.data };

          if (updates.isExecuting !== undefined) {
            updatedData.isExecuting = updates.isExecuting;
          }
          if (updates.lastResult !== undefined) {
            updatedData.lastResult = updates.lastResult;
          }
          if (updates.error !== undefined) {
            updatedData.error = updates.error;
          } else if ("error" in updates) {
            delete updatedData.error;
          }

          // Set the entire node back with updated data
          nodes.set(nodeId, {
            ...currentNode,
            data: updatedData,
          });
        }
      }
    });
  } catch (error) {
    console.error("Failed to update node in storage:", error);
    // Fallback: continue execution even if storage update fails
  }
}

// Add execution record to history
async function addExecutionRecord(
  roomId: string,
  record: ExecutionRecord
): Promise<void> {
  try {
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const history = root.get("executionHistory") as any;
      if (history && typeof history.insert === "function") {
        // Add to beginning of list
        history.insert(record, 0);
        // Keep only last 50 records
        while (history.length > 50) {
          history.delete(history.length - 1);
        }
      }
    });
  } catch (error) {
    console.error("Failed to add execution record:", error);
  }
}

// Update execution record in history
async function updateExecutionRecord(
  roomId: string,
  recordId: string,
  updates: Partial<ExecutionRecord>
): Promise<void> {
  try {
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const history = root.get("executionHistory") as any;
      if (history && typeof history.get === "function") {
        // Find and update the record
        for (let i = 0; i < history.length; i++) {
          const record = history.get(i);
          if (record && record.id === recordId) {
            // Create updated record and replace it
            const updatedRecord = { ...record, ...updates };
            history.set(i, updatedRecord);
            break;
          }
        }
      }
    });
  } catch (error) {
    console.error("Failed to update execution record:", error);
  }
}

// Main flow execution endpoint
export async function POST(request: NextRequest) {
  try {
    const { roomId, startNodeId } = await request.json();

    if (!roomId || !startNodeId) {
      return NextResponse.json(
        { error: "roomId and startNodeId are required" },
        { status: 400 }
      );
    }

    // Get initial storage state
    const storage = await getStorageData(roomId);
    const startNode = storage.nodes.get(startNodeId);

    if (!startNode) {
      return NextResponse.json(
        { error: `Start node ${startNodeId} not found` },
        { status: 404 }
      );
    }

    // Create execution record
    const executionId = `exec-${Date.now()}`;
    const results: ExecutionResult[] = [];
    let hasError = false;

    const executionRecord: ExecutionRecord = {
      id: executionId,
      startNodeId,
      startNodeLabel: startNode.data.label,
      startedAt: new Date().toISOString(),
      status: "running",
      nodesExecuted: 0,
      results: [],
    };

    await addExecutionRecord(roomId, executionRecord);

    // Track execution counts for circular flow support
    const executionCount = new Map<string, number>();
    const MAX_EXECUTIONS_PER_NODE = 10;
    let totalExecutions = 0;
    const MAX_TOTAL_EXECUTIONS = 100;

    // Execute a single node and its children
    async function executeNodeAndChildren(
      nodeId: string,
      input: unknown
    ): Promise<void> {
      // Check global limit
      if (totalExecutions >= MAX_TOTAL_EXECUTIONS) {
        console.warn("Max total executions reached, stopping flow");
        return;
      }

      // Check per-node limit
      const nodeExecCount = executionCount.get(nodeId) || 0;
      if (nodeExecCount >= MAX_EXECUTIONS_PER_NODE) {
        console.warn(`Node ${nodeId} reached max executions, skipping`);
        return;
      }
      executionCount.set(nodeId, nodeExecCount + 1);
      totalExecutions++;

      // Re-fetch storage to get latest state
      const currentStorage = await getStorageData(roomId);
      const node = currentStorage.nodes.get(nodeId);
      if (!node) return;

      // Mark node as executing (this should sync to clients in real-time)
      await updateNodeInStorage(roomId, nodeId, {
        isExecuting: true,
        error: undefined,
      });

      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 300));

      let nodeResult: { result?: unknown; error?: string } = {};

      try {
        // All nodes execute on server (including those marked as "client")
        const result = await executeNodeCode(node.data.code, input);
        const serializedResult =
          result !== undefined
            ? JSON.parse(JSON.stringify(result))
            : undefined;
        nodeResult = { result: serializedResult };
      } catch (e) {
        nodeResult = { error: e instanceof Error ? e.message : String(e) };
      }

      // Update node with result or error (syncs to clients)
      await updateNodeInStorage(roomId, nodeId, {
        isExecuting: false,
        lastResult: nodeResult.result,
        error: nodeResult.error,
      });

      results.push({
        nodeId,
        nodeLabel: node.data.label,
        result: nodeResult.result,
        error: nodeResult.error,
      });

      if (nodeResult.error) {
        hasError = true;
        return;
      }

      // Update execution record
      await updateExecutionRecord(roomId, executionId, {
        nodesExecuted: results.length,
        results: [...results],
      });

      // Get children nodes from edges
      const children = currentStorage.edges
        .filter((edge) => edge.source === nodeId)
        .map((edge) => edge.target);

      // Execute children nodes sequentially
      // Only continue if the node returned a value (not undefined/null)
      if (nodeResult.result !== undefined && nodeResult.result !== null) {
        for (const childId of children) {
          await executeNodeAndChildren(childId, nodeResult.result);
        }
      }
    }

    // Start execution from the start node
    await executeNodeAndChildren(startNodeId, undefined);

    // Finalize execution record
    await updateExecutionRecord(roomId, executionId, {
      completedAt: new Date().toISOString(),
      status: hasError ? "error" : "success",
      nodesExecuted: results.length,
      results,
    });

    return NextResponse.json({
      success: !hasError,
      executionId,
      nodesExecuted: results.length,
      results,
    });
  } catch (error) {
    console.error("Flow execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
