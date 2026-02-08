"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, ToolCall } from "../types/ai";

interface ChatPanelProps {
  messages: ChatMessage[];
  onClose: () => void;
  onClearMessages: () => void;
}

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
  const getToolIcon = (name: string) => {
    switch (name) {
      case "create_node":
        return "+";
      case "update_node":
        return "~";
      case "delete_node":
        return "-";
      case "connect_nodes":
        return "→";
      case "get_current_workflow":
        return "?";
      default:
        return "•";
    }
  };

  const getToolLabel = (name: string) => {
    switch (name) {
      case "create_node":
        return "Created node";
      case "update_node":
        return "Updated node";
      case "delete_node":
        return "Deleted node";
      case "connect_nodes":
        return "Connected nodes";
      case "get_current_workflow":
        return "Checked workflow";
      default:
        return name;
    }
  };

  const labelValue = toolCall.input.label;
  const nodeIdValue = toolCall.input.nodeId;

  return (
    <div className="flex items-start gap-2 text-xs text-zinc-400 bg-zinc-800/50 rounded px-2 py-1">
      <span className="text-blue-400 font-mono">{getToolIcon(toolCall.name)}</span>
      <span>{getToolLabel(toolCall.name)}</span>
      {labelValue !== undefined && (
        <span className="text-zinc-500">&quot;{String(labelValue)}&quot;</span>
      )}
      {nodeIdValue !== undefined && (
        <span className="text-zinc-500 font-mono">{String(nodeIdValue)}</span>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-200 border border-zinc-700"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="flex flex-col gap-1 max-w-[85%]">
          {message.toolCalls.map((toolCall, index) => (
            <ToolCallDisplay key={index} toolCall={toolCall} />
          ))}
        </div>
      )}
      <span className="text-xs text-zinc-600">
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

export function ChatPanel({ messages, onClose, onClearMessages }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed bottom-20 right-4 z-[100] w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl flex flex-col max-h-[60vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 flex-shrink-0">
          <h3 className="text-sm font-medium text-white">Chat History</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onClearMessages}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Close"
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
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">No messages yet</p>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
