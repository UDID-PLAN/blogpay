// 주석 마커 좌표 실측 — 저장한 관리자/쇼핑몰 HTML을 헤드리스 Chrome으로 열어 요소 위치를 spec.json marks(%) 형식으로 출력한다.
// 사용: node tools/capture/measure.mjs <html> '<{"1":["#sel"],"2":["*.cls"]}>' [out.json] [높이px]
//   - 값은 선택자 배열. 여러 요소를 하나의 박스로 묶으려면 선택자 앞에 * (querySelectorAll 합집합)
//   - 이미지 크기는 shot.mjs와 같은 1920x1250 기준(높이px를 주면 shot.mjs에도 같은 값을 준다). x·y·w·h는 이미지 대비 %
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findChrome, W, H } from './chrome.mjs';

const [file, mapJson, outFile, hArg] = process.argv.slice(2);
const HH = Number(hArg) || H;
if (!file || !mapJson) { console.error("사용: node tools/capture/measure.mjs <html> '<선택자 맵 JSON>' [out.json] [높이px]"); process.exit(1); }
const chrome = findChrome();
if (!chrome) { console.error('Chrome을 찾지 못했습니다 (CHROME_BIN 지정)'); process.exit(1); }
const probe = `<script>window.addEventListener('load',function(){var S=${mapJson},out={};
function R(els){var l=1e9,t=1e9,r=0,b=0;els.forEach(function(e){var x=e.getBoundingClientRect();l=Math.min(l,x.left);t=Math.min(t,x.top+scrollY);r=Math.max(r,x.right);b=Math.max(b,x.bottom+scrollY);});return [l,t,r,b];}
for(var k in S){var L=[];S[k].forEach(function(q){if(q[0]=='*'){document.querySelectorAll(q.slice(1)).forEach(function(e){L.push(e)})}else{var e=document.querySelector(q);if(e)L.push(e)}});out[k]=L.length?R(L):null;}
document.title='M'+JSON.stringify(out);});</script>`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-measure-'));
const tf = path.join(path.dirname(path.resolve(file)), '.__measure.html'); // 상대 경로 리소스(_files/)를 유지하려고 같은 폴더에 임시 생성
fs.writeFileSync(tf, fs.readFileSync(file, 'utf8').replace('</body>', probe + '</body>'));
const r = spawnSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--window-size=${W},${HH}`, '--virtual-time-budget=3000', '--dump-dom', 'file://' + tf.replace(/\\/g, '/')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
fs.rmSync(tf, { force: true }); fs.rmSync(tmp, { recursive: true, force: true });
const m = /<title>M(\{.*?\})<\/title>/s.exec(r.stdout || '');
if (!m) { console.error('측정 실패'); process.exit(1); }
const d = JSON.parse(m[1].replace(/&quot;/g, '"'));
const marks = [];
for (const [k, v] of Object.entries(d)) {
  if (!v) { console.error(`✖ 마커 ${k}: 선택자에 해당하는 요소가 없습니다`); process.exit(1); }
  const [l, t, rr, b] = v; const rd = (x) => Math.round(x * 100) / 100;
  marks.push({ n: Number(k), x: rd(l / W * 100), y: rd(t / HH * 100), w: rd((rr - l) / W * 100), h: rd((b - t) / HH * 100) });
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(marks, null, 1));
console.log(JSON.stringify(marks));
