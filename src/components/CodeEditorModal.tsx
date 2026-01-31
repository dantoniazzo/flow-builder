import { useState, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
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
import { useIsMobile } from "../shared/lib/useIsMobile";

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
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add custom paste action that uses Clipboard API
    editor.addAction({
      id: "custom-paste",
      label: "Paste",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
      contextMenuGroupId: "9_cutcopypaste",
      contextMenuOrder: 3,
      run: async (ed) => {
        try {
          const text = await navigator.clipboard.readText();
          const selection = ed.getSelection();
          if (selection) {
            ed.executeEdits("paste", [
              {
                range: selection,
                text: text,
                forceMoveMarkers: true,
              },
            ]);
          }
        } catch (err) {
          console.error("Failed to paste:", err);
        }
      },
    });
  };

  const handlePaste = async () => {
    if (!editorRef.current) return;
    try {
      const text = await navigator.clipboard.readText();
      const editor = editorRef.current;
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits("paste", [
          {
            range: selection,
            text: text,
            forceMoveMarkers: true,
          },
        ]);
        editor.focus();
      }
    } catch (err) {
      console.error("Failed to paste:", err);
    }
  };

  const handleSave = () => {
    onSave(localCode);
    closeEditor();
  };

  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col gap-0 p-0 bg-zinc-900 border-zinc-700">
        <DialogHeader className="px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Edit: {nodeLabel}</DialogTitle>
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePaste}
                className="ml-2"
              >
                Paste
              </Button>
            )}
          </div>
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

        <div
          onKeyDown={(e) => {
            // Stopping propagation because we don't want to reach
            // window event listener from React Flow
            e.stopPropagation();
          }}
          className="flex-1 overflow-hidden"
        >
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={localCode}
            onChange={(value) => setLocalCode(value || "")}
            onMount={handleEditorMount}
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
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
