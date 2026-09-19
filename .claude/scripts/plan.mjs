#!/usr/bin/env node
/**
 * Cập nhật trạng thái task trong docs/PLAN.md và đếm lại bảng Tổng quan.
 *
 *   node .claude/scripts/plan.mjs <TASK_ID> <todo|doing|done|skip> ["ghi chú nhật ký"]
 *   node .claude/scripts/plan.mjs --check        # chỉ đếm lại và báo lệch, không sửa
 *
 * Bảng Tổng quan luôn được tính lại từ các dòng task — không bao giờ cộng dồn từ số cũ,
 * để số liệu không thể trôi lệch khỏi thực tế.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const PLAN = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/PLAN.md');
const STATUS = { todo: '⬜', doing: '🔄', done: '✅', skip: '⏸️' };
const TASK_ROW = /^\| (F\d+-\d{2}) \|/;

function fail(msg) {
  process.stderr.write(`plan.mjs: ${msg}\n`);
  process.exit(1);
}

function cells(line) {
  return line.split('|').slice(1, -1);
}

function setStatus(lines, id, symbol) {
  const idx = lines.findIndex((l) => l.startsWith(`| ${id} |`));
  if (idx === -1) fail(`không tìm thấy task ${id}`);
  const c = cells(lines[idx]);
  c[c.length - 1] = ` ${symbol} `;
  lines[idx] = `|${c.join('|')}|`;
}

function tally(lines) {
  const groups = {};
  for (const line of lines) {
    const m = TASK_ROW.exec(line);
    if (!m) continue;
    const group = m[1].split('-')[0];
    const status = cells(line).at(-1).trim();
    groups[group] ??= { total: 0, done: 0, doing: [] };
    groups[group].total += 1;
    if (status === '✅' || status === '⏸️') groups[group].done += 1;
    if (status === '🔄') groups[group].doing.push(m[1]);
  }
  return groups;
}

const pct = (d, t) => (t === 0 ? '0%' : `${Math.round((d / t) * 100)}%`);

function rewriteSummary(lines, groups) {
  let total = 0;
  let done = 0;
  for (let i = 0; i < lines.length; i++) {
    const c = cells(lines[i]);
    if (c.length !== 8) continue;
    const key = c[0].trim();
    if (groups[key]) {
      const g = groups[key];
      c[4] = ` ${g.total} `;
      c[5] = ` ${g.done} `;
      c[6] = ` ${pct(g.done, g.total)} `;
      total += g.total;
      done += g.done;
      lines[i] = `|${c.join('|')}|`;
    } else if (c[1].includes('**Tổng**')) {
      c[4] = ` **${total}** `;
      c[5] = ` **${done}** `;
      c[6] = ` **${pct(done, total)}** `;
      lines[i] = `|${c.join('|')}|`;
    }
  }
  return { total, done };
}

function addLog(lines, id, note) {
  const head = lines.findIndex((l) => l.startsWith('## Nhật ký tiến độ'));
  if (head === -1) fail('không tìm thấy mục "Nhật ký tiến độ"');
  const sep = lines.findIndex((l, i) => i > head && l.startsWith('|---'));
  const today = new Date().toLocaleDateString('sv-SE');
  lines.splice(sep + 1, 0, `| ${today} | ${id} | ${note} |`);
}

const [, , arg, statusKey, note] = process.argv;
const text = readFileSync(PLAN, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);

if (arg !== '--check') {
  if (!arg || !STATUS[statusKey]) {
    fail('cách dùng: plan.mjs <TASK_ID> <todo|doing|done|skip> ["ghi chú"]');
  }
  if (statusKey === 'doing') {
    const others = Object.values(tally(lines)).flatMap((g) => g.doing).filter((x) => x !== arg);
    if (others.length) fail(`đang có task khác 🔄: ${others.join(', ')} — xong nó trước`);
  }
  setStatus(lines, arg, STATUS[statusKey]);
  if ((statusKey === 'done' || statusKey === 'skip') && note) addLog(lines, arg, note);
}

const { total, done } = rewriteSummary(lines, tally(lines));
const out = lines.join(eol);
if (arg === '--check') {
  process.stdout.write(out === text ? `OK — ${done}/${total}\n` : `LỆCH — bảng Tổng quan cần cập nhật (${done}/${total})\n`);
} else {
  writeFileSync(PLAN, out);
  process.stdout.write(`${arg} → ${STATUS[statusKey]}   Tổng: ${done}/${total} (${pct(done, total)})\n`);
}
