import { Suspense, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RoomProviderWrapper } from "./liveblocks/RoomProvider";
import { Flow } from "./components/Flow";
import { History } from "./components/History";
import { Tabs } from "./components/Tabs";
import { RoomSelector } from "./components/RoomSelector";

function LoadingScreen() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-4 bg-zinc-950">
      <div className="w-10 h-10 border-[3px] border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-zinc-400">Connecting to room...</p>
    </div>
  );
}

const tabs = [
  { id: "editor", label: "Editor" },
  { id: "history", label: "History" },
];

function AppContent({ roomId, onRoomChange }: { roomId: string; onRoomChange: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState("editor");

  return (
    <div className="w-screen h-screen bg-zinc-950 relative">
      <RoomSelector currentRoomId={roomId} onRoomChange={onRoomChange} />
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "editor" ? <Flow /> : <History />}
    </div>
  );
}

function App() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [key, setKey] = useState(0);

  const getInitialRoomId = useCallback(() => {
    const urlRoomId = searchParams.get("room");
    if (urlRoomId) return urlRoomId;

    const storedRoom = localStorage.getItem("flow-builder-current-room");
    if (storedRoom) return storedRoom;

    return "default-room";
  }, [searchParams]);

  const [roomId, setRoomId] = useState<string>(getInitialRoomId);

  const handleRoomChange = useCallback((newRoomId: string) => {
    localStorage.setItem("flow-builder-current-room", newRoomId);

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("room", newRoomId);
    navigate(newUrl.pathname + newUrl.search);

    setRoomId(newRoomId);
    setKey((k) => k + 1);
  }, [navigate]);

  return (
    <RoomProviderWrapper key={key} roomId={roomId}>
      <Suspense fallback={<LoadingScreen />}>
        <AppContent roomId={roomId} onRoomChange={handleRoomChange} />
      </Suspense>
    </RoomProviderWrapper>
  );
}

export default App;
