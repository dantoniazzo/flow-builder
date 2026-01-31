interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-[100] flex bg-zinc-800 rounded-lg p-1 border border-zinc-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
