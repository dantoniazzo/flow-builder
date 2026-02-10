

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../store/chatStore";

interface ChatInputProps {
  onSend: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading } = useChatStore();

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent space from triggering pan mode when typing
    e.stopPropagation();
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <div className="chat-input-animated">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to build a workflow..."
            disabled={isLoading}
            className="w-full px-4 py-2 pr-12 rounded-md text-white text-sm placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              <div className="w-5 h-5 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`px-4 py-2 rounded-md text-white text-sm cursor-pointer transition-colors flex-shrink-0 ${
            input.trim() && !isLoading
              ? "send-button-animated"
              : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
          }`}
        >
          Send
        </button>
      </form>
    </div>
  );
}
