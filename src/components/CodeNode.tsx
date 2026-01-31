import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { LiveNodeData } from "../liveblocks/liveblocks.config";
import { useFlowStore } from "../store/flowStore";

interface CodeNodeProps {
  id: string;
  data: LiveNodeData;
  selected?: boolean;
  isStartNode: boolean;
  onExecute: () => void;
}

function CodeNodeComponent({
  id,
  data,
  selected,
  isStartNode,
  onExecute,
}: CodeNodeProps) {
  const { openEditor } = useFlowStore();

  const handleDoubleClick = () => {
    openEditor(id);
  };

  const handleExecuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExecute();
  };

  // Determine border color based on status
  const getBorderClass = () => {
    if (data.isExecuting) return "border-orange-500 shadow-[0_0_10px_rgba(255,165,0,0.5)]";
    if (data.error) return "border-red-500";
    if (data.lastResult !== undefined) return "border-green-500";
    if (selected) return "border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)]";
    return "border-zinc-700 hover:border-zinc-500";
  };

  return (
    <div
      className={`bg-zinc-900 border-2 rounded-lg p-3 min-w-[180px] max-w-[250px] cursor-pointer transition-all ${getBorderClass()}`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Target handles (inputs) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !bg-zinc-500 !border-2 !border-zinc-900 hover:!bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-zinc-500 !border-2 !border-zinc-900 hover:!bg-blue-500"
      />

      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-white">{data.label}</span>
        {data.isExecuting && (
          <span className="w-3.5 h-3.5 border-2 border-transparent border-t-orange-500 rounded-full animate-spin" />
        )}
      </div>

      <div className="font-mono text-[11px] text-zinc-400 bg-zinc-800 px-2 py-1.5 rounded whitespace-nowrap overflow-hidden text-ellipsis mb-2">
        {data.code.slice(0, 50)}
        {data.code.length > 50 ? "..." : ""}
      </div>

      {data.error && (
        <div className="text-[11px] text-red-500 bg-red-500/10 px-1.5 py-1 rounded mt-1">
          {data.error}
        </div>
      )}
      {!data.error && data.lastResult !== undefined && (
        <div className="font-mono text-[10px] text-green-500 bg-green-500/10 px-1.5 py-1 rounded overflow-hidden text-ellipsis max-h-[60px] whitespace-pre-wrap break-all">
          {JSON.stringify(data.lastResult, null, 2).slice(0, 100)}
        </div>
      )}

      {isStartNode && (
        <button
          className="w-full mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed border-none rounded text-white text-xs font-medium cursor-pointer transition-colors"
          onClick={handleExecuteClick}
          disabled={data.isExecuting}
        >
          {data.isExecuting ? "Running..." : "Execute Flow"}
        </button>
      )}

      {/* Source handles (outputs) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !bg-zinc-500 !border-2 !border-zinc-900 hover:!bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-zinc-500 !border-2 !border-zinc-900 hover:!bg-blue-500"
      />
    </div>
  );
}

export const CodeNode = memo(CodeNodeComponent);
