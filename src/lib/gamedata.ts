// 빌드할 때 게임 내용(YAML)에 사진·기후 자료·지도 좌표를 붙여, 화면 스크립트가 읽을 JSON으로 만듭니다.
import fs from 'node:fs';
import path from 'node:path';
import type { CollectionEntry } from 'astro:content';
import climateData from '../data/climate.json';
import { landPath, project, MAP_VIEWBOX } from './worldmap';
import { url } from './url';

export type Unit = CollectionEntry<'units'>;
export type Game = CollectionEntry<'games'>;

export interface PhotoInfo {
  src: string;
  alt: string;
  credit: string;
  commons?: string;
  license?: string;
  licenseUrl?: string;
  author?: string;
}

type RawPhoto = {
  src: string;
  commons?: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
  alt?: string;
  note?: string;
};

let photosCache: Record<string, RawPhoto> | null = null;
export function rawPhotos(): Record<string, RawPhoto> {
  if (photosCache) return photosCache;
  const file = path.resolve('src/data/photos.json');
  try {
    photosCache = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    photosCache = {};
  }
  return photosCache!;
}

export function photo(key: string | undefined, fallbackAlt = ''): PhotoInfo | null {
  if (!key) return null;
  const p = rawPhotos()[key];
  if (!p) {
    console.warn(`[사진 없음] ${key}`);
    return null;
  }
  const credit = [p.author, p.license].filter(Boolean).join(' · ');
  return {
    src: url(p.src),
    alt: p.alt || fallbackAlt,
    credit: credit ? `사진: ${credit}` : '',
    commons: p.commons,
    license: p.license,
    licenseUrl: p.licenseUrl,
    author: p.author,
  };
}

export type ClimateCity = {
  name: string;
  country: string;
  climate: string;
  lat: number;
  lon: number;
  temp: number[];
  rain: number[];
  source: string;
  sourceUrl: string;
};
export const climate = climateData as Record<string, ClimateCity>;

// 지형 카드 (단원의 atlas) + 지도 위 좌표
export function atlasFor(unit: Unit) {
  const out: Record<string, any> = {};
  for (const a of unit.data.atlas) {
    const [x, y] = project(a.lon, a.lat);
    out[a.id] = { ...a, x, y, photo: photo(a.photo, a.name) };
  }
  return out;
}

function climateFor(ids: Set<string>) {
  const out: Record<string, any> = {};
  for (const id of ids) {
    const c = climate[id];
    if (!c) throw new Error(`기후 자료에 없는 도시: ${id}`);
    const [x, y] = project(c.lon, c.lat);
    out[id] = { ...c, x, y };
  }
  return out;
}

// 사진 키에서 지형 이름 찾기 (비교 문제에서 사진 아래 이름 표시용)
function labelForPhoto(unit: Unit, key: string): string {
  const a = unit.data.atlas.find((x) => x.photo === key);
  return a?.name ?? '';
}

export function missionData(game: Game, unit: Unit) {
  if (game.data.template !== 'mission') throw new Error('mission 게임이 아니에요');
  const g = game.data;
  const cityIds = new Set<string>();
  let needsMap = g.style === 'dex';
  const atlas = atlasFor(unit);
  // 지도 문제용 장소도 atlas 처럼 쓸 수 있게
  for (const pl of unit.data.places) {
    const [x, y] = project(pl.lon, pl.lat);
    atlas[pl.id] ??= { id: pl.id, name: pl.name, x, y, place: true };
  }

  const stages = g.stages.map((s) => ({
    ...s,
    steps: s.steps.map((st, i) => {
      if (st.chart) cityIds.add(st.chart);
      st.charts?.forEach((c) => cityIds.add(c));
      if (st.type === 'pin') {
        needsMap = true;
        for (const p of st.pins) {
          if (!atlas[p]) cityIds.add(p);
        }
      }
      const withPhoto = (o: any) =>
        typeof o === 'string' ? { text: o } : { text: o.text, photo: photo(o.photo, o.text) };
      return {
        ...st,
        key: `${s.id}-${i}`,
        photo: photo(st.photo, labelForPhoto(unit, st.photo ?? '')),
        photos: st.photos?.map((k) => ({ ...photo(k, labelForPhoto(unit, k)), label: labelForPhoto(unit, k) })),
        ...('options' in st ? { options: st.options.map(withPhoto) } : {}),
        ...(st.type === 'sort'
          ? { items: st.items.map((it) => ({ ...it, photo: photo(it.photo, it.text) })) }
          : {}),
      };
    }),
  }));

  return {
    id: game.id,
    unitId: unit.id,
    title: g.title,
    emoji: g.emoji,
    story: g.story ?? g.summary,
    style: g.style,
    stages,
    atlas,
    climate: climateFor(cityIds),
    map: needsMap ? { path: landPath(), viewBox: MAP_VIEWBOX } : null,
    unitUrl: url(`/u/${unit.id}/`),
  };
}

