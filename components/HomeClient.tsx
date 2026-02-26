"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogIn, Loader2 } from "lucide-react";
import { createRoom, joinRoom } from "@/lib/gameEngine";
import type { RoomConfig } from "@/lib/types";

const DEFAULT_CONFIG: RoomConfig = {
  maxPoints: 8,
  maxRounds: null,
  selectedSets: ["gigi", "CAH-es-set"],
};

type View = "home" | "create" | "join";

export default function HomePage() {
  const router = useRouter();
  const [view, setView] = useState<View>("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Introduce tu nombre"); return; }
    setLoading(true);
    setError("");
    try {
      const roomCode = await createRoom(name.trim(), DEFAULT_CONFIG);
      router.push(`/room/${roomCode}`);
    } catch (e) {
      console.error(e);
      setError("Error al crear la sala. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim()) { setError("Introduce tu nombre"); return; }
    if (!code.trim() || code.trim().length < 4) { setError("Código inválido (mín. 4 caracteres)"); return; }
    setLoading(true);
    setError("");
    try {
      const result = await joinRoom(code.trim(), name.trim());
      if (!result.success) {
        setError(result.error ?? "Error al unirse");
        setLoading(false);
        return;
      }
      router.push(`/room/${code.trim().toUpperCase()}`);
    } catch (e) {
      console.error(e);
      setError("Error al unirse a la sala.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-black flex flex-col items-center justify-center px-4 py-8">
      {/* Logo / Title */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="inline-block bg-white text-black px-6 py-3 rounded-2xl mb-4">
          <span className="text-3xl font-black tracking-tight">CCJ</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Cartas contra Joao
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          El juego de cartas para personas horribles
        </p>
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        {view === "home" && (
          <div className="flex flex-col gap-4">
            <button
              className="btn-primary flex items-center justify-center gap-3"
              onClick={() => setView("create")}
            >
              <Plus size={22} />
              Crear sala
            </button>
            <button
              className="btn-secondary flex items-center justify-center gap-3"
              onClick={() => setView("join")}
            >
              <LogIn size={22} />
              Unirse a una sala
            </button>
          </div>
        )}

        {view === "create" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => { setView("home"); setError(""); }}
              className="text-zinc-500 text-sm self-start mb-1 active:text-white transition-colors"
            >
              ← Volver
            </button>
            <div>
              <label className="text-zinc-400 text-sm font-semibold mb-2 block">
                Tu nombre
              </label>
              <input
                className="input-base"
                placeholder="¿Cómo te llamas?"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                maxLength={20}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm font-medium">{error}</p>
            )}
            <button
              className="btn-primary flex items-center justify-center gap-2"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /> Creando...</>
              ) : (
                <><Plus size={20} /> Crear sala</>
              )}
            </button>
          </div>
        )}

        {view === "join" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => { setView("home"); setError(""); }}
              className="text-zinc-500 text-sm self-start mb-1 active:text-white transition-colors"
            >
              ← Volver
            </button>
            <div>
              <label className="text-zinc-400 text-sm font-semibold mb-2 block">
                Tu nombre
              </label>
              <input
                className="input-base"
                placeholder="¿Cómo te llamas?"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                maxLength={20}
                autoFocus
              />
            </div>
            <div>
              <label className="text-zinc-400 text-sm font-semibold mb-2 block">
                Código de sala
              </label>
              <input
                className="input-base uppercase tracking-widest text-center text-2xl font-black"
                placeholder="XXXXX"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                  setError("");
                }}
                maxLength={6}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm font-medium">{error}</p>
            )}
            <button
              className="btn-primary flex items-center justify-center gap-2"
              onClick={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /> Uniéndose...</>
              ) : (
                <><LogIn size={20} /> Entrar</>
              )}
            </button>
          </div>
        )}
      </div>

      <p className="text-zinc-700 text-xs mt-12">
        +18 · Solo para adultos con mal gusto
      </p>
    </main>
  );
}
