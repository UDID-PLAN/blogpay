// 화면 캡처 — 저장한 HTML을 1920x1250(PC) 또는 모바일 폭으로 PNG 캡처한다.
// 사용: node tools/capture/shot.mjs <html> <out.png> [pc|mobile] [높이px]   (높이는 PC만, 기본 1250 — 긴 화면은 키운다)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findChrome, W, H } from './chrome.mjs';

const [file, out, dev = 'pc', hArg] = process.argv.slice(2);
if (!file || !out) { console.error('사용: node tools/capture/shot.mjs <html> <out.png> [pc|mobile] [높이px]'); process.exit(1); }
const chrome = findChrome();
if (!chrome) { console.error('Chrome을 찾지 못했습니다 (CHROME_BIN 지정)'); process.exit(1); }
const size = dev === 'mobile' ? '390,844' : `${W},${Number(hArg) || H}`;
const r = spawnSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--window-size=${size}`, '--virtual-time-budget=3000', `--screenshot=${path.resolve(out)}`, 'file://' + path.resolve(file).replace(/\\/g, '/')], { encoding: 'utf8' });
if (!fs.existsSync(out)) { console.error('캡처 실패\n' + (r.stderr || '')); process.exit(1); }
console.log('✔ ' + out + ' (' + size.replace(',', 'x') + ')');
