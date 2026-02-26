import RoomWrapper from "@/components/RoomWrapper";

export default async function Page({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <RoomWrapper roomCode={roomCode} />;
}
