// 화면정의서(spec.json) → 단일 HTML 조각 렌더러. 데이터만 있으면 같은 틀로 모든 요청 건을 만든다.
//
// spec.json
//   title / version / date           : 기획서 자체 제목·버전·작성일 (요청 건 제목이 아님)
//   revisions[]                      : { version, date, reason, changes: string|string[], author, reviewer } — 최신이 위
//   chapters[]: { id, title, sheets[], policyHtml?, flow? }   // policyHtml·flow는 챕터 안 화면 시트가 자기 blocks에 없을 때만 쓰는 기본값 (하단 탭은 항상 2차 탭=화면 시트 기준)
//   sheets[] type=document           : { id, type, title, tab?, kind: "revisions" | "html", htmlFile? }
//   sheets[] (화면)                  : { id, tab, title, menuPath, kind: "new"|"extend", intro: string[],
//                                        devices: { pc: {states:[state]}, mobile: null|{…} },
//                                        annotations[]: { n, title, lines: (string | {t, ref?:true, sub?:[…]})[], opens? },
//                                        blocks: { policy[], policyHtml, flow, questions[] } }   // 비어 있으면 해당 탭은 비활성
//   state                            : { id, label, image, group?, marks[{n,x,y,w,h,opens?}], annotations?[], overlays?[{id,label,image,box:{x,y,w}}] }
//                                      group = 같은 값끼리 상태 칩 하나(드롭다운)로 묶임 / annotations = 이 상태에서만 보이는 설명
//                                      overlays = 상태 전환 없이 화면 위에 띄우는 팝업(box는 캔버스 대비 %)
//   opens                            : 마크·설명을 누르면 열 상태 id 또는 overlay id (없는 id는 무시되므로 반드시 빌드 검증을 통과시킬 것)
//   flow[]                           : { label, sheet, state?, n?, open? } 또는 행 배열 — 누르면 해당 시트·상태·번호(·팝업)로 이동
//   marks x,y,w,h: 이미지 가로·세로 대비 % (번호 배지는 박스 좌상단)
import fs from 'node:fs';
import path from 'node:path';

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
  const ids = new Set();
  const uniq = (id) => { if (ids.has(id)) fail(`spec.json에 중복 id가 있습니다: ${id}`); ids.add(id); return id; };
  const badge = (b) => `<span class="tag ${b.tone ? 'tone-' + esc(b.tone) : ''}">${esc(b.label ?? b)}</span>`;
  const inline = (t) => esc(t).replace(/\{\{(.+?)\}\}/g, '<span class="ref">$1</span>');
  const line = (l) => (typeof l === 'string' ? inline(l) : l.ref ? `<span class="ref">${esc(l.t)}</span>` : inline(l.t));
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
    const body = secs.map((s) => `<details class="acc"${s.open === false ? '' : ' open'}><summary>${esc(s.title)}</summary><div class="acc-body">${sectionBody(s)}</div></details>`).join('\n');
    return `<section class="spec-sheet${first ? ' on' : ''}" data-sheet="${esc(sh.id)}"><div class="spec-doc">${body}</div></section>`;
  };

  const view = (sid, dev, st, first) => {
    const marks = (st.marks || []).map((m) => `<div class="mark" data-n="${m.n}"${m.opens ? ` data-opens="${esc(m.opens)}"` : ''} style="left:${m.x}%;top:${m.y}%;width:${m.w}%;height:${m.h}%"><span class="n">${m.n}</span></div>`).join('');
    const ovls = (st.overlays || []).map((o) => `<div class="ovl" data-ovl="${esc(o.id)}" hidden><img alt="${esc(o.label || o.id)}" style="left:${o.box.x}%;top:${o.box.y}%;width:${o.box.w}%" src="${imgData(o.image, `${sid} ${dev} ${o.id}`)}"><span class="ovl-close">닫기 ✕</span></div>`).join('');
    return `<div class="spec-view${first ? ' on' : ''}" data-dev="${dev}" data-state="${esc(st.id)}"><div class="canvas"><img alt="${esc(st.label)}" src="${imgData(st.image, `${sid} ${dev} ${st.id}`)}">${marks}${ovls}</div></div>`;
  };

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
      const chip = (x, i) => `<button type="button" class="fchip${i === 0 ? ' active' : ''}" data-state-btn="${esc(x.id)}">${esc(x.label)}</button>`;
      const out = [];
      for (let i = 0; i < states.length; i++) {
        const g = states[i].group;
        if (!g) { out.push(chip(states[i], i)); continue; }
        const idx = [];
        while (i < states.length && states[i].group === g) { idx.push(i); i++; }
        i--;
        out.push(`<span class="menu" data-menu="${esc(g)}"><button type="button" class="fchip menu-btn" data-menu-btn="${esc(g)}" aria-haspopup="true">${esc(g)} ▾</button><span class="menu-list" hidden>${idx.map((k) => `<button type="button" class="fchip" data-state-btn="${esc(states[k].id)}" data-menu-label="${esc(states[k].label)}">${esc(states[k].label)}</button>`).join('')}</span></span>`);
      }
      return out.join('');
    };
    const tools = `<div class="stage-tools">
<div class="seg" role="group" aria-label="화면 상태">${stateChips(devs[d0]?.states || [])}</div>
<div class="seg" role="group" aria-label="디바이스">${keys.map((k) => `<button type="button" class="fchip${k === d0 ? ' active' : ''}" data-dev-btn="${k}"${devs[k] ? '' : ' disabled title="모바일 화면 없음"'}>${k === 'pc' ? 'PC' : '모바일'}</button>`).join('')}</div></div>`;
    const allStates = keys.filter((k) => devs[k]).flatMap((k) => devs[k].states);
    const targets = new Set(allStates.flatMap((x) => [x.id, ...(x.overlays || []).map((o) => o.id)]));
    [...allStates.flatMap((x) => x.marks || []), ...(sh.annotations || [])].forEach((x) => { if (x.opens && !targets.has(x.opens)) fail(`${sh.id}: opens가 가리키는 상태·팝업이 없습니다: ${x.opens}`); });
    allStates.forEach((x) => { const own = new Set((x.annotations || sh.annotations || []).map((a) => a.n)); (x.marks || []).forEach((m) => { if (!own.has(m.n)) fail(`${sh.id}/${x.id}: 마크 ${m.n}번에 대응하는 설명이 없습니다`); }); });
    const views = keys.filter((k) => devs[k]).flatMap((k) => devs[k].states.map((s, i) => view(sh.id, k, s, k === d0 && i === 0))).join('');
    const intro = (sh.intro || []).length ? `<div class="side-note">${sh.intro.map(esc).join('<br>')}</div>` : '';
    const annoLi = (a) => `<li data-n="${a.n}"${a.opens ? ` data-opens="${esc(a.opens)}"` : ''}><span class="n">${a.n}</span><div><strong>${esc(a.title)}</strong>${list(a.lines)}</div></li>`;
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
      return `<li><button type="button" class="fchip"${go} data-flow-key="${esc(x.label)}">${esc(x.label)}</button></li>`;
    }).join('')}</ol>`).join('') : '';
    // 확인 필요: 정책 탭과 같은 2열(항목 | 내용) 형식. 항목은 {k, v} 또는 문자열(항목명 없이 내용만)
    const qRow = (q, i) => (typeof q === 'string'
      ? `<div class="plist-row"><span class="plist-k">확인 ${i + 1}</span><div class="plist-v">${inline(q)}</div></div>`
      : `<div class="plist-row"><span class="plist-k">${esc(q.k)}</span><div class="plist-v">${Array.isArray(q.v) ? list(q.v) : inline(q.v)}</div></div>`);
    const qBody = b.questions && b.questions.length ? `<div class="plist">${b.questions.map(qRow).join('')}</div>` : '';
    const panels = [['policy', '정책', policyBody], ['flow', '사용자 흐름', flowBody], ['questions', '확인 필요', qBody]];
    const bar = `<div class="tabs bar">${panels.map(([k, l, body]) => `<button type="button" class="tab" data-panel-btn="${k}"${body ? '' : ' disabled'}>${l}</button>`).join('')}</div>`;
    const drawers = panels.filter(([, , body]) => body).map(([k, , body]) => `<div class="spec-drawer" data-panel="${k}">${body}</div>`).join('');
    const zoom = `<div class="seg" role="group" aria-label="확대"><button type="button" class="fchip" data-zoom-step="-1" aria-label="축소">-</button><span class="zoom-val" data-zoom-val>100%</span><button type="button" class="fchip" data-zoom-step="1" aria-label="확대">+</button></div>`;
    return `<section class="spec-sheet${first ? ' on' : ''}" data-sheet="${esc(sh.id)}">
