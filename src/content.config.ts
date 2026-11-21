import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 성취수준 A·B·C 와 게임 단계
// C = 🧭 살펴보기, B = 🔎 조사하기, A = 🏅 분석하기
const level = z.enum(['C', 'B', 'A']);
const category = z.enum(['지식·이해', '과정·기능', '가치·태도']);
const levelText = z.object({ A: z.string(), B: z.string(), C: z.string() });

// ─────────────────────────────────────────────
// 단원: src/content/units/<단원id>.yaml
// ─────────────────────────────────────────────
const atlasItem = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  type: z.enum(['산지', '하천', '해안', '사막']),
  lat: z.number(),
  lon: z.number(),
  photo: z.string(), // src/data/photos.json 의 키 (예: landforms/sognefjord)
  feature: z.string(),
  life: z.string(),
});

const units = defineCollection({
  loader: glob({ pattern: '**/[^_]*.yaml', base: './src/content/units' }),
  schema: z.object({
    subject: z.string(),
    subjectSlug: z.string(),
    grade: z.number(),
    semester: z.number(),
    unitNo: z.number(),
    title: z.string(),
    emoji: z.string().default('🌏'),
    story: z.string(),
    textbookNote: z.string().optional(),
    standards: z.array(
      z.object({ code: z.string(), text: z.string(), short: z.string(), levels: levelText }),
    ),
    domain: z.string(),
    domainLevels: z.object({
      A: z.record(category, z.string()),
      B: z.record(category, z.string()),
      C: z.record(category, z.string()),
    }),
    topics: z.array(
      z.object({
        no: z.number(),
        title: z.string(),
        lessons: z.array(
          z.object({
            no: z.string(),
            title: z.string(),
            games: z.array(z.string()).default([]),
            // 2차 제작 예정 게임 (화면에 '곧 열려요'로 보임)
            soon: z.array(z.object({ title: z.string(), emoji: z.string(), mode: z.enum(['solo', 'board']) })).default([]),
          }),
        ),
      }),
    ),
    atlas: z.array(atlasItem).default([]),
    // 지도 문제에 쓰는 장소 (나라·도시 등)
    places: z.array(z.object({ id: z.string(), name: z.string(), lat: z.number(), lon: z.number() })).default([]),
    // 성취수준이 평가원 원문이 아닌 초안이면 true (선생님용 페이지와 리포트에 안내가 보여요)
    levelsDraft: z.boolean().default(false),
    levelsSource: z.string().optional(),
    // 영어: 등장인물과 목소리 (voice 는 Kokoro 목소리 이름, 예: af_heart)
    cast: z.array(z.object({ name: z.string(), voice: z.string(), emoji: z.string().default('🙂') })).default([]),
    draft: z.boolean().default(false),
  }),
});

// ─────────────────────────────────────────────
// 게임: src/content/games/<게임id>.yaml
// ─────────────────────────────────────────────
const option = z.union([z.string(), z.object({ text: z.string(), photo: z.string().optional() })]);