export function quizshowData(game: Game, unit: Unit) {
  if (game.data.template !== 'quizshow') throw new Error('quizshow 게임이 아니에요');
  const g = game.data;
  const ids = new Set<string>();
  const fix = (it: any) => {
    if (it.chart) ids.add(it.chart);
    return { ...it, photo: photo(it.photo) };
  };
  const categories = g.categories.map((c) => ({ ...c, items: c.items.map(fix) }));
  return {
    id: game.id,
    unitId: unit.id,
    title: g.title,
    emoji: g.emoji,
    categories,
    final: g.final ? fix(g.final) : null,
    climate: climateFor(ids),
    unitUrl: url(`/u/${unit.id}/`),
  };
}

// 게임 단계별 문제 수 (교사용 안내)
export function stepCounts(game: Game) {
  const out: Record<string, { C: number; B: number; A: number }> = {};
  if (game.data.template !== 'mission') return out;
  for (const s of game.data.stages) {
    const c = { C: 0, B: 0, A: 0 };
    for (const st of s.steps) c[st.lv]++;
    out[s.id] = c;
  }
  return out;
}

export function zoomoutData(game: Game, unit: Unit) {
  if (game.data.template !== 'zoomout') throw new Error('zoomout 게임이 아니에요');
  const atlas = atlasFor(unit);
  // 라운드마다 보여 줄 내용: 단원 atlas 의 지형이거나, 직접 적은 사진·이름
  const rounds = game.data.rounds.map((r) => {
    if (r.atlas) {
      const a = atlas[r.atlas];
      if (!a) throw new Error(`atlas 에 없는 지형: ${r.atlas}`);
      return { key: r.atlas, focus: r.focus, question: r.question, name: a.name, tag: a.type, sub: a.country, desc: a.feature, photo: a.photo, x: a.x, y: a.y };
    }
    if (!r.photo || !r.name) throw new Error('zoomout 라운드에는 atlas 또는 photo·name 이 필요해요');
    return { key: r.photo, focus: r.focus, question: r.question, name: r.name, tag: r.tag ?? '', sub: '', desc: r.desc ?? '', photo: photo(r.photo, r.name) };
  }).filter((r) => {
    // 사진을 찾지 못한 장면은 빼고 진행
    if (!r.photo) console.warn(`[줌아웃] 사진이 없어 뺀 장면: ${r.name}`);
    return !!r.photo;
  });
  return {
    id: game.id,
    title: game.data.title,
    emoji: game.data.emoji,
    ask: game.data.ask,
    vote: game.data.vote,
    voteTitle: game.data.voteTitle,
    outro: game.data.outro,
    rounds,
    map: { path: landPath(), viewBox: MAP_VIEWBOX },
    unitUrl: url(`/u/${unit.id}/`),
  };
}

export function bingoData(game: Game, unit: Unit) {
  if (game.data.template !== 'bingo') throw new Error('bingo 게임이 아니에요');
  const n = game.data.size * game.data.size;
  if (game.data.words.length < n) throw new Error(`빙고 낱말이 ${n}개보다 적어요`);
  return {
    id: game.id,
    title: game.data.title,
    emoji: game.data.emoji,
    size: game.data.size,
    words: game.data.words,
    unitUrl: url(`/u/${unit.id}/`),
    cardUrl: url(`/bingo/${game.id}/`),
  };
}
