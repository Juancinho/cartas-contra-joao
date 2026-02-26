"use client";

import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Upload, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { updateRoomConfig } from "@/lib/gameEngine";
import { parseCustomSet } from "@/lib/cardUtils";
import type { Room, CardSet, RoomConfig } from "@/lib/types";

const ALL_SETS = [
  { codeName: "base-set", name: "Base Set", official: true },
  { codeName: "CAH-es-set", name: "Pack Oficial España", official: true },
  { codeName: "green-box-expansion", name: "Green Box Expansion", official: true },
  { codeName: "the-first-expansion", name: "1ª Expansión", official: true },
  { codeName: "the-second-expansion", name: "2ª Expansión", official: true },
  { codeName: "the-third-expansion", name: "3ª Expansión", official: true },
  { codeName: "the-fourth-expansion", name: "4ª Expansión", official: true },
  { codeName: "the-fifth-expansion", name: "5ª Expansión", official: true },
  { codeName: "the-sixth-expansion", name: "6ª Expansión", official: true },
  { codeName: "canadian", name: "Canadian", official: false },
  { codeName: "fantasy-pack", name: "Fantasy Pack", official: false },
  { codeName: "food-pack", name: "Food Pack", official: false },
  { codeName: "holiday-pack-2012", name: "Holiday Pack 2012", official: false },
  { codeName: "holiday-pack-2013", name: "Holiday Pack 2013", official: false },
  { codeName: "house-of-cards-against-humanity", name: "House of Cards", official: false },
  { codeName: "nostalgia-pack-90s", name: "Nostalgia 90s", official: false },
  { codeName: "pax-east-2013", name: "PAX East 2013", official: false },
  { codeName: "pax-east-2014", name: "PAX East 2014", official: false },
  { codeName: "pax-prime-2013", name: "PAX Prime 2013", official: false },
  { codeName: "programmer-pack", name: "Programmer Pack", official: false },
  { codeName: "red-rising-pack", name: "Red Rising", official: false },
  { codeName: "science-pack", name: "Science Pack", official: false },
  { codeName: "world-wide-web-pack", name: "WWW Pack", official: false },
  { codeName: "reject-pack", name: "Reject Pack", official: false },
  { codeName: "reject-pack-2", name: "Reject Pack 2", official: false },
];

interface HostConfigProps {
  room: Room;
  customSets: CardSet[];
  onCustomSetAdded: (set: CardSet) => void;
}

