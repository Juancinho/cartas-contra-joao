"use client";

import { Crown, User } from "lucide-react";
import type { Player, Room } from "@/lib/types";

interface PlayerListProps {
  players: Player[];
  room: Room;
  currentPlayerId: string;
}

export function PlayerList({ players, room, currentPlayerId }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-white text-sm uppercase tracking-wide">
          Jugadores
        </h3>
        <span className="text-zinc-500 text-xs bg-zinc-800 px-2 py-0.5 rounded-full">
          {players.length}/∞
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 py-2 px-3 rounded-xl bg-zinc-800/60"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
              {player.isHost ? (
                <Crown size={14} className="text-yellow-400" />
              ) : (
                <User size={14} className="text-zinc-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm truncate">
                  {player.name}
                </span>
                {player.id === currentPlayerId && (
                  <span className="text-xs text-zinc-500 flex-shrink-0">(tú)</span>
                )}
              </div>
              {room.status === "playing" && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-yellow-400 font-semibold">
                    {player.points} pts
                  </span>
                  {player.id === room.zarPlayerId && (
                    <span className="text-xs text-zinc-500">· Zar 👑</span>
                  )}
                </div>
              )}
            </div>

            {player.isHost && room.status === "lobby" && (
              <span className="text-xs text-yellow-400 font-semibold flex-shrink-0">
                Host
              </span>
            )}
          </div>
        ))}
      </div>

      {players.length < 3 && room.status === "lobby" && (
        <p className="text-zinc-600 text-xs mt-3 text-center">
          Se necesitan al menos 3 jugadores para empezar
        </p>
      )}
    </div>
  );
}
