import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlock } from "@anthropic-ai/sdk/resources";
import { AI_TOOLS } from "./tools";
import { buildSystemPrompt } from "./systemPrompt";
import type { WorkflowContext, ToolCall } from "../types/ai";

export type ToolExecutor = (
  name: string,
  input: Record<string, unknown>
) => Promise<unknown>;

export interface ChatResponse {
  content: string;
  toolCalls: ToolCall[];
}

export class AIService {
  private client: Anthropic;
  private conversationHistory: MessageParam[] = [];

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async chat(
    userMessage: string,
    workflowContext: WorkflowContext,
    toolExecutor: ToolExecutor
  ): Promise<ChatResponse> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    const systemPrompt = buildSystemPrompt(workflowContext);
    const toolCalls: ToolCall[] = [];

    // Loop until we get a final response (no more tool calls)
    let continueLoop = true;
    while (continueLoop) {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: AI_TOOLS,
        messages: this.conversationHistory,
      });

      // Check if there are tool calls
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlocks.length > 0) {
        // Add assistant message with tool use to history
        this.conversationHistory.push({
          role: "assistant",
          content: response.content,
        });

        // Execute each tool and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          const input = toolUse.input as Record<string, unknown>;
          let result: unknown;
          let isError = false;

          try {
            result = await toolExecutor(toolUse.name, input);
          } catch (error) {
            result =
              error instanceof Error ? error.message : "Unknown error occurred";
            isError = true;
          }

          toolCalls.push({
            name: toolUse.name,
            input,
            result,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
            is_error: isError,
          });
        }

        // Add tool results to history
        this.conversationHistory.push({
          role: "user",
          content: toolResults,
        });
      } else {
        // No tool calls, we have the final response
        continueLoop = false;

        // Extract text content
        const textContent = this.extractTextContent(response.content);

        // Add final assistant message to history
        this.conversationHistory.push({
          role: "assistant",
          content: response.content,
        });

        return {
          content: textContent,
          toolCalls,
        };
      }

      // Check stop reason
      if (response.stop_reason === "end_turn") {
        continueLoop = false;

        // Extract text content
        const textContent = this.extractTextContent(response.content);

        // Add final assistant message to history if not already added
        if (
          this.conversationHistory[this.conversationHistory.length - 1].role !==
          "assistant"
        ) {
          this.conversationHistory.push({
            role: "assistant",
            content: response.content,
          });
        }

        return {
          content: textContent,
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

  private extractTextContent(content: ContentBlock[]): string {
    return content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}
