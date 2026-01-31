import { useCallback, useMemo, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ConnectionMode,
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
import { useStorage, useMutation, type LiveNode, type LiveNodeData } from "../liveblocks/liveblocks.config";
import { executeFlow, isStartNode } from "../execution/executeFlow";
import type { CodeNode as CodeNodeType, FlowEdge } from "../types";

// Wrapper component that provides isStartNode and onExecute to CodeNode
function CodeNodeWrapper(props: {
  id: string;
  data: LiveNodeData & { __flowProps?: { edges: FlowEdge[]; onExecute: (id: string) => void } };
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

  // Get data from LiveBlocks storage
  const liveNodes = useStorage((root) => root.nodes);
  const liveEdges = useStorage((root) => root.edges);

  // Convert LiveBlocks data to ReactFlow format
  const [nodes, setNodes] = useState<CodeNodeType[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);

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
    []
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
    []
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
    ({ storage }, connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => {
      const edgesList = storage.get("edges");
      const id = `e${connection.source}-${connection.sourceHandle || ''}-${connection.target}-${connection.targetHandle || ''}`;
      edgesList.push({
        id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      });
    },
    []
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
    [updateNodePosition, deleteNode]
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
    [deleteEdge]
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
    [addEdgeMutation]
  );

  // Execute a flow starting from a specific node
  const handleExecuteFlow = useCallback(
    async (startNodeId: string) => {
      await executeFlow(startNodeId, nodes, edges, (nodeId, updates) => {
        updateNodeData(nodeId, updates);
      });
    },
    [nodes, edges, updateNodeData]
  );

  // Get selected node for editor
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
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
    [nodes, edges, handleExecuteFlow]
  );

  const handleSaveCode = useCallback(
    (code: string) => {
      if (selectedNodeId) {
        updateNodeData(selectedNodeId, { code });
      }
    },
    [selectedNodeId, updateNodeData]
  );

  return (
    <div className="w-screen h-screen relative">
      <Toolbar onAddNode={addNode} />
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
      >
        <Background gap={20} />
        <Controls />
      </ReactFlow>

      {isEditorOpen && selectedNode && (
        <CodeEditorModal
          nodeLabel={selectedNode.data.label}
          code={selectedNode.data.code}
          onSave={handleSaveCode}
        />
      )}
    </div>
  );
}
