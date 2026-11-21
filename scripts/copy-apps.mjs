// Copy standalone apps (plain HTML/JS, no build step) into the built site.
// math-dungeon/ → dist/math-dungeon/ (index.html, src/, data/). Tests and SPEC stay out of the site.
import { cpSync, existsSync, rmSync } from 'node:fs';

const apps = [{ from: 'math-dungeon', to: 'dist/math-dungeon', include: ['index.html', 'src', 'data'] }];
for (const a of apps) {
  if (!existsSync('dist')) throw new Error('run astro build first');
  rmSync(a.to, { recursive: true, force: true });
  for (const p of a.include) cpSync(`${a.from}/${p}`, `${a.to}/${p}`, { recursive: true });
  console.log(`📦 ${a.from} → ${a.to}`);
}
