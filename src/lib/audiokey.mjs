// 영어 소리 파일 이름 정하기: 목소리·속도·문장이 같으면 같은 파일을 다시 써요.
// (scripts/audio-manifest.mjs 와 빌드가 함께 써요)
import crypto from 'node:crypto';

export const NARRATOR = 'af_heart'; // 등장인물이 없을 때 읽어 주는 목소리
export const SPEED = 0.9; // 초등학생이 듣기 좋게 조금 천천히

export function audioKey(voice, text) {
  return crypto.createHash('sha1').update(`${voice}|${SPEED}|${text.trim()}`).digest('hex').slice(0, 12);
}
