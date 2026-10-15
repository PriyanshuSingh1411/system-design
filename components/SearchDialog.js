'use client';
// Full-text search over all lessons. The index (/search-index.json) is built at deploy time
// and downloaded only the first time someone opens search.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lessonHref } from '@/lib/routes';

let indexPromise = null;
function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch('/search-index.json')
      .then((r) => { if (!r.ok) throw new Error('search index ' + r.status); return r.json(); })
      .then((list) => list.map((it) => ({ ...it, low: it.text.toLowerCase(), tl: it.title.toLowerCase(), ml: it.mod.toLowerCase() })))
      .catch((e) => { indexPromise = null; throw e; });
  }
  return indexPromise;
}

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function Highlight({ text, re }) {
  if (!re) return text;
  const parts = text.split(re);
  return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p));
}

export default function SearchDialog({ onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [index, setIndex] = useState(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(-1);

  useEffect(() => {
    inputRef.current && inputRef.current.focus();
    let alive = true;
    loadIndex().then((d) => alive && setIndex(d), () => alive && setFailed(true));
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { alive = false; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const terms = useMemo(() => q.trim().toLowerCase().split(/\s+/).filter(Boolean), [q]);
  const re = useMemo(() => (terms.length ? new RegExp('(' + terms.map(escRe).join('|') + ')', 'gi') : null), [terms]);

  const results = useMemo(() => {
    if (!index || !terms.length) return [];
    const out = [];
    for (const it of index) {
      let score = 0, ok = true;
      for (const t of terms) {
        const inT = it.tl.includes(t), inM = it.ml.includes(t);
        let cnt = 0, pos = it.low.indexOf(t);
        while (pos >= 0 && cnt < 30) { cnt++; pos = it.low.indexOf(t, pos + t.length); }
        if (!inT && !inM && !cnt) { ok = false; break; }
        score += (inT ? 40 : 0) + (inM ? 8 : 0) + cnt;
      }
      if (ok) out.push({ it, score });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 25).map(({ it }) => {
      const p = it.low.indexOf(terms[0]);
      const start = Math.max(0, p - 60);
      const snip = p >= 0 ? (start ? '…' : '') + it.text.slice(start, start + 170) + '…' : it.text.slice(0, 150) + '…';
      return { ...it, snip };
    });
  }, [index, terms]);

  useEffect(() => { setSel(-1); }, [q]);

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      const n = e.key === 'ArrowDown' ? Math.min(results.length - 1, sel + 1) : Math.max(0, sel - 1);
      setSel(n);
      const el = listRef.current && listRef.current.children[n];
      if (el) el.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const r = results[sel >= 0 ? sel : 0];
      if (r) { e.preventDefault(); onClose(); router.push(lessonHref(r.id)); }
    }
  }

  let body;
  if (failed) body = <div className="sr-empty">Search abhi load nahi ho paaya. Internet check karke dobara kholiye.</div>;
  else if (!terms.length) body = <div className="sr-empty">Kuch bhi likhiye: &quot;load balancer&quot;, &quot;CAP&quot;, &quot;kafka&quot;, &quot;singleton&quot;, &quot;uber&quot;…</div>;
  else if (!index) body = <div className="sr-empty">Search load ho raha hai…</div>;
  else if (!results.length) body = <div className="sr-empty">&quot;{q.trim()}&quot; ke liye kuch nahi mila. Doosra shabd try karein.</div>;
  else body = results.map((r, i) => (
    <Link key={r.id} className={'sr' + (i === sel ? ' sel' : '')} role="option" aria-selected={i === sel} href={lessonHref(r.id)} prefetch={false} onClick={onClose}>
      <b><Highlight text={r.title} re={re} /></b>
      <small>Module {r.modN} · {r.mod}</small>
      <p><Highlight text={r.snip} re={re} /></p>
    </Link>
  ));

  return (
    <div className="search-dlg" role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-box">
        <div className="search-row">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <input ref={inputRef} id="search-input" type="search" placeholder="e.g. caching, kafka, sharding, parking lot" autoComplete="off" aria-label="Search lessons" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} />
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Esc</button>
        </div>
        <div className="search-results" role="listbox" ref={listRef}>{body}</div>
      </div>
    </div>
  );
}
