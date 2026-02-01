import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

export type NodeIconType =
  | "code"
  | "start"
  | "api-fetch"
  | "api-post"
  | "render";

interface NodeIconProps {
  icon: NodeIconType;
  onChange: (icon: NodeIconType) => void;
}

const iconOptions: { value: NodeIconType; label: string }[] = [
  { value: "code", label: "Code" },
  { value: "start", label: "Start" },
  { value: "api-fetch", label: "Fetch Data" },
  { value: "api-post", label: "Post Data" },
  { value: "render", label: "Render" },
];

function IconSvg({ type, size = 14 }: { type: NodeIconType; size?: number }) {
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

  switch (type) {
    case "start":
      // Play icon
      return (
        <svg {...props}>
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
      );
    case "api-fetch":
      // Download/fetch icon
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case "api-post":
      // Upload/post icon
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );
    case "render":
      // Eye/display icon
      return (
        <svg {...props}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "code":
    default:
      // Code brackets icon
      return (
        <svg {...props}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
  }
}

export function NodeIcon({ icon, onChange }: NodeIconProps) {
  const handleSelect = (e: React.MouseEvent, value: NodeIconType) => {
    e.stopPropagation();
    onChange(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="p-1 rounded hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <IconSvg type={icon} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuLabel>Node Type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {iconOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={(e) => handleSelect(e, option.value)}
            className={icon === option.value ? "bg-zinc-800" : ""}
          >
            <IconSvg type={option.value} />
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export IconSvg for use elsewhere
export { IconSvg };
