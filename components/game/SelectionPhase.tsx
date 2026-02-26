"use client";

import { useState, useEffect } from "react";
import { Loader2, SendHorizonal } from "lucide-react";
import { BlackCard } from "@/components/ui/BlackCard";
import { WhiteCard } from "@/components/ui/WhiteCard";
import { submitCards, advanceToReveal } from "@/lib/gameEngine";
import type { Room, Player } from "@/lib/types";
import { cn } from "@/lib/cn";

interface SelectionPhaseProps {
  room: Room;
  currentPlayer: Player;
  players: Player[];
}

export function SelectionPhase({ room, currentPlayer, players }: SelectionPhaseProps) {
  const isZar = currentPlayer.id === room.zarPlayerId;
  const pickCount = room.currentBlackCard?.pick ?? 1;
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(currentPlayer.hasSubmitted);

  // Sync submitted state
  useEffect(() => {
    setSubmitted(currentPlayer.hasSubmitted);
  }, [currentPlayer.hasSubmitted]);

  // Non-Zar players count (must submit)
  const nonZarPlayers = players.filter((p) => p.id !== room.zarPlayerId);
  const waitingFor = nonZarPlayers.filter((p) => !p.hasSubmitted).map((p) => p.name);
  const allSubmitted = room.submittedCount >= nonZarPlayers.length && nonZarPlayers.length > 0;

  // Auto-advance to reveal when all submitted (any client can trigger via transaction)
  useEffect(() => {
    if (allSubmitted && room.phase === "selection") {
      advanceToReveal(room.roomCode);
    }
  }, [allSubmitted, room.phase, room.roomCode]);

  function toggleCard(card: string) {
    setSelected((prev) => {
      if (prev.includes(card)) {
        return prev.filter((c) => c !== card);
      }
      if (prev.length >= pickCount) {
        // Replace last if already at max
        return [...prev.slice(0, pickCount - 1), card];
      }
      return [...prev, card];
    });
  }

  async function handleSubmit() {
    if (selected.length !== pickCount) return;
    setSubmitting(true);
    try {
      await submitCards(room.roomCode, currentPlayer.id, selected);
      setSubmitted(true);
      setSelected([]);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  if (isZar) {
    return (
      <ZarWaiting
        room={room}
        waitingFor={waitingFor}
        nonZarCount={nonZarPlayers.length}
        submittedCount={room.submittedCount}
      />
    );
  }

  if (submitted) {
    return (
      <SubmittedWaiting
        waitingFor={waitingFor}
        nonZarCount={nonZarPlayers.length}
        submittedCount={room.submittedCount}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Black card */}
      {room.currentBlackCard && (
        <BlackCard card={room.currentBlackCard} size="lg" />
      )}

      {/* Pick indicator */}
      <div className="flex items-center justify-between px-1">
        <p className="text-zinc-400 text-sm">
          Elige <strong className="text-white">{pickCount}</strong> carta{pickCount > 1 ? "s" : ""}
        </p>
        <p className="text-zinc-500 text-xs">
          {selected.length}/{pickCount} seleccionada{pickCount > 1 ? "s" : ""}
        </p>
      </div>

      {/* Selection slots preview */}
      {pickCount > 1 && selected.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: pickCount }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-shrink-0 w-32 h-16 rounded-xl border-2 flex items-center justify-center text-xs font-semibold",
                selected[i]
                  ? "bg-white text-black border-white"
                  : "border-zinc-700 text-zinc-600"
              )}
            >
              {selected[i] ?? `Carta ${i + 1}`}
            </div>
          ))}
        </div>
      )}

      {/* Hand */}
      <div className="grid grid-cols-2 gap-2.5">
        {currentPlayer.hand.map((card, idx) => (
          <WhiteCard
            key={`${card}-${idx}`}
            text={card}
            selected={selected.includes(card)}
            selectionOrder={pickCount > 1 ? selected.indexOf(card) + 1 || undefined : undefined}
            onClick={() => toggleCard(card)}
          />
        ))}
      </div>

      {currentPlayer.hand.length === 0 && (
        <p className="text-zinc-600 text-center text-sm py-8">
          Sin cartas en mano...
        </p>
      )}

      {/* Submit button */}
      <button
        className="btn-primary flex items-center justify-center gap-2 sticky bottom-4"
        disabled={selected.length !== pickCount || submitting}
        onClick={handleSubmit}
      >
        {submitting ? (
          <><Loader2 size={20} className="animate-spin" /> Enviando...</>
        ) : (
          <><SendHorizonal size={20} /> Jugar carta{pickCount > 1 ? "s" : ""}</>
        )}
      </button>
    </div>
  );
}

function ZarWaiting({ room, waitingFor, nonZarCount, submittedCount }: {
  room: Room;
  waitingFor: string[];
  nonZarCount: number;
  submittedCount: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {room.currentBlackCard && (
        <BlackCard card={room.currentBlackCard} size="lg" />
      )}
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-center">
        <div className="text-4xl mb-3">👑</div>
        <h2 className="text-white font-black text-xl mb-1">Eres el Zar</h2>
        <p className="text-zinc-400 text-sm mb-4">
          Espera a que todos jueguen sus cartas
        </p>
        <div className="flex justify-center gap-1 mb-3">
          {Array.from({ length: nonZarCount }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full",
                i < submittedCount ? "bg-white" : "bg-zinc-700"
              )}
            />
          ))}
        </div>
        <p className="text-zinc-500 text-xs">
          {submittedCount}/{nonZarCount} han jugado
        </p>
        {waitingFor.length > 0 && (
          <p className="text-zinc-600 text-xs mt-2">
            Esperando a: {waitingFor.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function SubmittedWaiting({ waitingFor, nonZarCount, submittedCount }: {
  waitingFor: string[];
  nonZarCount: number;
  submittedCount: number;
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-center">
      <Loader2 size={32} className="animate-spin text-zinc-400 mx-auto mb-3" />
      <h2 className="text-white font-bold text-lg mb-1">Carta enviada</h2>
      <p className="text-zinc-400 text-sm mb-4">Esperando a los demás...</p>
      <div className="flex justify-center gap-1 mb-3">
        {Array.from({ length: nonZarCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full",
              i < submittedCount ? "bg-white" : "bg-zinc-700"
            )}
          />
        ))}
      </div>
      <p className="text-zinc-500 text-xs">
        {submittedCount}/{nonZarCount} han jugado
      </p>
      {waitingFor.length > 0 && (
        <p className="text-zinc-600 text-xs mt-2">
          Esperando a: {waitingFor.join(", ")}
        </p>
      )}
    </div>
  );
}
