// Records on this device (localStorage): one row per submission, one per finished run.
// Only the nickname identifies a student. Nothing is sent anywhere.

export const COLUMNS = ['t', 'nick', 'lessonId', 'questType', 'level', 'expression', 'hand', 'expr', 'answer', 'expressionOptimal', 'answerCorrect', 'answerReduced', 'errorTag', 'hintUsed', 'retry', 'ms'];
export const NICK_MAX = 8;

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

export function createLog(storage, key = 'math-dungeon:v1') {
  let store = storage;
  try {
    store ??= globalThis.localStorage;
    store.getItem(key);
  } catch {
    store = memoryStorage();
  }
  store ??= memoryStorage();

  const empty = () => ({ nick: '', settings: { timer: false, timerSeconds: 180 }, submissions: [], runs: [] });
  function load() {
    try {
      const d = JSON.parse(store.getItem(key) ?? 'null');
      return d ? { ...empty(), ...d, settings: { ...empty().settings, ...d.settings } } : empty();
    } catch {
      return empty();
    }
  }
  let data = load();
  const save = () => {
    try { store.setItem(key, JSON.stringify(data)); } catch { /* storage full or blocked: keep in memory */ }
  };

  return {
    getNick: () => data.nick,
    setNick(nick) {
      data.nick = cleanNick(nick);
      save();
      return data.nick;
    },
    getSettings: () => ({ ...data.settings }),
    setSettings(s) {
      data.settings = { ...data.settings, ...s };
      save();
    },
    addSubmission(row) {
      data.submissions.push(Object.fromEntries(COLUMNS.map((c) => [c, row[c] ?? ''])));
      save();
    },
    addRun(run) {
      data.runs.push(run);
      save();
    },
    submissions: () => [...data.submissions],
    runs: () => [...data.runs],
    best(nick, lessonId = null) {
      const rs = data.runs.filter((r) => r.nick === nick && (!lessonId || r.lessonId === lessonId));
      return rs.length ? Math.max(...rs.map((r) => r.score)) : null;
    },
    recent(nick, n = 5) {
      return data.runs.filter((r) => r.nick === nick).slice(-n).reverse();
    },
    stats() {
      const byLesson = {};
      const byTag = {};
      for (const s of data.submissions) {
        const L = (byLesson[s.lessonId] ??= { total: 0, correct: 0, optimal: 0, ms: 0 });
        L.total += 1;
        if (s.answerCorrect === true) L.correct += 1;
        if (s.expressionOptimal === true) L.optimal += 1;
        L.ms += Number(s.ms) || 0;
        if (s.errorTag) {
          const T = (byTag[s.errorTag] ??= { count: 0, lessons: {} });
          T.count += 1;
          T.lessons[s.lessonId] = (T.lessons[s.lessonId] ?? 0) + 1;
        }
      }
      for (const L of Object.values(byLesson)) {
        L.correctRate = L.total ? L.correct / L.total : 0;
        L.optimalRate = L.total ? L.optimal / L.total : 0;
        L.avgSeconds = L.total ? Math.round(L.ms / L.total / 1000) : 0;
      }
      const reflections = {};
      for (const r of data.runs) {
        if (!r.reflection) continue;
        const R = (reflections[r.lessonId] ??= {});
        R[r.reflection] = (R[r.reflection] ?? 0) + 1;
      }
      return { byLesson, byTag, reflections, submissions: data.submissions.length, runs: data.runs.length };
    },
    toCSV: () => toCSV(data.submissions),
    clear() {
      const nick = data.nick, settings = data.settings;
      data = { ...empty(), nick, settings };
      save();
    },
  };
}

export function cleanNick(nick) {
  return [...String(nick ?? '').replace(/[\u0000-\u001f<>]/g, '').trim()].slice(0, NICK_MAX).join('');
}

export function toCSV(rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(','))].join('\r\n') + '\r\n';
}
