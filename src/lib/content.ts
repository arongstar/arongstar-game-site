import { getCollection, getEntry } from 'astro:content';

export async function allUnits() {
  const units = await getCollection('units', (u) => !u.data.draft);
  return units.sort((a, b) => a.data.grade - b.data.grade || a.data.semester - b.data.semester || a.data.unitNo - b.data.unitNo);
}
export async function allGames() {
  return getCollection('games', (g) => !g.data.draft);
}
// 단원의 게임을 차시 순서대로
export async function gamesOf(unitId: string) {
  const first = (g: { data: { lessons: string[] } }) => parseInt(g.data.lessons[0] ?? '99', 10);
  return (await allGames()).filter((g) => g.data.unit.id === unitId).sort((a, b) => first(a) - first(b));
}
export async function unitOf(game: { data: { unit: { id: string } } }) {
  const u = await getEntry('units', game.data.unit.id);
  if (!u) throw new Error(`단원 없음: ${game.data.unit.id}`);
  return u;
}
// 빙고의 학생용 빙고판 주소
export const bingoCardPath = (id: string) => `/bingo/${id}/`;

// 게임 주소 (개인용은 /play, 전자칠판용은 /board)
export function gamePath(g: { id: string; data: { mode: string } }, stage?: string) {
  return g.data.mode === 'board' ? `/board/${g.id}/` : `/play/${g.id}/${stage ? `?stage=${stage}` : ''}`;
}
