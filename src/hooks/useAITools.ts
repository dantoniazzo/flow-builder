import { useCallback } from "react";
import {
  useStorage,
  useMutation,
  type LiveNode,
  type LiveNodeData,
  type LiveEdge,
} from "../liveblocks/liveblocks.config";
import type {
  WorkflowContext,
  CreateNodeInput,
  UpdateNodeInput,
  ConnectNodesInput,
  DeleteNodeInput,
} from "../types/ai";

export function useAITools() {
  // Get current workflow state
  const liveNodes = useStorage((root) => root.nodes);
  const liveEdges = useStorage((root) => root.edges);

  // Create a new node
  const addNodeMutation = useMutation(
    (
      { storage },
      { label, code, executionMode, position }: CreateNodeInput
    ): { nodeId: string; success: boolean } => {
      const nodesMap = storage.get("nodes");
      const id = `n${Date.now()}`;

      // Calculate position if not provided
      let nodePosition = position;
      if (!nodePosition) {
        // Find the lowest node and place new one below it
        let maxY = 100;
        nodesMap.forEach((node: LiveNode) => {
          if (node.position.y > maxY) {
            maxY = node.position.y;
          }
        });
        nodePosition = { x: 200, y: maxY + 150 };
      }

      nodesMap.set(id, {
        id,
        position: nodePosition,
        data: {
          label,
          code,
          executionMode: executionMode || "server",
        },
        type: "code",
      });

      return { nodeId: id, success: true };
    },
    []
  );

  // Update an existing node
  const updateNodeMutation = useMutation(
    (
      { storage },
      { nodeId, label, code, executionMode }: UpdateNodeInput
    ): { success: boolean; error?: string } => {
      const nodesMap = storage.get("nodes");
      const node = nodesMap.get(nodeId);

      if (!node) {
        return { success: false, error: `Node ${nodeId} not found` };
      }

      const updates: Partial<LiveNodeData> = {};
      if (label !== undefined) updates.label = label;
      if (code !== undefined) updates.code = code;
      if (executionMode !== undefined) updates.executionMode = executionMode;

      nodesMap.set(nodeId, {
        ...node,
        data: { ...node.data, ...updates },
      });

      return { success: true };
    },
    []
  );

  // Connect two nodes
  const connectNodesMutation = useMutation(
    (
      { storage },
      { sourceId, targetId, sourceHandle, targetHandle }: ConnectNodesInput
    ): { success: boolean; edgeId?: string; error?: string } => {
      const nodesMap = storage.get("nodes");
      const edgesList = storage.get("edges");

      // Verify both nodes exist
      if (!nodesMap.get(sourceId)) {
        return { success: false, error: `Source node ${sourceId} not found` };
      }
      if (!nodesMap.get(targetId)) {
        return { success: false, error: `Target node ${targetId} not found` };
      }

      // Check if edge already exists
      const existingEdge = Array.from(edgesList).find(
        (e: LiveEdge) => e.source === sourceId && e.target === targetId
      );
      if (existingEdge) {
        return {
          success: true,
          edgeId: existingEdge.id,
          error: "Edge already exists",
        };
      }

      const sHandle = sourceHandle || "bottom";
      const tHandle = targetHandle || "top";
      const edgeId = `e${sourceId}-${sHandle}-${targetId}-${tHandle}`;

      edgesList.push({
        id: edgeId,
        source: sourceId,
        target: targetId,
        sourceHandle: sHandle,
        targetHandle: tHandle,
      });

      return { success: true, edgeId };
    },
    []
  );

  // Delete a node
  const deleteNodeMutation = useMutation(
    (
      { storage },
      { nodeId }: DeleteNodeInput
    ): { success: boolean; error?: string } => {
      const nodesMap = storage.get("nodes");
      const edgesList = storage.get("edges");

      if (!nodesMap.get(nodeId)) {
        return { success: false, error: `Node ${nodeId} not found` };
      }

      // Remove the node
      nodesMap.delete(nodeId);

      // Remove connected edges
      const edgesArray = Array.from(edgesList);
      for (let i = edgesArray.length - 1; i >= 0; i--) {
        if (
          edgesArray[i].source === nodeId ||
          edgesArray[i].target === nodeId
        ) {
          edgesList.delete(i);
        }
      }

      return { success: true };
    },
    []
  );

  // Get current workflow context
  const getWorkflowContext = useCallback((): WorkflowContext => {
    const nodes: WorkflowContext["nodes"] = [];
    const edges: WorkflowContext["edges"] = [];

    if (liveNodes) {
      liveNodes.forEach((node: LiveNode) => {
        nodes.push({
          id: node.id,
          label: node.data.label,
          code: node.data.code,
          executionMode: node.data.executionMode,
          position: node.position,
        });
      });
    }

    if (liveEdges) {
      Array.from(liveEdges).forEach((edge: LiveEdge) => {
        edges.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
        });
      });
    }

    return { nodes, edges };
  }, [liveNodes, liveEdges]);

  // Execute a tool by name
  const executeTool = useCallback(
    async (
      name: string,
      input: Record<string, unknown>
    ): Promise<unknown> => {
      switch (name) {
        case "create_node":
          return addNodeMutation(input as unknown as CreateNodeInput);

        case "update_node":
          return updateNodeMutation(input as unknown as UpdateNodeInput);

        case "connect_nodes":
          return connectNodesMutation(input as unknown as ConnectNodesInput);

        case "delete_node":
          return deleteNodeMutation(input as unknown as DeleteNodeInput);

        case "get_current_workflow":
          return getWorkflowContext();

        default:
          return { error: `Unknown tool: ${name}` };
      }
    },
    [
      addNodeMutation,
      updateNodeMutation,
      connectNodesMutation,
      deleteNodeMutation,
      getWorkflowContext,
    ]
  );

  return {
    executeTool,
    getWorkflowContext,
  };
}
