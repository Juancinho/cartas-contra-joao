"use client";

import { useState } from "react";
import { Trophy, Loader2, X } from "lucide-react";
import { BlackCard } from "@/components/ui/BlackCard";
import { WhiteCard } from "@/components/ui/WhiteCard";
import { pickWinners, nextRound } from "@/lib/gameEngine";
import type { Room, Player } from "@/lib/types";
import { cn } from "@/lib/cn";

interface VerdictPhaseProps {
  room: Room;
  currentPlayer: Player;
  players: Player[];
}

export function VerdictPhase({ room, currentPlayer, players }: VerdictPhaseProps) {
  const isZar = currentPlayer.id === room.zarPlayerId;
  const pickCount = room.currentBlackCard?.pick ?? 1;
  const [slots, setSlots] = useState<(string | null)[]>(Array(pickCount).fill(null)); // submissionIds per slot
  const [confirming, setConfirming] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const submissionEntries = Object.entries(room.submissions);
  const winnersSet = room.winnerPlayerIds.length > 0;

  // Reverse-lookup: submissionId → playerId
  const reverseMap: Record<string, string> = {};
  for (const [pid, sid] of Object.entries(room.submissionMap)) {
    reverseMap[sid] = pid;
  }

  function handleCardClick(subId: string) {
    if (!isZar || confirming) return;
    setSlots((prev) => {
      // If already in a slot, remove it
      if (prev.includes(subId)) {
        return prev.map((s) => (s === subId ? null : s));
      }
      // Fill the first empty slot
      const emptyIdx = prev.findIndex((s) => s === null);
      if (emptyIdx === -1) return prev;
      const next = [...prev];
      next[emptyIdx] = subId;
      return next;
    });
  }

  function clearSlot(idx: number) {
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  }

  async function handleConfirm() {
    if (slots.some((s) => s === null)) return;
    setConfirming(true);
    try {
      await pickWinners(room.roomCode, slots as string[]);
    } catch (e) {
      console.error(e);
      setConfirming(false);
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

  // ── Winner announced ────────────────────────────────────────────────────
  if (winnersSet) {
    return (
      <WinnerAnnouncement
        room={room}
        players={players}
        reverseMap={reverseMap}
        isHost={currentPlayer.isHost}
        onNextRound={handleNextRound}
        advancing={advancing}
      />
    );
  }

  // ── Verdict picking UI ──────────────────────────────────────────────────
  const filledCount = slots.filter(Boolean).length;
  const allFilled = filledCount === pickCount;

  return (
    <div className="flex flex-col gap-4 pb-6">
      {room.currentBlackCard && (
        <BlackCard card={room.currentBlackCard} size="lg" />
      )}

      {/* Slot indicators (for pick > 1) */}
      {pickCount > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-zinc-500 text-xs px-1">
            {isZar ? "Toca las cartas para llenar cada hueco en orden" : "El Zar está ensamblando la respuesta..."}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {slots.map((subId, i) => {
              const card = subId ? room.submissions[subId]?.[0] : null;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-shrink-0 relative rounded-xl border-2 p-2 min-w-[100px] max-w-[140px]",
                    card ? "bg-white border-white" : "border-zinc-700 border-dashed"
                  )}
                >
                  <span className="text-zinc-500 text-xs font-bold block mb-1">#{i + 1}</span>
                  {card ? (
                    <>
                      <p className="text-black text-xs font-semibold leading-tight">{card}</p>
                      {isZar && (
                        <button
                          onClick={() => clearSlot(i)}
                          className="absolute top-1 right-1 text-zinc-400 active:text-black"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-zinc-600 text-xs">vacío</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isZar ? (
        <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 flex items-center gap-2">
          <span className="text-xl">👑</span>
          <p className="text-white font-bold text-sm">
            {pickCount === 1
              ? "Toca la mejor respuesta"
              : `Elige ${pickCount} cartas (${filledCount}/${pickCount})`}
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
          <p className="text-zinc-400 text-sm">El Zar está eligiendo...</p>
        </div>
      )}

      {/* Submission cards */}
      <div className="flex flex-col gap-3">
        {submissionEntries.map(([subId, cards], idx) => {
          const slotIndex = slots.indexOf(subId);
          const isInSlot = slotIndex !== -1;

          return (
            <button
              key={subId}
              disabled={!isZar || confirming}
              onClick={() => handleCardClick(subId)}
              className={cn(
                "text-left rounded-2xl p-4 border-2 transition-all",
                isInSlot
                  ? "border-white bg-zinc-800/60"
                  : isZar
                  ? "border-zinc-700 active:border-zinc-400 active:scale-[0.98]"
                  : "border-zinc-800",
                confirming && "opacity-70"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-zinc-600 text-xs font-semibold">Respuesta {idx + 1}</p>
                {isInSlot && (
                  <span className="text-xs font-black bg-white text-black px-2 py-0.5 rounded-full">
                    #{slotIndex + 1}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((card, i) => (
                  <WhiteCard key={i} text={card} size="md" />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirm button (Zar only) */}
      {isZar && (
        <button
          className="btn-primary sticky bottom-4 flex items-center justify-center gap-2"
          disabled={!allFilled || confirming}
          onClick={handleConfirm}
        >
          {confirming ? (
            <><Loader2 size={20} className="animate-spin" /> Confirmando...</>
          ) : pickCount === 1 ? (
            "Elegir ganadora"
          ) : (
            `Confirmar combinación (${filledCount}/${pickCount})`
          )}
        </button>
      )}
    </div>
  );
}

// ─── Winner Announcement ───────────────────────────────────────────────────

function WinnerAnnouncement({
  room,
  players,
  reverseMap,
  isHost,
  onNextRound,
  advancing,
}: {
  room: Room;
  players: Player[];
  reverseMap: Record<string, string>;
  isHost: boolean;
  onNextRound: () => void;
  advancing: boolean;
}) {
  const pickCount = room.currentBlackCard?.pick ?? 1;
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  // Build winning combo: for each slot in winnerPlayerIds, find the card played
  const winningCombo = room.winnerPlayerIds.map((pid) => {
    const subId = room.submissionMap[pid];
    const card = subId ? room.submissions[subId]?.[0] : "???";
    const player = players.find((p) => p.id === pid);
    return { pid, card, playerName: player?.name ?? "???" };
  });

  // Unique winners (deduplicated)
  const uniqueWinnerIds = [...new Set(room.winnerPlayerIds)];
  const uniqueWinners = uniqueWinnerIds.map((pid) => ({
    player: players.find((p) => p.id === pid),
    pointsEarned: room.winnerPlayerIds.filter((id) => id === pid).length,
  }));

  return (
    <div className="flex flex-col gap-4 pb-6 animate-fade-in">
      {/* Winner banner */}
      <div className="bg-yellow-400 rounded-2xl p-5 text-center">
        <Trophy size={36} className="mx-auto mb-2 text-black" />
        {uniqueWinners.length === 1 ? (
          <>
            <h2 className="text-black font-black text-2xl">
              {uniqueWinners[0].player?.name ?? "???"} gana la ronda!
            </h2>
            <p className="text-black/70 text-sm mt-1">
              +{uniqueWinners[0].pointsEarned} punto{uniqueWinners[0].pointsEarned > 1 ? "s" : ""}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-black font-black text-xl mb-1">¡Varios ganadores!</h2>
            {uniqueWinners.map(({ player, pointsEarned }) => (
              <p key={player?.id} className="text-black/80 text-sm font-bold">
                {player?.name ?? "???"} +{pointsEarned}
              </p>
            ))}
          </>
        )}
      </div>

      {/* Winning combo visualized */}
      {room.currentBlackCard && (
        <BlackCard card={room.currentBlackCard} size="md" />
      )}
      <div className="flex flex-col gap-2">
        {winningCombo.map(({ pid, card, playerName }, i) => (
          <div key={i} className="flex flex-col gap-1">
            <p className="text-zinc-500 text-xs px-1">
              {pickCount > 1 && `Hueco ${i + 1} · `}
              <span className="text-zinc-400 font-semibold">{playerName}</span>
            </p>
            <WhiteCard text={card ?? "???"} winner size="md" />
          </div>
        ))}
      </div>

      {/* Scoreboard */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-3">Puntuación</h3>
        <div className="flex flex-col gap-2">
          {sortedPlayers.map((p, i) => {
            const earnedThisRound = room.winnerPlayerIds.filter((id) => id === p.id).length;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-zinc-600 text-sm w-4">{i + 1}</span>
                <span className={cn(
                  "flex-1 text-sm font-semibold truncate",
                  earnedThisRound > 0 ? "text-yellow-400" : "text-white"
                )}>
                  {p.name}
                  {p.id === room.zarPlayerId && " 👑"}
                  {earnedThisRound > 0 && ` +${earnedThisRound}`}
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
            );
          })}
        </div>
      </div>

      {isHost ? (
        <button
          className="btn-primary flex items-center justify-center gap-2"
          onClick={onNextRound}
          disabled={advancing}
        >
          {advancing ? <><Loader2 size={20} className="animate-spin" /> Cargando...</> : "Siguiente ronda →"}
        </button>
      ) : (
        <p className="text-zinc-500 text-sm text-center">Esperando al host para continuar...</p>
      )}
    </div>
  );
}
