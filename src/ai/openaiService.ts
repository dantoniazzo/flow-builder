import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { buildSystemPrompt } from "./systemPrompt";
import type { WorkflowContext, ToolCall } from "../types/ai";

export type ToolExecutor = (
  name: string,
  input: Record<string, unknown>,
) => Promise<unknown>;

export interface ChatResponse {
  content: string;
  toolCalls: ToolCall[];
}

// Convert our tools to OpenAI format
const OPENAI_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_node",
      description:
        "Create a new workflow node with JavaScript code. The code will be executed when the workflow runs. Use the 'input' variable to access data from the previous node, and 'return' to pass data to connected nodes.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "update_node",
      description: "Update an existing node's code, label, or execution mode",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "connect_nodes",
      description:
        "Connect two nodes with an edge. Data flows from source to target when the workflow executes.",
      parameters: {
        type: "object",
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
  },
  {
    type: "function",
    function: {
      name: "delete_node",
      description:
        "Delete a node and all its connections from the workflow canvas",
      parameters: {
        type: "object",
        properties: {
          nodeId: {
            type: "string",
            description: "The ID of the node to delete",
          },
        },
        required: ["nodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_current_workflow",
      description:
        "Get the current state of all nodes and edges in the workflow. Use this to understand the current workflow structure before making changes.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export class OpenAIService {
  private client: OpenAI;
  private conversationHistory: ChatCompletionMessageParam[] = [];

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async chat(
    userMessage: string,
    workflowContext: WorkflowContext,
    toolExecutor: ToolExecutor,
  ): Promise<ChatResponse> {
    const systemPrompt = buildSystemPrompt(workflowContext);
    const toolCalls: ToolCall[] = [];

    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Build messages with system prompt
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...this.conversationHistory,
    ];

    // Loop until we get a final response (no more tool calls)
    let continueLoop = true;
    while (continueLoop) {
      const response = await this.client.chat.completions.create({
        model: "gpt-4.1",
        max_tokens: 4096,
        messages,
        tools: OPENAI_TOOLS,
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // Check if there are tool calls
      if (
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        // Add assistant message with tool calls to history
        this.conversationHistory.push(assistantMessage);
        messages.push(assistantMessage);

        // Execute each tool and collect results
        for (const toolCall of assistantMessage.tool_calls) {
          // Handle both function and custom tool call types
          if (toolCall.type !== "function") continue;

          const functionName = toolCall.function.name;
          const input = JSON.parse(toolCall.function.arguments) as Record<
            string,
            unknown
          >;

          let result: unknown;
          let isError = false;

          try {
            result = await toolExecutor(functionName, input);
          } catch (error) {
            result =
              error instanceof Error ? error.message : "Unknown error occurred";
            isError = true;
          }

          toolCalls.push({
            name: functionName,
            input,
            result,
          });

          // Add tool result to messages
          const toolResultMessage: ChatCompletionMessageParam = {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(isError ? { error: result } : result),
          };
          this.conversationHistory.push(toolResultMessage);
          messages.push(toolResultMessage);
        }
      } else {
        // No tool calls, we have the final response
        continueLoop = false;

        const content = assistantMessage.content || "";

        // Add final assistant message to history
        this.conversationHistory.push({
          role: "assistant",
          content,
        });

        return {
          content,
          toolCalls,
        };
      }

      // Check finish reason
      if (choice.finish_reason === "stop") {
        continueLoop = false;

        const content = assistantMessage.content || "";

        return {
          content,
          toolCalls,
        };
      }
    }

    // This shouldn't happen, but return empty response if loop exits unexpectedly
    return {
      content: "",
      toolCalls,
    };
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}
