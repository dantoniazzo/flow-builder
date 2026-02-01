import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { LiveNodeData, NodeIconType } from "../liveblocks/liveblocks.config";
import { useFlowStore } from "../store/flowStore";
import { Button } from "./ui/button";
import { NodeIcon } from "./NodeIcon";

interface CodeNodeProps {
  id: string;
  data: LiveNodeData;
  selected?: boolean;
  isStartNode: boolean;
  onExecute: () => void;
  onIconChange?: (icon: NodeIconType) => void;
}

const handleClass =
  "!w-2.5 !h-2.5 !bg-zinc-500 !border-2 !border-zinc-900 hover:!bg-blue-500";

function CodeNodeComponent({
  id,
  data,
  selected,
  isStartNode,
  onExecute,
  onIconChange,
}: CodeNodeProps) {
  const { openEditor } = useFlowStore();

  const handleDoubleClick = () => {
    openEditor(id);
  };

  const handleExecuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExecute();
  };

  const handleIconChange = (icon: NodeIconType) => {
    onIconChange?.(icon);
  };

  // Determine border color based on status
  const getBorderClass = () => {
    if (data.isExecuting)
      return "border-orange-500 shadow-[0_0_10px_rgba(255,165,0,0.5)]";
    if (data.error) return "border-red-500";
    if (data.lastResult !== undefined) return "border-green-500";
    if (selected)
      return "border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)]";
    return "border-zinc-700 hover:border-zinc-500";
  };

  return (
    <div
      className={`bg-zinc-900 border-2 rounded-lg p-3 min-w-[180px] max-w-[250px] cursor-pointer transition-all ${getBorderClass()}`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Top handle */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={handleClass}
      />

      {/* Left handle */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={handleClass}
      />

      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleClass}
      />

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleClass}
      />

      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-white truncate flex-1 mr-2">
          {data.label}
        </span>
        <div className="flex items-center gap-1">
          {data.isExecuting && (
            <span className="w-3.5 h-3.5 border-2 border-transparent border-t-orange-500 rounded-full animate-spin" />
          )}
          <NodeIcon
            icon={data.icon || "code"}
            onChange={handleIconChange}
          />
        </div>
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
        <Button
          className="w-full mt-2"
          onClick={handleExecuteClick}
          disabled={data.isExecuting}
        >
          {data.isExecuting ? "Running..." : "Execute Flow"}
        </Button>
      )}
    </div>
  );
}

export const CodeNode = memo(CodeNodeComponent);
