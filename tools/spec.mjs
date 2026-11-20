// 화면정의서(spec.json) → 단일 HTML 조각 렌더러. 데이터만 있으면 같은 틀로 모든 요청 건을 만든다.
//
// spec.json
//   title / version / date           : 기획서 자체 제목·버전·작성일 (요청 건 제목이 아님)
//   revisions[]                      : { version, date, reason, changes: string|string[], author, reviewer } — 최신이 위
//   chapters[]: { id, title, sheets[] }
//   sheets[] type=document           : { id, type, title, tab?, kind: "revisions" | "html", htmlFile? }
//   sheets[] type=screen             : { id, no, title, menuPath, url, badges[], intro: string[], notice,
//                                        devices: { pc: {states:[{id,label,image,marks:[{n,x,y,w,h}]}]}, mobile: null|{…} },
//                                        annotations[]: { n, title, lines: (string | {t, ref:true})[] },
//                                        blocks: { policy[], related[], questions[] } }
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
  const line = (l) => (typeof l === 'string' ? esc(l) : l.ref ? `<span class="ref">${esc(l.t)}</span>` : esc(l.t));
  const list = (arr) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${line(x)}</li>`).join('')}</ul>` : '<p class="mute">해당 없음</p>');

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
    const marks = (st.marks || []).map((m) => `<div class="mark" data-n="${m.n}" style="left:${m.x}%;top:${m.y}%;width:${m.w}%;height:${m.h}%"><span class="n">${m.n}</span></div>`).join('');
    return `<div class="spec-view${first ? ' on' : ''}" data-dev="${dev}" data-state="${esc(st.id)}"><div class="canvas"><img alt="${esc(st.label)}" src="${imgData(st.image, `${sid} ${dev} ${st.id}`)}">${marks}</div></div>`;
  };

  const screenSheet = (sh, first) => {
    uniq(sh.id);
    const devs = sh.devices || {};
    const keys = ['pc', 'mobile'];
    const d0 = keys.find((k) => devs[k]);
    const info = esc(sh.menuPath || '');
    const KIND = { new: { label: '신설', tone: 'blue' }, extend: { label: '확장', tone: 'violet' } };
    if (sh.kind && !KIND[sh.kind]) fail(`sheet.kind는 new(신설) 또는 extend(확장)만 가능합니다: ${sh.kind}`);
    const kindTag = sh.kind ? badge(KIND[sh.kind]) : '';
    const tools = `<div class="stage-tools">
<div class="seg" role="group" aria-label="화면 상태">${(devs[d0]?.states || []).map((s, i) => `<button type="button" class="fchip${i === 0 ? ' active' : ''}" data-state-btn="${esc(s.id)}">${esc(s.label)}</button>`).join('')}</div>
<div class="seg" role="group" aria-label="디바이스">${keys.map((k) => `<button type="button" class="fchip${k === d0 ? ' active' : ''}" data-dev-btn="${k}"${devs[k] ? '' : ' disabled title="모바일 화면 없음"'}>${k === 'pc' ? 'PC' : '모바일'}</button>`).join('')}</div></div>`;
    const views = keys.filter((k) => devs[k]).flatMap((k) => devs[k].states.map((s, i) => view(sh.id, k, s, k === d0 && i === 0))).join('');
    const intro = (sh.intro || []).length ? `<div class="side-note">${sh.intro.map(esc).join('<br>')}</div>` : '';
    const annos = (sh.annotations || []).map((a) => `<li data-n="${a.n}"><span class="n">${a.n}</span><div><strong>${esc(a.title)}</strong>${list(a.lines)}</div></li>`).join('');
    const b = sh.blocks || {};
    const panels = [['policy', '정책', b.policy], ['related', '연관 화면 · 흐름', b.related], ['questions', '확인 필요', b.questions]];
    const bar = `<div class="tabs bar">${panels.map(([k, l]) => `<button type="button" class="tab" data-panel-btn="${k}">${l}</button>`).join('')}</div>`;
    const drawers = panels.map(([k, l, arr]) => `<div class="spec-drawer" data-panel="${k}"><h4>${l}</h4>${list(arr)}</div>`).join('');
    const zoom = `<div class="seg" role="group" aria-label="확대"><button type="button" class="fchip" data-zoom-step="-1" aria-label="축소">-</button><span class="zoom-val" data-zoom-val>100%</span><button type="button" class="fchip" data-zoom-step="1" aria-label="확대">+</button></div>`;
    return `<section class="spec-sheet${first ? ' on' : ''}" data-sheet="${esc(sh.id)}">
<div class="stage-row"><div class="stage-head"><h2>${esc(sh.title)}</h2>${kindTag}<span class="stage-info">${info}</span>${tools}</div><div class="stage-zoom">${zoom}</div></div>
<div class="spec-body"><div class="stage"><div class="viewport">${views}</div></div>
<aside class="side" aria-label="화면 설명"><div class="side-head"><span>화면 설명</span></div><div class="side-scroll">${intro}<ol class="annos">${annos}</ol></div></aside></div>
${drawers}${bar}</section>`;
  };

  const chapters = spec.chapters || [];
  const nav = chapters.map((c, i) => `<button type="button" class="tab${i === 0 ? ' active' : ''}" data-chapter-btn="${esc(c.id)}">${esc(c.title)}</button>`).join('');
  const body = chapters.map((c, i) => {
    uniq(c.id);
    const sheets = c.sheets || [];
    const subtabs = sheets.length > 1 ? `<div class="tabs sub">${sheets.map((s, j) => `<button type="button" class="tab${j === 0 ? ' active' : ''}" data-sheet-btn="${esc(s.id)}">${esc(s.tab || s.title)}</button>`).join('')}</div>` : '';
    return `<div class="spec-chapter${i === 0 ? ' on' : ''}" data-chapter="${esc(c.id)}">${subtabs}${sheets.map((s, j) => (s.type === 'document' ? docSheet(s, j === 0) : screenSheet(s, j === 0))).join('\n')}</div>`;
  }).join('\n');

  const script = `(function(){
var $=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
function pick(btns,on){btns.forEach(function(b){b.classList.toggle('active',b===on);});}
$('[data-chapter-btn]').forEach(function(b){b.addEventListener('click',function(){pick($('[data-chapter-btn]'),b);$('.spec-chapter').forEach(function(c){c.classList.toggle('on',c.getAttribute('data-chapter')===b.getAttribute('data-chapter-btn'));});});});
$('.spec-chapter').forEach(function(ch){
  $('[data-sheet-btn]',ch).forEach(function(b){b.addEventListener('click',function(){pick($('[data-sheet-btn]',ch),b);$('.spec-sheet',ch).forEach(function(s){s.classList.toggle('on',s.getAttribute('data-sheet')===b.getAttribute('data-sheet-btn'));});});});
  $('.spec-sheet',ch).forEach(function(sh){
    var act=function(sel,attr,def){var e=$(sel+'.active',sh)[0];return e?e.getAttribute(attr):def;};
    var dev=act('[data-dev-btn]','data-dev-btn','pc'),st=act('[data-state-btn]','data-state-btn',''),sel=null;
    function show(){$('.spec-view',sh).forEach(function(v){v.classList.toggle('on',v.getAttribute('data-dev')===dev&&v.getAttribute('data-state')===st);});}
    $('[data-dev-btn]',sh).forEach(function(b){b.addEventListener('click',function(){if(b.disabled)return;dev=b.getAttribute('data-dev-btn');pick($('[data-dev-btn]',sh),b);show();});});
    $('[data-state-btn]',sh).forEach(function(b){b.addEventListener('click',function(){st=b.getAttribute('data-state-btn');pick($('[data-state-btn]',sh),b);show();});});
    var ZS=[100,150,200],zi=0;function setZoom(i){zi=Math.max(0,Math.min(ZS.length-1,i));var z=ZS[zi];$('.canvas',sh).forEach(function(c){c.style.width=z+'%';});$('[data-zoom-val]',sh).forEach(function(v){v.textContent=z+'%';});$('[data-zoom-step]',sh).forEach(function(b){b.disabled=(Number(b.getAttribute('data-zoom-step'))<0&&zi===0)||(Number(b.getAttribute('data-zoom-step'))>0&&zi===ZS.length-1);});if(sel)focus(sel,false);}
    $('[data-zoom-step]',sh).forEach(function(b){b.addEventListener('click',function(){setZoom(zi+Number(b.getAttribute('data-zoom-step')));});});
    setZoom(0);
    function items(n){return $('.mark,.annos > li',sh).filter(function(e){return e.getAttribute('data-n')===n;});}
    function hot(n,on){items(n).forEach(function(e){e.classList.toggle('hot',on);});}
    function focus(n,scrollList){$('.mark,.annos > li',sh).forEach(function(e){e.classList.remove('sel');});sel=n;items(n).forEach(function(e){e.classList.add('sel');});
      var m=items(n).filter(function(e){return e.classList.contains('mark')&&e.offsetParent;})[0];if(m)m.scrollIntoView({block:'center',inline:'center',behavior:'smooth'});
      var li=items(n).filter(function(e){return e.tagName==='LI';})[0];if(li&&scrollList)li.scrollIntoView({block:'nearest',behavior:'smooth'});}
    $('.mark,.annos > li',sh).forEach(function(e){var n=e.getAttribute('data-n');
      e.addEventListener('mouseenter',function(){hot(n,true);});e.addEventListener('mouseleave',function(){hot(n,false);});
      e.addEventListener('click',function(){focus(n,e.classList.contains('mark'));});});
    $('[data-panel-btn]',sh).forEach(function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-panel-btn'),was=b.classList.contains('active');
      $('[data-panel-btn]',sh).forEach(function(x){x.classList.remove('active');});$('.spec-drawer',sh).forEach(function(d){d.classList.remove('on');});
      if(!was){b.classList.add('active');$('.spec-drawer[data-panel="'+k+'"]',sh).forEach(function(d){d.classList.add('on');});}});});
  });
});
})();`;
  return { nav, body, script };
}
