// 영어 재미 게임 공통: 단계 고르기, 코인, 내 캐릭터, 축하 효과, 기록 저장
import { h } from './dom';
import * as store from './store';
import type { Tier, StepResult } from './store';

export const TIERS: Record<Tier, { emoji: string; name: string }> = {
  C: { emoji: '🧭', name: '살펴보기' },
  B: { emoji: '🔎', name: '조사하기' },
  A: { emoji: '🏅', name: '분석하기' },
};
export const HATS: { id: string; emoji: string; price: number; name: string }[] = [
  { id: 'cap', emoji: '🧢', price: 30, name: '야구 모자' },
  { id: 'bow', emoji: '🎀', price: 30, name: '리본' },
  { id: 'flower', emoji: '🌼', price: 40, name: '꽃 핀' },
  { id: 'glasses', emoji: '🕶️', price: 50, name: '선글라스' },
  { id: 'headphones', emoji: '🎧', price: 60, name: '헤드폰' },
  { id: 'tophat', emoji: '🎩', price: 80, name: '마술사 모자' },
  { id: 'crown', emoji: '👑', price: 120, name: '왕관' },
];

export function readTier(gameId: string): Tier {
  const p = new URLSearchParams(location.search).get('tier') as Tier | null;
  const t = p && TIERS[p] ? p : store.getLastTier(gameId) || 'C';
  return t as Tier;
}

export function coinBadge() {
  const el = h('span', { class: 'coin-badge', 'aria-live': 'polite' }, `🪙 ${store.getBag().coins}`);
  return { el, refresh: () => (el.textContent = `🪙 ${store.getBag().coins}`) };
}

// 단계 고르기 + 코인 (상단 막대)
export function topBar(data: any, tier: Tier, onTier: (t: Tier) => void, extra?: Node | null) {
  const coins = coinBadge();
  const bar = h('div', { class: 'fun-top' },
    h('h1', { class: 'fun-title' }, data.emoji, ' ', data.title),
    h('div', { class: 'fun-tiers', role: 'group', 'aria-label': '단계' },
      ...(['C', 'B', 'A'] as Tier[]).map((t) => h('button', { class: `tier-pill tier-${t}` + (t === tier ? ' on' : ''), type: 'button', 'aria-pressed': t === tier, onclick: () => { store.setLastTier(data.id, t); onTier(t); } }, `${TIERS[t].emoji} ${TIERS[t].name}`))),
    extra ?? null,
    coins.el);
  return { el: bar, coins };
}

// 내 캐릭터 (그림 + 쓰고 있는 꾸미기)
export function avatarImg(avatars: any[], cls = 'sprite me') {
  const bag = store.getBag();
  const a = avatars.find((x) => x.key === bag.avatar) ?? avatars[0];
  const hat = HATS.find((x) => x.id === bag.wear);
  return h('div', { class: cls }, hat ? h('span', { class: 'hat', 'aria-hidden': 'true' }, hat.emoji) : null, h('img', { src: a.src, alt: '내 캐릭터', draggable: false }));
}

// 코인이 톡 튀어 오르는 효과
export function coinPop(anchor: HTMLElement, n: number) {
  const r = anchor.getBoundingClientRect();
  const el = h('div', { class: 'coin-pop', style: { left: `${r.left + r.width / 2}px`, top: `${r.top}px` } }, `+${n} 🪙`);
  document.body.append(el);
  setTimeout(() => el.remove(), 1100);
}

export function confetti() {
  const box = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  const em = ['🎉', '⭐', '✨', '🎊', '💛'];
  for (let i = 0; i < 24; i++) box.append(h('span', { style: { left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.4}s` } }, em[i % em.length]));
  document.body.append(box);
  setTimeout(() => box.remove(), 2200);
}

export function toast(text: string) {
  const el = h('div', { class: 'fun-toast', role: 'status' }, text);
  document.body.append(el);
  setTimeout(() => el.classList.add('out'), 2200);
  setTimeout(() => el.remove(), 2700);
}

export function record(unitId: string, gameId: string, tier: Tier, stage: string, results: StepResult[]) {
  return store.saveRun(unitId, gameId, tier, stage, results);
}

export function stars(n: number) { return '⭐'.repeat(n) + '☆'.repeat(3 - n); }

// 끝났을 때 결과 상자
export function resultBox(title: string, run: store.StageRun, again: () => void, unitUrl: string, extra?: Node | null) {
  return h('div', { class: 'fun-result' },
    h('div', { class: 'fun-result-emoji', 'aria-hidden': 'true' }, run.stars === 3 ? '🏆' : run.stars === 2 ? '🥈' : '🌱'),
    h('h2', null, title),
    h('p', { class: 'r-stars' }, stars(run.stars)),
    h('p', null, `처음에 맞힌 것 ${run.first} / ${run.total}`),
    extra ?? null,
    h('div', { class: 'note-actions' },
      h('button', { class: 'btn primary', type: 'button', onclick: again }, '🔁 다시 하기'),
      h('a', { class: 'btn', href: unitUrl }, '🗺️ 단원으로')));
}

// 한 문제의 판정: 처음 틀리면 한 번 더, 두 번째도 틀리면 정답 공개
export function judgeFor(onDone: (firstOk: boolean, correct: boolean) => void) {
  let tries = 0;
  let done = false;
  return {
    get done() { return done; },
    judge(correct: boolean, onRetry: () => void, onReveal: () => void) {
      if (done) return;
      tries++;
      if (correct) { done = true; onDone(tries === 1, true); }
      else if (tries === 1) onRetry();
      else { done = true; onReveal(); onDone(false, false); }
    },
  };
}
