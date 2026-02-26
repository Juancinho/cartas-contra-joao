"use client";

import { Trophy, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Player, Room } from "@/lib/types";

interface FinishedScreenProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
}

export function FinishedScreen({ room, players, currentPlayer }: FinishedScreenProps) {
  const router = useRouter();
  const sorted = [...players].sort((a, b) => b.points - a.points);
  const winner = sorted[0];
  const iWon = winner?.id === currentPlayer.id;

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">{iWon ? "🎉" : "💀"}</div>
          <h1 className="text-white font-black text-3xl">
            {iWon ? "¡Has ganado!" : `${winner?.name} ha ganado`}
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            Partida finalizada · Ronda {room.currentRound}
          </p>
        </div>

        {/* Podium */}
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-4 text-center">
            Clasificación final
          </h3>
          <div className="flex flex-col gap-2">
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 py-3 px-3 rounded-xl ${
                  i === 0 ? "bg-yellow-400/10 border border-yellow-400/30" : "bg-zinc-800/40"
                }`}
              >
                <span className="text-2xl w-8 text-center">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <span className={`flex-1 font-bold ${i === 0 ? "text-yellow-400" : "text-white"}`}>
                  {p.name}
                  {p.id === currentPlayer.id && (
                    <span className="text-zinc-500 font-normal text-sm"> (tú)</span>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <Trophy size={14} className={i === 0 ? "text-yellow-400" : "text-zinc-600"} />
                  <span className={`font-black text-lg ${i === 0 ? "text-yellow-400" : "text-white"}`}>
                    {p.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <button
          className="btn-secondary flex items-center justify-center gap-2"
          onClick={() => router.push("/")}
        >
          <RotateCcw size={18} /> Volver al inicio
        </button>
      </div>
    </div>
  );
}
