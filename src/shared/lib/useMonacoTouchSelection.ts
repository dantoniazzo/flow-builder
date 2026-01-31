import { useEffect, useRef } from "react";
import type * as Monaco from "monaco-editor";

interface TouchHandle {
  element: HTMLDivElement;
  type: "start" | "end";
}

export function useMonacoTouchSelection(
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  isMobile: boolean
) {
  const handlesRef = useRef<{ start: TouchHandle | null; end: TouchHandle | null }>({
    start: null,
    end: null,
  });
  const isDraggingRef = useRef<"start" | "end" | null>(null);

  useEffect(() => {
    if (!editor || !isMobile) return;

    const editorDomNode = editor.getDomNode();
    if (!editorDomNode) return;

    // Create selection handles
    const createHandle = (type: "start" | "end"): TouchHandle => {
      const element = document.createElement("div");
      element.className = "monaco-touch-handle";
      element.style.cssText = `
        position: absolute;
        width: 2px;
        height: 20px;
        background: #007AFF;
        pointer-events: auto;
        touch-action: none;
        z-index: 1000;
        display: none;
      `;

      // Create the circular anchor
      const anchor = document.createElement("div");
      anchor.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        background: #007AFF;
        border-radius: 50%;
        left: 50%;
        transform: translateX(-50%);
        ${type === "start" ? "top: -22px;" : "bottom: -22px;"}
        touch-action: none;
      `;
      element.appendChild(anchor);

      editorDomNode.appendChild(element);
      return { element, type };
    };

    handlesRef.current.start = createHandle("start");
    handlesRef.current.end = createHandle("end");

    const updateHandlePositions = () => {
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) {
        handlesRef.current.start?.element && (handlesRef.current.start.element.style.display = "none");
        handlesRef.current.end?.element && (handlesRef.current.end.element.style.display = "none");
        return;
      }

      const startPos = {
        lineNumber: selection.startLineNumber,
        column: selection.startColumn,
      };
      const endPos = {
        lineNumber: selection.endLineNumber,
        column: selection.endColumn,
      };

      const startCoords = editor.getScrolledVisiblePosition(startPos);
      const endCoords = editor.getScrolledVisiblePosition(endPos);

      if (startCoords && handlesRef.current.start) {
        handlesRef.current.start.element.style.display = "block";
        handlesRef.current.start.element.style.left = `${startCoords.left}px`;
        handlesRef.current.start.element.style.top = `${startCoords.top}px`;
        handlesRef.current.start.element.style.height = `${startCoords.height}px`;
      }

      if (endCoords && handlesRef.current.end) {
        handlesRef.current.end.element.style.display = "block";
        handlesRef.current.end.element.style.left = `${endCoords.left}px`;
        handlesRef.current.end.element.style.top = `${endCoords.top}px`;
        handlesRef.current.end.element.style.height = `${endCoords.height}px`;
      }
    };

    // Handle touch events for dragging
    const handleTouchStart = (e: TouchEvent, type: "start" | "end") => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = type;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();

      const touch = e.touches[0];
      const position = editor.getTargetAtClientPoint(touch.clientX, touch.clientY);
      if (!position?.position) return;

      const currentSelection = editor.getSelection();
      if (!currentSelection) return;

      let newSelection: Monaco.ISelection;
      if (isDraggingRef.current === "start") {
        newSelection = {
          selectionStartLineNumber: position.position.lineNumber,
          selectionStartColumn: position.position.column,
          positionLineNumber: currentSelection.endLineNumber,
          positionColumn: currentSelection.endColumn,
        };
      } else {
        newSelection = {
          selectionStartLineNumber: currentSelection.startLineNumber,
          selectionStartColumn: currentSelection.startColumn,
          positionLineNumber: position.position.lineNumber,
          positionColumn: position.position.column,
        };
      }

      editor.setSelection(newSelection);
      updateHandlePositions();
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = null;
    };

    // Long press to start selection
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressStartPos: { x: number; y: number } | null = null;

    const handleEditorTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      longPressStartPos = { x: touch.clientX, y: touch.clientY };

      longPressTimer = setTimeout(() => {
        const position = editor.getTargetAtClientPoint(touch.clientX, touch.clientY);
        if (position?.position) {
          // Select the word at this position
          const wordAtPosition = editor.getModel()?.getWordAtPosition(position.position);
          if (wordAtPosition) {
            editor.setSelection({
              selectionStartLineNumber: position.position.lineNumber,
              selectionStartColumn: wordAtPosition.startColumn,
              positionLineNumber: position.position.lineNumber,
              positionColumn: wordAtPosition.endColumn,
            });
            updateHandlePositions();
          }
        }
      }, 500);
    };

    const handleEditorTouchMove = (e: TouchEvent) => {
      if (longPressTimer && longPressStartPos) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - longPressStartPos.x);
        const dy = Math.abs(touch.clientY - longPressStartPos.y);
        if (dx > 10 || dy > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }
    };

    const handleEditorTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    // Attach event listeners
    const startHandle = handlesRef.current.start?.element;
    const endHandle = handlesRef.current.end?.element;

    if (startHandle) {
      startHandle.addEventListener("touchstart", (e) => handleTouchStart(e, "start"), { passive: false });
    }
    if (endHandle) {
      endHandle.addEventListener("touchstart", (e) => handleTouchStart(e, "end"), { passive: false });
    }

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    editorDomNode.addEventListener("touchstart", handleEditorTouchStart, { passive: true });
    editorDomNode.addEventListener("touchmove", handleEditorTouchMove, { passive: true });
    editorDomNode.addEventListener("touchend", handleEditorTouchEnd);

    // Listen for selection changes
    const disposable = editor.onDidChangeCursorSelection(() => {
      if (!isDraggingRef.current) {
        updateHandlePositions();
      }
    });

    // Also update on scroll
    const scrollDisposable = editor.onDidScrollChange(() => {
      updateHandlePositions();
    });

    return () => {
      disposable.dispose();
      scrollDisposable.dispose();

      if (startHandle) {
        startHandle.remove();
      }
      if (endHandle) {
        endHandle.remove();
      }

      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      editorDomNode.removeEventListener("touchstart", handleEditorTouchStart);
      editorDomNode.removeEventListener("touchmove", handleEditorTouchMove);
      editorDomNode.removeEventListener("touchend", handleEditorTouchEnd);

      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [editor, isMobile]);
}
