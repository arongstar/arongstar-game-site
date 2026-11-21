// App start: load the theme and the lesson modules, then show the start or teacher screen.
import { createLog } from './engine/log.js';
import { go, renderStart, renderTeacher } from './ui/screens.js';

const dataUrl = (path) => new URL(`../data/${path}`, import.meta.url);
const getJSON = async (path) => {
  const r = await fetch(dataUrl(path), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
};

function applyTheme(theme) {
  document.title = theme.gameName ?? document.title;
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(theme.colors ?? {})) root.setProperty(`--${k}`, v);
}

async function main() {
  const root = document.getElementById('app');
  try {
    const [theme, index] = await Promise.all([getJSON('theme.json'), getJSON('lessons/index.json')]);
    const lessons = (await Promise.all(index.lessons.map((id) => getJSON(`lessons/${id}.json`)))).sort((a, b) => (a.lesson ?? 0) - (b.lesson ?? 0));
    applyTheme(theme);
    const app = { root, theme, lessons, log: createLog(), run: null, lesson: null };
    window.__app = app; // for automated checks
    if (new URLSearchParams(location.search).get('teacher') === '1') renderTeacher(app);
    else renderStart(app);
    window.addEventListener('popstate', () => go(app));
  } catch (e) {
    root.textContent = `불러오기에 실패했어요: ${e.message}. 웹 서버(예: npx serve .)로 열어 주세요.`;
  }
}
main();
