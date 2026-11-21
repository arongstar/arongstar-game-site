// 영어 게임에서 읽어 줄 문장을 모두 모아, 아직 소리 파일(public/audio/en/*.mp3)이 없는 것을 알려 줘요.
//   node scripts/audio-manifest.mjs            → 없는 소리 목록을 .audio-todo.json 에 저장
//   python3 scripts/make-audio.py              → 목록의 소리를 Kokoro 로 만들기 (scripts/make-audio.py 설명 참고)
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { audioKey, NARRATOR } from '../src/lib/audiokey.mjs';

const units = {};
for (const f of fs.readdirSync('src/content/units').filter((f) => f.endsWith('.yaml'))) {
  units[f.replace(/\.yaml$/, '')] = YAML.parse(fs.readFileSync(path.join('src/content/units', f), 'utf8'));
}
const want = new Map();
const add = (unitId, who, text) => {
  if (!text) return;
  const cast = units[unitId]?.cast ?? [];
  const voice = cast.find((c) => c.name === who)?.voice ?? NARRATOR;
  const key = audioKey(voice, text);
  want.set(key, { key, voice, text: text.trim() });
};
for (const f of fs.readdirSync('src/content/games').filter((f) => f.endsWith('.yaml'))) {
  const g = YAML.parse(fs.readFileSync(path.join('src/content/games', f), 'utf8'));
  const u = g.unit;
  if (g.template === 'mission')
    for (const s of g.stages)
      for (const st of s.steps) {
        for (const l of st.say ?? []) add(u, l.who, l.text);
        if (st.type === 'speak') add(u, st.who, st.target);
        if (st.type === 'spell') add(u, undefined, st.word);
        if (st.type === 'sentence') add(u, undefined, st.answer);
        if (st.optionsAudio) for (const o of st.options ?? []) add(u, undefined, typeof o === 'string' ? o : o.text);
      }
  if (g.template === 'quizshow') for (const c of g.categories) for (const it of c.items) add(u, undefined, it.say);
  if (g.template === 'quizshow' && g.final) add(u, undefined, g.final.say);
  if (g.template === 'bingo' && g.audio) for (const w of g.words) add(u, undefined, w.clue);
}
const todo = [...want.values()].filter((w) => !fs.existsSync(path.join('public/audio/en', w.key + '.mp3')));
fs.writeFileSync('.audio-todo.json', JSON.stringify(todo, null, 1));
console.log(`🔊 읽어 줄 문장 ${want.size}개 · 소리 파일이 없는 것 ${todo.length}개${todo.length ? ' → python3 scripts/make-audio.py' : ''}`);
