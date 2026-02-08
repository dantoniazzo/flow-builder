"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

export type ExecutionMode = "server" | "client";

interface NodeIconProps {
  executionMode: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
}

const modeOptions: { value: ExecutionMode; label: string; description: string }[] = [
  {
    value: "server",
    label: "Server",
    description: "Runs on Node.js backend",
  },
  {
    value: "client",
    label: "Browser",
    description: "Runs in the browser",
  },
];

function ExecutionModeIcon({ mode, size = 14 }: { mode: ExecutionMode; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (mode === "server") {
    // Server icon (database/server rack)
    return (
      <svg {...props}>
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    );
  }

  // Browser/client icon (globe/browser window)
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function NodeIcon({ executionMode, onChange }: NodeIconProps) {
  const handleSelect = (e: React.MouseEvent, value: ExecutionMode) => {
    e.stopPropagation();
    onChange(value);
  };

  const currentOption = modeOptions.find((opt) => opt.value === executionMode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="p-1 rounded hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        title={`Execution: ${currentOption?.label}`}
      >
        <ExecutionModeIcon mode={executionMode} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuLabel>Execution Mode</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={(e) => handleSelect(e, option.value)}
            className={executionMode === option.value ? "bg-zinc-800" : ""}
          >
            <ExecutionModeIcon mode={option.value} />
            <div className="flex flex-col">
              <span>{option.label}</span>
              <span className="text-xs text-zinc-500">{option.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export for use elsewhere
export { ExecutionModeIcon };
