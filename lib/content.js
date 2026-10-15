// Server-only: reads content/*.md at build time and turns it into lessons, quizzes and a search index.
// Content format is documented in README.md ("Lessons kaise add/edit karein").
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ANIM_NAMES } from './anims/names';
import { LEVEL_IDS } from './levels';

const CONTENT_DIR = path.join(process.cwd(), 'content');

/* ------------------------------------------------------------ inline */
export function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => {
    codes.push('<code>' + escapeHtml(c) + '</code>');
    return '\u0000' + (codes.length - 1) + '\u0000';
  });
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<![\w*])\*(?![\s*])(.+?)(?<![\s*])\*(?![\w*])/g, '<em>$1</em>');
  s = s.replace(/==(.+?)==/g, '<mark>$1</mark>');
  s = s.split('&lt;-&gt;').join('↔').split('-&gt;').join('→').split('=&gt;').join('⇒').split('&lt;-').join('←');
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => codes[Number(i)]);
  return s;
}

function slug(s) {
  s = s.replace(/<[^>]+>/g, '').toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'sec';
}

/* ------------------------------------------------------------ boxes / diagrams */
const BOX_TYPES = new Set(['client', 'edge', 'svc', 'cache', 'db', 'queue', 'store', 'ext']);

function box(item, ctx) {
  item = item.trim();
  let t = 'svc';
  const m = item.match(/^([a-z]+):(.+)$/);
  if (m && BOX_TYPES.has(m[1])) { t = m[1]; item = m[2].trim(); }
  else if (m) ctx.errors.push(`${ctx.where}: unknown box type "${item}"`);
  return `<div class="box t-${t}"><i class="box-ic" aria-hidden="true"></i><span>${inline(item)}</span></div>`;
}

// split on commas that are not inside parentheses
function splitTop(text) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function renderArch(title, layers, ctx) {
  const parts = ['<figure class="arch">'];
  if (title) parts.push(`<figcaption>${inline(title)}</figcaption>`);
  parts.push('<div class="arch-body">');
  layers.forEach((raw, k) => {
    let layer = raw, note = '';
    const at = layer.indexOf(' ~ ');
    if (at >= 0) { note = layer.slice(at + 3); layer = layer.slice(0, at); }
    if (k) parts.push('<div class="arch-link" aria-hidden="true"><span></span></div>');
    const items = splitTop(layer).filter((b) => b.trim());
    for (const it of items) {
      if ((it.match(/\(/g) || []).length !== (it.match(/\)/g) || []).length) ctx.errors.push(`${ctx.where}: unbalanced parentheses in "${layer}"`);
    }
    const boxes = items.map((b) => box(b, ctx)).join('');
    parts.push(`<div class="arch-layer"><div class="arch-boxes">${boxes}</div>${note ? `<div class="arch-note">${inline(note.trim())}</div>` : ''}</div>`);
  });
  parts.push('</div>');
  parts.push('<div class="arch-legend" aria-hidden="true"></div></figure>');
  return parts.join('');
}

function renderFlow(spec, ctx) {
  const out = ['<div class="flow">'];
  spec.split('->').forEach((n, k) => {
    if (k) out.push('<span class="flow-arrow" aria-hidden="true"></span>');
    out.push(box(n, ctx));
  });
  out.push('</div>');
  return out.join('');
}

