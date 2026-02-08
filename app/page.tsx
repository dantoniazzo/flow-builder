"use client";

import { Suspense, useState, useCallback } from "react";
import { RoomProviderWrapper } from "@/liveblocks/RoomProvider";
import { Flow } from "@/components/Flow";
import { History } from "@/components/History";
import { Tabs } from "@/components/Tabs";
import { RoomSelector } from "@/components/RoomSelector";
import { useSearchParams, useRouter } from "next/navigation";

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

function FlowBuilderApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [key, setKey] = useState(0); // Key to force re-render of RoomProvider

  // Get initial room ID synchronously
  const getInitialRoomId = useCallback(() => {
    const urlRoomId = searchParams.get("room");
    if (urlRoomId) return urlRoomId;

    if (typeof window !== "undefined") {
      const storedRoom = localStorage.getItem("flow-builder-current-room");
      if (storedRoom) return storedRoom;
    }

    return "default-room";
  }, [searchParams]);

  const [roomId, setRoomId] = useState<string>(getInitialRoomId);

  const handleRoomChange = useCallback((newRoomId: string) => {
    // Store the room choice
    if (typeof window !== "undefined") {
      localStorage.setItem("flow-builder-current-room", newRoomId);
    }

    // Update URL without full page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set("room", newRoomId);
    router.push(newUrl.pathname + newUrl.search);

    // Update state and force RoomProvider re-render
    setRoomId(newRoomId);
    setKey((k) => k + 1);
  }, [router]);

  return (
    <RoomProviderWrapper key={key} roomId={roomId}>
      <Suspense fallback={<LoadingScreen />}>
        <AppContent roomId={roomId} onRoomChange={handleRoomChange} />
      </Suspense>
    </RoomProviderWrapper>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <FlowBuilderApp />
    </Suspense>
  );
}
