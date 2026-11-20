// 인덱스 레이아웃 검사 — 헤드리스 Chrome으로 index.html을 열어 셀 넘침을 실측한다.
//  ① 표 머리글 글자가 열 내부 폭을 넘는지  ② 셀 내용이 칸 밖으로 넘치는지
//  ③ site.json에 등록된 프로젝트·진행상태 태그 전체가 해당 열에 들어가는지 (현재 행에 없는 값도 검사)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WIDTHS = [1920, 1440, 1100]; // 데스크톱 폭. 표는 최소 폭 이하에서 가로 스크롤이라 이 이하는 같은 레이아웃

function findChrome() {
  const cands = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  for (const c of cands) {
    const r = spawnSync(c, ['--version'], { encoding: 'utf8' });
    if (!r.error && r.status === 0) return c;
  }
  return null;
}

export function checkLayout({ quiet = false } = {}) {
  const chrome = findChrome();
  if (!chrome) { if (!quiet) console.warn('⚠ Chrome을 찾지 못해 레이아웃 검사를 건너뜁니다. (CHROME_BIN으로 경로 지정 가능)'); return { skipped: true, errors: [] }; }
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
  const tags = [...(site.projectTags || []).map((t) => ({ col: '프로젝트', ...t })), ...(site.statuses || []).map((t) => ({ col: '진행상태', ...t }))];
  const probe = `<script>window.addEventListener('load',function(){
var out=[];var tags=${JSON.stringify(tags)};
var inner=function(c){var s=getComputedStyle(c);return c.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)};
var ths={};document.querySelectorAll('.index-table th').forEach(function(th){ths[th.textContent.trim()]=th;
  var r=document.createRange();r.selectNodeContents(th);var need=r.getBoundingClientRect().width;
  if(need>inner(th)+0.5)out.push('머리글 "'+th.textContent.trim()+'" 글자 '+need.toFixed(0)+'px > 열 내부 '+inner(th).toFixed(0)+'px')});
document.querySelectorAll('.index-table tbody td').forEach(function(td){if(td.scrollWidth>td.clientWidth+1)out.push('셀 넘침: "'+td.textContent.trim().slice(0,16)+'" '+td.scrollWidth+'px > '+td.clientWidth+'px')});
tags.forEach(function(t){var th=ths[t.col];if(!th)return;var sp=document.createElement('span');sp.className='tag tone-'+t.tone;sp.textContent=t.name;document.body.appendChild(sp);
  var w=sp.getBoundingClientRect().width;sp.remove();if(w>inner(th)+0.5)out.push('태그 "'+t.name+'"('+t.col+') '+w.toFixed(0)+'px > 열 내부 '+inner(th).toFixed(0)+'px')});
document.title='LAYOUT:'+JSON.stringify(out)});</script>`;
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace('</body>', probe + '</body>');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blogpay-layout-'));
  const file = path.join(tmp, 'probe.html');
  fs.writeFileSync(file, src);
  const errors = [];
  for (const w of WIDTHS) {
    const r = spawnSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', `--window-size=${w},900`, '--virtual-time-budget=3000', '--dump-dom', 'file://' + file.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const m = /<title>LAYOUT:(.*?)<\/title>/s.exec(r.stdout || '');
    if (!m) { errors.push(`${w}px: 측정 결과를 읽지 못했습니다`); continue; }
    for (const e of JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))) errors.push(`${w}px: ${e}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return { skipped: false, errors: [...new Set(errors)] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { skipped, errors } = checkLayout();
  if (errors.length) { console.error('✖ 레이아웃 넘침 발견\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
  if (!skipped) console.log('✔ 레이아웃 검사 통과 (셀·머리글·태그 넘침 없음)');
}
