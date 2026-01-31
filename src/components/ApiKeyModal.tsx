import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useChatStore } from "../store/chatStore";
import type { AIProvider } from "../types/ai";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const {
    provider,
    anthropicApiKey,
    openaiApiKey,
    setProvider,
    setAnthropicApiKey,
    setOpenaiApiKey,
    clearApiKey,
  } = useChatStore();

  // Local state for the modal - selectedProvider tracks which tab is active
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>(provider);
  const [showKey, setShowKey] = useState(false);

  // Derive the current key and input value from store based on selected provider
  const currentStoredKey =
    selectedProvider === "anthropic" ? anthropicApiKey : openaiApiKey;

  // Local input state - initialized from store when provider changes
  const [inputKey, setInputKey] = useState(currentStoredKey || "");

  // Handle provider tab change
  const handleProviderChange = (newProvider: AIProvider) => {
    setSelectedProvider(newProvider);
    // Update input to show the stored key for the new provider
    const storedKey =
      newProvider === "anthropic" ? anthropicApiKey : openaiApiKey;
    setInputKey(storedKey || "");
  };

  const handleSave = () => {
    if (inputKey.trim()) {
      if (selectedProvider === "anthropic") {
        setAnthropicApiKey(inputKey.trim());
      } else {
        setOpenaiApiKey(inputKey.trim());
      }
      setProvider(selectedProvider);
      onOpenChange(false);
    }
  };

  const handleClear = () => {
    clearApiKey(selectedProvider);
    setInputKey("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSave();
    }
  };

  // Reset local state when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // Reset to current provider from store when opening
      setSelectedProvider(provider);
      const storedKey =
        provider === "anthropic" ? anthropicApiKey : openaiApiKey;
      setInputKey(storedKey || "");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Settings</DialogTitle>
          <DialogDescription>
            Choose your AI provider and enter your API key. Keys are stored
            locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Provider Selection */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleProviderChange("anthropic")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedProvider === "anthropic"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              Anthropic
            </button>
            <button
              type="button"
              onClick={() => handleProviderChange("openai")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedProvider === "openai"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              OpenAI
            </button>
          </div>

          {/* API Key Input */}
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedProvider === "anthropic" ? "sk-ant-..." : "sk-..."
              }
              className="w-full px-3 py-2 pr-10 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
            >
              {showKey ? (
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
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
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
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Get your API key from{" "}
            {selectedProvider === "anthropic" ? (
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                console.anthropic.com
              </a>
            ) : (
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                platform.openai.com
              </a>
            )}
          </p>

          {/* Model info */}
          <p className="text-xs text-zinc-500">
            Model:{" "}
            <span className="text-zinc-400">
              {selectedProvider === "anthropic" ? "Claude Sonnet 4" : "GPT-4.1"}
            </span>
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentStoredKey && (
            <Button variant="destructive" onClick={handleClear}>
              Remove Key
            </Button>
          )}
          <Button onClick={handleSave} disabled={!inputKey.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
