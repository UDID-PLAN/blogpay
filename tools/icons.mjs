// 화면정의서 아이콘 — 선 아이콘(24px 격자, stroke). spec.json의 chapter.icon / sheet.icon / state.icon에 이름으로 지정한다.
// 도구(알림·PC·모바일·원본 보기·확대·복사·정책·흐름·확인 필요)는 렌더러가 고정으로 쓴다.
const P = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  link: '<path d="m10 13 4-4m-6 7-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m2 8a3.5 3.5 0 0 0 5 0l4-4a3.5 3.5 0 0 0-5-5l-1 1" transform="rotate(-5 12 12)"/>',
  bag: '<path d="M4 8h16l1 13H3L4 8Zm4 0V6a4 4 0 0 1 8 0v2"/>',
  book: '<path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1Zm0 0v14"/>',
  shield: '<path d="m12 2 8 3v6c0 5-3.2 8.5-8 11-4.8-2.5-8-6-8-11V5l8-3Z"/><path d="m8.5 11.5 2.3 2.3 4.8-5"/>',
  'layout-split': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
  login: '<path d="M13 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6M3 12h12m-5-5 5 5-5 5"/>',
  'user-plus': '<circle cx="9" cy="7" r="3.5"/><path d="M2 20v-2a6 6 0 0 1 6-6h2a6 6 0 0 1 5 3m4-6v6m-3-3h6"/>',
  'doc-check': '<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5m-12 6 3 3 5-6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 6-3 7-3 9h18c0-2-3-3-3-9ZM10 20a2.3 2.3 0 0 0 4 0"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4m-4 0h8"/>',
  phone: '<rect x="6.5" y="2" width="11" height="20" rx="2.5"/><path d="M11 18.7h2"/>',
  external: '<path d="M14 3h7v7m0-7-8 8m-2-6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 5V3H4v13h2"/>',
  policy: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 8h7m-7 4h7m-7 4h4"/>',
  flow: '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.1.7-1.5 1.1-1.5 2.4m0 3h.01"/>',
};

export const ICON_NAMES = Object.keys(P);

export function icon(name, fail) {
  if (!name) return '';
  if (!P[name]) { if (fail) fail(`없는 아이콘 이름입니다: ${name} (사용 가능: ${ICON_NAMES.join(', ')})`); return ''; }
  return `<svg class="ico" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P[name]}</svg>`;
}
