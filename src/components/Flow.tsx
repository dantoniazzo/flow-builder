import { useCallback, useMemo, useEffect, useState } from "react";
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
import { useFlowStore } from "../store/flowStore";
import {
  useStorage,
  useMutation,
  type LiveNode,
  type LiveNodeData,
} from "../liveblocks/liveblocks.config";
import { executeFlow, isStartNode } from "../execution/executeFlow";
import { useIsMobile } from "../shared/lib/useIsMobile";
import type { CodeNode as CodeNodeType, FlowEdge } from "../types";

// Wrapper component that provides isStartNode and onExecute to CodeNode
function CodeNodeWrapper(props: {
  id: string;
  data: LiveNodeData & {
    __flowProps?: { edges: FlowEdge[]; onExecute: (id: string) => void };
  };
  selected?: boolean;
}) {
  const { edges, onExecute } = props.data.__flowProps || {};
  const startNode = edges ? isStartNode(props.id, edges) : false;

  return (
    <CodeNode
      id={props.id}
      data={props.data}
      selected={props.selected}
      isStartNode={startNode}
      onExecute={() => onExecute?.(props.id)}
    />
  );
}

const nodeTypes: NodeTypes = {
  code: CodeNodeWrapper,
};

export function Flow() {
  const { isEditorOpen, selectedNodeId } = useFlowStore();
  const isMobile = useIsMobile();

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNodes(nodeArray);
    }
  }, [liveNodes]);

  useEffect(() => {
    if (liveEdges) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Execute a flow starting from a specific node
  const handleExecuteFlow = useCallback(
    async (startNodeId: string) => {
      const startNode = nodes.find((n) => n.id === startNodeId);
      const executionId = `exec-${Date.now()}`;

      // Create execution record in LiveBlocks
      addExecutionRecord({
        id: executionId,
        startNodeId,
        startNodeLabel: startNode?.data.label || startNodeId,
        startedAt: new Date().toISOString(),
        status: "running",
        nodesExecuted: 0,
        results: [],
      });

      const result = await executeFlow(
        startNodeId,
        nodes,
        edges,
        (nodeId, updates) => {
          updateNodeData(nodeId, updates);
        },
      );

      // Update execution record with results in LiveBlocks
      updateExecutionRecord(executionId, {
        completedAt: new Date().toISOString(),
        status: result.success ? "success" : "error",
        nodesExecuted: result.results.length,
        results: result.results,
      });
    },
    [nodes, edges, updateNodeData, addExecutionRecord, updateExecutionRecord],
  );

  // Get selected node for editor
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId],
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
          },
        },
      })),
    [nodes, edges, handleExecuteFlow],
  );

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
    </div>
  );
}
