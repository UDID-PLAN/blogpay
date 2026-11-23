// 화면정의서(spec.json) → 단일 HTML 조각 렌더러. 데이터만 있으면 같은 틀로 모든 요청 건을 만든다.
//
// spec.json
//   title / version / date           : 기획서 자체 제목·버전·작성일 (요청 건 제목이 아님)
//   revisions[]                      : { version, date, reason, changes: string|string[], author, reviewer } — 최신이 위
//   chapters[]: { id, title, sheets[], policyHtml?, flow? }   // policyHtml·flow는 챕터 안 화면 시트가 자기 blocks에 없을 때만 쓰는 기본값 (하단 탭은 항상 2차 탭=화면 시트 기준)
//   sheets[] type=document           : { id, type, title, tab?, kind: "revisions" | "html", htmlFile? }
//   sheets[] (화면)                  : { id, tab, title, menuPath, kind: "new"|"extend", intro: string[],
//                                        devices: { pc: {states:[state]}, mobile: null|{…} },
//                                        annotations[]: { n, title, lines: (string | {t, ref?:true, sub?:[…]})[], opens?, cases?: [{label, image?, marks?}] },   // cases: 첫 항목=현재 화면, 이후 image로 화면 전체를 바꿔 보여줌. 해당 번호 마커만 표시(marks로 위치 지정)
//                                        blocks: { policy[], policyHtml, flow, questions[] } }   // 비어 있으면 해당 탭은 비활성
//   state                            : { id, label, image, group?, marks[{n,x,y,w,h,opens?}], annotations?[], overlays?[{id,label,image,box:{x,y,w}}] }
//                                      group = 같은 값끼리 상태 칩 하나(드롭다운)로 묶임 / annotations = 이 상태에서만 보이는 설명
//                                      overlays = 상태 전환 없이 화면 위에 띄우는 팝업(box는 캔버스 대비 %)
//   opens                            : 마크·설명을 누르면 열 상태 id 또는 overlay id (없는 id는 무시되므로 반드시 빌드 검증을 통과시킬 것)
//   flow[]                           : { label, sheet, state?, n?, open? } 또는 행 배열 — 누르면 해당 시트·상태·번호(·팝업)로 이동
//   marks x,y,w,h: 이미지 가로·세로 대비 % (번호 배지는 박스 좌상단)
import fs from 'node:fs';
import path from 'node:path';

import { icon as ico } from './icons.mjs';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const IMG_WARN = 800 * 1024;

