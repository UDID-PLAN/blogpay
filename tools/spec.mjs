// 화면정의서(spec.json) → 단일 HTML 조각 렌더러. 데이터만 있으면 같은 틀로 모든 요청 건을 만든다.
//
// spec.json 구조
//   chapters[]: { id, title, sheets[] }
//   sheets[]  : { id, type: "screen"|"document", no, title, scrId, path, badges[],
//                 devices: { pc: {states:[{id,label,image,pins:[{n,x,y}]}]}, mobile: null|{…} },
//                 annotations[]: { n, title, desc }, blocks: { policy[], flow[], questions[] },
//                 html (type=document일 때 본문) }
//   pins.x / pins.y: 이미지 가로·세로 대비 % 좌표
import fs from 'node:fs';
import path from 'node:path';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const IMG_WARN = 800 * 1024;

export function renderSpec(spec, { dir, revisions, fail, warn }) {
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

  const badge = (b) => `<span class="tag ${esc(b.tone ? 'tone-' + b.tone : '')}">${esc(b.label ?? b)}</span>`;
  const list = (arr) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="mute">해당 없음</p>');

  const view = (sid, dev, st, first) => {
    const pins = (st.pins || []).map((p) => `<button class="pin" type="button" data-n="${p.n}" style="left:${p.x}%;top:${p.y}%" aria-label="항목 ${p.n}">${p.n}</button>`).join('');
    return `<div class="spec-view${first ? ' on' : ''}" data-dev="${dev}" data-state="${esc(st.id)}"><div class="preview"><img alt="${esc(st.label)}" src="${imgData(st.image, `${sid} ${dev} ${st.id}`)}">${pins}</div></div>`;
  };

  const screenSheet = (sh, first) => {
    uniq(sh.id);
    const devs = sh.devices || {};
    const devKeys = ['pc', 'mobile'];
    const firstDev = devKeys.find((k) => devs[k]);
    const toolbar = `<div class="spec-toolbar">
<div class="seg" role="group" aria-label="디바이스">${devKeys.map((k) => `<button type="button" class="fchip${k === firstDev ? ' active' : ''}" data-dev-btn="${k}"${devs[k] ? '' : ' disabled title="모바일 화면 없음"'}>${k === 'pc' ? 'PC' : '모바일'}</button>`).join('')}</div>
<div class="seg" role="group" aria-label="화면 상태">${(devs[firstDev]?.states || []).map((s, i) => `<button type="button" class="fchip${i === 0 ? ' active' : ''}" data-state-btn="${esc(s.id)}">${esc(s.label)}</button>`).join('')}</div></div>`;
    const views = devKeys.filter((k) => devs[k]).flatMap((k) => devs[k].states.map((s, i) => view(sh.id, k, s, k === firstDev && i === 0))).join('');
    const annos = (sh.annotations || []).map((a) => `<li data-n="${a.n}"><span class="n">${a.n}</span><div><strong>${esc(a.title)}</strong><p>${esc(a.desc)}</p></div></li>`).join('');
    const b = sh.blocks || {};
    return `<section class="spec-sheet${first ? ' on' : ''}" id="${esc(sh.id)}" data-sheet="${esc(sh.id)}">
<div class="sheet-head"><h2>${esc(sh.no ? sh.no + '. ' : '')}${esc(sh.title)}</h2>${sh.scrId ? `<span class="tag tone-mute">${esc(sh.scrId)}</span>` : ''}${(sh.badges || []).map(badge).join('')}</div>
${sh.path ? `<p class="sheet-path">${esc(sh.path)}</p>` : ''}
${toolbar}
<div class="spec-grid"><div>${views}</div><ol class="annos">${annos}</ol></div>
<div class="blocks">
<details class="block" open><summary>정책</summary>${list(b.policy)}</details>
<details class="block" open><summary>사용자 흐름</summary>${list(b.flow)}</details>
<details class="block" open><summary>확인 필요</summary>${list(b.questions)}</details>
</div></section>`;
  };

  const docSheet = (sh, first) => {
    uniq(sh.id);
    const body = String(sh.html || '').replace(/\{\{REVISIONS\}\}/g, revisions);
    return `<section class="spec-sheet${first ? ' on' : ''}" id="${esc(sh.id)}" data-sheet="${esc(sh.id)}"><div class="sheet-head"><h2>${esc(sh.title)}</h2>${(sh.badges || []).map(badge).join('')}</div>${body}</section>`;
  };

  const chapters = spec.chapters || [];
  const nav = chapters.map((c, i) => `<button type="button" class="fchip${i === 0 ? ' active' : ''}" data-chapter-btn="${esc(c.id)}">${esc(c.title)}</button>`).join('');
  const body = chapters.map((c, i) => {
    uniq(c.id);
    const sheets = c.sheets || [];
    const subtabs = sheets.length > 1 ? `<div class="spec-subtabs">${sheets.map((s, j) => `<button type="button" class="fchip${j === 0 ? ' active' : ''}" data-sheet-btn="${esc(s.id)}">${esc(s.tab || s.title)}</button>`).join('')}</div>` : '';
    return `<div class="spec-chapter${i === 0 ? ' on' : ''}" data-chapter="${esc(c.id)}">${subtabs}${sheets.map((s, j) => (s.type === 'document' ? docSheet(s, j === 0) : screenSheet(s, j === 0))).join('\n')}</div>`;
  }).join('\n');

  const script = `(function(){
var $=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
function pick(btns,on){btns.forEach(function(b){b.classList.toggle('active',b===on);});}
$('[data-chapter-btn]').forEach(function(b){b.addEventListener('click',function(){pick($('[data-chapter-btn]'),b);$('.spec-chapter').forEach(function(c){c.classList.toggle('on',c.getAttribute('data-chapter')===b.getAttribute('data-chapter-btn'));});});});
$('.spec-chapter').forEach(function(ch){
  $('[data-sheet-btn]',ch).forEach(function(b){b.addEventListener('click',function(){pick($('[data-sheet-btn]',ch),b);$('.spec-sheet',ch).forEach(function(s){s.classList.toggle('on',s.getAttribute('data-sheet')===b.getAttribute('data-sheet-btn'));});});});
  $('.spec-sheet',ch).forEach(function(sh){
    var dev=($('[data-dev-btn].active',sh)[0]||{}).getAttribute?$('[data-dev-btn].active',sh)[0].getAttribute('data-dev-btn'):'pc';
    var st=($('[data-state-btn].active',sh)[0]||null)?$('[data-state-btn].active',sh)[0].getAttribute('data-state-btn'):'';
    function show(){$('.spec-view',sh).forEach(function(v){v.classList.toggle('on',v.getAttribute('data-dev')===dev&&v.getAttribute('data-state')===st);});}
    $('[data-dev-btn]',sh).forEach(function(b){b.addEventListener('click',function(){if(b.disabled)return;dev=b.getAttribute('data-dev-btn');pick($('[data-dev-btn]',sh),b);show();});});
    $('[data-state-btn]',sh).forEach(function(b){b.addEventListener('click',function(){st=b.getAttribute('data-state-btn');pick($('[data-state-btn]',sh),b);show();});});
    function hot(n,on){$('.pin',sh).concat($('.annos li',sh)).forEach(function(e){if(e.getAttribute('data-n')===n)e.classList.toggle('hot',on);});}
    $('.pin,.annos li',sh).forEach(function(e){var n=e.getAttribute('data-n');e.addEventListener('mouseenter',function(){hot(n,true);});e.addEventListener('mouseleave',function(){hot(n,false);});});
  });
});
})();`;
  return { nav, body, script };
}
