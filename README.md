# BlogPay 기획서

블로그페이 요청 건별 기획서를 버전별로 관리하는 레포입니다.
최종 산출물은 **버전별 HTML 파일 1개**이며, CSS·이미지가 모두 내장되어 있어 파일만 개발팀에 전달해도 깨지지 않습니다.

## 폴더 구조

```
blogpay/
├─ index.html                  # 인덱스 (빌드로 생성) — 서비스 공통 링크 + 요청 건 리스트
├─ site.json                   # 서비스 공통 링크 (IA, 정책서, 약관 등)
├─ src/
│  ├─ doc.css                  # ★ 공통 스타일은 이 파일 하나만 관리
│  ├─ doc-frame.html           # 문서 틀(상단바·목차·본문 영역)
│  └─ index-frame.html         # 인덱스 틀
├─ requests/
│  ├─ _template/               # 새 요청 건을 만들 때 복사하는 템플릿 (인덱스에는 표시 안 됨)
│  └─ <slug>/                  # 요청 건 1개 = 폴더 1개 (영문 slug)
│     ├─ request.json          # 요청 시트 항목(요청일·이슈 번호·프로젝트·제목·내용·플로우…) + 버전별 개정이력
│     └─ v1.0/
│        ├─ content.html       # 본문만 작성 (스타일·목차·개정이력은 빌드가 채움)
│        └─ assets/            # 이 버전에서 쓰는 이미지 (webp 권장)
├─ published/<slug>/           # 요청 건당 폴더 1개. publish 때마다 <slug>_<버전>.html 이 새 파일로 추가됨 (덮어쓰기 거부)
│                              #   샘플은 <slug>_<버전>_sample.html 로 별도 생성 (덮어써도 됨)
├─ draft/                      # 작업 중 미리보기 (git 제외)
└─ tools/
   ├─ build.mjs                # 빌드 (doc · publish · sample · index)
   ├─ spec.mjs                 # spec.json → 화면정의서 렌더러
   ├─ lint-css.mjs             # CSS 단일 규격 검사
   ├─ check-layout.mjs         # 인덱스 넘침 검사
   ├─ check-doc.mjs            # 문서 넘침 검사 (폭 1440/1024/768/500, 모든 챕터·시트 탭)
   └─ capture/                 # 화면 캡처·마커 좌표 실측 (shot.mjs · measure.mjs · examples/)
```

## 작업 순서

필요한 것: Node.js 18 이상 (외부 패키지 없음)

1. 새 요청 건: `requests/_template`을 `requests/<slug>`로 복사하고 `request.json`에 요청 시트(개선기획 요청서)의 행을 옮겨 적습니다. 인덱스 표의 컬럼은 이 시트를 따릅니다.
2. 새 버전: `request.json`의 `versions`에 항목 추가 → `requests/<slug>/<버전>/content.html` 작성
3. 미리보기: `node tools/build.mjs doc <slug> <버전>` → `draft/<slug>/<slug>_<버전>.html`을 브라우저로 열어 확인
4. 공유 확정: `node tools/build.mjs publish <slug> <버전>` → `published/`에 생성
5. 인덱스 갱신: `node tools/build.mjs index`
6. 커밋 후 `published/…html` 파일 1개를 개발팀에 전달

## 규칙

- **공유한 버전은 수정하지 않습니다.** 변경이 생기면 새 버전(v1.1 → v1.2)을 만듭니다. `publish`는 이미 있는 파일을 덮어쓰지 않습니다.
- 스타일 수정은 `src/doc.css`에서만 합니다. 이미 공유한 파일에는 영향이 없고, 이후 빌드하는 문서부터 반영됩니다.
- 외부 링크(CDN·외부 폰트·외부 이미지)를 쓰지 않습니다. 쓰면 빌드가 실패합니다.
- 폴더명(slug)은 영문 소문자와 하이픈으로 합니다. (예: `smartstore-integration`)
- 개정이력 표는 `request.json`에서 자동 생성됩니다. `content.html`에는 `{{REVISIONS}}`만 넣습니다.
- 스크린샷에 실제 고객·주문 데이터, 계정·키 정보가 들어가지 않도록 합니다.

