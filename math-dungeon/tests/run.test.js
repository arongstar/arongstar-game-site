import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRun } from '../src/engine/run.js';
import { optimalSolutions, quotient } from '../src/engine/quests.js';
import { toMixed } from '../src/engine/fraction.js';
import { createLog, toCSV, cleanNick } from '../src/engine/log.js';

const lessons = JSON.parse(readFileSync(new URL('../data/lessons/index.json', import.meta.url))).lessons
  .map((id) => JSON.parse(readFileSync(new URL(`../data/lessons/${id}.json`, import.meta.url))));
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

function rightAnswer(lesson, ops) {
  const q = quotient(lesson.expression, ops);
  const m = toMixed(q);
  return m.whole && lesson.answerForm === 'mixed' ? m : { n: q.n, d: q.d };
}

test('a whole run in every lesson: 3 quests, jokers, boss, summary, log', () => {
  for (const lesson of lessons) {
    const log = createLog(memory());
    const run = createRun({ lesson, seed: 11, nick: '테스트', onSubmit: (r) => log.addSubmission(r) });
    for (let r = 0; r < 3; r++) {
      assert.equal(run.state.phase, 'choose');
      run.choose(r);
      const q = run.state.current.quest;
      const best = optimalSolutions(q)[0];
      const res = run.submit({ ops: best.ops, answer: rightAnswer(lesson, best.ops), conversion: { n: 1, d: best.ops.c ?? 1 }, estimate: 'smaller' });
      assert.equal(res.done, true);
      assert.equal(res.ok, true);
      run.next();
      if (run.state.phase === 'joker') run.takeJoker(run.state.offer[0].id, run.state.jokers.length >= 3 ? run.state.jokers[0].id : null);
    }
    assert.equal(run.state.phase, 'boss');
    const b = run.state.boss;
    assert.equal(run.answerBoss(b.wrongLine, b.answerReason).defeated, true);
    const s = run.summary();
    assert.ok(s.score >= 300);
    log.addRun(run.reflect('약분 조커'));
    assert.equal(log.submissions().length, 3);
    assert.equal(log.best('테스트'), s.score);
    assert.equal(log.stats().byLesson[lesson.id].correctRate, 1);
  }
});

test('wrong first try shows a hint, the retry is worth half', () => {
  const lesson = lessons[2];
  const run = createRun({ lesson, seed: 3 });
  run.choose(1);
  const best = optimalSolutions(run.state.current.quest)[0];
  const o = best.ops;
  const first = run.submit({ ops: o, answer: { n: o.a * o.c, d: o.b } });
  assert.equal(first.done, false);
  assert.ok(first.answerFeedback);
  const second = run.submit({ ops: o, answer: rightAnswer(lesson, o) });
  assert.equal(second.done, true);
  assert.equal(second.score.base, 37.5);
});

test('log: CSV and nickname', () => {
  assert.equal(cleanNick('  가나다라마바사아자차  '), '가나다라마바사아');
  const csv = toCSV([{ t: 'x', nick: 'a,b', answer: '1 "2"' }]);
  assert.ok(csv.startsWith('﻿t,nick,'));
  assert.ok(csv.includes('"a,b"'));
  assert.ok(csv.includes('"1 ""2"""'));
});