// 문제(스텝) 공통 정보
const stepBase = {
  lv: level, // 이 문제의 수준 (게임 단계 C/B/A 중 어디에 나오는지)
  std: z.string(), // 성취기준 코드 (예: 6사10-01)
  cat: category, // 내용 체계 범주
  q: z.string(),
  hint: z.string().optional(), // 📒 탐험 노트 (감점 없음)
  explain: z.string().optional(), // 답을 확인한 뒤 보이는 설명
  // 보여 줄 자료
  photo: z.string().optional(),
  photos: z.array(z.string()).optional(),
  chart: z.string().optional(), // src/data/climate.json 의 도시 id
  charts: z.array(z.string()).optional(),
  hideChartName: z.boolean().default(false), // 그래프 위에 도시 이름을 숨길지 (맞히기 문제)
  collect: z.array(z.string()).default([]), // 맞히면 도감에 들어갈 지형 카드 id
  sun: z.boolean().default(false), // 위도별 햇볕 시뮬레이터를 함께 보여 줄지
  // 표 자료
  table: z.object({ title: z.string().optional(), head: z.array(z.string()), rows: z.array(z.array(z.string())), note: z.string().optional() }).optional(),
  // 막대그래프 자료
  bars: z
    .object({ title: z.string(), unit: z.string(), items: z.array(z.object({ label: z.string(), value: z.number() })), note: z.string().optional() })
    .optional(),
  // 나이별 인구 구성 (나라별 가로 막대: 0~14세 / 15~64세 / 65세 이상, %)
  agebars: z
    .object({ title: z.string(), items: z.array(z.object({ label: z.string(), young: z.number(), adult: z.number(), old: z.number() })), note: z.string().optional() })
    .optional(),
  // 과학 가상 실험실
  sunday: z.object({ rows: z.array(z.object({ time: z.string(), alt: z.number(), shadow: z.number(), temp: z.number() })) }).optional(),
  orbit: z.boolean().default(false),
  candle: z.boolean().default(false),
  magnet: z.boolean().default(false),
  // 6학년 1학기 과학 가상 실험실
  indicator: z.union([z.boolean(), z.object({ solutions: z.array(z.string()) })]).optional(), // 지시약 실험실
  mix: z.boolean().default(false), // 산성·염기성 용액 섞기
  track: z
    .object({ title: z.string().optional(), w: z.number().int(), h: z.number().int(), times: z.array(z.string()).min(2), items: z.array(z.object({ label: z.string(), emoji: z.string(), pos: z.array(z.tuple([z.number(), z.number()])) })).min(1) })
    .optional(), // 좌표판 위 위치 변화
  race: z.object({ title: z.string().optional(), unit: z.string().optional(), items: z.array(z.object({ label: z.string(), emoji: z.string(), dist: z.number(), time: z.number() })).min(2) }).optional(), // 달리기 경주
  microscope: z.boolean().default(false), // 현미경으로 본 양파 표피 세포
  sky: z.enum(['sun', 'star']).optional(), // 남쪽 하늘의 태양·별 위치 변화
  rotation: z.boolean().default(false), // 자전과 낮·밤
  starseason: z.boolean().default(false), // 공전과 계절별 별자리
  globe: z.boolean().default(false), // 지구본과 세계지도 비교 (사회)
  // 영어 듣기: 차례대로 읽어 줄 문장 (who 는 단원 cast 의 이름)
  say: z.array(z.object({ who: z.string().optional(), text: z.string() })).optional(),
  // 대본 보이기: hide(답한 뒤에도 숨김) · after(답한 뒤 보임) · show(처음부터 보임, 대화창처럼)
  script: z.enum(['hide', 'after', 'show']).default('after'),
  optionsAudio: z.boolean().default(false), // 보기마다 🔊 읽어 주기
  // 상황 카드 (그림 대신 이모지와 짧은 글)
  card: z.object({ emoji: z.string(), title: z.string(), text: z.string() }).optional(),
};

// 꾸미기(집·옷)와 상점 문제의 보기
const fitOption = z.object({
  text: z.string(),
  fit: z.boolean(), // 이 기후·지형에 알맞은지
  why: z.string(), // 고른 뒤 보여 줄 까닭
  look: z.string().optional(), // 그림 모양 (예: roof-steep, body-fur)
});

