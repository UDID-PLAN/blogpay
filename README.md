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
├─ published/<slug>/<slug>_v1.0.html   # 공유한 버전 (고정, 덮어쓰기 거부)
├─ draft/                      # 작업 중 미리보기 (git 제외)
└─ tools/build.mjs             # 빌드 스크립트
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

## 인덱스 표 열 너비 규칙

열 너비는 `src/doc.css`의 5개 토큰만 사용합니다. 표가 이 합계(약 1224px)보다 좁아지면 줄바꿈 대신 가로 스크롤이 생깁니다.

| 토큰 | 너비 | 사용 열 |
| --- | --- | --- |
| xs | 80px | 이슈 번호, 플로우 |
| sm | 120px | 요청일, 프로젝트(태그) |
| md | 160px | 제목 |
| lg | 192px | 기획서(버전 버튼), 비고(관련 자료 링크) |
| fluid | 남는 폭 (최소 280px) | 내용 |

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