## 인덱스의 기획서·기획 추출 열

- **샘플**: 화면정의서 템플릿 샘플이 있으면 맨 앞에 검정 버튼으로 두고 새 탭에서 엽니다. (`request.json`의 `sample`)
- **버전 버튼**: 최신 버전이 위. `published/`에 HTML이 있으면 그 파일, 없으면 `versions[].url`(외부 문서)로 연결합니다.
- **기획 추출**(비고 오른쪽 열): 스타일·이미지가 내장된 HTML 파일을 내려받습니다. 기본은 최신 버전이며, 최신 버전의 HTML이 없으면 같은 버전의 샘플을 내려받습니다. `과거 버전`에서 과거 버전을 고를 수 있고, HTML이 없는 버전은 외부 문서 링크로만 열립니다. 내려받을 HTML이 하나도 없으면 비활성입니다.

## 인덱스 표 열 너비 규칙

열 너비는 `src/doc.css`의 5개 토큰만 사용합니다. 표가 이 합계(약 1384px)보다 좁아지면 줄바꿈 대신 가로 스크롤이 생깁니다.

| 토큰 | 너비 | 사용 열 |
| --- | --- | --- |
| xs | 96px | 이슈 번호, 진행상태, 플로우 |
| sm | 120px | 요청일 |
| md | 160px | 프로젝트(태그), 제목, 기획서(샘플·버전 버튼), 기획 추출 |
| lg | 192px | 비고(관련 자료 링크) |
| fluid | 남는 폭 (최소 240px) | 내용 |

프로젝트 태그 색상은 `site.json`의 `projectTags`에서 이름별로 지정합니다. (blue / amber / violet / cyan / red, 미지정은 neutral)

## 색상 규칙

Vercel DESIGN.md의 색상 토큰만 사용하며, 규칙은 `src/doc.css` 상단 주석에 있습니다. CSS 규칙 안에는 hex를 직접 쓰지 않고 `:root` 토큰(`var(--…)`)만 씁니다.

| 구분 | 토큰 | 용도 |
| --- | --- | --- |
| 텍스트 | ink → body → mute → faint | 제목·강조 → 본문 → 보조 → 비활성 |
| 면·선 | canvas, surface, hairline | 배경, 카드·입력, 1px 테두리 |
| 상태 | link(blue) / warning(amber) / error(red) | 정상·안내 / 주의 / 오류·확인 필요 |
| 분류 | violet, cyan | 구분용 태그 |

- 유채색은 태그·상태 같은 작은 요소에만 쓰고 큰 면에는 채우지 않습니다.
- 태그는 soft 배경 + 진한 글자색이며, red만 흰 배경 + error 테두리입니다.
- 그라데이션, pink·magenta는 사용하지 않습니다.

현재 프로젝트 태그: 기능 업데이트 = blue, 이슈사항 = amber, 1본부 개발 = violet

## 진행상태 · 정렬 · 필터

- `request.json`의 `status`에 **대기 / 진행 / 보류 / 완료** 중 하나를 넣습니다. (허용 목록은 `site.json`의 `statuses`, 다른 값이면 빌드 실패)
- 목록은 **신규 요청이 위**에 옵니다. 요청일 내림차순, 같은 날이면 `no`가 큰 순입니다. 새 요청 건은 `no`를 이전 최댓값 + 1로 넣으세요.
- 인덱스에서 진행상태·프로젝트를 선택해 필터링하고, 제목·내용·이슈 번호를 검색할 수 있습니다.
- 진행상태 색상: 대기 = 회색, 진행 = blue, 보류 = amber, 완료 = 검정

## CSS 단일 규격

`src/doc.css` 하나가 모든 화면의 기준이며 예외 값을 두지 않습니다.