const step = z.discriminatedUnion('type', [
  // 하나 고르기
  z.object({ type: z.literal('choice'), ...stepBase, options: z.array(option).min(2), answer: z.string() }),
  // 알맞은 것 모두 고르기
  z.object({ type: z.literal('multi'), ...stepBase, options: z.array(option).min(2), answers: z.array(z.string()).min(1) }),
  // 바구니에 나누어 담기
  z.object({
    type: z.literal('sort'),
    ...stepBase,
    bins: z.array(z.string()).min(2),
    items: z.array(z.object({ text: z.string(), photo: z.string().optional(), bin: z.string() })).min(2),
  }),
  // 기후 그래프에서 달 고르기
  z.object({
    type: z.literal('pickmonth'),
    ...stepBase,
    answer: z.array(z.number().int().min(1).max(12)).min(1),
  }),
  // 세계 지도에서 위치 고르기 (pins 는 atlas 의 id 또는 climate 도시 id)
  // grid: 위선·경선(30° 간격)과 적도·본초 자오선 그리기
  z.object({ type: z.literal('pin'), ...stepBase, pins: z.array(z.string()).min(2), answer: z.string(), grid: z.boolean().default(false) }),
  // 기후에 맞는 집·옷 꾸미기: 부분마다 하나씩 고르기
  z.object({
    type: z.literal('build'),
    ...stepBase,
    target: z.enum(['house', 'clothes']),
    scene: z.enum(['열대', '건조', '온대', '냉대', '한대', '고산']).optional(), // 배경 그림
    parts: z.array(z.object({ label: z.string(), options: z.array(fitOption).min(2) })).min(1),
  }),
  // 전기 회로 꾸미기: 전구 밝기(0 꺼짐, 1 켜짐, 2 더 밝게)를 목표대로 맞추기
  z.object({
    type: z.literal('circuit'),
    ...stepBase,
    target: z.number().int().min(0).max(2),
    materials: z.array(z.object({ text: z.string(), conductor: z.boolean(), emoji: z.string().optional() })).min(1),
    start: z.object({ cells: z.number().int().min(1).max(2).default(1), on: z.boolean().default(false), material: z.number().int().default(0) }).optional(),
    allowCells: z.boolean().default(true),
  }),
  // 영어: 따라 말하기 (듣기 → 녹음 → 비교, 스스로 확인)
  z.object({
    type: z.literal('speak'),
    ...stepBase,
    target: z.string(), // 말할 문장
    who: z.string().optional(), // 본보기 목소리 (cast 이름)
    stress: z.array(z.string()).default([]), // 강세를 주는 낱말 (굵게 표시)
    tone: z.enum(['up', 'down']).optional(), // 문장 끝 억양 ↗ ↘
    tip: z.string().optional(),
  }),
  // 영어: 낱말 카드로 문장 만들기 (대문자·문장 부호 포함)
  z.object({ type: z.literal('sentence'), ...stepBase, answer: z.string(), extra: z.array(z.string()).default([]) }),
  // 영어: 글자 카드로 철자 맞히기
  z.object({ type: z.literal('spell'), ...stepBase, word: z.string(), extra: z.string().default(''), emoji: z.string().optional() }),
  // 영어: 예시문을 보고 빈칸 틀에 맞춰 글쓰기 → 카드로 저장
  z.object({
    type: z.literal('write'),
    ...stepBase,
    model: z.string(), // 예시문
    frame: z.string(), // {id} 자리에 학생이 써요. 예: My name is {name}.
    fields: z.array(z.object({ id: z.string(), label: z.string(), bank: z.array(z.string()).default([]), hint: z.string().optional() })).min(1),
    title: z.string().default('✍️ 나의 글 카드'),
  }),
  // 순서대로 놓기
  z.object({ type: z.literal('order'), ...stepBase, items: z.array(z.string()).min(3) }), // items 는 정답 순서
  // 예산 안에서 고르기 (합리적 선택)
  z.object({
    type: z.literal('budget'),
    ...stepBase,
    budget: z.number(),
    items: z.array(z.object({ text: z.string(), emoji: z.string(), price: z.number(), need: z.boolean().default(false), note: z.string().optional() })).min(3),
  }),
  // 세계 상점: 손님에게 알맞은 상품 기능을 모두 고르고 판매 계획 세우기
  z.object({
    type: z.literal('shop'),
    ...stepBase,
    customer: z.object({ emoji: z.string(), name: z.string(), place: z.string(), says: z.string() }),
    features: z.array(fitOption).min(3),
    plan: z.boolean().default(true), // 상품 이름·광고 문구 적기
    // 계획 적기 칸 이름 (캠페인 등 다른 기획에 쓸 때)
    planLabels: z
      .object({ title: z.string(), name: z.string(), slogan: z.string(), when: z.string(), save: z.string(), emoji: z.string() })
      .optional(),
  }),
]);

const stage = z.object({
  id: z.string(),
  title: z.string(),
  emoji: z.string().default('📍'),
  lesson: z.string().optional(), // 권장 차시
  intro: z.string().optional(),
  steps: z.array(step).min(1),
});

