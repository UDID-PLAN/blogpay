#!/usr/bin/env node
// BlogPay 기획서 빌드 스크립트 (외부 패키지 없음, Node 18+)
//
//   node tools/build.mjs doc <slug> <버전>        초안 생성  → draft/<slug>/<slug>_<버전>.html  (git 제외)
//   node tools/build.mjs publish <slug> <버전>    공유본 생성 → published/<slug>/<slug>_<버전>.html (이미 있으면 거부, --force로만 덮어쓰기)
//   node tools/build.mjs index                    인덱스 생성 → index.html
//
// 결과 HTML은 CSS·이미지를 모두 내장한 단일 파일이다. 외부 링크가 하나라도 있으면 빌드가 실패한다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintCss } from './lint-css.mjs';
import { checkLayout } from './check-layout.mjs';
import { renderSpec } from './spec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const MAX_BYTES = 5 * 1024 * 1024; // 단일 파일 용량 경고선
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' };

const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const fill = (tpl, map) => tpl.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m));
const fail = (msg) => { console.error('✖ ' + msg); process.exit(1); };
const kb = (n) => (n / 1024).toFixed(0) + 'KB';

function loadRequest(slug) {
  const f = P('requests', slug, 'request.json');
  if (!fs.existsSync(f)) fail(`요청 건을 찾을 수 없습니다: requests/${slug}/request.json`);
  return readJson(f);
}

