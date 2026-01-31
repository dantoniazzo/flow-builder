import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIProvider } from "../types/ai";

interface ChatStore {
  // UI state (not persisted)
  isLoading: boolean;
  isPanelOpen: boolean;

  // Persisted settings
  provider: AIProvider;
  anthropicApiKey: string | null;
  openaiApiKey: string | null;

  // Actions
  setProvider: (provider: AIProvider) => void;
  setAnthropicApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  clearApiKey: (provider: AIProvider) => void;
  setLoading: (loading: boolean) => void;
  togglePanel: () => void;
  setPanel: (open: boolean) => void;
  getCurrentApiKey: () => string | null;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      isLoading: false,
      isPanelOpen: false,
      provider: "anthropic",
      anthropicApiKey: null,
      openaiApiKey: null,

      setProvider: (provider: AIProvider) => set({ provider }),

      setAnthropicApiKey: (key: string) => set({ anthropicApiKey: key }),

      setOpenaiApiKey: (key: string) => set({ openaiApiKey: key }),

      clearApiKey: (provider: AIProvider) =>
        set(
          provider === "anthropic"
            ? { anthropicApiKey: null }
            : { openaiApiKey: null }
        ),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

      setPanel: (open: boolean) => set({ isPanelOpen: open }),

      getCurrentApiKey: () => {
        const state = get();
        return state.provider === "anthropic"
          ? state.anthropicApiKey
          : state.openaiApiKey;
      },
    }),
    {
      name: "flow-builder-chat",
      partialize: (state) => ({
        provider: state.provider,
        anthropicApiKey: state.anthropicApiKey,
        openaiApiKey: state.openaiApiKey,
      }),
    }
  )
);
