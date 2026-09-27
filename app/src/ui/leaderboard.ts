/**
 * Leaderboard: localStorage always works (survives browser refresh).
 * Optional match server + Tiger Data (DATABASE_URL) = shared board that
 * survives server restarts and works across machines at the venue.
 *
 * One row per player name: a new run only replaces the old if it's better
 * (higher margin human−fly, then higher human score).
 */

export type LeaderEntry = {
  id: string;
  name: string;
  humanScore: number;
  flyScore: number;
  margin: number;
  won: boolean;
  mode: string;
  ts: string;
};

const STORAGE_KEY = "beat-the-fly-leaderboard-v1";
const NAME_KEY = "beat-the-fly-player-name";
const MAX_LOCAL = 50;

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8787";

/** Case-insensitive key so "Alex" and "alex" are the same player. */
export function nameKey(name: string): string {
  const t = name.trim().toLowerCase();
  return t || "anonymous";
}

/** True if `a` should replace `b` on the board. */
export function isBetterScore(
  a: { humanScore: number; flyScore: number },
  b: { humanScore: number; flyScore: number }
): boolean {
  const am = a.humanScore - a.flyScore;
  const bm = b.humanScore - b.flyScore;
  if (am !== bm) return am > bm;
  return a.humanScore > b.humanScore;
}

export function loadPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function savePlayerName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 24));
  } catch {
    /* private mode */
  }
}

/** Silly online-game style names (Adjective + Noun + optional digits). */
const NAME_ADJ = [
  "Swift",
  "Pixel",
  "Turbo",
  "Lucky",
  "Brave",
  "Sneaky",
  "Cosmic",
  "Neon",
  "Quiet",
  "Zippy",
  "Fuzzy",
  "Crispy",
  "Royal",
  "Dusty",
  "Hyper",
  "Chill",
];
const NAME_NOUN = [
  "Fly",
  "Gnat",
  "Moth",
  "Hopper",
  "Wings",
  "Buzz",
  "Lane",
  "Skip",
  "Dash",
  "Pollen",
  "Nectar",
  "Voxel",
  "Hex",
  "Spark",
  "Drift",
  "Glider",
];

export function randomPlayerName(): string {
  const adj = NAME_ADJ[Math.floor(Math.random() * NAME_ADJ.length)];
  const noun = NAME_NOUN[Math.floor(Math.random() * NAME_NOUN.length)];
  const n = Math.floor(Math.random() * 90) + 10; // 10–99
  const name = `${adj}${noun}${n}`;
  return name.slice(0, 24);
}

export function loadLocalBoard(): LeaderEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalBoard(entries: LeaderEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_LOCAL)));
  } catch {
    /* ignore */
  }
}

/** Rank humans by margin, then score. */
export function rankEntries(entries: LeaderEntry[]): LeaderEntry[] {
  return [...entries].sort((a, b) => {
    if (b.margin !== a.margin) return b.margin - a.margin;
    if (b.humanScore !== a.humanScore) return b.humanScore - a.humanScore;
    return a.ts < b.ts ? 1 : -1;
  });
}

/** Keep the best run per player name. */
export function bestPerName(entries: LeaderEntry[]): LeaderEntry[] {
  const by = new Map<string, LeaderEntry>();
  for (const e of entries) {
    const k = nameKey(e.name);
    const prev = by.get(k);
    if (!prev || isBetterScore(e, prev)) by.set(k, e);
  }
  return rankEntries([...by.values()]);
}

/**
 * Upsert: same name keeps only their best run.
 * Returns the entry that is now on the board for that name (new or previous).
 */
export function addLocalEntry(
  partial: Omit<LeaderEntry, "id" | "ts" | "margin" | "won">
): LeaderEntry {
  const entry: LeaderEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    margin: partial.humanScore - partial.flyScore,
    won: partial.humanScore >= partial.flyScore,
    ...partial,
    name: partial.name.trim().slice(0, 24) || "Anonymous",
  };

  // Collapse any legacy duplicate names from before upsert existed.
  const board = bestPerName(loadLocalBoard());
  const key = nameKey(entry.name);
  const idx = board.findIndex((e) => nameKey(e.name) === key);

  if (idx >= 0) {
    if (!isBetterScore(entry, board[idx])) {
      // Worse or equal — keep the existing personal best.
      writeLocalBoard(board);
      return board[idx];
    }
    board[idx] = entry;
  } else {
    board.push(entry);
  }

  writeLocalBoard(rankEntries(board));
  return entry;
}

export async function fetchRemoteBoard(): Promise<LeaderEntry[]> {
  try {
    const r = await fetch(`${API_BASE}/leaderboard`);
    if (!r.ok) return [];
    const rows = (await r.json()) as LeaderEntry[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Prefer remote when available; merge local so this browser’s best still shows. */
export async function loadBoard(): Promise<{
  entries: LeaderEntry[];
  source: "remote" | "local";
}> {
  const local = loadLocalBoard();
  const remote = await fetchRemoteBoard();
  if (remote.length === 0) {
    return { entries: bestPerName(local), source: "local" };
  }
  return { entries: bestPerName([...remote, ...local]), source: "remote" };
}

export async function postMatch(body: {
  region: string;
  human_score: number;
  fly_score: number;
  controller: string;
  duration_s: number;
  player_name: string;
  spike_summary?: Record<string, number>;
}): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Short science beats shown after each round — educational without a lecture. */
export const TEACH_TIPS = [
  {
    title: "AL → MB → CX",
    body: "Smell relay (antennal lobe) soft-feeds memory (mushroom body), which soft-feeds navigation (central complex). Three real MaleCNS regions — not an LLM.",
  },
  {
    title: "Frozen wiring",
    body: "We freeze the connectome, then train only thin encoders/decoders. Ablations prove it: real wiring ~95% teacher match; shuffled collapses to ~10%.",
  },
  {
    title: "Brain-weighted search",
    body: "The pathway scores hops; look-ahead search picks a legal, safe move. Brain proposes (priorStrength 18), search enforces — Fly Chess–style hybrid.",
  },
  {
    title: "Central complex",
    body: "In the fly, Ring / PFN / PFL cells steer. Here they still drive the move logits you see in the sidebar.",
  },
  {
    title: "Honest scope",
    body: "This is ~11k neurons across three regions — not the whole 166k MaleCNS. The atlas lights AL + MB + CX; optic lobes stay dim on purpose.",
  },
];

export function tipForRound(seed: number) {
  return TEACH_TIPS[Math.abs(seed) % TEACH_TIPS.length];
}