/* ------------------------------------------------------------ blocks */
const CALLOUTS = {
  tip: 'Tip', analogy: 'Real-life example', warn: 'Dhyan dein', key: 'Yaad rakhein',
  note: 'Note', pro: 'Pro insight', interview: 'Interview angle', example: 'Example',
};
const LIST_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const BLOCK_START = /^\s*(#{2,3} |>|\||```|\[\[|[-*]\s|\d+\.\s)/;

function dedent(lines) {
  let min = Infinity;
  for (const l of lines) {
    if (!l.trim()) continue;
    min = Math.min(min, l.match(/^[ \t]*/)[0].length);
  }
  if (!isFinite(min)) min = 0;
  return lines.map((l) => (l.trim() ? l.slice(min) : '')).join('\n').replace(/^\n+|\n+$/g, '');
}

function renderList(items) {
  const parts = [];
  const stack = [];
  for (const [level, ordered, text] of items) {
    const tag = ordered ? 'ol' : 'ul';
    while (stack.length && stack[stack.length - 1][0] > level) parts.push(`</li></${stack.pop()[1]}>`);
    if (stack.length && stack[stack.length - 1][0] === level) parts.push('</li>');
    else { parts.push(`<${tag}>`); stack.push([level, tag]); }
    parts.push('<li>' + inline(text));
  }
  while (stack.length) parts.push(`</li></${stack.pop()[1]}>`);
  return parts.join('');
}

function render(md, ctx) {
  const lines = md.split('\n');
  const out = [];
  const n = lines.length;
  let i = 0;
  while (i < n) {
    const line = lines[i];
    const st = line.trim();
    if (!st) { i++; continue; }

    if (st.startsWith('```')) {
      const lang = st.slice(3).trim();
      let j = i + 1;
      const buf = [];
      while (j < n && !lines[j].trim().startsWith('```')) { buf.push(lines[j]); j++; }
      if (j >= n) ctx.errors.push(`${ctx.where}: unclosed code fence`);
      out.push(`<div class="code"><div class="code-h"><span>${escapeHtml(lang || 'code')}</span><button class="copy" type="button">Copy</button></div><pre><code>${escapeHtml(dedent(buf))}</code></pre></div>`);
      i = j + 1;
      continue;
    }
    if (st.startsWith('[[arch')) {
      const title = st.slice('[[arch'.length).replace(/\]+$/, '').trim();
      let j = i + 1;
      const layers = [];
      while (j < n && lines[j].trim() !== '[[/arch]]') { if (lines[j].trim()) layers.push(lines[j].trim()); j++; }
      if (j >= n) ctx.errors.push(`${ctx.where}: unclosed [[arch]]`);
      out.push(renderArch(title, layers, ctx));
      i = j + 1;
      continue;
    }
    let m = st.match(/^\[\[anim:([\w-]+)\]\]$/);
    if (m) {
      ctx.anims.push(m[1]);
      out.push(`<div class="anim" data-anim="${m[1]}"></div>`);
      i++;
      continue;
    }
    m = st.match(/^\[\[flow:(.+)\]\]$/);
    if (m) { out.push(renderFlow(m[1], ctx)); i++; continue; }
    if (st.startsWith('[[')) ctx.errors.push(`${ctx.where}: unknown directive ${st}`);
    if (st.startsWith('### ')) { const t = inline(st.slice(4)); out.push(`<h3 id="${slug(t)}">${t}</h3>`); i++; continue; }
    if (st.startsWith('## ')) { const t = inline(st.slice(3)); out.push(`<h2 id="${slug(t)}">${t}</h2>`); i++; continue; }

    if (st.startsWith('>')) {
      let buf = [];
      while (i < n && lines[i].trim().startsWith('>')) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      const cm = buf[0].match(/^\[!(\w+)\]\s*(.*)$/);
      let kind = 'note', title = '';
      if (cm) {
        kind = cm[1].toLowerCase();
        title = cm[2];
        buf = buf.slice(1);
        if (!CALLOUTS[kind]) ctx.errors.push(`${ctx.where}: unknown callout ${kind}`);
      }
      const label = CALLOUTS[kind] || 'Note';
      out.push(`<aside class="callout c-${kind}"><div class="callout-l">${escapeHtml(label)}</div>${title ? `<div class="callout-t">${inline(title)}</div>` : ''}<div class="callout-b">${render(buf.join('\n'), ctx)}</div></aside>`);
      continue;
    }

    if (st.startsWith('|')) {
      const rows = [];
      while (i < n && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++; }
      const cells = rows.map((r) => r.replace(/^\|+|\|+$/g, '').split('|').map((c) => c.trim()));
      let head = null, body = cells;
      if (cells.length < 2 || !/^:?-{2,}/.test(cells[1][0])) ctx.errors.push(`${ctx.where}: table without separator row`);
      else { head = cells[0]; body = cells.slice(2); }
      for (const r of body) {
        if (head && r.length !== head.length) ctx.errors.push(`${ctx.where}: table row has ${r.length} cells, header has ${head.length}`);
      }
      const t = ['<div class="table-wrap"><table>'];
      if (head) t.push(`<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`);
      t.push(`<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      out.push(t.join(''));
      continue;
    }

    if (LIST_RE.test(line)) {
      const items = [];
      while (i < n) {
        const l = lines[i];
        const lm = l.match(LIST_RE);
        if (lm) {
          const indent = lm[1].replace(/\t/g, '    ').length;
          items.push([indent < 2 ? 0 : 1, /^\d/.test(lm[2]), lm[3]]);
          i++;
        } else if (l.trim() && l.startsWith('  ') && items.length) {
          items[items.length - 1][2] += ' ' + l.trim();
          i++;
        } else break;
      }
      out.push(renderList(items));
      continue;
    }

    const buf = [st];
    i++;
    while (i < n && lines[i].trim() && !BLOCK_START.test(lines[i])) { buf.push(lines[i].trim()); i++; }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('');
}

/* ------------------------------------------------------------ structure */
function parseInterview(body, ctx) {
  const qa = [];
  body = body.replace(/^:::interview\s*\n([\s\S]*?)\n:::\s*$/gm, (m, block) => {
    let cur = null;
    for (const l of block.split('\n')) {
      if (l.startsWith('Q:')) { cur = { q: l.slice(2).trim(), a: [] }; qa.push(cur); }
      else if (l.startsWith('A:')) {
        if (!cur) { ctx.errors.push(`${ctx.where}: A: before Q:`); continue; }
        cur.a.push(l.slice(2).trim());
      } else if (cur) cur.a.push(l);
    }
    return '';
  });
  const out = qa.map((item) => {
    const a = item.a.join('\n').trim();
    if (!item.q || !a) ctx.errors.push(`${ctx.where}: empty interview Q/A`);
    return { q: inline(item.q), a: render(a, ctx) };
  });
  return [body, out];
}

// deterministic PRNG so option order is the same on every build
function seededRandom(text) {
  let s = parseInt(crypto.createHash('md5').update(text).digest('hex').slice(0, 8), 16) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseQuiz(text, where, errors) {
  const qs = [];
  for (const chunk of text.trim().split(/\n\s*\n/)) {
    const lines = chunk.trim().split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim());
    if (!lines.length) continue;
    let q = null, ex = '';
    const opts = [], ans = [];
    for (const l of lines) {
      if (l.startsWith('Q:')) q = l.slice(2).trim();
      else if (l.startsWith('+ ')) { ans.push(opts.length); opts.push(l.slice(2).trim()); }
      else if (l.startsWith('- ')) opts.push(l.slice(2).trim());
      else if (l.startsWith('E:')) ex = l.slice(2).trim();
      else errors.push(`${where} quiz: stray line "${l}"`);
    }
    if (!q || opts.length < 2 || ans.length !== 1 || !ex) {
      errors.push(`${where} quiz: bad question "${q}" (options=${opts.length}, answers=${ans.length}, explanation=${Boolean(ex)})`);
      continue;
    }
    const rnd = seededRandom(q);
    const order = opts.map((_, k) => k);
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(rnd() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }
    qs.push({ q: inline(q), o: order.map((k) => inline(opts[k])), a: order.indexOf(ans[0]), e: inline(ex) });
  }
  return qs;
}

function wordCount(h) {
  return h.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function takeMeta(text) {
  const meta = {};
  const lines = text.split('\n');
  let j = 0;
  while (j < lines.length) {
    const m = lines[j].match(/^@(title|level|desc)\s+(.*)$/);
    if (m) { meta[m[1]] = m[2].trim(); j++; }
    else if (!lines[j].trim() && !Object.keys(meta).length) j++;
    else break;
  }
  return [meta, lines.slice(j).join('\n')];
}

function parseFile(file, modules, errors) {
  const name = path.basename(file);
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const sections = text.split(/^(@module|@lesson|@quiz)\b/m);
  if (sections[0].trim()) errors.push(`${name}: text before first section`);
  let curMod = modules.length ? modules[modules.length - 1] : null;
  for (let k = 1; k < sections.length; k += 2) {
    const kind = sections[k];
    const chunk = sections[k + 1];
    if (kind === '@module') {
      const nl = chunk.indexOf('\n');
      const head = nl >= 0 ? chunk.slice(0, nl) : chunk;
      const [meta, rest] = takeMeta(nl >= 0 ? chunk.slice(nl + 1) : '');
      curMod = { id: head.trim(), title: meta.title || '', level: meta.level || '', desc: meta.desc || '', lessons: [], quiz: [] };
      modules.push(curMod);
      if (rest.trim()) errors.push(`${name}: text after module meta`);
    } else if (kind === '@lesson') {
      if (!curMod) { errors.push(`${name}: lesson before any module`); continue; }
      const nl = chunk.indexOf('\n');
      const lid = (nl >= 0 ? chunk.slice(0, nl) : chunk).trim();
      const [meta, raw] = takeMeta(nl >= 0 ? chunk.slice(nl + 1) : '');
      const ctx = { where: `${name}/${lid}`, anims: [], errors };
      const [body, iq] = parseInterview(raw, ctx);
      if (body.includes(':::')) errors.push(`${ctx.where}: leftover ::: (interview block malformed)`);
      const html = render(body, ctx);
      const words = wordCount(html) + iq.reduce((a, x) => a + wordCount(x.a) + wordCount(x.q), 0);
      curMod.lessons.push({ id: lid, title: meta.title || lid, html, iq, mins: Math.max(3, Math.round(words / 170)), anims: ctx.anims });
    } else if (kind === '@quiz') {
      if (!curMod) { errors.push(`${name}: quiz before any module`); continue; }
      curMod.quiz = parseQuiz(chunk, `${name}/${curMod.id}`, errors);
    }
  }
}

function loadCourse() {
  const errors = [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')).sort();
  const modules = [];
  for (const f of files) parseFile(path.join(CONTENT_DIR, f), modules, errors);

  const seen = new Set();
  const known = new Set(ANIM_NAMES);
  modules.forEach((m, mi) => {
    m.n = mi + 1;
    if (!m.title || !LEVEL_IDS.includes(m.level)) errors.push(`module ${m.id}: missing title or unknown level "${m.level}"`);
    if (seen.has(m.id)) errors.push(`duplicate id ${m.id}`);
    seen.add(m.id);
    if (!m.quiz.length) errors.push(`module ${m.id} has no quiz`);
    m.lessons.forEach((l, li) => {
      l.n = li + 1;
      if (seen.has(l.id)) errors.push(`duplicate id ${l.id}`);
      seen.add(l.id);
      if (!/^[a-z0-9-]+$/.test(l.id)) errors.push(`lesson id "${l.id}" must use a-z, 0-9 and -`);
      l.anims.forEach((a) => { if (!known.has(a)) errors.push(`${l.id}: unknown demo "${a}"`); });
      if (!l.iq.length) errors.push(`${l.id}: no interview Q&A`);
    });
  });
  if (errors.length) {
    throw new Error('Content errors in content/*.md:\n  - ' + errors.join('\n  - '));
  }
  return { modules };
}

/* ------------------------------------------------------------ public API */
let cached = null;
export function getCourse() {
  if (cached && process.env.NODE_ENV === 'production') return cached;
  cached = loadCourse();
  return cached;
}

export function getAllLessons() {
  return getCourse().modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
}

export function getModule(id) {
  return getCourse().modules.find((m) => m.id === id) || null;
}

export function getLesson(id) {
  const all = getAllLessons();
  const gi = all.findIndex((l) => l.id === id);
  if (gi < 0) return null;
  const lesson = all[gi];
  const mod = getModule(lesson.moduleId);
  const brief = (l) => (l ? { id: l.id, title: l.title } : null);
  return {
    lesson, summary: summarize(lesson.html),
    module: { id: mod.id, n: mod.n, title: mod.title, level: mod.level, count: mod.lessons.length },
    prev: brief(all[gi - 1]), next: brief(all[gi + 1]),
  };
}

// small outline for the client: no lesson HTML
export function getOutline() {
  return getCourse().modules.map((m) => ({
    id: m.id, n: m.n, title: m.title, level: m.level, desc: m.desc, quizCount: m.quiz.length,
    lessons: m.lessons.map((l) => ({ id: l.id, n: l.n, title: l.title, mins: l.mins, iqCount: l.iq.length, hasDemo: l.anims.length > 0 })),
  }));
}

export function getStats() {
  const mods = getCourse().modules;
  const lessons = mods.flatMap((m) => m.lessons);
  const demos = new Set(lessons.flatMap((l) => l.anims));
  const cs = mods.find((m) => m.id === 'case-studies');
  return {
    lessons: lessons.length,
    demos: demos.size,
    caseStudies: cs ? cs.lessons.filter((l) => l.id.startsWith('design-')).length : 0,
    interview: lessons.reduce((a, l) => a + l.iq.length, 0),
    quiz: mods.reduce((a, m) => a + m.quiz.length, 0),
  };
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'" };
function toText(h) {
  return h.replace(/<[^>]+>/g, ' ').replace(/&(amp|lt|gt|quot|#x27|#39);/g, (e) => ENTITIES[e]).replace(/\s+/g, ' ').trim();
}

// first paragraph as plain text, cut to ~155 characters (used for page descriptions)
function summarize(html) {
  const m = html.match(/<p>([\s\S]*?)<\/p>/);
  const t = m ? toText(m[1]) : '';
  if (t.length <= 155) return t;
  return t.slice(0, 155).replace(/\s+\S*$/, '') + '…';
}

export function getSearchIndex() {
  return getCourse().modules.flatMap((m) => m.lessons.map((l) => ({
    id: l.id, title: l.title, mod: m.title, modN: m.n,
    text: toText(l.html + ' ' + l.iq.map((x) => x.q + ' ' + x.a).join(' ')),
  })));
}
