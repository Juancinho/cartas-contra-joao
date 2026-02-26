"use client";

import dynamic from "next/dynamic";

const Spinner = () => (
  <div className="min-h-dvh bg-black flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
  </div>
);

const RoomClient = dynamic(() => import("@/components/RoomClient"), {
  ssr: false,
  loading: Spinner,
});

export default function RoomWrapper({ roomCode }: { roomCode: string }) {
  return <RoomClient roomCode={roomCode} />;
}