- `:root` 밖에서는 px·hex·rgb를 직접 쓰지 않고 토큰만 씁니다. (글자 크기 `--fs-*` 12/14/16/20/32, 굵기 `--fw-*` 400/500/600, 간격 `--sp-*` 4~96, 라운드 `--radius-*` 6/12/full, 높이 컨트롤 32·태그 24)
- 텍스트 색은 ink·body만 씁니다. 옅은 회색(mute)은 대비 3.2:1이라 텍스트에서 제외했습니다.
- `npm run lint:css`로 검사하며, 빌드(`doc`·`publish`·`index`) 때도 자동 실행되어 위반 시 빌드가 중단됩니다.
- 새 값이 필요하면 임의 값을 쓰지 말고 `:root`에 토큰을 먼저 추가·합의합니다.

## 레이아웃 검사

`npm run check:layout` (인덱스 빌드 때 자동 실행). 헤드리스 Chrome으로 `index.html`을 열어 실측합니다.

- 표 머리글 글자, 셀 내용이 칸 밖으로 넘치면 빌드가 중단됩니다.
- `site.json`에 등록된 프로젝트·진행상태 태그 전체를 검사하므로, 아직 목록에 없는 새 태그도 미리 잡습니다.
- Chrome을 찾지 못하면 경고만 하고 건너뜁니다. (`CHROME_BIN`으로 경로 지정)

## 화면정의서 작성 규칙 (spec.json 방식)

화면정의서는 `requests/<slug>/<버전>/spec.json` 하나로 작성합니다. `spec.json`이 있으면 빌드가 `tools/spec.mjs`로 렌더링하고, 없으면 `content.html` 방식으로 빌드합니다. 템플릿·CSS·뷰어 동작은 렌더러가 담당하므로 작성자는 내용만 채웁니다.

### 작업 흐름 (참고 Figma 없이 자료로 바로 작성)

1. **자료 수령·등록** — 자료조사·자료정리·정책정리·관리자 UI HTML을 받으면 `request.json`의 `materials`에 종류(`자료조사`/`자료정리`/`정책정리`/`관리자UI`/`기타`)·이름·링크(또는 경로)를 기록합니다. 로컬 HTML은 `requests/<slug>/materials/`에 보관합니다.
2. **화면 캡처 준비** — 관리자·쇼핑몰 저장 HTML을 상태별로 가공(개인정보 마스킹, 알림창·모달 상태 주입)한 뒤 `tools/capture/shot.mjs`로 캡처합니다. 가공 예시는 `tools/capture/examples/`.
3. **마커 좌표 실측** — `tools/capture/measure.mjs`에 `{"마커번호":["선택자"]}`를 주면 `marks`용 좌표(%)가 나옵니다. 눈대중으로 좌표를 적지 않습니다.
4. **spec.json 작성** — 정책정리 내용을 근거로 디스크립션·정책·사용자 흐름을 작성합니다. 근거 자료가 없는 문장은 쓰지 않고 `questions`(확인 필요)로 분리합니다. 참고 Figma가 없으므로 문구는 작성자(AI 포함)가 직접 쓰며, 검토 전에는 확정 문구로 취급하지 않습니다.
5. **빌드·검사** — `node tools/build.mjs doc <slug> <버전>` → 검증(opens·마커↔디스크립션·flow·이미지·외부 링크), CSS 규격, 폭별 넘침 검사가 자동 실행됩니다.
6. **공유** — `publish` → `index`. 공유한 버전은 수정하지 않고 새 버전을 만듭니다.

### spec.json 구조

- 최상위: `title` · `version` · `date` · `revisions[]` · `chapters[]`
- 챕터: `{ id, title, sheets[], policyHtml?, flow? }` — 챕터 `flow`는 사용자 흐름 칩 목록
- 문서 시트(개요 등): `sections[{ title, kind: revisions|html, htmlFile, open }]` — 개정이력은 `open:true`(펼침), 정책 아코디언은 `open:false`(접힘)
- 화면 시트: `{ id, tab, title, menuPath, kind: new|extend, intro[], devices{ pc, mobile }.states[], annotations[], blocks{ policy[], policyHtml, flow, questions[] } }`
  - 비어 있는 블록은 탭이 비활성화됩니다. "해당 없음"을 쓰지 않습니다.