<div class="stage-row"><div class="stage-head"><h2>${esc(sh.title)}</h2>${kindTag}<span class="stage-info">${info}</span>${tools}</div><div class="stage-zoom">${zoom}</div></div>
<div class="spec-body"><div class="stage"><div class="viewport">${views}</div></div>
<aside class="side" aria-label="화면 설명"><div class="side-head"><span>화면 설명</span></div><div class="side-scroll">${intro}${annos}</div></aside></div>
${drawers}${bar}</section>`;
  };

  const chapters = spec.chapters || [];
  const nav = chapters.map((c, i) => `<button type="button" class="tab${i === 0 ? ' active' : ''}" data-chapter-btn="${esc(c.id)}">${esc(c.title)}</button>`).join('');
  const body = chapters.map((c, i) => {
    uniq(c.id);
    const sheets = c.sheets || [];
    const subtabs = sheets.length > 1 ? `<div class="tabs sub">${sheets.map((s, j) => `<button type="button" class="tab${j === 0 ? ' active' : ''}" data-sheet-btn="${esc(s.id)}">${esc(s.tab || s.title)}</button>`).join('')}</div>` : '';
    return `<div class="spec-chapter${i === 0 ? ' on' : ''}" data-chapter="${esc(c.id)}">${subtabs}${sheets.map((s, j) => (s.type === 'document' ? docSheet(s, j === 0) : screenSheet(s, j === 0, c))).join('\n')}</div>`;
  }).join('\n');

  const script = `(function(){
var $=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var GO={};
function pick(btns,on){btns.forEach(function(b){b.classList.toggle('active',b===on);});}
$('[data-chapter-btn]').forEach(function(b){b.addEventListener('click',function(){pick($('[data-chapter-btn]'),b);$('.spec-chapter').forEach(function(c){c.classList.toggle('on',c.getAttribute('data-chapter')===b.getAttribute('data-chapter-btn'));});});});
$('.spec-chapter').forEach(function(ch){
  $('[data-sheet-btn]',ch).forEach(function(b){b.addEventListener('click',function(){pick($('[data-sheet-btn]',ch),b);$('.spec-sheet',ch).forEach(function(s){s.classList.toggle('on',s.getAttribute('data-sheet')===b.getAttribute('data-sheet-btn'));});});});
  $('.spec-sheet',ch).forEach(function(sh){
    var act=function(sel,attr,def){var e=$(sel+'.active',sh)[0];return e?e.getAttribute(attr):def;};
    var dev=act('[data-dev-btn]','data-dev-btn','pc'),st=act('[data-state-btn]','data-state-btn',''),sel=null;
    function show(){$('.spec-view',sh).forEach(function(v){v.classList.toggle('on',v.getAttribute('data-dev')===dev&&v.getAttribute('data-state')===st);});$('.viewport',sh).forEach(function(v){v.setAttribute('data-dev',dev);});$('[data-menu]',sh).forEach(function(m){var a=$('[data-state-btn].active',m)[0],mb=$('.menu-btn',m)[0];mb.classList.toggle('active',!!a);mb.textContent=m.getAttribute('data-menu')+(a?' · '+a.getAttribute('data-menu-label'):'')+' ▾';$('.menu-list',m)[0].hidden=true;});$('.ovl',sh).forEach(function(o){o.hidden=true;});$('.mark,.annos > li',sh).forEach(function(e){e.classList.remove('sel','hot');});sel=null;var own=$('.annos[data-for="'+st+'"]',sh)[0];$('.annos',sh).forEach(function(o){o.classList.toggle('on',own?o===own:o.getAttribute('data-for')==='*');});}
    show();
    $('[data-dev-btn]',sh).forEach(function(b){b.addEventListener('click',function(){if(b.disabled)return;dev=b.getAttribute('data-dev-btn');pick($('[data-dev-btn]',sh),b);show();});});
    $('[data-state-btn]',sh).forEach(function(b){b.addEventListener('click',function(){st=b.getAttribute('data-state-btn');pick($('[data-state-btn]',sh),b);show();});});
    $('.menu-btn',sh).forEach(function(g){g.addEventListener('click',function(e){e.stopPropagation();var l=g.parentNode.querySelector('.menu-list');var h=l.hidden;$('.menu-list').forEach(function(x){x.hidden=true;});l.hidden=!h;});});
    function ovl(id,on){$('.spec-view.on .ovl',sh).forEach(function(o){if(o.getAttribute('data-ovl')===id)o.hidden=!on;});}
    $('.ovl',sh).forEach(function(o){o.addEventListener('click',function(){o.hidden=true;});});
    var ZS=[100,150,200],zi=0;function setZoom(i){zi=Math.max(0,Math.min(ZS.length-1,i));var z=ZS[zi];$('.canvas',sh).forEach(function(c){c.style.setProperty('--zoom',z/100);});$('[data-zoom-val]',sh).forEach(function(v){v.textContent=z+'%';});$('[data-zoom-step]',sh).forEach(function(b){b.disabled=(Number(b.getAttribute('data-zoom-step'))<0&&zi===0)||(Number(b.getAttribute('data-zoom-step'))>0&&zi===ZS.length-1);});if(sel)focus(sel,false);}
    $('[data-zoom-step]',sh).forEach(function(b){b.addEventListener('click',function(){setZoom(zi+Number(b.getAttribute('data-zoom-step')));});});
    setZoom(0);
    function clearSel(){$('.mark,.annos > li',sh).forEach(function(e){e.classList.remove('sel','hot');});sel=null;}
    function items(n){return $('.mark,.annos > li',sh).filter(function(e){return e.getAttribute('data-n')===n;});}
    function hot(n,on){items(n).forEach(function(e){e.classList.toggle('hot',on);});}
    function focus(n,scrollList){$('.ovl',sh).forEach(function(o){o.hidden=true;});$('.mark,.annos > li',sh).forEach(function(e){e.classList.remove('sel');});sel=n;items(n).forEach(function(e){e.classList.add('sel');});
      var m=items(n).filter(function(e){return e.classList.contains('mark')&&e.offsetParent;})[0];if(m)m.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});
      var li=items(n).filter(function(e){return e.tagName==='LI';})[0];if(li&&scrollList)li.scrollIntoView({block:'nearest',behavior:'smooth'});}
    $('.mark,.annos > li',sh).forEach(function(e){var n=e.getAttribute('data-n');
      e.addEventListener('mouseenter',function(){hot(n,true);});e.addEventListener('mouseleave',function(){hot(n,false);});
      e.addEventListener('click',function(){var o=e.getAttribute('data-opens');if(o){var ov=$('.spec-view.on .ovl[data-ovl="'+o+'"]',sh)[0];if(ov){ovl(o,true);return;}var ob=$('[data-state-btn="'+o+'"]',sh)[0];if(ob){ob.click();return;}}focus(n,e.classList.contains('mark'));});});
    $('[data-panel-btn]',sh).forEach(function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-panel-btn'),was=b.classList.contains('active');
      $('[data-panel-btn]',sh).forEach(function(x){x.classList.remove('active');});$('.spec-drawer',sh).forEach(function(d){d.classList.remove('on');});
      if(!was){b.classList.add('active');$('.spec-drawer[data-panel="'+k+'"]',sh).forEach(function(d){d.classList.add('on');});}});});
    GO[sh.getAttribute('data-sheet')]=function(state,n,open){if(state){var sb=$('[data-state-btn="'+state+'"]',sh)[0];if(sb)sb.click();}clearSel();if(n)focus(String(n),true);if(open)ovl(open,true);var fb=$('[data-panel-btn="flow"]',sh)[0];if(fb&&!fb.disabled&&!fb.classList.contains('active'))fb.click();};
  });
});
document.addEventListener('click',function(){$('.menu-list').forEach(function(x){x.hidden=true;});});
document.addEventListener('keydown',function(e){if(e.key==='Escape')$('.ovl').forEach(function(o){o.hidden=true;});});
$('[data-go-sheet]').forEach(function(b){b.addEventListener('click',function(){var id=b.getAttribute('data-go-sheet'),sh=$('.spec-sheet[data-sheet="'+id+'"]')[0];if(!sh)return;var ch=sh.closest('.spec-chapter'),cb=$('[data-chapter-btn="'+ch.getAttribute('data-chapter')+'"]')[0];if(cb)cb.click();var sb=$('[data-sheet-btn="'+id+'"]',ch)[0];if(sb)sb.click();GO[id](b.getAttribute('data-go-state'),b.getAttribute('data-go-n'),b.getAttribute('data-go-open'));$('.flow .fchip').forEach(function(f){f.classList.toggle('here',f.getAttribute('data-flow-key')===b.getAttribute('data-flow-key'));});});});
$('[data-state-btn],[data-sheet-btn],[data-chapter-btn]').forEach(function(b){b.addEventListener('click',function(){$('.flow .fchip.here').forEach(function(f){f.classList.remove('here');});});});
})();`;
  return { nav, body, script };
}
