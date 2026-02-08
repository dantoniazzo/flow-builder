"use client";

import { useCallback, useMemo, useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ConnectionMode,
  SelectionMode,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CodeNode } from "./CodeNode";
import { CodeEditorModal } from "./CodeEditorModal";
import { Toolbar } from "./Toolbar";
import { ChatInput } from "./ChatInput";
import { ChatPanel } from "./ChatPanel";
import { ApiKeyModal } from "./ApiKeyModal";
import { useFlowStore } from "../store/flowStore";
import { useChatStore } from "../store/chatStore";
import {
  useStorage,
  useMutation,
  useRoom,
  type LiveNode,
  type LiveNodeData,
  type LiveChatMessage,
  type ExecutionMode,
  type JsonObject,
} from "../liveblocks/liveblocks.config";
import { isStartNode, executeNode } from "../execution/executeFlow";
import { useIsMobile } from "../shared/lib/useIsMobile";
import { useAITools } from "../hooks/useAITools";
import { AIService } from "../ai/aiService";
import { OpenAIService } from "../ai/openaiService";
import type { CodeNode as CodeNodeType, FlowEdge } from "../types";
import type { ChatMessage } from "../types/ai";

// Wrapper component that provides isStartNode and onExecute to CodeNode
function CodeNodeWrapper(props: {
  id: string;
  data: LiveNodeData & {
    __flowProps?: {
      edges: FlowEdge[];
      onExecute: (id: string) => void;
      onExecutionModeChange: (id: string, mode: ExecutionMode) => void;
    };
  };
  selected?: boolean;
}) {
  const { edges, onExecute, onExecutionModeChange } =
    props.data.__flowProps || {};
  const startNode = edges ? isStartNode(props.id, edges) : false;

  return (
    <CodeNode
      id={props.id}
      data={props.data}
      selected={props.selected}
      isStartNode={startNode}
      onExecute={() => onExecute?.(props.id)}
      onExecutionModeChange={(mode) => onExecutionModeChange?.(props.id, mode)}
    />
  );
}

const nodeTypes: NodeTypes = {
  code: CodeNodeWrapper,
};

