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
  z.object({ type: z.literal('pin'), ...stepBase, pins: z.array(z.string()).min(2), answer: z.string() }),
  // 기후에 맞는 집·옷 꾸미기: 부분마다 하나씩 고르기
  z.object({
    type: z.literal('build'),
    ...stepBase,
    target: z.enum(['house', 'clothes']),
    scene: z.enum(['열대', '건조', '온대', '냉대', '한대', '고산']).optional(), // 배경 그림
    parts: z.array(z.object({ label: z.string(), options: z.array(fitOption).min(2) })).min(1),
  }),
  // 세계 상점: 손님에게 알맞은 상품 기능을 모두 고르고 판매 계획 세우기
  z.object({
    type: z.literal('shop'),
    ...stepBase,
    customer: z.object({ emoji: z.string(), name: z.string(), place: z.string(), says: z.string() }),
    features: z.array(fitOption).min(3),
    plan: z.boolean().default(true), // 상품 이름·광고 문구 적기
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

const quizItem = z.object({
  lv: level,
  q: z.string(),
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
      rounds: z.array(
        z.object({
          atlas: z.string(), // 단원 atlas 의 지형 id
          focus: z.tuple([z.number(), z.number()]), // 처음 확대할 곳 (사진 왼쪽 위 기준 %)
          question: z.string().optional(), // 정답 공개 뒤 함께 생각할 질문
        }),
      ).min(3),
    }),
    // 빙고: 전자칠판에 설명이 나오고, 학생은 태블릿 빙고판에 표시
    z.object({
      template: z.literal('bingo'),
      mode: z.literal('board').default('board'),
      ...gameBase,
      size: z.number().int().min(3).max(5).default(4),
      words: z.array(z.object({ word: z.string(), clue: z.string() })).min(12),
    }),
  ]),
});

export const collections = { units, games };
