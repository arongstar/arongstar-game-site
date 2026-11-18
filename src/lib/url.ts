// 사이트가 하위 경로(예: /저장소이름/)에 배포되어도 링크가 깨지지 않게 해 주는 도우미
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function url(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${base}/${path.replace(/^\//, '')}`;
}
