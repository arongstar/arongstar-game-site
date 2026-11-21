# .audio-todo.json 의 영어 문장을 mp3 로 만들어 public/audio/en/ 에 저장해요.
# 준비 (한 번만): Kokoro TTS (Apache 2.0)
#   python3 -m venv ~/tts/.venv && ~/tts/.venv/bin/pip install kokoro-onnx soundfile
#   ~/tts 에 kokoro-v1.0.int8.onnx, voices-v1.0.bin 받기
#   (https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0)
# 실행: ~/tts/.venv/bin/python scripts/make-audio.py
import json, os, subprocess, sys, tempfile
import soundfile as sf
from kokoro_onnx import Kokoro

HOME = os.path.expanduser('~/tts')
SPEED = 0.9  # src/lib/audiokey.mjs 의 SPEED 와 같아야 해요
todo = json.load(open('.audio-todo.json'))
if not todo:
    print('만들 소리가 없어요.'); sys.exit(0)
k = Kokoro(os.path.join(HOME, 'kokoro-v1.0.int8.onnx'), os.path.join(HOME, 'voices-v1.0.bin'))
os.makedirs('public/audio/en', exist_ok=True)
for i, w in enumerate(todo, 1):
    samples, sr = k.create(w['text'], voice=w['voice'], speed=SPEED, lang='en-gb' if w['voice'].startswith('b') else 'en-us')
    out = f"public/audio/en/{w['key']}.mp3"
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        sf.write(tmp.name, samples, sr)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-ac', '1', '-b:a', '48k', out], check=True)
    print(f'{i}/{len(todo)} {w["voice"]}: {w["text"]}')
