// 세계 지도(SVG)를 빌드할 때 만들어 둡니다. (Natural Earth 1:110m, world-atlas)
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import land from 'world-atlas/land-110m.json' with { type: 'json' };

export const MAP_W = 1000;
export const MAP_H = 500;
// 남극과 북극 가장자리는 잘라서 보여 줍니다.
export const MAP_VIEWBOX = '0 14 1000 400';

const projection = geoEquirectangular()
  .scale(MAP_W / (2 * Math.PI))
  .translate([MAP_W / 2, MAP_H / 2]);

let cached: string | null = null;
export function landPath(): string {
  if (cached) return cached;
  // @ts-expect-error topojson 타입
  const geo = feature(land, land.objects.land);
  const d = geoPath(projection)(geo as any) ?? '';
  // 소수점을 줄여 파일 크기를 줄임
  cached = d.replace(/(\d+\.\d)\d+/g, '$1');
  return cached;
}

export function project(lon: number, lat: number): [number, number] {
  const p = projection([lon, lat])!;
  return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
}
