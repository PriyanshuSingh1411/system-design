'use client';
import Link from 'next/link';
import { useStore, pct } from './Store';

function effectiveTheme() {
  const a = document.documentElement.getAttribute('data-theme');
  if (a === 'dark' || a === 'light') return a;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function Topbar({ menuOpen, onMenu, onSearch }) {
  const { outline, done, setTheme, showToast } = useStore();
  const total = outline.reduce((a, m) => a + m.lessons.length, 0);
  const finished = outline.reduce((a, m) => a + m.lessons.filter((l) => done[l.id]).length, 0);
  const p = pct(finished, total);

  function toggleTheme() {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    showToast(next === 'dark' ? 'Dark mode on' : 'Light mode on');
  }

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" type="button" aria-label="Menu kholo" aria-controls="sidebar" aria-expanded={menuOpen} onClick={onMenu}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
      </button>
      <Link className="brand" href="/" aria-label="System Design Seekho home">
        <svg className="brand-mark" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
          <rect x="2" y="12" width="8" height="8" rx="1.5" className="bm-a" />
          <rect x="22" y="3" width="8" height="8" rx="1.5" className="bm-b" />
          <rect x="22" y="21" width="8" height="8" rx="1.5" className="bm-b" />
          <path d="M10 16h6m0 0V7h6m-6 9v9h6" className="bm-l" />
        </svg>
        <span className="brand-t">System Design <b>Seekho</b></span>
      </Link>
      <button className="search-trigger" type="button" aria-haspopup="dialog" onClick={onSearch}>
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <span className="st-label">Topic search karein</span><kbd>/</kbd>
      </button>
      <div className="top-progress" title={`Progress: ${finished} / ${total} lessons complete`}>
        <svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true">
          <circle cx="18" cy="18" r="15" className="tp-bg" />
          <circle cx="18" cy="18" r="15" className="tp-fg" style={{ strokeDashoffset: 94.25 * (1 - p / 100) }} />
        </svg>
        <span>{p}%</span>
      </div>
      <button className="icon-btn" type="button" aria-label="Theme badlo" onClick={toggleTheme}>
        <svg className="ic-sun" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <svg className="ic-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
      </button>
    </header>
  );
}
