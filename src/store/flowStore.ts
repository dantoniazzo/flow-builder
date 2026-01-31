import { create } from "zustand";

interface FlowStore {
  // Modal state
  isEditorOpen: boolean;
  selectedNodeId: string | null;

  // Actions
  openEditor: (nodeId: string) => void;
  closeEditor: () => void;
}

export const useFlowStore = create<FlowStore>((set) => ({
  isEditorOpen: false,
  selectedNodeId: null,

  openEditor: (nodeId: string) =>
    set({
      isEditorOpen: true,
      selectedNodeId: nodeId,
    }),

  closeEditor: () =>
    set({
      isEditorOpen: false,
      selectedNodeId: null,
    }),
}));