// ───────── 영어 RPG: 퀘스트·대장 도전의 한 장면 ─────────
const tiers = z.array(level).default(['C', 'B', 'A']); // 이 장면이 나오는 단계
const say = z.array(z.object({ who: z.string().optional(), text: z.string() }));
const rpgStep = z.discriminatedUnion('t', [
  z.object({ t: z.literal('talk'), who: z.string(), text: z.string(), lv: tiers }), // 주민이 말해요 (소리)
  z.object({ t: z.literal('read'), lv: tiers, title: z.string().optional(), lines: say }), // 읽을 글 (소리와 함께)
  z.object({ t: z.literal('choose'), lv: tiers, std: z.string(), cat: category.default('과정·기능'), q: z.string(), say: say.optional(), script: z.boolean().default(false), options: z.array(z.string()).min(2), answer: z.string(), optionsAudio: z.boolean().default(false), explain: z.string().optional() }),
  z.object({ t: z.literal('build'), lv: tiers, std: z.string(), cat: category.default('과정·기능'), q: z.string(), answer: z.string(), extra: z.array(z.string()).default([]), ko: z.string().optional(), listen: z.boolean().default(true) }),
  z.object({ t: z.literal('spell'), lv: tiers, std: z.string(), cat: category.default('과정·기능'), q: z.string().optional(), word: z.string(), emoji: z.string().optional() }),
  z.object({ t: z.literal('speak'), lv: tiers, std: z.string(), cat: category.default('과정·기능'), q: z.string(), target: z.string(), who: z.string().optional(), stress: z.array(z.string()).default([]), tone: z.enum(['up', 'down']).optional(), tip: z.string().optional() }),
  z.object({ t: z.literal('write'), lv: tiers, std: z.string(), cat: category.default('과정·기능'), q: z.string(), model: z.string(), frame: z.string(), fields: z.array(z.object({ id: z.string(), label: z.string(), bank: z.array(z.string()).default([]) })).min(1), title: z.string().default('✍️ 나의 글 카드') }),
]);

const quizItem = z.object({
  lv: level,
  q: z.string(),
  say: z.string().optional(), // 영어: 전자칠판에서 읽어 줄 문장
  answer: z.string(),
  explain: z.string().optional(),
  photo: z.string().optional(),
  chart: z.string().optional(),
  hideChartName: z.boolean().default(false),
});

const gameBase = {
  unit: reference('units'),
  title: z.string(),
  emoji: z.string(),
  summary: z.string(),
  story: z.string().optional(),
  lessons: z.array(z.string()),
  standards: z.array(z.string()),
  minutes: z.number().default(15),
  teacherGuide: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
};

