// 기획서(문서) 레이아웃 검사 — 빌드된 HTML을 헤드리스 Chrome으로 열어 폭별로 실측한다.
//  ① 페이지 가로 스크롤(문서 전체 넘침)  ② 스크롤 영역 밖으로 튀어나온 요소
//  모든 챕터·시트 탭을 순서대로 열어 검사한다. (spec.json 기반 문서만 탭이 있고, content.html 문서는 1화면)
//  사용: node tools/check-doc.mjs <html 파일>...   (build.mjs doc 때 자동 실행)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WIDTHS = [1440, 1024, 768, 500]; // 데스크톱 / 토글 경계 / 태블릿 / 모바일(헤드리스 Chrome 최소 창 폭 ≈500)

function findChrome() {
  const cands = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  for (const c of cands) { const r = spawnSync(c, ['--version'], { encoding: 'utf8' }); if (!r.error && r.status === 0) return c; }
  return null;
}

const PROBE = `<script>window.addEventListener('load',function(){
var out=[];var vw=document.documentElement.clientWidth;
function scrollParent(e){for(var p=e.parentElement;p&&p!==document.body;p=p.parentElement){var o=getComputedStyle(p);if(/(auto|scroll|hidden)/.test(o.overflowX)&&p.scrollWidth>=p.clientWidth)return p;}return null;}
function scan(tag){
  if(document.documentElement.scrollWidth>vw+1)out.push(tag+'페이지 가로 스크롤 '+document.documentElement.scrollWidth+'px > '+vw+'px');
  var seen=0;document.querySelectorAll('body *').forEach(function(e){
    if(seen>=3)return;var r=e.getBoundingClientRect();if(!r.width||!r.height||r.right<=vw+1)return;
    var cs=getComputedStyle(e);if(cs.position==='fixed'||e.closest('[hidden],.menu-list,.ovl')&&e.closest('[hidden]'))return;
    var sp=scrollParent(e);if(sp&&sp.getBoundingClientRect().right<=vw+1)return;
    out.push(tag+'<'+e.tagName.toLowerCase()+(e.className&&e.className.baseVal===undefined?'.'+String(e.className).split(' ')[0]:'')+'> 우측 '+Math.round(r.right)+'px > '+vw+'px');seen++;});
}
var chs=document.querySelectorAll('[data-chapter-btn]');
if(!chs.length){scan('');}
chs.forEach(function(cb){cb.click();var ch=document.querySelector('.spec-chapter.on');var sbs=ch?ch.querySelectorAll('[data-sheet-btn]'):[];
  if(!sbs.length){scan('['+cb.textContent.trim()+'] ');return;}
  sbs.forEach(function(sb){sb.click();scan('['+cb.textContent.trim()+' > '+sb.textContent.trim()+'] ');});});
document.title='DOC:'+JSON.stringify({vw:vw,out:out});});</script>`;

export function checkDoc(files, { quiet = false } = {}) {
  const chrome = findChrome();
  if (!chrome) { if (!quiet) console.warn('⚠ Chrome을 찾지 못해 문서 레이아웃 검사를 건너뜁니다. (CHROME_BIN으로 경로 지정)'); return { skipped: true, errors: [] }; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blogpay-doc-'));
  const errors = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8').replace('</body>', PROBE + '</body>');
    const tf = path.join(tmp, 'probe.html');
    fs.writeFileSync(tf, src);
    for (const w of WIDTHS) {
      const r = spawnSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', `--window-size=${w},900`, '--virtual-time-budget=5000', '--dump-dom', 'file://' + tf.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      const m = /<title>DOC:(.*?)<\/title>/s.exec(r.stdout || '');
      if (!m) { errors.push(`${path.basename(f)} ${w}px: 측정 결과를 읽지 못했습니다`); continue; }
      const d = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      for (const e of d.out) errors.push(`${path.basename(f)} ${w}px(실측 ${d.vw}): ${e}`);
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return { skipped: false, errors: [...new Set(errors)] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2);
  if (!files.length) { console.log('사용: node tools/check-doc.mjs <html 파일>...'); process.exit(1); }
  const { skipped, errors } = checkDoc(files);
  if (errors.length) { console.error('✖ 문서 레이아웃 넘침 발견\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
  if (!skipped) console.log('✔ 문서 레이아웃 검사 통과 (' + files.length + '개 파일, 폭 ' + WIDTHS.join('/') + 'px)');
}
