"use client";

import { useState } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { BlackCard } from "@/components/ui/BlackCard";
import { WhiteCard } from "@/components/ui/WhiteCard";
import { pickWinner, nextRound } from "@/lib/gameEngine";
import type { Room, Player } from "@/lib/types";
import { cn } from "@/lib/cn";

interface VerdictPhaseProps {
  room: Room;
  currentPlayer: Player;
  players: Player[];
}

export function VerdictPhase({ room, currentPlayer, players }: VerdictPhaseProps) {
  const isZar = currentPlayer.id === room.zarPlayerId;
  const [picking, setPicking] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [localWinner, setLocalWinner] = useState<string | null>(room.winnerPlayerId);

  const submissionEntries = Object.entries(room.submissions);
  const winnerPlayerId = localWinner ?? room.winnerPlayerId;
  const winnerPlayer = winnerPlayerId ? players.find((p) => p.id === winnerPlayerId) : undefined;

  async function handlePickWinner(submissionId: string) {
    if (!isZar || picking) return;
    setPicking(true);
    try {
      await pickWinner(room.roomCode, submissionId);
      setLocalWinner(room.submissionMap[submissionId]);
    } catch (e) {
      console.error(e);
    } finally {
      setPicking(false);
    }
  }

  async function handleNextRound() {
    setAdvancing(true);
    try {
      await nextRound(room.roomCode);
    } catch (e) {
      console.error(e);
      setAdvancing(false);
    }
  }

  // If winner already picked, show result
  if (room.winnerPlayerId) {
    return (
      <WinnerAnnouncement
        room={room}
        winnerPlayer={winnerPlayer}
        players={players}
        isHost={currentPlayer.isHost}
        onNextRound={handleNextRound}
        advancing={advancing}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {room.currentBlackCard && (
        <BlackCard card={room.currentBlackCard} size="lg" />
      )}

      {isZar ? (
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">👑</span>
            <p className="text-white font-bold">Elige la mejor respuesta</p>
          </div>
          <p className="text-zinc-500 text-sm">Toca la carta ganadora</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
          <p className="text-zinc-400 text-sm">El Zar está eligiendo la ganadora...</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {submissionEntries.map(([subId, cards]) => {
          const ownerId = room.submissionMap[subId];
          const owner = players.find((p) => p.id === ownerId);

          return (
            <button
              key={subId}
              disabled={!isZar || picking}
              onClick={() => handlePickWinner(subId)}
              className={cn(
                "text-left rounded-2xl p-4 border-2 transition-all",
                isZar
                  ? "border-zinc-700 active:border-white active:scale-[0.98] cursor-pointer"
                  : "border-zinc-800 cursor-default",
                picking && "opacity-70"
              )}
            >
              {owner && (
                <p className="text-zinc-500 text-xs mb-2 font-semibold">
                  — {owner.name}
                </p>
              )}
              <div className="flex flex-col gap-2">
                {cards.map((card, i) => (
                  <WhiteCard key={i} text={card} size="md" />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {picking && (
        <div className="flex justify-center py-4">
          <Loader2 size={24} className="animate-spin text-zinc-400" />
        </div>
      )}
    </div>
  );
}

function WinnerAnnouncement({
  room,
  winnerPlayer,
  players,
  isHost,
  onNextRound,
  advancing,
}: {
  room: Room;
  winnerPlayer: Player | undefined;
  players: Player[];
  isHost: boolean;
  onNextRound: () => void;
  advancing: boolean;
}) {
  const winnerSubId = winnerPlayer
    ? room.submissionMap[winnerPlayer.id]
      ? Object.entries(room.submissionMap).find(([pid]) => pid === winnerPlayer.id)?.[1]
      : null
    : null;

  // Reverse lookup: find submissionId where submissionMap[playerId] === submissionId
  const winnerSubmissionId = Object.entries(room.submissionMap).find(
    ([pid]) => pid === room.winnerPlayerId
  )?.[1];
  const winnerCards = winnerSubmissionId ? room.submissions[winnerSubmissionId] : [];

  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="flex flex-col gap-4 pb-6 animate-fade-in">
      {/* Winner announcement */}
      <div className="bg-yellow-400 rounded-2xl p-6 text-center">
        <Trophy size={40} className="mx-auto mb-2 text-black" />
        <h2 className="text-black font-black text-2xl">
          {winnerPlayer?.name ?? "???"} gana la ronda!
        </h2>
        <p className="text-black/70 text-sm mt-1">+1 Awesome Point</p>
      </div>

      {/* Winning card(s) */}
      {room.currentBlackCard && (
        <BlackCard card={room.currentBlackCard} size="md" />
      )}
      <div className="flex flex-col gap-2">
        {winnerCards.map((card, i) => (
          <WhiteCard key={i} text={card} winner={true} size="md" />
        ))}
      </div>

      {/* Scoreboard */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-3">
          Puntuación
        </h3>
        <div className="flex flex-col gap-2">
          {sortedPlayers.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-zinc-600 text-sm w-4">{i + 1}</span>
              <span className={cn(
                "flex-1 text-sm font-semibold",
                p.id === room.winnerPlayerId ? "text-yellow-400" : "text-white"
              )}>
                {p.name}
                {p.id === room.zarPlayerId && " 👑"}
              </span>
              <span className="font-black text-white">{p.points}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(p.points, room.config.maxPoints) }).map((_, j) => (
                  <div key={j} className="w-2 h-2 bg-yellow-400 rounded-full" />
                ))}
                {Array.from({ length: Math.max(0, room.config.maxPoints - p.points) }).map((_, j) => (
                  <div key={j} className="w-2 h-2 bg-zinc-700 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next round — any player can advance (host) */}
      {isHost ? (
        <button
          className="btn-primary flex items-center justify-center gap-2"
          onClick={onNextRound}
          disabled={advancing}
        >
          {advancing ? (
            <><Loader2 size={20} className="animate-spin" /> Cargando...</>
          ) : (
            "Siguiente ronda →"
          )}
        </button>
      ) : (
        <p className="text-zinc-500 text-sm text-center">
          Esperando al host para continuar...
        </p>
      )}
    </div>
  );
}