const games = defineCollection({
  loader: glob({ pattern: '**/[^_]*.yaml', base: './src/content/games' }),
  schema: z.discriminatedUnion('template', [
    // 학생 개인 태블릿용: 스테이지 → 문제
    z.object({
      template: z.literal('mission'),
      mode: z.literal('solo').default('solo'),
      // dex = 지형 도감(카드 모으기 화면이 함께 보임)
      style: z.enum(['dex', 'village', 'detective', 'sun', 'builder', 'shop']).default('village'),
      ...gameBase,
      stages: z.array(stage).min(1),
    }),
    // 전자칠판용 모둠 대항 퀴즈쇼
    z.object({
      template: z.literal('quizshow'),
      mode: z.literal('board').default('board'),
      ...gameBase,
      categories: z.array(z.object({ name: z.string(), emoji: z.string(), items: z.array(quizItem).length(3) })),
      final: quizItem.optional(),
    }),
    // 전자칠판: 확대된 사진이 점점 넓어지며 어디인지 맞히기
    z.object({
      template: z.literal('zoomout'),
      mode: z.literal('board').default('board'),
      ...gameBase,
      ask: z.string().default('여기는 어디일까요? 어떤 지형일까요?'),
      vote: z.string().default('🙋 여기에 가 보고 싶은 사람?'),
      voteTitle: z.string().default('🙋 우리 반이 가장 가 보고 싶은 곳'),
      outro: z.string().default('이 단원에서 이곳들의 지형과 사람들의 생활 모습을 하나씩 탐험해 봐요!'),
      rounds: z.array(
        z.object({
          atlas: z.string().optional(), // 단원 atlas 의 지형 id
          // atlas 대신 직접 적기
          photo: z.string().optional(),
          name: z.string().optional(),
          tag: z.string().optional(),
          desc: z.string().optional(),
          focus: z.tuple([z.number(), z.number()]), // 처음 확대할 곳 (사진 왼쪽 위 기준 %)
          question: z.string().optional(), // 정답 공개 뒤 함께 생각할 질문
        }),
      ).min(3),
    }),
    // 영어 어드벤처: 캐릭터가 맵을 돌아다니며 친구(NPC)와 대화하고 미션을 해결
    z.object({
      template: z.literal('adventure'),
      mode: z.literal('solo').default('solo'),
      ...gameBase,
      map: z.string(), // 배경 그림 (photos.json 키)
      start: z.tuple([z.number(), z.number()]), // 처음 위치 (가로·세로 %)
      avatars: z.array(z.string()).min(1), // 고를 수 있는 내 캐릭터 그림
      std: z.object({ ask: z.string(), listen: z.string(), speak: z.string() }), // 묻기·듣기·말하기 문제의 성취기준
      quests: z.array(z.object({ id: z.string(), title: z.string(), emoji: z.string(), need: z.number().int(), grade: z.string().optional() })).min(1),
      npcs: z.array(z.object({
        id: z.string(),
        name: z.string(), // 단원 cast 의 이름 (목소리)
        sprite: z.string(),
        pos: z.tuple([z.number(), z.number()]),
        grade: z.enum(['first', 'second', 'third', 'fourth', 'fifth', 'sixth']),
        club: z.string(), // 예: art → I'm in the art club.
        clubEmoji: z.string(),
        hello: z.string(),
      })).min(2),
      stations: z.array(z.object({ id: z.string(), label: z.string(), emoji: z.string(), pos: z.tuple([z.number(), z.number()]), game: z.string() })).default([]),
    }),
    // 영어 RPG 지역 (Lesson 하나 = 지역 하나)
    z.object({
      template: z.literal('region'),
      mode: z.literal('solo').default('solo'),
      ...gameBase,
      order: z.number().int(), // Lesson 번호 (이야기 순서)
      area: z.string(), // 지역 이름
      map: z.string(),
      start: z.tuple([z.number(), z.number()]),
      spots: z.array(z.tuple([z.number(), z.number()])).min(3), // 낱말 요정이 나타나는 자리
      fairyStd: z.string(),
      walls: z.array(z.tuple([z.number(), z.number(), z.number(), z.number()])).default([]),
      // 지도 끝의 출구: to = 다른 지역 게임 id, 'world' = 섬 지도, 아직 없는 지역이면 잠긴 표지판. spawn = 그쪽에서 들어왔을 때 서는 자리
      exits: z.array(z.object({ to: z.string(), label: z.string(), emoji: z.string().default('🚪'), at: z.tuple([z.number(), z.number()]), spawn: z.tuple([z.number(), z.number()]).optional() })).default([]), // 걸어갈 수 없는 곳 [x1, y1, x2, y2] (발 위치, %)
      words: z.array(z.object({ word: z.string(), ko: z.string(), emoji: z.string(), lv: level, sentence: z.string().optional() })).min(10),
      npcs: z.array(z.object({ id: z.string(), name: z.string(), sprite: z.string(), pos: z.tuple([z.number(), z.number()]) })).min(1),
      quests: z.array(z.object({ id: z.string(), title: z.string(), emoji: z.string(), lesson: z.string(), npc: z.string(), steps: z.array(rpgStep).min(1) })).min(1),
      stations: z.array(z.object({ id: z.string(), label: z.string(), emoji: z.string(), pos: z.tuple([z.number(), z.number()]), game: z.string() })).default([]),
      boss: z.object({ title: z.string(), emoji: z.string(), npc: z.string(), intro: z.string(), win: z.string(), steps: z.array(rpgStep).min(3) }),
    }),
    // 영어 미니게임: 들은 말이 적힌 길로 점프
    z.object({
      template: z.literal('jump'),
      mode: z.literal('solo').default('solo'),
      ...gameBase,
      std: z.string(),
      rounds: z.number().int().default(8),
      items: z.array(z.object({ word: z.string(), emoji: z.string(), sentence: z.string() })).min(4),
    }),
    // 영어 미니게임: 낱말 블록으로 다리 놓기
    z.object({
      template: z.literal('bridge'),
      mode: z.literal('solo').default('solo'),
      ...gameBase,
      std: z.string(),
      sentences: z.array(z.object({ lv: level, text: z.string(), extra: z.array(z.string()).default([]), ko: z.string().optional() })).min(3),
    }),
    // 영어 단어 외우기: 낱말 카드 → 짝 맞추기 → 철자
    z.object({
      template: z.literal('words'),
      mode: z.literal('solo').default('solo'),
      ...gameBase,
      std: z.object({ meaning: z.string(), spell: z.string() }),
      words: z.array(z.object({ word: z.string(), ko: z.string(), emoji: z.string(), sentence: z.string().optional(), lv: level.default('C') })).min(6),
    }),
    // 빙고: 전자칠판에 설명이 나오고, 학생은 태블릿 빙고판에 표시
    z.object({
      template: z.literal('bingo'),
      mode: z.literal('board').default('board'),
      ...gameBase,
      size: z.number().int().min(3).max(5).default(4),
      words: z.array(z.object({ word: z.string(), clue: z.string(), emoji: z.string().optional() })).min(12),
      audio: z.boolean().default(false), // 영어: 설명(clue)을 소리로 읽어 주기
    }),
  ]),
});

export const collections = { units, games };
