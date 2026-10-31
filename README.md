# 월례 당회보고서 종합 시스템

교회 각 부서(팀)가 한 달 사역보고와 다음 달 계획을 입력하면, 관리자 화면에서 이를 모아 A4 2쪽 당회보고서로 만들어 인쇄하거나 PDF로 내려받는 웹 시스템입니다. 분당우리교회 훈련양육분과에서 만들어 쓰고 있는 코드를 다른 부서·교회도 가져다 쓸 수 있도록 공개합니다.

## 화면

- 팀 입력: `/` — 팀을 고르고 입력코드를 넣은 뒤 사역보고와 다음 달 계획을 적습니다.
- 관리자: `/admin.html` — 제출 현황 확인, 대신 입력·삭제, 보고서 미리보기·인쇄·PDF 저장, 팀·코드 설정.

## 흐름

1. 매월 마지막 주 금요일까지 팀별로 입력합니다.
2. 관리자가 「보고서 미리보기」에서 확인하고 인쇄하거나 PDF로 저장합니다(A4 2쪽).
3. 다음 달 첫 주일 당회에 보고합니다.

- "보고 월"은 사역보고를 하는 달입니다. 9월 보고 = 9월 사역보고 + 10월 계획 → 10월 첫 주일 당회.
- 「지난달 계획 불러오기」를 누르면 지난달에 적은 이번 달 계획을 이번 달 사역보고 초안으로 가져옵니다.

## 설치 (Netlify)

필요한 것: Node.js, Netlify 계정, Netlify CLI(`npm i -g netlify-cli`).

```bash
npm install
netlify login
netlify sites:create --name <원하는-사이트-이름>
netlify deploy --prod --dir site --functions netlify/functions
```

데이터는 Netlify Blobs에 저장됩니다(별도 데이터베이스 불필요). 키 형식은 `month/YYYY-MM/팀id`, 설정은 `config`입니다.

## 설치 직후 꼭 할 일

기본값은 공개된 코드에 들어 있으므로 누구나 알 수 있습니다. 배포하자마자 관리자 화면에 들어가 바꿔 주세요.

- 기본 관리자 비밀번호: `admin-change-me`
- 기본 팀 입력코드: `입력코드`
- 관리자 화면 → 「팀·코드 설정」에서 비밀번호·입력코드·팀 목록(이름·담당자·순서)을 바꿉니다.

## 로컬 실행

```bash
netlify dev --offline --port 8899
# http://localhost:8899
```

## 예시 데이터 넣기

```bash
node tools/seed.mjs <사이트주소> <관리자비번> 2026-08 tools/seed-sample.json
```

## 고칠 만한 곳

- 보고서 제목·분과 이름: `site/admin.html`의 `renderReport()`, `tableHtml()`
- 기본 팀 목록: `netlify/functions/api.mjs`의 `DEFAULT_TEAMS`
- 인쇄 서식: `site/report.css`
