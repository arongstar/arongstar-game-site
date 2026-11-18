// 학생 기록은 이 기기(브라우저) 안에만 저장합니다. 이름·학번은 저장하지 않아요.
export type Tier = 'C' | 'B' | 'A';
export const TIER_ORDER: Tier[] = ['C', 'B', 'A'];

export interface StepResult {
  key: string;
  std: string;
  cat: string;
  lv: Tier;
  ok: boolean; // 처음에 맞혔는지
  hint: boolean; // 탐험 노트를 봤는지
}
export interface StageRun {
  at: number;
  first: number;
  total: number;
  stars: number;
  best: number;
  results: StepResult[];
}
export interface Note {
  id: string;
  unit: string;
  game?: string;
  stage?: string;
  q: string;
  a?: string;
  at: number;
}
interface Data {
  v: 1;
  nick?: string;
  runs: Record<string, StageRun>;
  cards: Record<string, string[]>;
  notes: Note[];
  lastTier: Record<string, Tier>;
}

const KEY = 'class-games:v1';
let memory: Data | null = null;

function empty(): Data {
  return { v: 1, runs: {}, cards: {}, notes: [], lastTier: {} };
}

export function load(): Data {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    memory = raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    memory = empty();
  }
  return memory!;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* 저장할 수 없는 환경(사생활 보호 모드 등)에서는 이번 접속 동안만 기억 */
  }
}

export const runKey = (unit: string, game: string, tier: Tier, stage: string) => `${unit}|${game}|${tier}|${stage}`;

export function getRun(unit: string, game: string, tier: Tier, stage: string): StageRun | undefined {
  return load().runs[runKey(unit, game, tier, stage)];
}

export function saveRun(unit: string, game: string, tier: Tier, stage: string, results: StepResult[]): StageRun {
  const d = load();
  const k = runKey(unit, game, tier, stage);
  const first = results.filter((r) => r.ok).length;
  const total = results.length;
  const ratio = total ? first / total : 0;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
  const prev = d.runs[k];
  const run: StageRun = { at: Date.now(), first, total, stars, best: Math.max(stars, prev?.best ?? 0), results };
  d.runs[k] = run;
  save();
  return run;
}

export function runsFor(unit: string): { game: string; tier: Tier; stage: string; run: StageRun }[] {
  const out = [];
  for (const [k, run] of Object.entries(load().runs)) {
    const [u, game, tier, stage] = k.split('|');
    if (u === unit) out.push({ game, tier: tier as Tier, stage, run });
  }
  return out;
}

export function getCards(unit: string): string[] {
  return load().cards[unit] ?? [];
}
export function addCards(unit: string, ids: string[]): string[] {
  const d = load();
  const have = new Set(d.cards[unit] ?? []);
  const added = ids.filter((id) => !have.has(id));
  added.forEach((id) => have.add(id));
  d.cards[unit] = [...have];
  if (added.length) save();
  return added;
}

export function getNotes(unit: string): Note[] {
  return load().notes.filter((n) => n.unit === unit);
}
export function addNote(n: Omit<Note, 'id' | 'at'>): Note {
  const d = load();
  const note: Note = { ...n, id: Math.random().toString(36).slice(2, 10), at: Date.now() };
  d.notes.push(note);
  save();
  return note;
}
export function updateNote(id: string, patch: Partial<Note>) {
  const d = load();
  const n = d.notes.find((x) => x.id === id);
  if (n) Object.assign(n, patch);
  save();
}
export function deleteNote(id: string) {
  const d = load();
  d.notes = d.notes.filter((x) => x.id !== id);
  save();
}

export function getLastTier(game: string): Tier | undefined {
  return load().lastTier[game];
}
export function setLastTier(game: string, t: Tier) {
  load().lastTier[game] = t;
  save();
}

export function getNick(): string {
  return load().nick ?? '';
}
export function setNick(nick: string) {
  load().nick = nick.slice(0, 20);
  save();
}

export function resetUnit(unit: string) {
  const d = load();
  for (const k of Object.keys(d.runs)) if (k.startsWith(unit + '|')) delete d.runs[k];
  delete d.cards[unit];
  d.notes = d.notes.filter((n) => n.unit !== unit);
  save();
}

// 이 게임에서 단계별로 끝낸 스테이지 수
export function tierProgress(unit: string, game: string, stageIds: string[]) {
  const out: Record<Tier, number> = { C: 0, B: 0, A: 0 };
  for (const t of TIER_ORDER) out[t] = stageIds.filter((s) => getRun(unit, game, t, s)).length;
  return out;
}
