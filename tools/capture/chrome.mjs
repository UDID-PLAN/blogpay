import { spawnSync } from 'node:child_process';
export const W = 1920, H = 1250; // 화면 캡처·마커 좌표 기준 크기 (PC)
export function findChrome() {
  const cands = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  for (const c of cands) { const r = spawnSync(c, ['--version'], { encoding: 'utf8' }); if (!r.error && r.status === 0) return c; }
  return null;
}