- 상태(`states[]`): `{ id, label, image, group?, marks[{ n, x, y, w, h, opens? }], annotations?[], overlays?[{ id, label, image, box:{ x, y, w } }] }`
  - `group`을 주면 칩 대신 드롭다운(예: 알림)으로 묶입니다. 상태가 많아져도 칩 줄이 깨지지 않습니다.
  - 모달·팝업은 화면 전체 이미지가 아니라 **오버레이**(잘라낸 팝업 이미지 + 스크림)로 올립니다. 페이지가 바뀐 것처럼 보이지 않게 합니다.
  - 알림창은 상태(`alert-*`)로 두고 자체 디스크립션을 가집니다. 트리거 버튼은 기본 상태 마커의 `opens`로 연결합니다.
- 디스크립션(`annotations[]`): `{ n, title, lines[], opens? }` — `lines` 항목은 문자열(`{{red}}…{{/red}}` 강조 가능) 또는 `{t, ref}`(다른 시트 참조), `{t, sub}`(하위 항목)
- 사용자 흐름(`flow` 행): `{ label, sheet, state?, n?, open? }` — 칩 클릭 시 해당 시트·상태·번호·오버레이로 이동하며 하이라이트는 1개만 유지합니다.

### 작성 원칙

- 디스크립션은 **사용자 조작 → 시스템 동작** 중심의 단문으로 씁니다. 배경 설명은 정책 탭으로 보냅니다.
- 화면의 모든 마커(`marks`)는 같은 번호의 디스크립션이 있어야 하고, 디스크립션의 번호는 화면 마커 또는 알림 상태와 연결되어야 합니다. (빌드가 검사)
- 라벨은 실제 화면 문구와 같게 씁니다. (예: 버튼 라벨이 "상품선택"이면 디스크립션 제목도 "버튼 - 상품선택")
- 샘플 데이터(상품명·회원명 등)는 가공 시 작성자가 만든 값이므로 자료의 실제 값과 구분하고, 개인정보는 `홍길동(sample)`처럼 마스킹합니다.
- Happy Path만 쓰지 않습니다. 빈 상태·알림·오류·권한·한도 등 해당되는 상태는 상태 칩이나 `questions`로 남깁니다.
- 새 스타일이 필요하면 `src/doc.css`의 토큰(`:root`)을 먼저 추가합니다. 인라인 스타일·임의 px·hex는 쓰지 않습니다.

### 검사 (빌드 때 자동 실행)

| 검사 | 내용 | 생략 |
| --- | --- | --- |
| spec 검증 | `opens`·마커↔디스크립션·flow 대상·이미지·외부 링크 | 불가 |
| CSS 규격 | 토큰만 사용, 미정의 토큰 차단 | 불가 |
| 인덱스 넘침 | 표 머리글·셀·태그 (`check-layout.mjs`) | Chrome 없으면 경고 후 건너뜀 |
| 문서 넘침 | 폭 1440/1024/768/500에서 모든 챕터·시트의 페이지 가로 스크롤·영역 밖 요소 (`check-doc.mjs`) | `--no-check` |

### 지원 범위와 알려진 제한

- **화면 표시**: 데스크톱·태블릿·모바일(≤640px)에서 넘침 없음을 검사합니다. 모바일에서는 화면 이미지·디스크립션이 세로로 쌓이고 표는 가로 스크롤됩니다.
- **인쇄·PDF**: 화면정의서는 화면용 뷰어(뷰포트 고정 레이아웃)라 인쇄하면 첫 화면만 나옵니다. 전달 형식은 HTML 1개 파일이며, PDF가 필요하면 별도 인쇄 스타일을 먼저 합의합니다.
- **헤드리스 Chrome 최소 창 폭은 약 500px**이라 그보다 좁은 폭은 실측하지 못합니다.
- 연동상품관리 챕터는 화면 시트가 아직 없습니다. (흐름 칩 "화면 시트 추가 예정")