export function HostConfig({ room, customSets, onCustomSetAdded }: HostConfigProps) {
  const [selectedSets, setSelectedSets] = useState<string[]>(room.config.selectedSets);
  const [maxPoints, setMaxPoints] = useState(room.config.maxPoints);
  const [maxRounds, setMaxRounds] = useState<number | null>(room.config.maxRounds);
  const [showSets, setShowSets] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  // Custom card form
  const [customWhite, setCustomWhite] = useState("");
  const [customBlack, setCustomBlack] = useState("");
  const [customBlackPick, setCustomBlackPick] = useState(1);
  const [localCustomCards, setLocalCustomCards] = useState<{ whites: string[]; blacks: Array<{ text: string; pick: number }> }>({
    whites: [], blacks: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleSet(codeName: string) {
    setSelectedSets((prev) =>
      prev.includes(codeName) ? prev.filter((s) => s !== codeName) : [...prev, codeName]
    );
  }

  async function saveConfig() {
    setSaving(true);
    const config: Partial<RoomConfig> = { selectedSets, maxPoints, maxRounds };
    await updateRoomConfig(room.roomCode, config);
    setSaving(false);
  }

  function addCustomWhite() {
    if (!customWhite.trim()) return;
    setLocalCustomCards((prev) => ({ ...prev, whites: [...prev.whites, customWhite.trim()] }));
    setCustomWhite("");
  }

  function addCustomBlack() {
    if (!customBlack.trim()) return;
    setLocalCustomCards((prev) => ({
      ...prev,
      blacks: [...prev.blacks, { text: customBlack.trim(), pick: customBlackPick }]
    }));
    setCustomBlack("");
  }

  function commitCustomCards() {
    if (localCustomCards.whites.length === 0 && localCustomCards.blacks.length === 0) return;
    const set: CardSet = {
      name: "Cartas personalizadas",
      codeName: `custom-${Date.now()}`,
      official: false,
      blackCards: localCustomCards.blacks,
      whiteCards: localCustomCards.whites,
    };
    onCustomSetAdded(set);
    const newSelected = [...selectedSets, set.codeName];
    setSelectedSets(newSelected);
    updateRoomConfig(room.roomCode, { selectedSets: newSelected });
    setLocalCustomCards({ whites: [], blacks: [] });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const set = parseCustomSet(json, file.name.replace(".json", ""));
      if (!set) { alert("Formato de archivo inválido"); return; }
      onCustomSetAdded(set);
      const newSelected = [...selectedSets, set.codeName];
      setSelectedSets(newSelected);
      updateRoomConfig(room.roomCode, { selectedSets: newSelected });
    } catch {
      alert("Error al leer el archivo JSON");
    }
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rules */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">
          Reglas de partida
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-zinc-400 text-xs mb-1.5 block">
              Puntos para ganar
            </label>
            <div className="flex items-center gap-3">
              {[5, 8, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxPoints(n)}
                  className={cn(
                    "w-10 h-10 rounded-xl font-bold text-sm transition-all",
                    maxPoints === n
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-400 active:bg-zinc-700"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-1.5 block">
              Límite de rondas (opcional)
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {[null, 10, 15, 20, 30].map((n) => (
                <button
                  key={n ?? "inf"}
                  onClick={() => setMaxRounds(n)}
                  className={cn(
                    "px-3 h-10 rounded-xl font-bold text-sm transition-all",
                    maxRounds === n
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-400 active:bg-zinc-700"
                  )}
                >
                  {n === null ? "∞" : n}
                </button>
              ))}
            </div>
          </div>

          <button onClick={saveConfig} disabled={saving} className="btn-primary py-2 px-4 text-sm min-h-0">
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </div>

      {/* Set Selector */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 text-left"
          onClick={() => setShowSets(!showSets)}
        >
          <div>
            <span className="font-bold text-white text-sm uppercase tracking-wide">Mazos</span>
            <span className="text-zinc-500 text-xs ml-2">({selectedSets.length} seleccionados)</span>
          </div>
          {showSets ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </button>

        {showSets && (
          <div className="px-4 pb-4 flex flex-col gap-1 border-t border-zinc-800">
            {/* Quick select all/none */}
            <div className="flex gap-2 py-2">
              <button onClick={() => setSelectedSets(ALL_SETS.map(s => s.codeName))} className="text-xs text-zinc-400 active:text-white">
                Todo
              </button>
              <span className="text-zinc-700">·</span>
              <button onClick={() => setSelectedSets([])} className="text-xs text-zinc-400 active:text-white">
                Ninguno
              </button>
            </div>

            {/* Official sets */}
            <p className="text-zinc-600 text-xs uppercase tracking-wider font-semibold mt-1 mb-1">Oficiales</p>
            {ALL_SETS.filter(s => s.official).map((set) => (
              <SetToggle
                key={set.codeName}
                name={set.name}
                selected={selectedSets.includes(set.codeName)}
                onToggle={() => toggleSet(set.codeName)}
              />
            ))}

            {/* Community sets */}
            <p className="text-zinc-600 text-xs uppercase tracking-wider font-semibold mt-3 mb-1">Packs especiales</p>
            {ALL_SETS.filter(s => !s.official).map((set) => (
              <SetToggle
                key={set.codeName}
                name={set.name}
                selected={selectedSets.includes(set.codeName)}
                onToggle={() => toggleSet(set.codeName)}
              />
            ))}

            {/* Custom sets */}
            {customSets.length > 0 && (
              <>
                <p className="text-zinc-600 text-xs uppercase tracking-wider font-semibold mt-3 mb-1">Personalizados</p>
                {customSets.map((set) => (
                  <SetToggle
                    key={set.codeName}
                    name={set.name}
                    selected={selectedSets.includes(set.codeName)}
                    onToggle={() => toggleSet(set.codeName)}
                  />
                ))}
              </>
            )}

            <button onClick={saveConfig} disabled={saving} className="btn-primary py-2 px-4 text-sm min-h-0 mt-3">
              {saving ? "Guardando..." : "Guardar selección"}
            </button>
          </div>
        )}
      </div>

      {/* Custom Cards */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 text-left"
          onClick={() => setShowCustom(!showCustom)}
        >
          <span className="font-bold text-white text-sm uppercase tracking-wide">Cartas personalizadas</span>
          {showCustom ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </button>

        {showCustom && (
          <div className="px-4 pb-4 border-t border-zinc-800 flex flex-col gap-4">
            {/* File upload */}
            <div className="pt-3">
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center justify-center gap-2 py-2 px-4 text-sm min-h-0 w-full"
              >
                <Upload size={16} /> Importar JSON
              </button>
            </div>

            {/* White card form */}
            <div>
              <p className="text-zinc-400 text-xs font-semibold mb-2">Carta blanca (respuesta)</p>
              <div className="flex gap-2">
                <input
                  className="input-base text-sm flex-1 min-h-0 py-2"
                  placeholder="Texto de la carta..."
                  value={customWhite}
                  onChange={(e) => setCustomWhite(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomWhite()}
                  maxLength={200}
                />
                <button onClick={addCustomWhite} className="btn-primary px-3 py-2 text-sm min-h-0">
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Black card form */}
            <div>
              <p className="text-zinc-400 text-xs font-semibold mb-2">Carta negra (pregunta)</p>
              <div className="flex gap-2 mb-2">
                <input
                  className="input-base text-sm flex-1 min-h-0 py-2"
                  placeholder="Frase con _ como hueco..."
                  value={customBlack}
                  onChange={(e) => setCustomBlack(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomBlack()}
                  maxLength={300}
                />
                <button onClick={addCustomBlack} className="bg-zinc-200 text-black px-3 py-2 rounded-xl min-h-0">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCustomBlackPick(n)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold",
                      customBlackPick === n ? "bg-white text-black" : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    Elige {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {(localCustomCards.whites.length > 0 || localCustomCards.blacks.length > 0) && (
              <div className="flex flex-col gap-2">
                <p className="text-zinc-500 text-xs">
                  {localCustomCards.whites.length} blancas · {localCustomCards.blacks.length} negras añadidas
                </p>
                {localCustomCards.whites.slice(-3).map((c, i) => (
                  <div key={i} className="bg-white text-black rounded-xl p-2 text-xs font-semibold flex justify-between">
                    {c}
                    <button onClick={() => setLocalCustomCards(prev => ({ ...prev, whites: prev.whites.filter((_, j) => j !== prev.whites.length - 3 + i) }))} className="text-zinc-400 ml-2">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button onClick={commitCustomCards} className="btn-primary py-2 px-4 text-sm min-h-0">
                  Añadir al mazo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SetToggle({ name, selected, onToggle }: { name: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-3 w-full py-2.5 px-3 rounded-xl text-sm font-medium transition-colors text-left",
        selected ? "bg-white text-black" : "bg-zinc-800/60 text-zinc-400 active:bg-zinc-800"
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center",
        selected ? "bg-black border-black" : "border-zinc-600"
      )}>
        {selected && <span className="text-white text-xs font-black">✓</span>}
      </div>
      {name}
    </button>
  );
}
