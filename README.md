# 시 스템 :: 딥 다이브

일반 스테이지는 방치형 탐사, 보스 스테이지는 4인 SRPG 레이드로 진행되는 웹게임.

- 서비스 주소: https://seestem.naru.pub (나루 정적 호스팅)
- 로그인·데이터: Firebase (Authentication 이메일 인증 + Realtime Database, 무료 Spark 플랜)

## 파일 구조
| 경로 | 내용 |
|---|---|
| `index.html` | 본 화면 뼈대. css 1개, 데이터 1개, js를 순서대로 불러옴 |
| `raid.html` | 레이드 전투 창(iframe) |
| `css/style.css`, `css/raid.css` | 스타일 |
| `data/skills.js` | 기술 데이터(시트에서 생성, 직접 고치지 않음) |
| `data/database.rules.json` | Firebase Realtime Database 보안 규칙(콘솔 → 규칙 탭에 붙여 넣고 게시) |
| `js/explore.js` | 탐사 엔진(DOM 없음) |
| `js/core.js` | 공통 도구 · 직업·종족 데이터 |
| `js/creator.js` | 캐릭터 만들기 |
| `js/auth.js` | 계정 · Firebase 로그인/저장 |
| `js/lobby.js` | 로비 · 창고 · 제작대 |
| `js/shop.js` / `js/achv.js` / `js/skilldb.js` | 상점 / 업적·타이틀 / 기술 리스트 |
| `js/social.js` | 전체 채팅 · 친구 · 1대1 |
| `js/explore-ui.js` / `js/season.js` | 탐사 화면 / 시즌·심연 순위 |
| `js/raid-room.js` / `js/raid-chat.js` / `js/raid-battle.js` | 레이드 대기실 / 파티 채팅 / 전투 |
| `js/mail.js` / `js/misc.js` | 우편·GM / 확인창·신고·이탈 제재 |
| `js/main.js` | 시작 처리 (맨 마지막에 불러와야 함) |

js 파일은 일반 `<script>`로 순서대로 불러오고 전역 범위를 함께 써요. `index.html`의 불러오는 순서를 바꾸지 마세요.

## 서버 이전 진행
1. ✅ 계정(이메일 인증) · 내 데이터(캐릭터·창고·탐사·제작·골드)
2. 채팅 · 1대1 · 친구 · 우편 · 신고
3. 탐사 오프라인 계산 확인 · 상점
4. 레이드 방 · 파티 채팅
5. 업적 · 타이틀 · 심연 순위 · 시즌 · GM 권한

아직 2~5단계 데이터는 각자 브라우저(localStorage)에 저장돼요.
