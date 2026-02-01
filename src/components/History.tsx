import { useMemo, useState, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  themeQuartz,
} from "ag-grid-community";
import {
  useStorage,
  useMutation,
  type LiveExecutionRecord,
} from "../liveblocks/liveblocks.config";

ModuleRegistry.registerModules([AllCommunityModule]);

const darkTheme = themeQuartz.withParams({
  backgroundColor: "#18181b",
  foregroundColor: "#ffffff",
  headerBackgroundColor: "#27272a",
  headerTextColor: "#a1a1aa",
  rowHoverColor: "#3f3f46",
  borderColor: "#3f3f46",
  oddRowBackgroundColor: "#1f1f23",
});

interface ExecutionRow {
  id: string;
  startNodeLabel: string;
  startedAt: string;
  duration: string;
  status: string;
  nodesExecuted: number;
  record: LiveExecutionRecord;
}

export function History() {
  const liveHistory = useStorage((root) => root.executionHistory);
  const [executionHistory, setExecutionHistory] = useState<
    LiveExecutionRecord[]
  >([]);
  const [selectedExecution, setSelectedExecution] =
    useState<LiveExecutionRecord | null>(null);

  // Sync LiveBlocks storage to local state
  useEffect(() => {
    if (liveHistory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExecutionHistory(Array.from(liveHistory));
    }
  }, [liveHistory]);

  const clearHistory = useMutation(({ storage }) => {
    const history = storage.get("executionHistory");
    // Clear all items
    while (history.length > 0) {
      history.delete(0);
    }
  }, []);

  const rowData: ExecutionRow[] = useMemo(() => {
    return executionHistory.map((exec) => {
      const startedAt = new Date(exec.startedAt);
      const completedAt = exec.completedAt ? new Date(exec.completedAt) : null;
      const duration = completedAt
        ? `${((completedAt.getTime() - startedAt.getTime()) / 1000).toFixed(2)}s`
        : "Running...";

      return {
        id: exec.id,
        startNodeLabel: exec.startNodeLabel,
        startedAt: startedAt.toLocaleString(),
        duration,
        status: exec.status,
        nodesExecuted: exec.nodesExecuted,
        record: exec,
      };
    });
  }, [executionHistory]);

  const columnDefs: ColDef<ExecutionRow>[] = useMemo(
    () => [
      {
        field: "startedAt",
        headerName: "Started At",
        flex: 1,
        minWidth: 180,
      },
      {
        field: "startNodeLabel",
        headerName: "Start Node",
        flex: 1,
        minWidth: 120,
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        cellRenderer: (params: { value: string }) => {
          const statusColors: Record<string, string> = {
            running: "bg-orange-500/20 text-orange-400",
            success: "bg-green-500/20 text-green-400",
            error: "bg-red-500/20 text-red-400",
          };
          return (
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[params.value] || ""}`}
            >
              {params.value}
            </span>
          );
        },
      },
      {
        field: "nodesExecuted",
        headerName: "Nodes",
        width: 100,
      },
      {
        field: "duration",
        headerName: "Duration",
        width: 120,
      },
    ],
    [],
  );

  const defaultColDef: ColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
    }),
    [],
  );

  const handleClearHistory = () => {
    clearHistory();
    setSelectedExecution(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 pt-14">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Execution History</h2>
        {executionHistory.length > 0 && (
          <button
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            onClick={handleClearHistory}
          >
            Clear History
          </button>
        )}
      </div>

      <div className="flex-1 flex p-4">
        <div className={`${selectedExecution ? "w-1/2" : "w-full"} h-full`}>
          {executionHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="text-center">
                <p className="text-lg mb-2">No executions yet</p>
                <p className="text-sm">
                  Run a flow to see execution history here
                </p>
              </div>
            </div>
          ) : (
            <AgGridReact<ExecutionRow>
              theme={darkTheme}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              rowSelection="single"
              onRowClicked={(event) =>
                setSelectedExecution(event.data?.record || null)
              }
              getRowId={(params) => params.data.id}
            />
          )}
        </div>

        {selectedExecution && (
          <div className="w-1/2 h-full border-l border-zinc-800 overflow-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Execution Details
                </h3>
                <button
                  className="text-zinc-400 hover:text-white text-xl leading-none"
                  onClick={() => setSelectedExecution(null)}
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Start Node</span>
                    <p className="text-white">
                      {selectedExecution.startNodeLabel}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Status</span>
                    <p
                      className={`font-medium ${
                        selectedExecution.status === "success"
                          ? "text-green-400"
                          : selectedExecution.status === "error"
                            ? "text-red-400"
                            : "text-orange-400"
                      }`}
                    >
                      {selectedExecution.status}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Started At</span>
                    <p className="text-white">
                      {new Date(selectedExecution.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Completed At</span>
                    <p className="text-white">
                      {selectedExecution.completedAt
                        ? new Date(
                            selectedExecution.completedAt,
                          ).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm text-zinc-500 mb-2">Node Results</h4>
                  <div className="space-y-2">
                    {selectedExecution.results.map((result, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          result.error
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-zinc-800 border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white text-sm">
                            {result.nodeLabel}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {result.nodeId}
                          </span>
                        </div>
                        {result.error ? (
                          <pre className="text-xs text-red-400 whitespace-pre-wrap">
                            {result.error}
                          </pre>
                        ) : (
                          <pre className="text-xs text-zinc-400 whitespace-pre-wrap overflow-auto max-h-32">
                            {JSON.stringify(result.result, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
