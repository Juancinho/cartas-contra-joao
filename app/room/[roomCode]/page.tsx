"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { onSnapshot, doc, collection } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { ensureAuth, startGame, joinRoom } from "@/lib/gameEngine";
import { loadAllSets } from "@/lib/cardUtils";
import { PlayerList } from "@/components/lobby/PlayerList";
import { HostConfig } from "@/components/lobby/HostConfig";
import { SelectionPhase } from "@/components/game/SelectionPhase";
import { RevealPhase } from "@/components/game/RevealPhase";
import { VerdictPhase } from "@/components/game/VerdictPhase";
import { FinishedScreen } from "@/components/game/FinishedScreen";
import { BlackCard } from "@/components/ui/BlackCard";
import type { Room, Player, CardSet } from "@/lib/types";
import { Loader2, Copy, Check, Users, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";

type Tab = "game" | "players" | "config";

export default function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allSets, setAllSets] = useState<CardSet[]>([]);
  const [customSets, setCustomSets] = useState<CardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("game");
  const [playerName, setPlayerName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [joiningWithName, setJoiningWithName] = useState(false);

  // Auth init
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        const id = await ensureAuth();
        setUid(id);
      }
    });
    return unsub;
  }, []);

  // Load sets (client-side via require)
  useEffect(() => {
    loadAllSets().then(setAllSets).catch(console.error);
  }, []);

  // Subscribe to room — wait for auth to be ready
  useEffect(() => {
    if (!roomCode || !uid) return;
    const unsub = onSnapshot(
      doc(db, "rooms", roomCode.toUpperCase()),
      (snap) => {
        if (!snap.exists()) {
          setError("Sala no encontrada");
          setLoading(false);
          return;
        }
        setRoom(snap.data() as Room);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Error al conectar con la sala");
        setLoading(false);
      }
    );
    return unsub;
  }, [roomCode, uid]);

  // Subscribe to players — wait for auth to be ready
  useEffect(() => {
    if (!roomCode || !uid) return;
    const unsub = onSnapshot(
      collection(db, "rooms", roomCode.toUpperCase(), "players"),
      (snap) => {
        const ps = snap.docs.map((d) => d.data() as Player);
        setPlayers(ps);
      }
    );
    return unsub;
  }, [roomCode, uid]);

  // Check if current user is in room
  useEffect(() => {
    if (!uid || !room || loading) return;
    const inRoom = players.some((p) => p.id === uid);
    if (!inRoom && room.status === "lobby") {
      setNeedsName(true);
    }
  }, [uid, room, players, loading]);

  const currentPlayer = players.find((p) => p.id === uid) ?? null;
  const isHost = currentPlayer?.isHost ?? false;
  const isZar = currentPlayer?.id === room?.zarPlayerId;

  async function handleJoinWithName() {
    if (!playerName.trim()) return;
    setJoiningWithName(true);
    const result = await joinRoom(roomCode.toUpperCase(), playerName.trim());
    if (result.success) {
      setNeedsName(false);
    } else {
      setError(result.error ?? "Error al unirse");
    }
    setJoiningWithName(false);
  }

  async function handleStartGame() {
    if (!room) return;
    setStarting(true);
    try {
      const mergedSets = [...allSets, ...customSets];
      await startGame(room.roomCode, mergedSets);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al iniciar";
      setError(msg);
    } finally {
      setStarting(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(room?.roomCode ?? roomCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-dvh bg-black flex flex-col items-center justify-center px-4 gap-4">
        <p className="text-red-400 text-lg font-bold">{error}</p>
        <button className="btn-secondary" onClick={() => router.push("/")}>Volver al inicio</button>
      </div>
    );
  }

  // ── Name prompt (direct URL access) ─────────────────────────────────────
  if (needsName) {
    return (
      <div className="min-h-dvh bg-black flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <div className="text-center mb-4">
            <div className="inline-block bg-white text-black px-4 py-1 rounded-xl mb-2">
              <span className="font-black tracking-widest text-xl">{roomCode.toUpperCase()}</span>
            </div>
            <h2 className="text-white font-bold text-xl">Unirse a la sala</h2>
          </div>
          <input
            className="input-base"
            placeholder="Tu nombre..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinWithName()}
            autoFocus
            maxLength={20}
          />
          <button className="btn-primary" onClick={handleJoinWithName} disabled={joiningWithName}>
            {joiningWithName ? "Uniéndose..." : "Entrar"}
          </button>
        </div>
      </div>
    );
  }

  if (!room || !currentPlayer) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────────
  if (room.status === "finished") {
    return <FinishedScreen room={room} players={players} currentPlayer={currentPlayer} />;
  }

  // ── LOBBY ─────────────────────────────────────────────────────────────────
  if (room.status === "lobby") {
    return (
      <div className="min-h-dvh bg-black flex flex-col">
        {/* Header */}
        <header className="bg-zinc-950 border-b border-zinc-800 px-4 py-4 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-white font-black text-lg">Sala de espera</h1>
            <p className="text-zinc-500 text-xs">{players.length} jugador{players.length !== 1 ? "es" : ""} conectado{players.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-black text-lg tracking-widest active:scale-95 transition-transform"
          >
            {codeCopied ? <Check size={16} /> : <Copy size={16} />}
            {room.roomCode}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Tab nav */}
          {isHost && (
            <div className="flex bg-zinc-900 rounded-xl p-1 gap-1">
              {(["players", "config"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
                    tab === t ? "bg-white text-black" : "text-zinc-500 active:text-white"
                  )}
                >
                  {t === "players" ? <><Users size={14} /> Jugadores</> : <><Settings size={14} /> Config</>}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          {(!isHost || tab === "players") && (
            <PlayerList players={players} room={room} currentPlayerId={uid!} />
          )}

          {isHost && tab === "config" && (
            <HostConfig
              room={room}
              customSets={customSets}
              onCustomSetAdded={(s) => setCustomSets((prev) => [...prev, s])}
            />
          )}

          {/* Start game button (host only) */}
          {isHost && (
            <div className="sticky bottom-4 mt-2">
              {error && <p className="text-red-400 text-sm mb-2 text-center">{error}</p>}
              <button
                className="btn-primary w-full"
                onClick={handleStartGame}
                disabled={starting || players.length < 2 || room.config.selectedSets.length === 0}
              >
                {starting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" /> Iniciando...
                  </span>
                ) : players.length < 2 ? (
                  "Esperando jugadores..."
                ) : (
                  "¡Empezar partida!"
                )}
              </button>
            </div>
          )}

          {!isHost && (
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-center">
              <Loader2 size={24} className="animate-spin text-zinc-500 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Esperando a que el host inicie la partida...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  const zarPlayer = players.find((p) => p.id === room.zarPlayerId);

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      {/* Game Header */}
      <header className="bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs font-semibold">
              Ronda {room.currentRound}
            </span>
            {room.config.maxRounds && (
              <span className="text-zinc-700 text-xs">/ {room.config.maxRounds}</span>
            )}
            <span className="text-zinc-700 text-xs mx-1">·</span>
            <span className="text-zinc-500 text-xs">
              Zar: <strong className="text-white">{zarPlayer?.name ?? "?"}</strong>
              {isZar && " (tú)"}
            </span>
          </div>
          {/* Phase indicator */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {(["selection", "reveal", "verdict"] as const).map((ph) => (
              <div
                key={ph}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  ph === "selection" ? "w-8" : ph === "reveal" ? "w-8" : "w-8",
                  room.phase === ph ? "bg-white" : "bg-zinc-700"
                )}
              />
            ))}
            <span className="text-zinc-600 text-xs ml-1 capitalize">
              {room.phase === "selection" ? "Jugando" : room.phase === "reveal" ? "Revelando" : "Veredicto"}
            </span>
          </div>
        </div>

        {/* Score for current player */}
        <div className="text-right flex-shrink-0">
          <div className="text-white font-black text-xl">{currentPlayer.points}</div>
          <div className="text-zinc-600 text-xs">pts</div>
        </div>

        {/* Players tab toggle */}
        <button
          onClick={() => setTab(tab === "players" ? "game" : "players")}
          className={cn(
            "p-2 rounded-xl transition-colors",
            tab === "players" ? "bg-white text-black" : "text-zinc-500 active:text-white"
          )}
        >
          <Users size={20} />
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "players" ? (
          <div className="flex flex-col gap-4">
            <PlayerList players={players} room={room} currentPlayerId={uid!} />
            <button onClick={() => setTab("game")} className="btn-secondary">
              ← Volver al juego
            </button>
          </div>
        ) : (
          <>
            {room.phase === "selection" && (
              <SelectionPhase
                room={room}
                currentPlayer={currentPlayer}
                players={players}
              />
            )}
            {room.phase === "reveal" && (
              <RevealPhase
                room={room}
                currentPlayer={currentPlayer}
              />
            )}
            {room.phase === "verdict" && (
              <VerdictPhase
                room={room}
                currentPlayer={currentPlayer}
                players={players}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
