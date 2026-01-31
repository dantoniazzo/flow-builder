import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const { isEditorOpen, closeEditor } = useFlowStore();
  const [localCode, setLocalCode] = useState(code);

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleSave = () => {
    onSave(localCode);
    closeEditor();
  };

  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col gap-0 p-0 bg-zinc-900 border-zinc-700">
        <DialogHeader className="px-6 py-4 border-b border-zinc-700">
          <DialogTitle className="text-white">Edit: {nodeLabel}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Write JavaScript code. Use{" "}
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-xs">
              input
            </code>{" "}
            to access data from the previous node. Use{" "}
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-xs">
              return
            </code>{" "}
            to pass data to the next node.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
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

        <DialogFooter className="px-6 py-4 border-t border-zinc-700">
          <Button variant="outline" onClick={closeEditor}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
