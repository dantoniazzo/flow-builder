

import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - internal Monaco API
import * as actions from "monaco-editor/esm/vs/platform/actions/common/actions";
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
import { useMonacoTouchSelection } from "../shared/lib/useMonacoTouchSelection";

// Remove built-in paste from context menu (runs once)
let pasteMenuRemoved = false;
function removeBuiltInPaste() {
  if (pasteMenuRemoved) return;
  pasteMenuRemoved = true;

  const menus = actions.MenuRegistry._menuItems;
  const contextMenuEntry = [...menus].find(
    (entry: [{ _debugName: string }, unknown]) =>
      entry[0]._debugName === "EditorContext",
  );
  if (!contextMenuEntry) return;

  const contextMenuLinks = contextMenuEntry[1];
  const removableIds = ["editor.action.clipboardPasteAction"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node = (contextMenuLinks as any)._first;
  while (node) {
    const next = node.next;
    if (removableIds.includes(node.element?.command?.id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (contextMenuLinks as any)._remove(node);
    }
    node = next;
  }
}

removeBuiltInPaste();

interface CodeEditorModalProps {
  nodeLabel: string;
  code: string;
  onSave: (code: string) => void;
  onRename: (label: string) => void;
}

export function CodeEditorModal({
  nodeLabel,
  code,
  onSave,
  onRename,
}: CodeEditorModalProps) {
  const { isEditorOpen, closeEditor } = useFlowStore();
  const [localCode, setLocalCode] = useState(code);
  const [localLabel, setLocalLabel] = useState(nodeLabel);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editorInstance, setEditorInstance] =
    useState<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();

  // Enable touch selection handles on mobile
  useMonacoTouchSelection(editorInstance, isMobile);

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  useEffect(() => {
    setLocalLabel(nodeLabel);
    // Auto-enable editing and select all if default title
    if (nodeLabel === "New Node") {
      setIsEditingLabel(true);
    }
  }, [nodeLabel]);

  // Focus and select input when entering edit mode
  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      if (localLabel === "New Node") {
        labelInputRef.current.select();
      }
    }
  }, [isEditingLabel, localLabel]);

  // Debounced rename handler
  const handleLabelChange = (newLabel: string) => {
    setLocalLabel(newLabel);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onRename(newLabel);
    }, 300);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const pasteFromClipboard = async (
    editor: Pick<Monaco.editor.ICodeEditor, "getSelection" | "executeEdits">,
  ) => {
    try {
      const text = await navigator.clipboard.readText();
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits("paste", [
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
  };

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setEditorInstance(editor);

    // Override the built-in paste command to use Clipboard API
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      pasteFromClipboard(editor);
    });

    // Add custom paste action with keybinding indicator
    editor.addAction({
      id: "custom.clipboardPasteAction",
      label: "Paste",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
      contextMenuGroupId: "9_cutcopypaste",
      contextMenuOrder: 3,
      run: (ed) => pasteFromClipboard(ed),
    });
  }, []);

  const handlePaste = async () => {
    if (!editorRef.current) return;
    await pasteFromClipboard(editorRef.current);
    editorRef.current.focus();
  };

  const handleSave = () => {
    onSave(localCode);
    closeEditor();
  };

  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col gap-0 p-0 bg-zinc-900 border-zinc-700">
        <DialogHeader className="px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle asChild>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-white text-lg font-semibold shrink-0">
                  Edit:
                </span>
                <input
                  type="text"
                  value={localLabel}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="flex-1 min-w-0 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white text-lg font-semibold focus:outline-none focus:border-blue-500"
                  placeholder="Node name"
                />
              </div>
            </DialogTitle>
            {isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePaste}
                className="shrink-0"
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
