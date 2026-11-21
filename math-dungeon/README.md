# 수학 던전 런 (가칭) — v0

6학년 1학기 「분수의 나눗셈」 5차시용 카드 조립 로그라이크 게임이에요. 오늘 배운 차시를 고르면 그날의 던전이 열려요.
한 판 = 의뢰 3개 + 보스 1개 (약 15분). 명세는 [SPEC.md](SPEC.md)에 있어요.

- 순수 HTML + CSS + JavaScript(ES 모듈). 빌드 도구·프레임워크·외부 CDN 없음.
- 기록은 이 기기의 `localStorage`에만 저장돼요. 학생 정보는 닉네임(최대 8자)뿐이에요.
- 분수 계산은 모두 정수 분수 연산(`src/engine/fraction.js`)이고, 정답·최적해는 코드가 브루트포스로 검증해요.

## 실행하기

```bash
cd math-dungeon
npx serve .
```

또는 `python3 -m http.server` 로 열어도 돼요. 파일을 더블클릭해서 열면(`file://`) 차시 JSON을 불러오지 못하니 꼭 웹 서버로 열어요.

- 학생 화면: `http://localhost:3000/`
- 교사 화면: `http://localhost:3000/?teacher=1` (차시별 정답률, 오개념 태그별 빈도, 성찰 응답, 최근 기록, CSV 내보내기, 기록 초기화)

## 테스트

```bash
cd math-dungeon
node --test tests/*.test.js
```

(Node 22 이상에서는 `node --test tests/` 처럼 폴더만 쓰면 폴더를 파일로 읽어 실패해요. 위처럼 파일 패턴으로 실행해요. `npm test` 도 같은 명령이에요.)

테스트 내용: 분수 연산, 같은 시드 → 같은 의뢰, 모든 목표 의뢰의 해 존재, 최댓값·최솟값과 독립 브루트포스의 일치, 0으로 나누기 없음,
오개념 매칭(명세 예시 4개), 점수(재도전 절반·힌트 절반·조커 중첩·문자열 효과 무시), **차시마다 무작위 의뢰 200개의 최적해·판정 일관성**, 보스 문제, 한 판 전체 흐름, CSV.

## 차시 모듈 추가하기 (코드 수정 없이)

1. `data/lessons/` 에 JSON 파일을 하나 만들어요. 기존 파일(예: `6-1-u1-l3.json`)을 복사해서 고치면 쉬워요.
2. `data/lessons/index.json` 의 `lessons` 배열에 파일 이름(확장자 빼고)을 추가해요.

`expression` 이 이미 있는 유형(`nat_div_nat`, `frac_div_nat`, `mixed_div_nat`)이면 엔진 코드를 고치지 않아도 시작 화면 목록에 나타나고 플레이할 수 있어요.

| 필드 | 뜻 |
| --- | --- |
| `id`, `lesson`, `title`, `summary` | 차시 번호와 이름 (`lesson` 순서로 목록에 보여요) |
| `standards`, `standardNote` | 성취기준 코드와 문구 |
| `expression` | 식 유형. `nat_div_nat` a÷b, `frac_div_nat` (a/b)÷c, `mixed_div_nat` (w a/b)÷c |
| `quests` | 의뢰 3칸: `{ "level": "easy", "type": "target" }` 처럼. `type` 은 `target`/`max`/`min` 또는 그중 몇 개의 배열(무작위) |
| `constraints` | `order: "less"/"greater"` (a÷b 의 a와 b 크기), `nonInteger`, `properFractionOnly`, `divisorMin`, `numeratorMultipleOfDivisorBias` |
| `answerForm` | `"mixed"` 면 1보다 큰 몫을 대분수로 써야 정답 |
| `conversion` | `true` 면 ÷c 를 ×(1/c) 로 바꾸는 칸이 나와요 (4차시) |
| `estimate` | 답을 쓰기 전 몫 어림 질문. `compareTo: "one"` 또는 `"dividend"` |
| `concepts` | 개념 조커. `unlock`(모두 참이면 열림), `effect: { "type": "multiplier" 또는 "bonusFlat", "value", "when": [...] }` |
| `misconceptions` | 오개념 태그별 `pattern`(보스 이유 보기에도 쓰임)과 `hint`. 지원 태그: `reverse_fraction`, `mixed_whole_only`, `divide_denominator`, `multiply_to_numerator`, `forgot_reciprocal` |
| `hints` | 일반 힌트와 식·대분수·곱셈 변환 힌트 |
| `bossQuiz` | `findWrongLine`, 이유 보기에 섞을 `distractors` |

조커 조건·효과에 쓸 수 있는 값: `expressionOptimal`, `answerCorrect`, `answerReduced`, `requiredReduction`, `answerMixed`, `firstTry`, `estimateCorrect`, `conversionCorrect`, `hintFree`.
효과는 정해진 종류(`multiplier`, `bonusFlat`)의 객체로만 해석하고, 문자열 수식은 실행하지 않아요.

## 스킨 바꾸기

게임 이름, 마스코트, 색, 아이콘(이모지), 버튼 문구는 `data/theme.json` 한 파일에 있어요. 학생 투표로 정한 스킨으로 이 파일만 바꾸면 돼요.

## 점수 규칙

- 기본 100점 = 식 고르기 50 + 몫 계산 50.
- 힌트를 보면 계산 점수 절반. 처음 제출이 틀리면 힌트가 나오고 한 번 더 도전할 수 있어요(두 번째 제출은 그 의뢰 점수 절반).
  예) 두 번째에 맞히면 (50 + 25) × ½ = 37.5 → 38점.
- 개념 조커는 의뢰를 마친 뒤 조건을 채운 것 중 최대 3장이 제시되고, 1장을 골라요(최대 3장 보유). 덧셈 효과를 먼저, 곱셈 효과를 나중에 적용해요.
- 시간 제한은 기본 꺼짐. ⚙️ 설정에서 의뢰마다 2·3·5분으로 켤 수 있어요(시간이 끝나면 그 의뢰는 0점).

## GitHub Pages 배포

이 폴더만 따로 올릴 때: 이 폴더의 내용을 저장소 루트(또는 `docs/`)에 두고, 저장소 Settings → Pages 에서 해당 브랜치·폴더를 고르면 돼요. 모든 경로가 상대 경로라 하위 경로(`/저장소이름/`)에서도 동작해요.

이 저장소(arongstar-game-site)에서는 사이트를 빌드할 때(`npm run build`) 이 폴더의 테스트를 먼저 돌리고, `index.html`·`src/`·`data/` 를 사이트의 `/math-dungeon/` 경로로 복사해서 함께 배포해요(`scripts/copy-apps.mjs`).

## 교사가 확인할 것

- 성취기준: 1·2차시 [6수01-10] '(자연수)÷(자연수)'에서 나눗셈의 몫을 분수로 나타낼 수 있다. / 3~5차시 [6수01-11] 분수의 나눗셈의 계산 원리를 탐구하고 그 계산을 할 수 있다.
  공식 원문 사이트(국가교육과정정보센터 등)가 개발 환경에서 열리지 않아 2차 자료 두 곳에서 같은 문구를 확인했어요. 교육부 고시 제2022-33호 원문과 지도서의 차시별 성취기준을 대조해 `standardNote` 를 확정해 주세요.
- 사용하는 교과서(출판사)의 차시 순서와 위 5차시가 맞는지.
- 의뢰 난이도: 지금은 쉬움 = 목표 몫 맞추기, 보통 = 가장 작은 몫, 도전 = 가장 큰 몫이에요(5차시는 카드 4장). 시범 수업 뒤 `quests` 를 고쳐 조정해요.
