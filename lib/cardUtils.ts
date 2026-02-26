import he from "he";
import type { CardSet, BlackCard, WhiteCard } from "./types";

// ─── Decode HTML entities in card text ─────────────────────────────────────

export function decodeCard(text: string): string {
  return he.decode(text);
}

// ─── Shuffle array (Fisher-Yates) ──────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Build merged deck from selected sets ──────────────────────────────────

export function buildDeck(
  sets: CardSet[],
  selectedCodeNames: string[]
): { blackCards: BlackCard[]; whiteCards: WhiteCard[] } {
  const selected = sets.filter((s) => selectedCodeNames.includes(s.codeName));

  const blackCards: BlackCard[] = [];
  const whiteCards: WhiteCard[] = [];

  for (const set of selected) {
    for (const card of set.blackCards) {
      blackCards.push({ text: decodeCard(card.text), pick: card.pick });
    }
    for (const card of set.whiteCards) {
      whiteCards.push(decodeCard(card));
    }
  }

  return {
    blackCards: shuffle(blackCards),
    whiteCards: shuffle(whiteCards),
  };
}

// ─── Generate a random room code ───────────────────────────────────────────

export function generateRoomCode(length = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 (confusing)
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Load all sets from /sets directory (server-side only) ─────────────────
// Used in a Next.js Server Component or Route Handler

export async function loadAllSets(): Promise<CardSet[]> {
  // Dynamic import at build time via Next.js
  const setFiles = [
    "base-set",
    "CAH-es-set",
    "box-expansion",
    "canadian",
    "fantasy-pack",
    "food-pack",
    "green-box-expansion",
    "holiday-pack-2012",
    "holiday-pack-2013",
    "house-of-cards-against-humanity",
    "nostalgia-pack-90s",
    "pax-east-2013",
    "pax-east-2014-panel-pack",
    "pax-east-2014",
    "pax-prime-2013",
    "pax-prime-2014-panel-pack",
    "pax-prime-2015-food-packs",
    "programmer-pack",
    "red-rising-pack",
    "reject-pack-2",
    "reject-pack",
    "science-pack",
    "the-fifth-expansion",
    "the-first-expansion",
    "the-fourth-expansion",
    "the-second-expansion",
    "the-sixth-expansion",
    "the-third-expansion",
    "world-wide-web-pack",
    "gigi",
  ];

  const sets: CardSet[] = [];
  for (const file of setFiles) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const data = require(`../sets/${file}.json`) as CardSet;
      sets.push(data);
    } catch {
      console.warn(`Could not load set: ${file}`);
    }
  }
  return sets;
}

// ─── Parse custom uploaded JSON ────────────────────────────────────────────

export function parseCustomSet(json: unknown, name: string): CardSet | null {
  try {
    const data = json as Partial<CardSet>;
    return {
      name: data.name ?? name,
      codeName: `custom-${Date.now()}`,
      official: false,
      blackCards: (data.blackCards ?? []).map((c) => ({
        text: typeof c === "string" ? c : c.text,
        pick: typeof c === "string" ? 1 : c.pick ?? 1,
      })),
      whiteCards: (data.whiteCards ?? []).map((c) =>
        typeof c === "string" ? c : String(c)
      ),
    };
  } catch {
    return null;
  }
}
