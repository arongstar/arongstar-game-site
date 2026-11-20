// 게임 내용 검사: 정답이 보기 안에 있는지, 바구니 이름이 맞는지 등을 빌드 전에 확인해요.
// 문제가 있으면 빌드(배포)를 멈춰서, 정답을 고를 수 없는 문제가 학생에게 가지 않게 해요.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const dir = 'src/content/games';
const problems = [];
const text = (o) => (typeof o === 'string' ? o : o.text);

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))) {
  const g = YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  if (g.template !== 'mission') continue;
  for (const s of g.stages) {
    for (const t of ['C', 'B', 'A'])
      if (!s.steps.some((st) => st.lv === t)) problems.push(`${file} › ${s.id}: ${t} 단계 문제가 없어 그 단계에서 스테이지가 잠겨요.`);
    s.steps.forEach((st, i) => {
      const where = `${file} › ${s.id} › ${i + 1}번 문제 (${st.type})`;
      const opts = (st.options ?? []).map(text);
      if (st.type === 'choice' && !opts.includes(st.answer)) problems.push(`${where}: 정답 "${st.answer}"이(가) 보기에 없어요.`);
      if (st.type === 'multi') for (const a of st.answers) if (!opts.includes(a)) problems.push(`${where}: 정답 "${a}"이(가) 보기에 없어요.`);
      if (st.type === 'sort') for (const it of st.items) if (!st.bins.includes(it.bin)) problems.push(`${where}: "${it.text}"의 바구니 "${it.bin}"이(가) 없어요.`);
      if (st.type === 'pin' && !st.pins.includes(st.answer)) problems.push(`${where}: 정답 위치가 지도 핀에 없어요.`);
      if (st.type === 'build') for (const p of st.parts) if (!p.options.some((o) => o.fit)) problems.push(`${where}: "${p.label}"에 알맞은 보기가 없어요.`);
      if (st.type === 'shop' && !st.features.some((f) => f.fit)) problems.push(`${where}: 알맞은 기능이 하나도 없어요.`);
      if (st.type === 'order' && new Set(st.items).size !== st.items.length) problems.push(`${where}: 같은 카드가 두 번 있어요.`);
      if (st.type === 'circuit') {
        if (st.target > 0 && !st.materials.some((m) => m.conductor)) problems.push(`${where}: 전기가 통하는 물체가 없어 전구를 켤 수 없어요.`);
        if (st.target === 2 && st.allowCells === false) problems.push(`${where}: 전지 수를 바꿀 수 없는데 '더 밝게'가 목표예요.`);
      }
      if (st.type === 'choice' && new Set(opts).size !== opts.length) problems.push(`${where}: 같은 보기가 두 번 있어요.`);
    });
  }
}

if (problems.length) {
  console.error(`\n❌ 게임 내용에 고칠 곳이 ${problems.length}개 있어요:\n` + problems.map((p) => ' - ' + p).join('\n') + '\n');
  process.exit(1);
}
console.log('✅ 게임 내용 검사 통과');