// 외부 리소스 참조 검사 — 단일 파일로 전달했을 때 깨지는 원인을 빌드 단계에서 차단
function assertSelfContained(html, label) {
  const bad = [];
  const rules = [
    [/<link\b[^>]*\bhref=/gi, '<link href>'],
    [/<script\b[^>]*\bsrc=/gi, '<script src>'],
    [/<(?:img|source|iframe|video|audio)\b[^>]*\bsrc="(?!data:)[^"]*"/gi, '<img/iframe src> (data URI 아님)'],
    [/@import\b/gi, '@import'],
    [/url\(\s*['"]?(?!data:)(?:https?:)?\/\//gi, 'url(http…)'],
  ];
  for (const [re, name] of rules) if (re.test(html)) bad.push(name);
  if (bad.length) fail(`${label}: 외부 참조가 남아 있습니다 → ${bad.join(', ')}`);
}

function inlineImages(content, dir) {
  return content.replace(/(<img\b[^>]*?\ssrc=")([^"]+)(")/gi, (m, a, src, c) => {
    if (/^(data:|https?:|\/\/)/i.test(src)) {
      if (!/^data:/i.test(src)) fail(`외부 이미지는 사용할 수 없습니다: ${src}`);
      return m;
    }
    const f = path.resolve(dir, src);
    if (!fs.existsSync(f)) fail(`이미지 파일이 없습니다: ${path.relative(ROOT, f)}`);
    const mime = MIME[path.extname(f).toLowerCase()];
    if (!mime) fail(`지원하지 않는 이미지 형식입니다: ${src}`);
    return `${a}data:${mime};base64,${fs.readFileSync(f).toString('base64')}${c}`;
  });
}

// h2/h3에 id를 보장하고 목차 생성
function buildToc(content) {
  const items = [];
  let n = 0;
  const out = content.replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (m, lv, attrs = '', inner) => {
    let id = (attrs.match(/\sid="([^"]+)"/) || [])[1];
    if (!id) { id = `sec-${++n}`; attrs = `${attrs} id="${id}"`; }
    items.push({ lv: Number(lv), id, label: stripTags(inner) });
    return `<h${lv}${attrs}>${inner}</h${lv}>`;
  });
  let html = '<ol>';
  let depth = 2;
  for (const it of items) {
    if (it.lv > depth) { html += '<ol>'; depth = it.lv; }
    else if (it.lv < depth) { html += '</ol></li>'; depth = it.lv; }
    else if (html !== '<ol>') html += '</li>';
    html += `<li><a href="#${it.id}">${esc(it.label)}</a>`;
  }
  if (depth === 3) html += '</li></ol>';
  html += items.length ? '</li></ol>' : '</ol>';
  return { content: out, toc: html };
}

// 개정이력 표 — request.json의 versions에서 자동 생성 (해당 버전까지만 표시 → 과거 공유본이 달라지지 않음)
function revisionsTable(versions, idx) {
  const rows = versions.slice(0, idx + 1).map((v) => `<tr>
  <td>${esc(v.version)}</td><td>${esc(v.date)}</td><td>${esc(v.reason || '-')}</td>
  <td>${esc(v.changes || v.summary || '-')}</td><td>${esc(v.author || '-')}</td><td>${esc(v.reviewer || '-')}</td></tr>`);
  return `<div class="table-wrap"><table>
<thead><tr><th>버전</th><th>변경일자</th><th>변경사유</th><th>변경내용</th><th>작성자</th><th>검토자</th></tr></thead>
<tbody>${rows.join('\n')}</tbody></table></div>`;
}

function renderDoc(slug, version) {
  const req = loadRequest(slug);
  const idx = (req.versions || []).findIndex((v) => v.version === version);
  if (idx < 0) fail(`request.json의 versions에 ${version}이(가) 없습니다.`);
  const ver = req.versions[idx];
  const dir = P('requests', slug, version);
  const sf = path.join(dir, 'spec.json');
  if (fs.existsSync(sf)) {
    const { nav, body, script } = renderSpec(readJson(sf), { dir, revisions: revisionsTable(req.versions, idx), fail, warn: (m) => console.warn('⚠ ' + m) });
    const html = fill(read(P('src', 'spec-frame.html')), { CSS: read(P('src', 'doc.css')), TITLE: esc(req.title), VERSION: esc(version), DATE: esc(ver.date), NAV: nav, CONTENT: body, SCRIPT: script });
    assertSelfContained(html, `${slug} ${version}`);
    const size = Buffer.byteLength(html);
    if (size > MAX_BYTES) console.warn(`⚠ 파일 용량이 ${kb(size)}입니다. 이미지를 webp로 압축하세요. (권장 상한 ${kb(MAX_BYTES)})`);
    return { html, size };
  }
  const cf = path.join(dir, 'content.html');
  if (!fs.existsSync(cf)) fail(`본문 파일이 없습니다: requests/${slug}/${version}/content.html`);

  let content = fill(read(cf), { REVISIONS: revisionsTable(req.versions, idx) });
  content = inlineImages(content, dir);
  const { content: withIds, toc } = buildToc(content);

  const html = fill(read(P('src', 'doc-frame.html')), {
    CSS: read(P('src', 'doc.css')),
    TITLE: esc(req.title),
    VERSION: esc(version),
    DATE: esc(ver.date),
    TOC: toc,
    CONTENT: withIds,
  });
  assertSelfContained(html, `${slug} ${version}`);
  const size = Buffer.byteLength(html);
  if (size > MAX_BYTES) console.warn(`⚠ 파일 용량이 ${kb(size)}입니다. 이미지를 webp로 압축하세요. (권장 상한 ${kb(MAX_BYTES)})`);
  return { html, size };
}

function write(out, html) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

function cmdDoc(slug, version) {
  const { html, size } = renderDoc(slug, version);
  const out = P('draft', slug, `${slug}_${version}.html`);
  write(out, html);
  console.log(`✔ 초안 생성: ${path.relative(ROOT, out)} (${kb(size)})`);
}

function cmdPublish(slug, version, force) {
  const out = P('published', slug, `${slug}_${version}.html`);
  if (fs.existsSync(out) && !force) {
    fail(`이미 공유된 버전입니다: ${path.relative(ROOT, out)}\n  공유한 버전은 수정하지 않습니다. 변경이 있으면 새 버전(예: v1.2)을 만드세요. (정말 덮어써야 하면 --force)`);
  }
  const { html, size } = renderDoc(slug, version);
  write(out, html);
  console.log(`✔ 공유본 생성: ${path.relative(ROOT, out)} (${kb(size)})`);
  console.log('  → node tools/build.mjs index 로 인덱스를 갱신하세요.');
}

// 템플릿 샘플: 실제 공유본과 별개 파일(published/<slug>/<slug>_<버전>_sample.html). 샘플은 덮어써도 된다.
function cmdSample(slug, version) {
  const { html, size } = renderDoc(slug, version);
  const out = P('published', slug, `${slug}_${version}_sample.html`);
  write(out, html);
  console.log(`✔ 샘플 생성: ${path.relative(ROOT, out)} (${kb(size)})`);
}

function linkBtn(label, url, primary) {
  if (!url) return `<span class="btn disabled">${esc(label)} (미등록)</span>`;
  return `<a class="btn${primary ? ' primary' : ''}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
}

function cmdIndex() {
  const site = readJson(P('site.json'));
  const common = `<div class="links">${(site.commonLinks || []).filter((l) => l.url).map((l) => linkBtn(l.label, l.url)).join('\n')}</div>`;
  const tones = Object.fromEntries((site.projectTags || []).map((t) => [t.name, t.tone || 'neutral']));
  const statusDefs = site.statuses || [];
  const statusNames = statusDefs.map((x) => x.name);
  const statusTones = Object.fromEntries(statusDefs.map((x) => [x.name, x.tone || 'neutral']));
  const statusTag = (name) => `<span class="tag tone-${esc(statusTones[name] || 'neutral')}">${esc(name)}</span>`;
  const projectTag = (name) => name ? `<span class="tag tone-${esc(tones[name] || 'neutral')}">${esc(name)}</span>` : '<span class="mute">-</span>';

  const reqDir = P('requests');
  const slugs = fs.existsSync(reqDir)
    ? fs.readdirSync(reqDir).filter((s) => !s.startsWith('_') && fs.existsSync(P('requests', s, 'request.json')))
    : [];
  const reqs = slugs.map((slug) => ({ slug, ...loadRequest(slug) }))
    .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)) || (b.no ?? 0) - (a.no ?? 0)); // 신규 요청이 위: 요청일 내림차순, 같은 날이면 번호(no)가 큰 순

  const aLink = (l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`;
  const linkify = (t) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  const contentCell = (text) => {
    const lines = String(text || '').split('\n').map((x) => x.trim()).filter((x) => x && x !== '===');
    if (!lines.length) return '<span class="mute">-</span>';
    let head = lines.slice(0, 2).join(' / ');
    if (head.length > 60) head = head.slice(0, 60) + '…';
    return `<details class="cell-content"><summary>${esc(head)}</summary><div>${linkify(String(text).trim())}</div></details>`;
  };

  for (const r of reqs) {
    if (!statusNames.includes(r.status)) fail(`requests/${r.slug}/request.json의 status가 올바르지 않습니다: "${r.status ?? ''}" (허용: ${statusNames.join(' / ')})`);
  }

  const rows = reqs.map((r) => {
    const vs = [...(r.versions || [])].reverse(); // 최신이 위
    // 기획서 열: 버전 버튼만 표시 (변경 내용은 각 기획서의 개정이력에 있으므로 목록에는 넣지 않는다)
    const chip = (v, i) => {
      const f = `published/${r.slug}/${r.slug}_${v.version}.html`;
      const hasHtml = fs.existsSync(P(f));
      const cls = `btn${i === 0 ? ' primary' : ''}`;
      const tip = esc([v.date, v.summary].filter(Boolean).join(' · '));
      if (hasHtml) return `<a class="${cls}" href="${esc(f)}" title="${tip}">${esc(v.version)}</a>`;
      if (v.url) return `<a class="${cls}" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer" title="${tip}">${esc(v.version)}</a>`;
      return `<span class="btn disabled" title="${tip}">${esc(v.version)}</span>`;
    };
    const parts = [];
    if (vs.length) parts.push(`<div class="vbtns">${vs.map(chip).join('')}</div>`);
    if (r.sample) {
      const sf = `published/${r.slug}/${r.slug}_${r.sample}_sample.html`;
      if (fs.existsSync(P(sf))) parts.push(`<div class="vbtns"><a class="btn" href="${esc(sf)}" title="화면정의서 템플릿 샘플 (${esc(r.sample)} 기준)">샘플</a></div>`);
    }
    const planCell = parts.join('') || '<span class="mute">작성 전</span>';

    const extra = [];
    if (r.qa) extra.push(aLink({ label: 'QA', url: r.qa }));
    for (const l of r.references || []) extra.push(aLink(l));
    const refList = extra.length ? `<ul class="reflist">${extra.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
    const noteCell = [r.note ? `<div>${esc(r.note)}</div>` : '', refList].filter(Boolean).join('');

    const q = esc([r.title, r.content, r.issue, r.requestedAt, r.project].join(' ')).toLowerCase();
    return `<tr data-status="${esc(r.status)}" data-project="${esc(r.project || '')}" data-q="${q}">
  <td class="nowrap">${esc(r.requestedAt || '-')}</td>
  <td class="nowrap">${esc(r.issue || '-')}</td>
  <td>${projectTag(r.project)}</td>
  <td>${statusTag(r.status)}</td>
  <td><strong>${esc(r.title)}</strong></td>
  <td class="col-content">${contentCell(r.content)}</td>
  <td class="nowrap">${r.flow ? aLink({ label: '플로우', url: r.flow }) : '<span class="mute">-</span>'}</td>
  <td>${planCell}</td>
  <td>${noteCell || '<span class="mute">-</span>'}</td></tr>`;
  });
  const table = `<div class="table-wrap"><table class="index-table">
<colgroup><col class="w-sm"><col class="w-xs"><col class="w-md"><col class="w-xs"><col class="w-md"><col class="w-fluid"><col class="w-xs"><col class="w-md"><col class="w-lg"></colgroup>
<thead><tr><th>요청일</th><th>이슈 번호</th><th>프로젝트</th><th>진행상태</th><th>제목</th><th>내용</th><th>플로우</th><th>기획서</th><th>비고</th></tr></thead>
<tbody>${rows.join('\n') || '<tr><td colspan="9" class="mute">등록된 요청 건이 없습니다.</td></tr>'}<tr id="empty-row" hidden><td colspan="9" class="mute">조건에 맞는 요청이 없습니다.</td></tr></tbody></table></div>`;

  // 필터: 진행상태·프로젝트(선택형) + 키워드 검색(제목·내용·이슈 번호·요청일)
  const chips = (group, names) => `<button type="button" class="fchip active" data-group="${group}" data-value="" aria-pressed="true">전체</button>`
    + names.map((n) => `<button type="button" class="fchip" data-group="${group}" data-value="${esc(n)}" aria-pressed="false">${esc(n)}</button>`).join('');
  const filters = `<div class="filters">
  <div class="filter-row"><span class="filter-label">진행상태</span>${chips('status', statusNames)}</div>
  <div class="filter-row"><span class="filter-label">프로젝트</span>${chips('project', (site.projectTags || []).map((t) => t.name))}</div>
  <div class="filter-row"><span class="filter-label">검색</span><input id="q" class="search" type="search" placeholder="제목·내용·이슈 번호 검색" autocomplete="off"><span id="result-count" class="mute"></span></div>
</div>`;

  const html = fill(read(P('src', 'index-frame.html')), {
    CSS: read(P('src', 'doc.css')),
    UPDATED: new Date().toISOString().slice(0, 10),
    COMMON: common,
    REQUESTS: filters + table,
  });
  assertSelfContained(html, 'index');
  fs.writeFileSync(P('index.html'), html);
  console.log(`✔ 인덱스 생성: index.html (요청 건 ${reqs.length}개)`);
  const layout = checkLayout();
  if (layout.errors.length) { console.error('✖ 레이아웃 넘침 발견 (열 너비 토큰·패딩을 조정하세요)\n' + layout.errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
  if (!layout.skipped) console.log('✔ 레이아웃 검사 통과');
}

const cssErrors = lintCss(fs.readFileSync(P('src', 'doc.css'), 'utf8'));
if (cssErrors.length) { console.error('✖ CSS 단일 규격 위반 (src/doc.css)\n' + cssErrors.map((e) => '  ' + e).join('\n')); process.exit(1); }

const [cmd, a, b, ...rest] = process.argv.slice(2);
const force = [a, b, ...rest].includes('--force');
if (cmd === 'doc' && a && b) cmdDoc(a, b);
else if (cmd === 'publish' && a && b) cmdPublish(a, b, force);
else if (cmd === 'sample' && a && b) cmdSample(a, b);
else if (cmd === 'index') cmdIndex();
else {
  console.log(`사용법:
  node tools/build.mjs doc <slug> <버전>       초안 생성 (draft/, git 제외)
  node tools/build.mjs publish <slug> <버전>   공유본 생성 (published/, 덮어쓰기 거부)
  node tools/build.mjs index                   인덱스(index.html) 갱신`);
  process.exit(cmd ? 1 : 0);
}
