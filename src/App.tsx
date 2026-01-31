import { Suspense } from "react";
import { RoomProviderWrapper } from "./liveblocks/RoomProvider";
import { Flow } from "./components/Flow";

function LoadingScreen() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center gap-4 bg-zinc-950">
      <div className="w-10 h-10 border-[3px] border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-zinc-400">Connecting to room...</p>
    </div>
  );
}

export default function App() {
  // Get room ID from URL or use default
  const roomId =
    new URLSearchParams(window.location.search).get("room") || "default-room";

  return (
    <RoomProviderWrapper roomId={roomId}>
      <Suspense fallback={<LoadingScreen />}>
        <Flow />
      </Suspense>
    </RoomProviderWrapper>
  );
}
