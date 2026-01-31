interface ToolbarProps {
  onAddNode: () => void;
}

export function Toolbar({ onAddNode }: ToolbarProps) {
  return (
    <div className="absolute top-2.5 left-2.5 z-[100] flex gap-2">
      <button
        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm cursor-pointer transition-colors hover:bg-zinc-700"
        onClick={onAddNode}
      >
        + Add Node
      </button>
    </div>
  );
}
