// 단일 규격 린트 — src/doc.css의 :root 밖에서 토큰이 아닌 값(px·hex·rgb 리터럴 등)을 쓰면 실패한다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function lintCss(css) {
  const errors = [];
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')); // 주석 제거(줄 번호 유지)
  const lines = stripped.split('\n');
  let inRoot = false;
  lines.forEach((line, i) => {
    const n = i + 1;
    if (/^:root\s*\{/.test(line)) inRoot = true;
    const insideRoot = inRoot;
    if (inRoot && /^\}/.test(line)) inRoot = false;
    if (insideRoot) return;
    const code = line.replace(/@media[^{]*\{/g, ''); // 미디어 쿼리 기준점은 변수를 쓸 수 없어 제외
    if (/#[0-9a-fA-F]{3,8}\b/.test(code)) errors.push(`${n}: hex 색상 직접 사용 → :root 토큰을 쓰세요: ${line.trim()}`);
    if (/\b(rgb|rgba|hsl|hsla)\(/.test(code)) errors.push(`${n}: rgb/hsl 직접 사용: ${line.trim()}`);
    if (/(^|[^\w-])-?\d*\.?\d+(px|rem|em)\b/.test(code)) errors.push(`${n}: px/rem/em 리터럴 → :root 토큰을 쓰세요: ${line.trim()}`);
    for (const m of code.matchAll(/font-size:\s*([^;}]+)/g)) if (!/^var\(--fs-/.test(m[1].trim())) errors.push(`${n}: font-size는 --fs-* 토큰만: ${m[1].trim()}`);
    for (const m of code.matchAll(/font-weight:\s*([^;}]+)/g)) if (!/^var\(--fw-/.test(m[1].trim())) errors.push(`${n}: font-weight는 --fw-* 토큰만: ${m[1].trim()}`);
    for (const m of code.matchAll(/(?<![\w-])line-height:\s*([^;}]+)/g)) if (!/^var\(--lh-/.test(m[1].trim())) errors.push(`${n}: line-height는 --lh-* 토큰만: ${m[1].trim()}`);
    for (const m of code.matchAll(/border-radius:\s*([^;}]+)/g)) if (!/^var\(--radius-/.test(m[1].trim())) errors.push(`${n}: border-radius는 --radius-* 토큰만: ${m[1].trim()}`);
    for (const m of code.matchAll(/(?<![\w-])(?:padding|margin|gap)(?:-[a-z]+)?:\s*([^;}]+)/g)) {
      for (const v of m[1].trim().split(/\s+/)) if (!/^(0|auto|var\(--sp-\d\))$/.test(v)) errors.push(`${n}: 간격은 --sp-* 토큰만: ${v}`);
    }
  });
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = lintCss(readFileSync(new URL('../src/doc.css', import.meta.url), 'utf8'));
  if (errors.length) { console.error('✖ CSS 단일 규격 위반\n' + errors.map((e) => '  ' + e).join('\n')); process.exit(1); }
  console.log('✔ CSS 단일 규격 통과');
}
