// 사이트 기본 정보 — 여기만 고치면 제목·소개 문구가 바뀝니다.
export const SITE = {
  title: '수업 게임 탐험소',
  description: '초등학교 과목·단원·차시별 수업 게임 모음',
};

// 게임 단계 = 성취수준 (C·B·A)
export const TIERS = {
  C: { emoji: '🧭', name: '살펴보기', desc: '사진·지도·그래프를 살펴보고 특징을 찾아요', color: '#2f8f5b' },
  B: { emoji: '🔎', name: '조사하기', desc: '자료를 조사해 생활 모습과 그 까닭을 설명해요', color: '#2f6fb3' },
  A: { emoji: '🏅', name: '분석하기', desc: '여러 자료를 비교·분석하고 새로운 곳에 적용해요', color: '#b5651d' },
} as const;
