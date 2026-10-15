'use client';
// One small client store for the whole site: progress (done lessons, quiz scores),
// sidebar open/closed modules, last opened lesson, theme, toast, and the course outline.
// Progress lives in this browser's localStorage only (key "sds.v1").
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const KEY = 'sds.v1';
const EMPTY = { done: {}, quiz: {}, open: {}, last: null, theme: null };
const StoreContext = createContext(null);

function sanitize(p) {
  const out = { ...EMPTY };
  if (!p || typeof p !== 'object') return out;
  for (const k of ['done', 'quiz', 'open']) if (p[k] && typeof p[k] === 'object') out[k] = p[k];
  if (typeof p.last === 'string') out.last = p.last;
  if (p.theme === 'dark' || p.theme === 'light') out.theme = p.theme;
  return out;
}

export function StoreProvider({ outline, children }) {
  const [state, setState] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  // load saved progress once, after the first render (keeps server and client HTML identical)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(sanitize(JSON.parse(raw)));
    } catch { /* storage blocked: site still works, just without saved progress */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, ready]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const actions = useMemo(() => ({
    toggleDone(id) {
      setState((s) => {
        const done = { ...s.done };
        if (done[id]) delete done[id]; else done[id] = Date.now();
        return { ...s, done };
      });
    },
    saveQuiz(moduleId, score, total) {
      setState((s) => {
        const prev = s.quiz[moduleId];
        const best = prev && prev.total === total ? Math.max(prev.best, score) : score;
        return { ...s, quiz: { ...s.quiz, [moduleId]: { best, total } } };
      });
    },
    setOpen(moduleId, open) {
      setState((s) => (s.open[moduleId] === open ? s : { ...s, open: { ...s.open, [moduleId]: open } }));
    },
    setLast(id) {
      setState((s) => (s.last === id ? s : { ...s, last: id }));
    },
    setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      setState((s) => ({ ...s, theme }));
    },
  }), []);

  const lessonIndex = useMemo(() => {
    const map = {};
    outline.forEach((m) => m.lessons.forEach((l) => { map[l.id] = { ...l, moduleId: m.id, moduleN: m.n, moduleTitle: m.title }; }));
    return map;
  }, [outline]);

  const value = useMemo(() => ({ ...state, ready, outline, lessonIndex, toast, showToast, ...actions }),
    [state, ready, outline, lessonIndex, toast, showToast, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export function pct(a, b) {
  return b ? Math.round((a * 100) / b) : 0;
}

export function moduleDone(module, done) {
  return module.lessons.filter((l) => done[l.id]).length;
}
