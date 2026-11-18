// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Actions에서 배포할 때 SITE_URL / BASE_PATH 가 자동으로 채워집니다.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
});
