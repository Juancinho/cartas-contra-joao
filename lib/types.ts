import type { Timestamp } from "firebase/firestore";

// ─── Card Types ────────────────────────────────────────────────────────────

export interface BlackCard {
  text: string;
  pick: number; // how many white cards to play
}

export type WhiteCard = string;

export interface CardSet {
  name: string;
  codeName: string;
  official: boolean;
  blackCards: BlackCard[];
  whiteCards: WhiteCard[];
}

// ─── Player ────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  hand: WhiteCard[];
  points: number;
  isHost: boolean;
  hasSubmitted: boolean;
  orderIndex: number;
  joinedAt: Timestamp;
}

// ─── Room Config ───────────────────────────────────────────────────────────

export interface RoomConfig {
  maxPoints: number;
  maxRounds: number | null; // null = until maxPoints
  selectedSets: string[]; // set codeNames
}

// ─── Submission (anonymous until verdict) ─────────────────────────────────

// submissions: { [submissionId]: cards[] }   — visible to all (anonymous)
// submissionMap: { [playerId]: submissionId } — revealed only in verdict
export type Submissions = Record<string, WhiteCard[]>;
export type SubmissionMap = Record<string, string>;

// ─── Room ──────────────────────────────────────────────────────────────────

export type RoomStatus = "lobby" | "playing" | "finished";
export type GamePhase = "selection" | "reveal" | "verdict";

export interface Room {
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  phase: GamePhase;
  currentRound: number;
  config: RoomConfig;
  zarPlayerId: string;
  zarRotationIndex: number;
  currentBlackCard: BlackCard | null;
  submissions: Submissions;
  submissionMap: SubmissionMap;
  submittedCount: number;
  winnerPlayerIds: string[]; // one per blank filled by the Zar
  playerOrder: string[]; // ordered UIDs for zar rotation
  createdAt: Timestamp;
}

// ─── Deck (stored in subcollection to keep room doc small) ─────────────────

export interface Deck {
  blackCards: BlackCard[];
  whiteCards: WhiteCard[];
  blackDealIndex: number;
  whiteDealIndex: number;
}

// ─── UI State ──────────────────────────────────────────────────────────────

export interface GameState {
  room: Room | null;
  players: Player[];
  currentPlayer: Player | null;
  isZar: boolean;
  isHost: boolean;
}
