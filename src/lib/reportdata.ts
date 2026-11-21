import type { Unit } from './gamedata';
import { gamesOf } from './content';
import { recordStages } from './gamedata';

// 리포트·수첩 화면에 넘길 단원 요약
export async function reportData(unit: Unit) {
  const games = await gamesOf(unit.id);
  return {
    id: unit.id,
    domain: unit.data.domain,
    standards: unit.data.standards,
    domainLevels: unit.data.domainLevels,
    levelsDraft: unit.data.levelsDraft,
    games: Object.fromEntries(
      games.map((g) => [
        g.id,
        {
          title: g.data.title,
          stages: recordStages(g),
        },
      ]),
    ),
  };
}
