import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useFlowStore } from "../store/flowStore";

interface CodeEditorModalProps {
  nodeLabel: string;
  code: string;
  onSave: (code: string) => void;
}

export function CodeEditorModal({
  nodeLabel,
  code,
  onSave,
}: CodeEditorModalProps) {
  const { closeEditor } = useFlowStore();
  const [localCode, setLocalCode] = useState(code);

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleSave = () => {
    onSave(localCode);
    closeEditor();
  };

  const handleCancel = () => {
    closeEditor();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeEditor();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]"
      onClick={handleBackdropClick}
    >
      <div className="bg-zinc-900 rounded-xl w-[90%] max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <h2 className="m-0 text-lg font-semibold text-white">
            Edit: {nodeLabel}
          </h2>
          <button
            className="bg-transparent border-none text-zinc-400 text-2xl cursor-pointer p-0 leading-none hover:text-white"
            onClick={handleCancel}
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-5 py-3 bg-zinc-800 text-sm text-zinc-400">
            Write JavaScript code. Use{" "}
            <code className="bg-zinc-700 px-1.5 py-0.5 rounded font-mono">
              input
            </code>{" "}
            to access data from the previous node. Use{" "}
            <code className="bg-zinc-700 px-1.5 py-0.5 rounded font-mono">
              return
            </code>{" "}
            to pass data to the next node.
          </div>
          <Editor
            height="400px"
            defaultLanguage="javascript"
            value={localCode}
            onChange={(value) => setLocalCode(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
            }}
          />
        </div>

        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-zinc-700">
          <button
            className="px-5 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors bg-transparent border border-zinc-500 text-white hover:bg-zinc-800"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors bg-blue-600 border-none text-white hover:bg-blue-700"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