export function Flow() {
  const { isEditorOpen, selectedNodeId } = useFlowStore();
  const {
    isPanelOpen,
    provider,
    anthropicApiKey,
    openaiApiKey,
    setLoading,
    setPanel,
    togglePanel,
  } = useChatStore();
  const isMobile = useIsMobile();
  const room = useRoom();

  // Get chat messages from LiveBlocks
  const liveChatMessages = useStorage((root) => root.chatMessages);
  const messages: ChatMessage[] = liveChatMessages
    ? (Array.from(liveChatMessages) as ChatMessage[])
    : [];

  // Add chat message mutation
  const addChatMessage = useMutation(
    ({ storage }, message: LiveChatMessage) => {
      const chatMessages = storage.get("chatMessages");
      chatMessages.push(message);
    },
    [],
  );

  // Clear chat messages mutation
  const clearChatMessages = useMutation(({ storage }) => {
    const chatMessages = storage.get("chatMessages");
    while (chatMessages.length > 0) {
      chatMessages.delete(0);
    }
  }, []);

  // AI Tools hook
  const { executeTool, getWorkflowContext } = useAITools();

  // AI Service instances (persisted across renders when keys change)
  const anthropicServiceRef = useRef<AIService | null>(null);
  const openaiServiceRef = useRef<OpenAIService | null>(null);

  useEffect(() => {
    if (anthropicApiKey) {
      anthropicServiceRef.current = new AIService(anthropicApiKey);
    } else {
      anthropicServiceRef.current = null;
    }
  }, [anthropicApiKey]);

  useEffect(() => {
    if (openaiApiKey) {
      openaiServiceRef.current = new OpenAIService(openaiApiKey);
    } else {
      openaiServiceRef.current = null;
    }
  }, [openaiApiKey]);

  // API Key modal state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Pan mode state (hand tool) - always true on mobile
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Hide LiveBlocks badge using MutationObserver to catch it when it's added
  useEffect(() => {
    const hideBadge = () => {
      const badge = document.getElementById("liveblocks-badge");
      if (badge) {
        badge.style.display = "none";
        return true;
      }
      return false;
    };

    // Try immediately in case it already exists
    if (hideBadge()) return;

    // Watch for it being added to the DOM
    const observer = new MutationObserver(() => {
      if (hideBadge()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  // Get data from LiveBlocks storage
  const liveNodes = useStorage((root) => root.nodes);
  const liveEdges = useStorage((root) => root.edges);

  // Convert LiveBlocks data to ReactFlow format
  const [nodes, setNodes] = useState<CodeNodeType[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);

  // Handle space key for temporary pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !isEditorOpen) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isEditorOpen]);

  // Combined pan mode (either hand tool, space key, or mobile)
  const activePanMode = isMobile || isPanMode || isSpacePressed;

  // Sync LiveBlocks storage to local state
  // Note: This pattern is intentional for syncing from external LiveBlocks storage
  useEffect(() => {
    if (liveNodes) {
      const nodeArray: CodeNodeType[] = [];
      liveNodes.forEach((n: LiveNode) => {
        nodeArray.push({
          id: n.id,
          position: n.position,
          data: n.data,
          type: "code",
        } as CodeNodeType);
      });
      setNodes(nodeArray);
    }
  }, [liveNodes]);

  useEffect(() => {
    if (liveEdges) {
      setEdges(Array.from(liveEdges) as FlowEdge[]);
    }
  }, [liveEdges]);

  // LiveBlocks mutations
  const updateNodePosition = useMutation(
    ({ storage }, nodeId: string, position: { x: number; y: number }) => {
      const nodesMap = storage.get("nodes");
      const node = nodesMap.get(nodeId);
      if (node) {
        nodesMap.set(nodeId, { ...node, position });
      }
    },
    [],
  );

  const updateNodeData = useMutation(
    ({ storage }, nodeId: string, data: Partial<LiveNodeData>) => {
      const nodesMap = storage.get("nodes");
      const node = nodesMap.get(nodeId);
      if (node) {
        nodesMap.set(nodeId, {
          ...node,
          data: { ...node.data, ...data },
        });
      }
    },
    [],
  );

  const deleteNode = useMutation(({ storage }, nodeId: string) => {
    const nodesMap = storage.get("nodes");
    const edgesList = storage.get("edges");

    // Remove the node
    nodesMap.delete(nodeId);

    // Remove connected edges
    const edgesArray = Array.from(edgesList);
    for (let i = edgesArray.length - 1; i >= 0; i--) {
      if (edgesArray[i].source === nodeId || edgesArray[i].target === nodeId) {
        edgesList.delete(i);
      }
    }
  }, []);

  const addNode = useMutation(({ storage }) => {
    const nodesMap = storage.get("nodes");
    const id = `n${Date.now()}`;
    nodesMap.set(id, {
      id,
      position: { x: 200, y: 200 },
      data: {
        label: "New Node",
        code: "// Write your code here\nreturn input;",
      },
      type: "code",
    });
  }, []);

  const addEdgeMutation = useMutation(
    (
      { storage },
      connection: {
        source: string;
        target: string;
        sourceHandle?: string | null;
        targetHandle?: string | null;
      },
    ) => {
      const edgesList = storage.get("edges");
      const id = `e${connection.source}-${connection.sourceHandle || ""}-${connection.target}-${connection.targetHandle || ""}`;
      edgesList.push({
        id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      });
    },
    [],
  );

  const deleteEdge = useMutation(({ storage }, edgeId: string) => {
    const edgesList = storage.get("edges");
    const edgesArray = Array.from(edgesList);
    const index = edgesArray.findIndex((e) => e.id === edgeId);
    if (index !== -1) {
      edgesList.delete(index);
    }
  }, []);

  // Handle node changes (position, selection, deletion)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateNodePosition(change.id, change.position);
        } else if (change.type === "remove") {
          deleteNode(change.id);
        }
      }
      // Apply changes locally for smooth dragging
      setNodes((nds) => applyNodeChanges(changes, nds) as CodeNodeType[]);
    },
    [updateNodePosition, deleteNode],
  );

  // Handle edge changes (deletion)
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === "remove") {
          deleteEdge(change.id);
        }
      }
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [deleteEdge],
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdgeMutation({
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        });
      }
    },
    [addEdgeMutation],
  );

  // Execution history mutations
  const addExecutionRecord = useMutation(
    (
      { storage },
      record: {
        id: string;
        startNodeId: string;
        startNodeLabel: string;
        startedAt: string;
        status: "running" | "success" | "error";
        nodesExecuted: number;
        results: Array<{
          nodeId: string;
          nodeLabel: string;
          result?: unknown;
          error?: string;
        }>;
      },
    ) => {
      const history = storage.get("executionHistory");
      history.insert(
        {
          ...record,
          results: record.results.map((r) => ({
            ...r,
            result:
              r.result !== undefined
                ? JSON.parse(JSON.stringify(r.result))
                : undefined,
          })),
        },
        0,
      );
    },
    [],
  );

  const updateExecutionRecord = useMutation(
    (
      { storage },
      id: string,
      updates: {
        completedAt?: string;
        status?: "running" | "success" | "error";
        nodesExecuted?: number;
        results?: Array<{
          nodeId: string;
          nodeLabel: string;
          result?: unknown;
          error?: string;
        }>;
      },
    ) => {
      const history = storage.get("executionHistory");
      const historyArray = Array.from(history);
      const index = historyArray.findIndex((e) => e.id === id);
      if (index !== -1) {
        const existing = historyArray[index];
        history.set(index, {
          ...existing,
          ...updates,
          results: updates.results
            ? updates.results.map((r) => ({
                ...r,
                result:
                  r.result !== undefined
                    ? JSON.parse(JSON.stringify(r.result))
                    : undefined,
              }))
            : existing.results,
        });
      }
    },
    [],
  );

  // Execute a flow starting from a specific node
  // Uses server-side code execution but client-side Liveblocks updates for real-time UI
  const handleExecuteFlow = useCallback(
    async (startNodeId: string) => {
      const startNode = nodes.find((n) => n.id === startNodeId);
      const executionId = `exec-${Date.now()}`;
      const results: Array<{
        nodeId: string;
        nodeLabel: string;
        result?: unknown;
        error?: string;
      }> = [];
      let hasError = false;

      // Create execution record
      addExecutionRecord({
        id: executionId,
        startNodeId,
        startNodeLabel: startNode?.data.label || startNodeId,
        startedAt: new Date().toISOString(),
        status: "running",
        nodesExecuted: 0,
        results: [],
      });

      const visited = new Set<string>();

      // Execute a single node and its children
      async function executeNodeAndChildren(
        nodeId: string,
        input: unknown,
      ): Promise<void> {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const executionMode = node.data.executionMode || "server";

        // Mark node as executing (shows orange border)
        updateNodeData(nodeId, { isExecuting: true, error: undefined });

        // Small delay for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 300));

        let nodeResult: {
          result?: JsonObject | string | number | boolean | null;
          error?: string;
        } = {};
        let children: string[] = [];

        try {
          if (executionMode === "server") {
            // Execute on server via API
            const response = await fetch("/api/execute", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                roomId: room.id,
                nodeId,
                input,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "Execution failed");
            }

            nodeResult = data.nodeResult;
            children = data.children;
          } else {
            // Execute in browser (client-side)
            try {
              const result = await executeNode(node.data.code, input);
              const serializedResult =
                result !== undefined
                  ? JSON.parse(JSON.stringify(result))
                  : undefined;
              nodeResult = { result: serializedResult };
            } catch (e) {
              nodeResult = {
                error: e instanceof Error ? e.message : String(e),
              };
            }

            // Get children from edges
            children = edges
              .filter((edge) => edge.source === nodeId)
              .map((edge) => edge.target);
          }

          // Update node with result or error
          updateNodeData(nodeId, {
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
          updateExecutionRecord(executionId, {
            nodesExecuted: results.length,
            results: [...results],
          });

          // Execute children nodes sequentially
          for (const childId of children) {
            await executeNodeAndChildren(childId, nodeResult.result);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          updateNodeData(nodeId, {
            isExecuting: false,
            error: errorMessage,
          });
          results.push({
            nodeId,
            nodeLabel: node.data.label,
            error: errorMessage,
          });
          hasError = true;
        }
      }

      // Start execution
      await executeNodeAndChildren(startNodeId, undefined);

      // Update final execution record
      updateExecutionRecord(executionId, {
        completedAt: new Date().toISOString(),
        status: hasError ? "error" : "success",
        nodesExecuted: results.length,
        results,
      });
    },
    [nodes, room.id, updateNodeData, addExecutionRecord, updateExecutionRecord],
  );

  // Get selected node for editor
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  // Handle execution mode change for a node
  const handleExecutionModeChange = useCallback(
    (nodeId: string, executionMode: ExecutionMode) => {
      updateNodeData(nodeId, { executionMode });
    },
    [updateNodeData],
  );

  // Inject flow props into node data for the wrapper
  const nodesWithFlowProps = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          __flowProps: {
            edges,
            onExecute: handleExecuteFlow,
            onExecutionModeChange: handleExecutionModeChange,
          },
        },
      })),
    [nodes, edges, handleExecuteFlow, handleExecutionModeChange],
  );
  console.log("Nodes: ", nodesWithFlowProps);
  const handleSaveCode = useCallback(
    (code: string) => {
      if (selectedNodeId) {
        updateNodeData(selectedNodeId, { code });
      }
    },
    [selectedNodeId, updateNodeData],
  );

  const handleRenameNode = useCallback(
    (label: string) => {
      if (selectedNodeId) {
        updateNodeData(selectedNodeId, { label });
      }
    },
    [selectedNodeId, updateNodeData],
  );

  // Handle chat message submission
  const handleChatSend = useCallback(
    async (message: string) => {
      const currentApiKey =
        provider === "anthropic" ? anthropicApiKey : openaiApiKey;

      if (!currentApiKey) {
        setShowApiKeyModal(true);
        return;
      }

      // Get the appropriate service
      let service: AIService | OpenAIService | null = null;
      if (provider === "anthropic") {
        if (!anthropicServiceRef.current) {
          anthropicServiceRef.current = new AIService(currentApiKey);
        }
        service = anthropicServiceRef.current;
      } else {
        if (!openaiServiceRef.current) {
          openaiServiceRef.current = new OpenAIService(currentApiKey);
        }
        service = openaiServiceRef.current;
      }

      // Add user message to LiveBlocks
      const userMessage: LiveChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      addChatMessage(userMessage);
      setLoading(true);

      try {
        const workflowContext = getWorkflowContext();
        const response = await service.chat(
          message,
          workflowContext,
          executeTool,
        );

        // Add assistant message to LiveBlocks
        // Convert toolCalls to JSON-serializable format for LiveBlocks
        const toolCalls = response.toolCalls.map((tc) => ({
          name: tc.name,
          input: JSON.parse(JSON.stringify(tc.input)),
          result:
            tc.result !== undefined
              ? JSON.parse(JSON.stringify(tc.result))
              : undefined,
        }));

        const assistantMessage: LiveChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: response.content,
          timestamp: new Date().toISOString(),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };
        addChatMessage(assistantMessage);

        // If there were tool calls, open the panel to show them
        if (response.toolCalls.length > 0) {
          setPanel(true);
        }
      } catch (error) {
        // Add error message to LiveBlocks
        const errorMessage: LiveChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Something went wrong"}`,
          timestamp: new Date().toISOString(),
        };
        addChatMessage(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [
      provider,
      anthropicApiKey,
      openaiApiKey,
      addChatMessage,
      setLoading,
      getWorkflowContext,
      executeTool,
      setPanel,
    ],
  );

  return (
    <div
      className={`w-screen h-screen relative ${activePanMode ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <Toolbar
        onAddNode={addNode}
        isPanMode={isPanMode}
        onTogglePanMode={() => setIsPanMode(!isPanMode)}
        isMobile={isMobile}
      />
      <ReactFlow
        nodes={nodesWithFlowProps}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        snapToGrid
        snapGrid={[20, 20]}
        connectionMode={ConnectionMode.Loose}
        // Touchpad: two-finger pan, pinch to zoom
        panOnScroll={true}
        zoomOnScroll={false}
        zoomOnPinch={true}
        // Mouse: drag to select (unless in pan mode)
        panOnDrag={activePanMode}
        selectionOnDrag={!activePanMode}
        selectionMode={SelectionMode.Partial}
        // Selection box styling
        selectionKeyCode={null}
      >
        <Background gap={20} />
        <Controls />
      </ReactFlow>

      {isEditorOpen && selectedNode && (
        <CodeEditorModal
          nodeLabel={selectedNode.data.label}
          code={selectedNode.data.code}
          onSave={handleSaveCode}
          onRename={handleRenameNode}
        />
      )}

      {/* AI Chat Components */}
      <ChatInput onSend={handleChatSend} />

      {isPanelOpen && (
        <ChatPanel
          messages={messages}
          onClose={() => setPanel(false)}
          onClearMessages={clearChatMessages}
        />
      )}

      <ApiKeyModal open={showApiKeyModal} onOpenChange={setShowApiKeyModal} />

      {/* Chat history button - bottom right with animated border */}
      <div
        className={`chat-button-animated z-[100] cursor-pointer ${
          isPanelOpen ? "active" : ""
        }`}
        onClick={togglePanel}
        title="Chat history"
      >
        <div className="chat-button-animated-inner text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        {messages.length > 0 && !isPanelOpen && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center z-10">
            {messages.length > 99 ? "99+" : messages.length}
          </span>
        )}
      </div>

      {/* Settings button for API key - top right */}
      <button
        onClick={() => setShowApiKeyModal(true)}
        className="absolute top-4 right-4 z-[100] p-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        title="AI Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}
