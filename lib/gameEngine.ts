import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { generateRoomCode, buildDeck, shuffle } from "./cardUtils";
import type {
  Room,
  Player,
  Deck,
  RoomConfig,
  CardSet,
  WhiteCard,
  BlackCard,
} from "./types";

const HAND_SIZE = 10;

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function ensureAuth(): Promise<string> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

// ─── Room references ───────────────────────────────────────────────────────

export const roomRef = (code: string) => doc(getFirebaseDb(), "rooms", code);
export const playerRef = (code: string, uid: string) =>
  doc(getFirebaseDb(), "rooms", code, "players", uid);
export const deckRef = (code: string) =>
  doc(getFirebaseDb(), "rooms", code, "deck", "main");
export const playersRef = (code: string) =>
  collection(getFirebaseDb(), "rooms", code, "players");

// ─── Create Room ───────────────────────────────────────────────────────────

export async function createRoom(
  hostName: string,
  config: RoomConfig
): Promise<string> {
  const uid = await ensureAuth();
  let roomCode = generateRoomCode();

  // ensure unique code
  let attempts = 0;
  while (attempts < 10) {
    const snap = await getDoc(roomRef(roomCode));
    if (!snap.exists()) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  const room: Omit<Room, "createdAt"> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    roomCode,
    hostId: uid,
    status: "lobby",
    phase: "selection",
    currentRound: 0,
    config,
    zarPlayerId: uid,
    zarRotationIndex: 0,
    currentBlackCard: null,
    submissions: {},
    submissionMap: {},
    submittedCount: 0,
    winnerPlayerIds: [],
    playerOrder: [uid],
    createdAt: serverTimestamp(),
  };

  const player: Omit<Player, "joinedAt"> & { joinedAt: ReturnType<typeof serverTimestamp> } = {
    id: uid,
    name: hostName,
    hand: [],
    points: 0,
    isHost: true,
    hasSubmitted: false,
    orderIndex: 0,
    joinedAt: serverTimestamp(),
  };

  await setDoc(roomRef(roomCode), room);
  await setDoc(playerRef(roomCode, uid), player);

  return roomCode;
}

// ─── Join Room ─────────────────────────────────────────────────────────────

export async function joinRoom(
  roomCode: string,
  playerName: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await ensureAuth();
  const code = roomCode.toUpperCase();

  try {
    const result = await runTransaction(getFirebaseDb(), async (tx) => {
      const roomSnap = await tx.get(roomRef(code));
      if (!roomSnap.exists()) return { success: false, error: "Sala no encontrada" };

      const room = roomSnap.data() as Room;
      if (room.status !== "lobby") return { success: false, error: "La partida ya ha comenzado" };

      const playerSnap = await tx.get(playerRef(code, uid));
      if (playerSnap.exists()) {
        // Already in room — update name
        tx.update(playerRef(code, uid), { name: playerName });
        return { success: true };
      }

      const playersSnap = await getDocs(playersRef(code));
      const orderIndex = playersSnap.size;

      const player: Omit<Player, "joinedAt"> & { joinedAt: ReturnType<typeof serverTimestamp> } = {
        id: uid,
        name: playerName,
        hand: [],
        points: 0,
        isHost: false,
        hasSubmitted: false,
        orderIndex,
        joinedAt: serverTimestamp(),
      };

      tx.set(playerRef(code, uid), player);
      tx.update(roomRef(code), {
        playerOrder: [...room.playerOrder, uid],
      });

      return { success: true };
    });

    return result;
  } catch (e) {
    console.error(e);
    return { success: false, error: "Error al unirse a la sala" };
  }
}

// ─── Start Game ────────────────────────────────────────────────────────────

