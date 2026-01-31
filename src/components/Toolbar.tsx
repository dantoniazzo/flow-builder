interface ToolbarProps {
  onAddNode: () => void;
  isPanMode: boolean;
  onTogglePanMode: () => void;
  isMobile: boolean;
}

export function Toolbar({ onAddNode, isPanMode, onTogglePanMode, isMobile }: ToolbarProps) {
  return (
    <div className="absolute bottom-18 left-1/2 -translate-x-1/2 z-[100] flex gap-2">
      <button
        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm cursor-pointer transition-colors hover:bg-zinc-700"
        onClick={onAddNode}
      >
        + Add Node
      </button>
      {!isMobile && (
        <button
          className={`px-3 py-2 border rounded-md text-sm cursor-pointer transition-colors ${
            isPanMode
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
          }`}
          onClick={onTogglePanMode}
          title="Hand tool (or hold Space)"
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
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