export function renderSpec(spec, { dir, fail, warn }) {
  const imgData = (rel, label) => {
    const f = path.resolve(dir, rel);
    if (!fs.existsSync(f)) fail(`화면 이미지가 없습니다: ${rel} (${label})`);
    const mime = MIME[path.extname(f).toLowerCase()];
    if (!mime) fail(`지원하지 않는 이미지 형식입니다: ${rel}`);
    const buf = fs.readFileSync(f);
    if (buf.length > IMG_WARN) warn(`이미지가 ${(buf.length / 1024).toFixed(0)}KB입니다: ${rel} (webp 변환 권장)`);
    return `data:${mime};base64,${buf.toString('base64')}`;
  };
  const icon = (n) => ico(n, fail);
  const ids = new Set();
  const uniq = (id) => { if (ids.has(id)) fail(`spec.json에 중복 id가 있습니다: ${id}`); ids.add(id); return id; };
  const badge = (b) => `<span class="tag ${b.tone ? 'tone-' + esc(b.tone) : ''}">${esc(b.label ?? b)}</span>`;
  const inline = (t) => esc(t).replace(/\{\{(.+?)\}\}/g, '<span class="ref">$1</span>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  // {t, copy:"문구"}: 안내 배너·알림처럼 긴 문구는 본문 대신 [복사] 버튼만 표시. 누르면 토스트 알림({{}} 강조는 복사 시 제거)
  const copyBox = (l) => `${l.t ? inline(l.t) : ''}<button type="button" class="fchip copy-btn" data-copy="${esc(l.copy.replace(/\{\{(.+?)\}\}/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1'))}">${ico('copy')}복사</button>`;
  const line = (l) => (typeof l === 'string' ? inline(l) : l.copy ? copyBox(l) : l.ref ? `<span class="ref">${esc(l.t)}</span>` : inline(l.t));
  const li = (x) => `<li>${line(x)}${x && x.sub && x.sub.length ? `<ul>${x.sub.map(li).join('')}</ul>` : ''}</li>`;
  const list = (arr) => (arr && arr.length ? `<ul>${arr.map(li).join('')}</ul>` : '<p class="mute">해당 없음</p>');

  const revisions = () => {
    const rows = (spec.revisions || []).map((r) => {
      const ch = Array.isArray(r.changes) ? `<ul>${r.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : esc(r.changes ?? '-');
      return `<tr><td>${esc(r.version)}</td><td>${esc(r.date)}</td><td>${esc(r.reason ?? '-')}</td><td>${ch}</td><td>${esc(r.author ?? '-')}</td><td>${esc(r.reviewer ?? '-')}</td></tr>`;
    }).join('\n');
    return `<div class="table-wrap"><table class="rev-table"><colgroup><col class="c-ver"><col class="c-date"><col class="c-why"><col class="c-what"><col class="c-who"><col class="c-who"></colgroup>
<thead><tr><th>버전</th><th>변경일자</th><th>변경 사유</th><th>변경 내용</th><th>작성자</th><th>검토자</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };

  const sectionBody = (s) => {
    if (s.kind === 'revisions') return revisions();
    const f = path.resolve(dir, s.htmlFile || '');
    if (!s.htmlFile || !fs.existsSync(f)) fail(`문서 시트 본문 파일이 없습니다: ${s.htmlFile}`);
    return fs.readFileSync(f, 'utf8');
  };
  const docSheet = (sh, first) => {
    uniq(sh.id);
    const secs = sh.sections || [{ title: sh.title, kind: sh.kind, htmlFile: sh.htmlFile, open: true }];
    // plain:true 섹션은 아코디언 없이 본문만 펼쳐 둔다 (예: 이용매뉴얼 STEP 카드)
    const body = secs.map((s) => (s.plain ? `<div class="doc-plain">${sectionBody(s)}</div>` : `<details class="acc"${s.open === false ? '' : ' open'}><summary>${esc(s.title)}</summary><div class="acc-body">${sectionBody(s)}</div></details>`)).join('\n');
    return `<section class="spec-sheet${first ? ' on' : ''}" data-sheet="${esc(sh.id)}"><div class="spec-doc">${body}</div></section>`;
  };

  const view = (sid, dev, st, first) => {
    const marks = (st.marks || []).map((m) => `<div class="mark${m.pin === 'right' ? ' pin-r' : ''}" data-n="${m.n}"${m.opens ? ` data-opens="${esc(m.opens)}"` : ''} style="left:${m.x}%;top:${m.y}%;width:${m.w}%;height:${m.h}%"><span class="n">${m.n}</span></div>`).join('');
    const ovls = (st.overlays || []).map((o) => `<div class="ovl" data-ovl="${esc(o.id)}" hidden><img alt="${esc(o.label || o.id)}" style="left:${o.box.x}%;top:${o.box.y}%;width:${o.box.w}%" src="${imgData(o.image, `${sid} ${dev} ${o.id}`)}"><span class="ovl-close">닫기 ✕</span></div>`).join('');
    return `<div class="spec-view${first ? ' on' : ''}" data-dev="${dev}" data-state="${esc(st.id)}"><div class="canvas"><img alt="${esc(st.label)}" src="${imgData(st.image, `${sid} ${dev} ${st.id}`)}">${marks}${ovls}</div></div>`;
  };

  // 화면 도구: 원본 보기(현재 이미지를 새 탭) + 배율(50~200%, 10% 단위). 배율은 문서 전체에 적용된다
  const ZOOMS = Array.from({ length: 16 }, (_, i) => 50 + i * 10);
  const magnify = () => `<div class="magnify" role="group" aria-label="배율"><button type="button" data-change="-10" aria-label="축소">${icon('minus')}</button><span class="zoom-picker"><select aria-label="배율 선택">${ZOOMS.map((z) => `<option value="${z}"${z === 100 ? ' selected' : ''}>${z}%</option>`).join('')}</select></span><button type="button" data-change="10" aria-label="확대">${icon('plus')}</button></div>`;
  const zoomTools = (orig) => `${orig ? `<button type="button" class="original-view">${icon('external')}원본 보기</button>` : ''}${magnify()}`;

  const screenSheet = (sh, first, ch = {}) => {
    uniq(sh.id);
    const devs = sh.devices || {};
    const keys = ['pc', 'mobile'];
    const d0 = keys.find((k) => devs[k]);
    const info = esc(sh.menuPath || '');
    const KIND = { new: { label: '신설', tone: 'blue' }, extend: { label: '확장', tone: 'violet' } };
    if (sh.kind && !KIND[sh.kind]) fail(`sheet.kind는 new(신설) 또는 extend(확장)만 가능합니다: ${sh.kind}`);
    const kindTag = sh.kind ? badge(KIND[sh.kind]) : '';
    const stateChips = (states) => {
      const chip = (x, i) => `<button type="button" class="fchip${i === 0 ? ' active' : ''}" data-state-btn="${esc(x.id)}">${icon(x.icon)}${esc(x.label)}</button>`;
      const out = [];
      for (let i = 0; i < states.length; i++) {
        const g = states[i].group;
        if (!g) { out.push(chip(states[i], i)); continue; }
        const idx = [];
        while (i < states.length && states[i].group === g) { idx.push(i); i++; }
        i--;
        out.push(`<span class="menu" data-menu="${esc(g)}"><button type="button" class="fchip menu-btn" data-menu-btn="${esc(g)}" aria-haspopup="true">${icon('bell')}<span class="menu-label">${esc(g)} ▾</span></button><span class="menu-list" hidden>${idx.map((k) => `<button type="button" class="fchip" data-state-btn="${esc(states[k].id)}" data-menu-label="${esc(states[k].label)}">${esc(states[k].label)}</button>`).join('')}</span></span>`);
      }
      return out.join('');
    };
    const tools = `<div class="stage-tools">
<div class="seg" role="group" aria-label="화면 상태">${stateChips(devs[d0]?.states || [])}</div>
<div class="seg dev" role="group" aria-label="디바이스">${keys.map((k) => `<button type="button" class="fchip${k === d0 ? ' active' : ''}" data-dev-btn="${k}"${devs[k] ? '' : ` disabled title="${k === 'pc' ? 'PC' : '모바일'} 화면 없음"`}>${icon(k === 'pc' ? 'monitor' : 'phone')}${k === 'pc' ? 'PC 화면' : '모바일 화면'}</button>`).join('')}</div></div>`;
    const allStates = keys.filter((k) => devs[k]).flatMap((k) => devs[k].states);
    const targets = new Set(allStates.flatMap((x) => [x.id, ...(x.overlays || []).map((o) => o.id)]));
    [...allStates.flatMap((x) => x.marks || []), ...(sh.annotations || [])].forEach((x) => { if (x.opens && !targets.has(x.opens)) fail(`${sh.id}: opens가 가리키는 상태·팝업이 없습니다: ${x.opens}`); });
    allStates.forEach((x) => { const own = new Set((x.annotations || sh.annotations || []).map((a) => a.n)); (x.marks || []).forEach((m) => { if (!own.has(m.n)) fail(`${sh.id}/${x.id}: 마크 ${m.n}번에 대응하는 설명이 없습니다`); }); });
    const views = keys.filter((k) => devs[k]).flatMap((k) => devs[k].states.map((s, i) => view(sh.id, k, s, k === d0 && i === 0))).join('');
    // intro 항목: 문자열 또는 {t, tryHtml} — tryHtml은 직접 입력해 볼 수 있는 예시 HTML(같은 폴더 파일)을 새 탭으로 연다
    const tryHtml = (x) => { const f = path.resolve(dir, x.tryHtml); if (!fs.existsSync(f)) fail(`예시 HTML 파일이 없습니다: ${x.tryHtml}`); return ` <button type="button" class="try-link" data-try-html="${Buffer.from(fs.readFileSync(f)).toString('base64')}">${esc(x.t)} ↗</button>`; };
    const intro = (sh.intro || []).length ? `<div class="side-note">${sh.intro.map((x) => (typeof x === 'string' ? inline(x) : x.tryHtml ? tryHtml(x) : inline(x.t))).join(' ')}</div>` : '';
    // 케이스 전환: 같은 화면에서 조건에 따라 달라지는 모습(예: 사용함/사용안함, 사업자/개인)을 디스크립션 버튼으로 전환. 첫 번째 케이스는 현재 화면(image 생략)
    // 케이스 전환 시 해당 번호 마커만 남긴다. case.marks로 케이스 이미지의 위치를 지정(생략하면 기본 위치)
    const caseBtns = (a) => (a.cases && a.cases.length ? `<div class="cases">${a.cases.map((c, i) => `<button type="button" class="fchip${i === 0 ? ' active' : ''}" data-case="${c.image ? imgData(c.image, `${sh.id} case ${c.label}`) : ''}" data-case-n="${a.n}"${c.marks ? ` data-case-marks="${esc(JSON.stringify(c.marks))}"` : ''}>${esc(c.label)}</button>`).join('')}</div>` : '');
    const annoLi = (a) => `<li data-n="${a.n}"${a.opens ? ` data-opens="${esc(a.opens)}"` : ''}><span class="n">${a.n}</span><div><strong>${esc(a.title)}</strong>${list(a.lines)}${caseBtns(a)}</div></li>`;
    const firstState = devs[d0]?.states?.[0]?.id;
    const ownLists = keys.filter((k) => devs[k]).flatMap((k) => devs[k].states).filter((s, i, a) => s.annotations && a.findIndex((x) => x.id === s.id) === i);
    const annos = `<ol class="annos${ownLists.some((s) => s.id === firstState) ? '' : ' on'}" data-for="*">${(sh.annotations || []).map(annoLi).join('')}</ol>`
      + ownLists.map((s) => `<ol class="annos${s.id === firstState ? ' on' : ''}" data-for="${esc(s.id)}">${s.annotations.map(annoLi).join('')}</ol>`).join('');
    const b = sh.blocks || {};
    const policyFile = b.policyHtml ?? ch.policyHtml;
    const policyBody = policyFile ? (() => { const f = path.resolve(dir, policyFile); if (!fs.existsSync(f)) fail(`정책 본문 파일이 없습니다: ${policyFile}`); return fs.readFileSync(f, 'utf8'); })() : (b.policy && b.policy.length ? list(b.policy) : '');
    const rowsIn = b.flow ?? ch.flow ?? [];
    const rows = rowsIn.length && !Array.isArray(rowsIn[0]) ? [rowsIn] : rowsIn;
    const sheetIds = new Set((ch.sheets || []).map((x) => x.id));
    const flowBody = rows.length ? rows.map((r) => `<ol class="flow">${r.map((x) => {
      if (x.sheet && !sheetIds.has(x.sheet)) fail(`사용자 흐름의 이동 대상 시트가 없습니다: ${x.sheet}`);
      if (x.sheet && sheetIds.has(x.sheet)) {
        const tg = (ch.sheets || []).find((y) => y.id === x.sheet);
        const sts = Object.values(tg.devices || {}).filter(Boolean).flatMap((v) => v.states || []);
        const ok = new Set(sts.flatMap((y) => [y.id, ...(y.overlays || []).map((o) => o.id)]));
        if (x.state && !ok.has(x.state)) fail(`사용자 흐름의 상태가 없습니다: ${x.sheet}/${x.state}`);
        if (x.open && !ok.has(x.open)) fail(`사용자 흐름의 팝업이 없습니다: ${x.sheet}/${x.open}`);
        const st0 = sts.find((y) => y.id === (x.state || sts[0]?.id));
        if (x.n && st0 && !(st0.marks || []).some((m) => m.n === x.n)) fail(`사용자 흐름의 번호 ${x.n}에 해당하는 마크가 없습니다: ${x.sheet}/${st0.id}`);
      }
      const go = x.sheet ? ` data-go-sheet="${esc(x.sheet)}"${x.state ? ` data-go-state="${esc(x.state)}"` : ''}${x.n ? ` data-go-n="${x.n}"` : ''}${x.open ? ` data-go-open="${esc(x.open)}"` : ''}` : ' disabled title="화면 시트 추가 예정"';
      return `<li><button type="button" class="fchip"${go} data-flow-key="${esc(x.label)}"><span class="flow-action">${esc(x.label)}</span></button></li>`;
    }).join('')}</ol>`).join('') : '';
    // 확인 필요: 정책 탭과 같은 2열(항목 | 내용) 형식. 항목은 {k, v} 또는 문자열(항목명 없이 내용만)
    const qRow = (q, i) => (typeof q === 'string'
      ? `<div class="plist-row"><span class="plist-k">확인 ${i + 1}</span><div class="plist-v">${inline(q)}</div></div>`
      : `<div class="plist-row"><span class="plist-k">${esc(q.k)}</span><div class="plist-v">${Array.isArray(q.v) ? list(q.v) : inline(q.v)}</div></div>`);
    const qBody = b.questions && b.questions.length ? `<div class="plist">${b.questions.map(qRow).join('')}</div>` : '';
    // 하단 독: 정책·사용자 흐름·확인 필요 — 아이콘·개수(정책·확인 필요 = 행 수, 흐름 = 단계 수)를 함께 보여준다
    const count = (html, re) => (html.match(re) || []).length;
    const panels = [['policy', '정책', policyBody, 'policy', count(policyBody, /class="plist-row"/g) || count(policyBody, /<li>/g), '개'], ['flow', '사용자 흐름', flowBody, 'flow', count(flowBody, /<li>/g), '단계'], ['questions', '확인 필요', qBody, 'help', count(qBody, /class="plist-row"/g), '개']];
    const bar = `<div class="tabs bar">${panels.map(([k, l, body, ic, n, u]) => `<button type="button" class="tab" data-panel-btn="${k}" aria-expanded="false"${body ? '' : ' disabled'}>${icon(ic)}<span class="dock-label">${l}</span>${body ? `<span class="dock-count">${n}<span class="dock-unit">${u}</span></span>` : ''}</button>`).join('')}</div>`;
    const drawers = panels.filter(([, , body]) => body).map(([k, , body]) => `<div class="spec-drawer" data-panel="${k}">${body}</div>`).join('');
    const zoom = zoomTools(true);
    return `<section class="spec-sheet${first ? ' on' : ''}" data-sheet="${esc(sh.id)}">
<div class="stage-row"><div class="stage-head"><div class="stage-caption"><h2>${esc(sh.title)}</h2>${kindTag}<span class="stage-info">${info}</span></div>${tools}</div><div class="stage-zoom">${zoom}</div></div>
<div class="spec-body"><div class="stage"><div class="viewport">${views}</div></div>
<aside class="side" aria-label="화면 설명"><div class="side-head"><span>화면 설명</span></div><div class="side-scroll">${intro}${annos}</div></aside></div>
${drawers}${bar}</section>`;
  };

  // 단계형 시트(type:"step"): 좌측 이미지 + 우측 패널(STEP 번호·제목·태그·설정 위치 + htmlFile의 할 일/입력값/주의사항). 예: 이용매뉴얼
  const stepSheet = (sh, first) => {
    uniq(sh.id);
    const f = path.resolve(dir, sh.htmlFile || '');
    if (!sh.htmlFile || !fs.existsSync(f)) fail(`단계 시트 본문 파일이 없습니다: ${sh.htmlFile}`);
    // images: [{image, caption?, source?}] — 위에서 아래로 쌓아 보여준다(예: 카카오 공식 가이드 예시 화면)
    const imgs = sh.images || (sh.image ? [{ image: sh.image }] : []);
    const img = imgs.length ? `<div class="step-imgs">${imgs.map((x, k) => `<figure class="step-fig"><img alt="${esc(x.caption || sh.title)}" src="${imgData(x.image, `${sh.id} step ${k}`)}"><figcaption>${x.caption ? `<span class="fig-cap">${esc(x.caption)}</span>` : ''}${x.source ? `<span class="fig-src">출처 : ${esc(x.source)}</span>` : ''}<button type="button" class="original-view">${icon('external')}원본 보기</button></figcaption></figure>`).join('')}</div>` : '<p class="step-empty mute">이미지 준비 중</p>';
    const tag = sh.badge ? badge(sh.badge) : '';
    return `<section class="spec-sheet${first ? ' on' : ''}" data-sheet="${esc(sh.id)}"><div class="stage-row step-row"><div class="stage-zoom">${zoomTools(false)}</div></div><div class="spec-body step-body"><div class="stage"><div class="viewport">${img}</div></div>
<aside class="side" aria-label="단계 설명"><div class="side-head step-side-head"><span class="step-no">${esc(sh.no || sh.tab)}</span><span class="step-title">${esc(sh.title)}</span>${tag}</div><div class="side-scroll">${sh.where ? `<p class="step-where">설정 위치 : ${esc(sh.where)}</p>` : ''}${fs.readFileSync(f, 'utf8')}</div></aside></div></section>`;
  };

  const chapters = spec.chapters || [];
  const nav = chapters.map((c, i) => `<button type="button" class="tab${i === 0 ? ' active' : ''}" data-chapter-btn="${esc(c.id)}">${icon(c.icon)}<span class="tab-label">${esc(c.title)}</span>${c.badge ? badge(c.badge) : ''}</button>`).join('');
  const body = chapters.map((c, i) => {
    uniq(c.id);
    const sheets = c.sheets || [];
    const subtabs = sheets.length > 1 ? `<div class="tabs sub">${sheets.map((s, j) => `<button type="button" class="tab${j === 0 ? ' active' : ''}${s.tabSub ? ' two' : ''}" data-sheet-btn="${esc(s.id)}">${icon(s.icon)}${s.tabSub ? `<span class="tab-index">${esc(s.tab || s.title)}</span><span>${esc(s.tabSub)}</span>` : esc(s.tab || s.title)}</button>`).join('')}</div>` : '';
    const noteF = c.noteHtml ? path.resolve(dir, c.noteHtml) : null;
    if (noteF && !fs.existsSync(noteF)) fail(`챕터 안내 파일이 없습니다: ${c.noteHtml}`);
    const note = noteF ? `<div class="chapter-note">${fs.readFileSync(noteF, 'utf8')}</div>` : '';
    return `<div class="spec-chapter${i === 0 ? ' on' : ''}" data-chapter="${esc(c.id)}">${note}${subtabs}${sheets.map((s, j) => (s.type === 'document' ? docSheet(s, j === 0) : s.type === 'step' ? stepSheet(s, j === 0) : screenSheet(s, j === 0, c))).join('\n')}</div>`;
  }).join('\n');

  const script = `(function(){
var $=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var GO={},PANEL=null;
function pick(btns,on){btns.forEach(function(b){b.classList.toggle('active',b===on);});}
$('[data-chapter-btn]').forEach(function(b){b.addEventListener('click',function(){pick($('[data-chapter-btn]'),b);$('.spec-chapter').forEach(function(c){c.classList.toggle('on',c.getAttribute('data-chapter')===b.getAttribute('data-chapter-btn'));});});});
$('.spec-chapter').forEach(function(ch){
  $('[data-sheet-btn]',ch).forEach(function(b){b.addEventListener('click',function(){pick($('[data-sheet-btn]',ch),b);$('.spec-sheet',ch).forEach(function(s){s.classList.toggle('on',s.getAttribute('data-sheet')===b.getAttribute('data-sheet-btn'));});});});
  $('.spec-sheet',ch).forEach(function(sh){
    var act=function(sel,attr,def){var e=$(sel+'.active',sh)[0];return e?e.getAttribute(attr):def;};
    var dev=act('[data-dev-btn]','data-dev-btn','pc'),st=act('[data-state-btn]','data-state-btn',''),sel=null;
    function show(){$('.spec-view',sh).forEach(function(v){v.classList.toggle('on',v.getAttribute('data-dev')===dev&&v.getAttribute('data-state')===st);});$('.viewport',sh).forEach(function(v){v.setAttribute('data-dev',dev);});$('[data-menu]',sh).forEach(function(m){var a=$('[data-state-btn].active',m)[0],mb=$('.menu-btn',m)[0];mb.classList.toggle('active',!!a);$('.menu-label',mb)[0].textContent=m.getAttribute('data-menu')+(a?' · '+a.getAttribute('data-menu-label'):'')+' ▾';$('.menu-list',m)[0].hidden=true;});$('.ovl',sh).forEach(function(o){o.hidden=true;});$('.mark,.annos > li',sh).forEach(function(e){e.classList.remove('sel','hot');});sel=null;var own=$('.annos[data-for="'+st+'"]',sh)[0];$('.annos',sh).forEach(function(o){o.classList.toggle('on',own?o===own:o.getAttribute('data-for')==='*');});resetCase();}
    var caseN=null;
    function resetCase(){caseN=null;$('.canvas img[data-orig]',sh).forEach(function(i){i.src=i.getAttribute('data-orig');});$('.canvas .cm',sh).forEach(function(m){m.remove();});$('.canvas',sh).forEach(function(c){c.classList.remove('case-on');});$('.cases',sh).forEach(function(g){$('[data-case]',g).forEach(function(b,i){b.classList.toggle('active',i===0);});});}
    $('[data-case]',sh).forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();var v=$('.spec-view.on',sh)[0];if(!v)return;var n=b.getAttribute('data-case-n');resetCase();var im=$('.canvas > img',v)[0],cv=$('.canvas',v)[0];if(!im.getAttribute('data-orig'))im.setAttribute('data-orig',im.src);var src=b.getAttribute('data-case');
      if(src){im.src=src;caseN=n;var ms=b.getAttribute('data-case-marks'),dm=$('.mark[data-n="'+n+'"]',cv)[0],list=ms?JSON.parse(ms):(dm?[{n:n,x:parseFloat(dm.style.left),y:parseFloat(dm.style.top),w:parseFloat(dm.style.width),h:parseFloat(dm.style.height)}]:[]);cv.classList.add('case-on');{list.forEach(function(m){var d=document.createElement('div');d.className='mark cm';d.setAttribute('data-n',String(m.n));d.style.left=m.x+'%';d.style.top=m.y+'%';d.style.width=m.w+'%';d.style.height=m.h+'%';d.innerHTML='<span class="n">'+m.n+'</span>';d.addEventListener('click',function(){pickN(String(m.n),true);});cv.appendChild(d);});}}
      $('[data-case]',b.parentNode).forEach(function(x){x.classList.toggle('active',x===b);});focus(n,false);});});
    // 케이스 전환 중 다른 번호를 누르면 기본 화면으로 돌아간 뒤 해당 번호로 이동
    function pickN(n,fromMark){if(caseN&&n!==caseN)resetCase();focus(n,fromMark);}
    show();
    $('[data-dev-btn]',sh).forEach(function(b){b.addEventListener('click',function(){if(b.disabled)return;dev=b.getAttribute('data-dev-btn');pick($('[data-dev-btn]',sh),b);show();});});
    $('[data-state-btn]',sh).forEach(function(b){b.addEventListener('click',function(){st=b.getAttribute('data-state-btn');pick($('[data-state-btn]',sh),b);show();});});
    $('.menu-btn',sh).forEach(function(g){g.addEventListener('click',function(e){e.stopPropagation();var l=g.parentNode.querySelector('.menu-list');var h=l.hidden;$('.menu-list').forEach(function(x){x.hidden=true;});l.hidden=!h;});});
    function ovl(id,on){$('.spec-view.on .ovl',sh).forEach(function(o){if(o.getAttribute('data-ovl')===id)o.hidden=!on;});}
    $('.ovl',sh).forEach(function(o){o.addEventListener('click',function(){o.hidden=true;});});
    function clearSel(){$('.mark,.annos > li',sh).forEach(function(e){e.classList.remove('sel','hot');});sel=null;}
    function items(n){return $('.mark,.annos > li',sh).filter(function(e){return e.getAttribute('data-n')===n;});}
    function hot(n,on){items(n).forEach(function(e){e.classList.toggle('hot',on);});}
    function focus(n,scrollList){$('.ovl',sh).forEach(function(o){o.hidden=true;});$('.mark,.annos > li',sh).forEach(function(e){e.classList.remove('sel');});sel=n;items(n).forEach(function(e){e.classList.add('sel');});
      var m=items(n).filter(function(e){return e.classList.contains('mark')&&e.offsetParent;})[0];if(m)m.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});
      var li=items(n).filter(function(e){return e.tagName==='LI';})[0];if(li&&scrollList)li.scrollIntoView({block:'nearest',behavior:'smooth'});}
    $('.mark,.annos > li',sh).forEach(function(e){var n=e.getAttribute('data-n');
      e.addEventListener('mouseenter',function(){hot(n,true);});e.addEventListener('mouseleave',function(){hot(n,false);});
      e.addEventListener('click',function(){var o=e.getAttribute('data-opens');if(o){var ov=$('.spec-view.on .ovl[data-ovl="'+o+'"]',sh)[0];if(ov){ovl(o,true);return;}var ob=$('[data-state-btn="'+o+'"]',sh)[0];if(ob){ob.click();return;}}pickN(n,e.classList.contains('mark'));});});
    $('[data-panel-btn]',sh).forEach(function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-panel-btn'),was=b.classList.contains('active');
      $('[data-panel-btn]',sh).forEach(function(x){x.classList.remove('active');x.setAttribute('aria-expanded','false');});$('.spec-drawer',sh).forEach(function(d){d.classList.remove('on');});
      if(!was){b.classList.add('active');b.setAttribute('aria-expanded','true');$('.spec-drawer[data-panel="'+k+'"]',sh).forEach(function(d){d.classList.add('on');});}PANEL=was?null:k;});});
    GO[sh.getAttribute('data-sheet')]=function(state,n,open){if(state){var sb=$('[data-state-btn="'+state+'"]',sh)[0];if(sb)sb.click();}clearSel();if(n)focus(String(n),true);if(open)ovl(open,true);var fb=$('[data-panel-btn="flow"]',sh)[0];if(fb&&!fb.disabled&&!fb.classList.contains('active'))fb.click();};
  });
});
document.addEventListener('click',function(){$('.menu-list').forEach(function(x){x.hidden=true;});});
var TOAST=document.createElement('div');TOAST.className='toast';TOAST.hidden=true;document.body.appendChild(TOAST);var TT=null;
function toast(m){TOAST.textContent=m;TOAST.hidden=false;clearTimeout(TT);TT=setTimeout(function(){TOAST.hidden=true;},1500);}
$('[data-copy]').forEach(function(b){b.addEventListener('click',function(e){e.stopPropagation();var t=b.getAttribute('data-copy');var done=function(){toast('복사되었습니다.');};
  var fb=function(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');}catch(x){}a.remove();done();};if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(done,fb);}else{fb();}});});
document.addEventListener('keydown',function(e){if(e.key==='Escape')$('.ovl').forEach(function(o){o.hidden=true;});});
$('[data-go-sheet]').forEach(function(b){b.addEventListener('click',function(){var id=b.getAttribute('data-go-sheet'),sh=$('.spec-sheet[data-sheet="'+id+'"]')[0];if(!sh)return;var ch=sh.closest('.spec-chapter'),cb=$('[data-chapter-btn="'+ch.getAttribute('data-chapter')+'"]')[0];if(cb)cb.click();var sb=$('[data-sheet-btn="'+id+'"]',ch)[0];if(sb)sb.click();GO[id](b.getAttribute('data-go-state'),b.getAttribute('data-go-n'),b.getAttribute('data-go-open'));$('.flow .fchip').forEach(function(f){f.classList.toggle('here',f.getAttribute('data-flow-key')===b.getAttribute('data-flow-key'));});});});
$('[data-state-btn],[data-sheet-btn],[data-chapter-btn]').forEach(function(b){b.addEventListener('click',function(){$('.flow .fchip.here').forEach(function(f){f.classList.remove('here');});});});
// 하단 탭(정책·사용자 흐름·확인 필요)은 사용자가 직접 닫기 전까지 1차·2차 탭을 옮겨도 같은 탭을 펼친 상태로 유지한다.
function syncPanel(){$('.spec-chapter.on .spec-sheet.on').forEach(function(sh){$('[data-panel-btn]',sh).forEach(function(x){x.classList.remove('active');x.setAttribute('aria-expanded','false');});$('.spec-drawer',sh).forEach(function(d){d.classList.remove('on');});if(!PANEL)return;var b=$('[data-panel-btn="'+PANEL+'"]',sh)[0];if(b&&!b.disabled){b.classList.add('active');b.setAttribute('aria-expanded','true');$('.spec-drawer[data-panel="'+PANEL+'"]',sh).forEach(function(d){d.classList.add('on');});}});}
$('[data-sheet-btn],[data-chapter-btn]').forEach(function(b){b.addEventListener('click',syncPanel);});
// 배율: 50~200%, 문서 전체에 적용
function showZoom(v){v=Math.max(50,Math.min(200,v));document.documentElement.style.setProperty('--zoom',v/100);$('.magnify').forEach(function(g){$('select',g)[0].value=String(v);$('[data-change="-10"]',g)[0].disabled=v<=50;$('[data-change="10"]',g)[0].disabled=v>=200;});}
$('.magnify').forEach(function(g){var sel=$('select',g)[0];sel.addEventListener('change',function(){showZoom(Number(sel.value));});$('[data-change]',g).forEach(function(b){b.addEventListener('click',function(){showZoom(Number(sel.value)+Number(b.getAttribute('data-change')));});});});
showZoom(100);
// 원본 보기: 지금 보이는 화면 이미지(또는 매뉴얼 그림)를 새 탭으로 연다
var URLS={};function blobUrl(src,type){if(!URLS[src]){var p=src.split(','),bin=atob(p[1]),a=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);URLS[src]=URL.createObjectURL(new Blob([a],{type:type||p[0].slice(5).split(';')[0]}));}return URLS[src];}
$('.original-view').forEach(function(b){b.addEventListener('click',function(){var f=b.closest('figure'),v=b.closest('.spec-sheet').querySelector('.spec-view.on'),im=f?f.querySelector('img'):(v&&(v.querySelector('.ovl:not([hidden]) img')||v.querySelector('.canvas > img')));if(!im)return;var u=im.src;if(u.indexOf('data:')===0)u=blobUrl(u);window.open(u,'_blank','noopener');});});
$('[data-try-html]').forEach(function(b){b.addEventListener('click',function(){window.open(blobUrl('data:text/html;charset=utf-8;base64,'+b.getAttribute('data-try-html'),'text/html;charset=utf-8'),'_blank','noopener');});});
// 2차 탭: 방향키·Home·End로 이동
$('.tabs.sub').forEach(function(strip){var tabs=$('[data-sheet-btn]',strip);strip.setAttribute('role','tablist');tabs.forEach(function(t,i){t.setAttribute('role','tab');t.addEventListener('keydown',function(e){var d={ArrowLeft:(i+tabs.length-1)%tabs.length,ArrowRight:(i+1)%tabs.length,Home:0,End:tabs.length-1}[e.key];if(d===undefined)return;e.preventDefault();tabs[d].focus();tabs[d].click();});});});
})();`;
  return { nav, body, script };
}
