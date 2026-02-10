import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Liveblocks } from "@liveblocks/node";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Liveblocks client
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

// Middleware
app.use(cors());
app.use(express.json());

// Types
interface LiveNodeData {
  label: string;
  code: string;
  executionMode?: "server" | "client";
  lastResult?: unknown;
  isExecuting?: boolean;
  error?: string;
  pendingClientExecution?: boolean;
  clientInput?: unknown;
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
async function executeNodeCode(code: string, input: unknown): Promise<unknown> {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction(
    "input",
    "fetch",
    `
    "use strict";
    ${code}
  `,
  );
  return await fn(input, fetch);
}

// Get storage data from Liveblocks
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
    },
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
  updates: Partial<LiveNodeData>,
): Promise<void> {
  try {
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodes = root.get("nodes") as any;
      if (nodes && typeof nodes.get === "function") {
        const currentNode = nodes.get(nodeId);
        if (currentNode) {
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
          if (updates.pendingClientExecution !== undefined) {
            updatedData.pendingClientExecution = updates.pendingClientExecution;
          }
          if (updates.clientInput !== undefined) {
            updatedData.clientInput = updates.clientInput;
          } else if ("clientInput" in updates) {
            delete updatedData.clientInput;
          }

          nodes.set(nodeId, {
            ...currentNode,
            data: updatedData,
          });
        }
      }
    });
  } catch (error) {
    console.error("Failed to update node in storage:", error);
  }
}

// Add execution record to history
async function addExecutionRecord(
  roomId: string,
  record: ExecutionRecord,
): Promise<void> {
  try {
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const history = root.get("executionHistory") as any;
      if (history && typeof history.insert === "function") {
        history.insert(record, 0);
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
  updates: Partial<ExecutionRecord>,
): Promise<void> {
  try {
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const history = root.get("executionHistory") as any;
      if (history && typeof history.get === "function") {
        for (let i = 0; i < history.length; i++) {
          const record = history.get(i);
          if (record && record.id === recordId) {
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

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// OAuth Google redirect handler
app.get("/oauth/google", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Google OAuth</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            background-color: #09090b;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .container {
            text-align: center;
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 2px solid #3f3f46;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .text {
            color: #a1a1aa;
            font-size: 14px;
          }
          .subtext {
            color: #71717a;
            font-size: 12px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <p class="text">Completing authentication...</p>
          <p class="subtext">This window will close automatically.</p>
        </div>
        <script>
          // Extract access token from URL hash
          const hash = window.location.hash;
          const match = hash.match(/access_token=([^&]+)/);

          if (match && window.opener) {
            // Send token back to opener window
            window.opener.postMessage(
              { type: "google_oauth_token", accessToken: match[1] },
              "*"
            );
            // Close this popup
            window.close();
          }
        </script>
      </body>
    </html>
  `);
});

// Execute flow endpoint
app.post("/api/execute-flow", async (req, res) => {
  try {
    const { roomId, startNodeId } = req.body;

    if (!roomId || !startNodeId) {
      return res
        .status(400)
        .json({ error: "roomId and startNodeId are required" });
    }

    const storage = await getStorageData(roomId);
    const startNode = storage.nodes.get(startNodeId);

    if (!startNode) {
      return res
        .status(404)
        .json({ error: `Start node ${startNodeId} not found` });
    }

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

    const executionCount = new Map<string, number>();
    const MAX_EXECUTIONS_PER_NODE = 10;
    let totalExecutions = 0;
    const MAX_TOTAL_EXECUTIONS = 100;

    async function executeNodeAndChildren(
      nodeId: string,
      input: unknown,
    ): Promise<void> {
      if (totalExecutions >= MAX_TOTAL_EXECUTIONS) {
        console.warn("Max total executions reached, stopping flow");
        return;
      }

      const nodeExecCount = executionCount.get(nodeId) || 0;
      if (nodeExecCount >= MAX_EXECUTIONS_PER_NODE) {
        console.warn(`Node ${nodeId} reached max executions, skipping`);
        return;
      }
      executionCount.set(nodeId, nodeExecCount + 1);
      totalExecutions++;

      const currentStorage = await getStorageData(roomId);
      const node = currentStorage.nodes.get(nodeId);
      if (!node) return;

      const executionMode = node.data.executionMode || "server";
      let nodeResult: { result?: unknown; error?: string } = {};

      if (executionMode === "client") {
        // Client-mode execution
        await updateNodeInStorage(roomId, nodeId, {
          isExecuting: true,
          error: undefined,
          pendingClientExecution: true,
          clientInput:
            input !== undefined ? JSON.parse(JSON.stringify(input)) : null,
        });

        const maxWaitTime = 60000;
        const pollInterval = 500;
        let waitedTime = 0;
        let clientCompleted = false;

        while (waitedTime < maxWaitTime) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          waitedTime += pollInterval;

          const updatedStorage = await getStorageData(roomId);
          const updatedNode = updatedStorage.nodes.get(nodeId);

          if (updatedNode && !updatedNode.data.pendingClientExecution) {
            clientCompleted = true;
            nodeResult = {
              result: updatedNode.data.lastResult,
              error: updatedNode.data.error,
            };
            break;
          }
        }

        if (!clientCompleted) {
          nodeResult = {
            error:
              "Client execution timeout - no browser connected or execution took too long",
          };
          await updateNodeInStorage(roomId, nodeId, {
            isExecuting: false,
            pendingClientExecution: false,
            error: nodeResult.error,
          });
        }
      } else {
        // Server-mode execution
        await updateNodeInStorage(roomId, nodeId, {
          isExecuting: true,
          error: undefined,
        });

        await new Promise((resolve) => setTimeout(resolve, 300));

        try {
          const result = await executeNodeCode(node.data.code, input);
          const serializedResult =
            result !== undefined
              ? JSON.parse(JSON.stringify(result))
              : undefined;
          nodeResult = { result: serializedResult };
        } catch (e) {
          nodeResult = { error: e instanceof Error ? e.message : String(e) };
        }

        await updateNodeInStorage(roomId, nodeId, {
          isExecuting: false,
          lastResult: nodeResult.result,
          error: nodeResult.error,
        });
      }

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

      await updateExecutionRecord(roomId, executionId, {
        nodesExecuted: results.length,
        results: [...results],
      });

      const children = currentStorage.edges
        .filter((edge) => edge.source === nodeId)
        .map((edge) => edge.target);

      if (nodeResult.result !== undefined && nodeResult.result !== null) {
        for (const childId of children) {
          await executeNodeAndChildren(childId, nodeResult.result);
        }
      }
    }

    await executeNodeAndChildren(startNodeId, undefined);

    await updateExecutionRecord(roomId, executionId, {
      completedAt: new Date().toISOString(),
      status: hasError ? "error" : "success",
      nodesExecuted: results.length,
      results,
    });

    res.json({
      success: !hasError,
      executionId,
      nodesExecuted: results.length,
      results,
    });
  } catch (error) {
    console.error("Flow execution error:", error);
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// Room management endpoints
app.get("/api/rooms", async (req, res) => {
  try {
    const response = await fetch("https://api.liveblocks.io/v2/rooms", {
      headers: {
        Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

app.post("/api/rooms", async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    const response = await fetch(
      `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(roomId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          defaultAccesses: ["room:write"],
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `Failed to create room: ${response.statusText}`,
      );
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error creating room:", error);
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

app.patch("/api/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { metadata } = req.body;

    const response = await fetch(
      `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(roomId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update room: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error updating room:", error);
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

app.delete("/api/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    const response = await fetch(
      `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(roomId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete room: ${response.statusText}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
