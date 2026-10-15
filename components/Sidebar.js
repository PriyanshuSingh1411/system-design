'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore, pct, moduleDone } from './Store';
import { LEVELS } from '@/lib/levels';
import { lessonHref, quizHref, parsePath } from '@/lib/routes';

export default function Sidebar({ open }) {
  const pathname = usePathname();
  const { outline, lessonIndex, done, quiz, open: openMap, setOpen } = useStore();
  const ref = useRef(null);
  const route = parsePath(pathname);
  const activeMod = route.type === 'lesson' ? lessonIndex[route.id]?.moduleId : route.type === 'module' || route.type === 'quiz' ? route.id : null;

  // the module you are reading is always expanded
  useEffect(() => {
    if (activeMod && openMap[activeMod] === false) setOpen(activeMod, true);
  }, [activeMod]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the active lesson visible inside the sidebar
  useEffect(() => {
    const box = ref.current;
    const a = box && box.querySelector('a.active');
    if (!a) return;
    const r = a.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (r.top < b.top || r.bottom > b.bottom) a.scrollIntoView({ block: 'center' });
  }, [pathname]);

  const isOpen = (id) => (openMap[id] === undefined ? id === activeMod : openMap[id]);

  return (
    <nav className={'sidebar' + (open ? ' open' : '')} id="sidebar" aria-label="Course contents" ref={ref}>
      <Link className={'nav-home' + (route.type === 'home' ? ' active' : '')} href="/">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
        Home &amp; Roadmap
      </Link>
      {LEVELS.map((L) => {
        const mods = outline.filter((m) => m.level === L.id);
        if (!mods.length) return null;
        return (
          <div className={`nav-level lvl-${L.id}`} key={L.id}>
            <div className="nav-level-h"><i />{L.id}</div>
            {mods.map((m) => {
              const d = moduleDone(m, done);
              const opened = isOpen(m.id);
              const qs = quiz[m.id];
              const quizActive = route.type === 'quiz' && route.id === m.id;
              return (
                <div className={'nav-mod' + (opened ? ' open' : '')} key={m.id}>
                  <button className="nav-mod-btn" type="button" aria-expanded={opened} onClick={() => setOpen(m.id, !opened)}>
                    <span className="nav-mod-t">{m.n}. {m.title}</span>
                    <span className="nav-mod-n">{d}/{m.lessons.length}</span>
                    <span className="nav-mod-bar"><i style={{ width: pct(d, m.lessons.length) + '%' }} /></span>
                  </button>
                  <ul className="nav-lessons">
                    {m.lessons.map((l) => {
                      const act = route.type === 'lesson' && route.id === l.id;
                      return (
                        <li key={l.id}>
                          <Link href={lessonHref(l.id)} prefetch={false} className={(done[l.id] ? 'done' : '') + (act ? ' active' : '')} aria-current={act ? 'page' : undefined}>
                            <span className="dot" /><span>{l.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                    <li>
                      <Link href={quizHref(m.id)} prefetch={false} className={'quiz-link' + (qs && qs.best === qs.total ? ' done' : '') + (quizActive ? ' active' : '')} aria-current={quizActive ? 'page' : undefined}>
                        <span className="dot" /><span>Module quiz{qs ? ` · best ${qs.best}/${qs.total}` : ''}</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