export async function startGame(
  roomCode: string,
  sets: CardSet[]
): Promise<void> {
  const roomSnap = await getDoc(roomRef(roomCode));
  if (!roomSnap.exists()) throw new Error("Sala no encontrada");
  const room = roomSnap.data() as Room;

  const playersSnap = await getDocs(playersRef(roomCode));
  const players = playersSnap.docs.map((d) => d.data() as Player);

  if (players.length < 2) throw new Error("Se necesitan al menos 2 jugadores");

  const { blackCards, whiteCards } = buildDeck(sets, room.config.selectedSets);

  // Shuffle player order, first player is Zar
  const playerOrder = shuffle(players.map((p) => p.id));
  const zarPlayerId = playerOrder[0];

  // Deal 10 cards to each non-Zar player (Zar also gets cards for next round)
  let whiteIndex = 0;
  const handUpdates: Promise<void>[] = [];

  for (const player of players) {
    const hand = whiteCards.slice(whiteIndex, whiteIndex + HAND_SIZE);
    whiteIndex += HAND_SIZE;
    handUpdates.push(
      updateDoc(playerRef(roomCode, player.id), { hand, hasSubmitted: false })
    );
  }

  await Promise.all(handUpdates);

  const firstBlackCard = blackCards[0];
  const deck: Deck = {
    blackCards,
    whiteCards,
    blackDealIndex: 1,
    whiteDealIndex: whiteIndex,
  };

  await setDoc(deckRef(roomCode), deck);
  await updateDoc(roomRef(roomCode), {
    status: "playing",
    phase: "selection",
    currentRound: 1,
    zarPlayerId,
    zarRotationIndex: 0,
    playerOrder,
    currentBlackCard: firstBlackCard,
    submissions: {},
    submissionMap: {},
    submittedCount: 0,
    winnerPlayerIds: [],
  });
}

// ─── Submit Cards ──────────────────────────────────────────────────────────

export async function submitCards(
  roomCode: string,
  playerId: string,
  selectedCards: WhiteCard[]
): Promise<void> {
  const submissionId = crypto.randomUUID();

  await runTransaction(getFirebaseDb(), async (tx) => {
    const roomSnap = await tx.get(roomRef(roomCode));
    const playerSnap = await tx.get(playerRef(roomCode, playerId));
    if (!roomSnap.exists() || !playerSnap.exists()) return;

    const room = roomSnap.data() as Room;
    const player = playerSnap.data() as Player;

    if (player.hasSubmitted || room.phase !== "selection") return;

    // Remove played cards from hand
    const newHand = player.hand.filter((c) => !selectedCards.includes(c));
    const newSubmittedCount = room.submittedCount + 1;

    tx.update(playerRef(roomCode, playerId), {
      hand: newHand,
      hasSubmitted: true,
    });

    tx.update(roomRef(roomCode), {
      [`submissions.${submissionId}`]: selectedCards,
      [`submissionMap.${playerId}`]: submissionId,
      submittedCount: newSubmittedCount,
    });
  });
}

// ─── Advance to Reveal ──────────────────────────────────────────────────────

export async function advanceToReveal(roomCode: string): Promise<void> {
  await runTransaction(getFirebaseDb(), async (tx) => {
    const roomSnap = await tx.get(roomRef(roomCode));
    if (!roomSnap.exists()) return;
    const room = roomSnap.data() as Room;
    if (room.phase !== "selection") return;

    tx.update(roomRef(roomCode), { phase: "reveal" });
  });
}

// ─── Advance to Verdict ─────────────────────────────────────────────────────

export async function advanceToVerdict(roomCode: string): Promise<void> {
  await runTransaction(getFirebaseDb(), async (tx) => {
    const roomSnap = await tx.get(roomRef(roomCode));
    if (!roomSnap.exists()) return;
    const room = roomSnap.data() as Room;
    if (room.phase !== "reveal") return;

    tx.update(roomRef(roomCode), { phase: "verdict" });
  });
}

// ─── Pick Winners (one submissionId per blank) ─────────────────────────────
// Each submissionId maps to one player who gets +1 point.
// The same player can appear multiple times (if Zar picks their card for 2+ blanks).

