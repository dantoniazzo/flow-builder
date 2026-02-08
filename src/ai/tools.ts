import type Anthropic from "@anthropic-ai/sdk";

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "create_node",
    description:
      "Create a new workflow node with JavaScript code. The code will be executed when the workflow runs. Use the 'input' variable to access data from the previous node, and 'return' to pass data to connected nodes.",
    input_schema: {
      type: "object" as const,
      properties: {
        label: {
          type: "string",
          description: "Display name for the node",
        },
        code: {
          type: "string",
          description:
            "JavaScript code to execute. Has access to 'input' (data from previous node) and should 'return' data for next node. Can use async/await and fetch().",
        },
        executionMode: {
          type: "string",
          enum: ["server", "client"],
          description:
            "Where the node's code should execute. Use 'server' for API calls, database operations, file processing, and sensitive operations. Use 'client' for DOM manipulation, browser APIs, OAuth popups, and UI interactions.",
        },
        position: {
          type: "object",
          description:
            "Optional position for the node. If not provided, will be auto-positioned.",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
          },
        },
      },
      required: ["label", "code"],
    },
  },
  {
    name: "update_node",
    description: "Update an existing node's code, label, or execution mode",
    input_schema: {
      type: "object" as const,
      properties: {
        nodeId: {
          type: "string",
          description: "The ID of the node to update",
        },
        label: {
          type: "string",
          description: "New display name for the node",
        },
        code: {
          type: "string",
          description: "New JavaScript code for the node",
        },
        executionMode: {
          type: "string",
          enum: ["server", "client"],
          description:
            "Where the node's code should execute. Use 'server' for API calls, database operations, file processing, and sensitive operations. Use 'client' for DOM manipulation, browser APIs, OAuth popups, and UI interactions.",
        },
      },
      required: ["nodeId"],
    },
  },
  {
    name: "connect_nodes",
    description:
      "Connect two nodes with an edge. Data flows from source to target when the workflow executes.",
    input_schema: {
      type: "object" as const,
      properties: {
        sourceId: {
          type: "string",
          description: "The ID of the source node",
        },
        targetId: {
          type: "string",
          description: "The ID of the target node",
        },
        sourceHandle: {
          type: "string",
          enum: ["top", "bottom", "left", "right"],
          description:
            "Which handle on the source node to connect from. Defaults to 'bottom'.",
        },
        targetHandle: {
          type: "string",
          enum: ["top", "bottom", "left", "right"],
          description:
            "Which handle on the target node to connect to. Defaults to 'top'.",
        },
      },
      required: ["sourceId", "targetId"],
    },
  },
  {
    name: "delete_node",
    description:
      "Delete a node and all its connections from the workflow canvas",
    input_schema: {
      type: "object" as const,
      properties: {
        nodeId: {
          type: "string",
          description: "The ID of the node to delete",
        },
      },
      required: ["nodeId"],
    },
  },
  {
    name: "get_current_workflow",
    description:
      "Get the current state of all nodes and edges in the workflow. Use this to understand the current workflow structure before making changes.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
];
