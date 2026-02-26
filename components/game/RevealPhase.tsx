"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { BlackCard } from "@/components/ui/BlackCard";
import { WhiteCard } from "@/components/ui/WhiteCard";
import { advanceToVerdict } from "@/lib/gameEngine";
import type { Room, Player } from "@/lib/types";

interface RevealPhaseProps {
  room: Room;
  currentPlayer: Player;
}

export function RevealPhase({ room, currentPlayer }: RevealPhaseProps) {
  const isZar = currentPlayer.id === room.zarPlayerId;
  const [advancing, setAdvancing] = useState(false);

  // Shuffle the submission IDs for display (stable order per render)
  const submissionEntries = Object.entries(room.submissions);

  async function handleAdvance() {
    setAdvancing(true);
    try {
      await advanceToVerdict(room.roomCode);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Black card */}
      {room.currentBlackCard && (
        <BlackCard card={room.currentBlackCard} size="lg" />
      )}

      <div className="flex items-center gap-2 px-1">
        <Eye size={16} className="text-zinc-400" />
        <p className="text-zinc-400 text-sm">
          {submissionEntries.length} respuesta{submissionEntries.length !== 1 ? "s" : ""} recibida{submissionEntries.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Anonymous submissions */}
      <div className="flex flex-col gap-3">
        {submissionEntries.map(([subId, cards], idx) => (
          <div
            key={subId}
            className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 animate-fade-in"
          >
            <p className="text-zinc-600 text-xs mb-2">Respuesta {idx + 1}</p>
            <div className="flex flex-col gap-2">
              {cards.map((card, i) => (
                <WhiteCard key={i} text={card} size="md" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {isZar ? (
        <button
          className="btn-primary sticky bottom-4"
          onClick={handleAdvance}
          disabled={advancing}
        >
          {advancing ? "..." : "Elegir la ganadora →"}
        </button>
      ) : (
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 text-center">
          <p className="text-zinc-400 text-sm">
            El Zar está leyendo las respuestas...
          </p>
        </div>
      )}
    </div>
  );
}