export async function pickWinners(
  roomCode: string,
  submissionIds: string[] // ordered: [blank1SubId, blank2SubId, ...]
): Promise<void> {
  await runTransaction(getFirebaseDb(), async (tx) => {
    const roomSnap = await tx.get(roomRef(roomCode));
    if (!roomSnap.exists()) return;
    const room = roomSnap.data() as Room;
    if (room.phase !== "verdict") return;

    // Reverse-lookup submissionMap ({ playerId → submissionId }) for each slot
    const reverseMap: Record<string, string> = {};
    for (const [pid, sid] of Object.entries(room.submissionMap)) {
      reverseMap[sid] = pid;
    }

    // Count points per player (a player might fill multiple blanks)
    const pointsPerPlayer: Record<string, number> = {};
    const winnerPlayerIds: string[] = [];
    for (const subId of submissionIds) {
      const pid = reverseMap[subId];
      if (!pid) continue;
      pointsPerPlayer[pid] = (pointsPerPlayer[pid] ?? 0) + 1;
      winnerPlayerIds.push(pid);
    }

    // Award points and check game over
    let isGameOver = false;
    for (const [pid, pts] of Object.entries(pointsPerPlayer)) {
      const snap = await tx.get(playerRef(roomCode, pid));
      if (!snap.exists()) continue;
      const player = snap.data() as Player;
      const newPoints = player.points + pts;
      if (newPoints >= room.config.maxPoints ||
        (room.config.maxRounds !== null && room.currentRound >= room.config.maxRounds)) {
        isGameOver = true;
      }
      tx.update(playerRef(roomCode, pid), { points: newPoints });
    }

    tx.update(roomRef(roomCode), {
      winnerPlayerIds,
      status: isGameOver ? "finished" : "playing",
    });
  });
}

// ─── Next Round ────────────────────────────────────────────────────────────

export async function nextRound(roomCode: string): Promise<void> {
  await runTransaction(getFirebaseDb(), async (tx) => {
    const roomSnap = await tx.get(roomRef(roomCode));
    const deckSnap = await tx.get(deckRef(roomCode));
    if (!roomSnap.exists() || !deckSnap.exists()) return;

    const room = roomSnap.data() as Room;
    const deck = deckSnap.data() as Deck;
    if (room.status !== "playing") return;

    // Rotate Zar
    const newZarIndex = (room.zarRotationIndex + 1) % room.playerOrder.length;
    const newZarId = room.playerOrder[newZarIndex];

    // Next black card
    const blackIdx = deck.blackDealIndex % deck.blackCards.length;
    const nextBlackCard: BlackCard = deck.blackCards[blackIdx];
    let whiteIdx = deck.whiteDealIndex;

    // Replenish hands (players need HAND_SIZE cards)
    const playersSnap = await getDocs(playersRef(roomCode));
    const players = playersSnap.docs.map((d) => d.data() as Player);

    for (const player of players) {
      const needed = HAND_SIZE - player.hand.length;
      if (needed <= 0) continue;
      const newCards = deck.whiteCards.slice(
        whiteIdx % deck.whiteCards.length,
        (whiteIdx % deck.whiteCards.length) + needed
      );
      whiteIdx += needed;
      tx.update(playerRef(roomCode, player.id), {
        hand: [...player.hand, ...newCards],
        hasSubmitted: false,
      });
    }

    tx.update(deckRef(roomCode), {
      blackDealIndex: blackIdx + 1,
      whiteDealIndex: whiteIdx,
    });

    tx.update(roomRef(roomCode), {
      phase: "selection",
      currentRound: room.currentRound + 1,
      zarPlayerId: newZarId,
      zarRotationIndex: newZarIndex,
      currentBlackCard: nextBlackCard,
      submissions: {},
      submissionMap: {},
      submittedCount: 0,
      winnerPlayerIds: [],
    });
  });
}

// ─── Leave Room ────────────────────────────────────────────────────────────

export async function leaveRoom(roomCode: string, playerId: string): Promise<void> {
  try {
    await updateDoc(playerRef(roomCode, playerId), { active: false });
  } catch {
    // ignore if doc doesn't exist
  }
}

// ─── Update Room Config ────────────────────────────────────────────────────

export async function updateRoomConfig(
  roomCode: string,
  config: Partial<Room["config"]>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (config.maxPoints !== undefined) updates["config.maxPoints"] = config.maxPoints;
  if (config.maxRounds !== undefined) updates["config.maxRounds"] = config.maxRounds;
  if (config.selectedSets !== undefined) updates["config.selectedSets"] = config.selectedSets;
  await updateDoc(roomRef(roomCode), updates);
}
