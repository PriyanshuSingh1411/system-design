'use client';
// Lesson article. HTML comes from content/*.md (built at deploy time); live demos inside it are
// mounted after render, and the demo code is downloaded only when the lesson has a demo.
import { useEffect, useRef } from 'react';
import { useStore } from './Store';

export default function LessonBody({ html }) {
  const ref = useRef(null);
  const { showToast } = useStore();

  useEffect(() => {
    const root = ref.current;
    if (!root || !root.querySelector('.anim')) return undefined;
    let cleanup = null, dead = false;
    import('@/lib/anims').then((m) => { if (!dead) cleanup = m.mountAnims(root); });
    return () => { dead = true; if (cleanup) cleanup(); };
  }, [html]);

  function onClick(e) {
    const btn = e.target.closest('.code .copy');
    if (!btn) return;
    const code = btn.closest('.code').querySelector('code');
    const fallback = () => {
      try {
        const r = document.createRange(); r.selectNodeContents(code);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        showToast('Text select ho gaya, ab Ctrl+C dabayein');
      } catch { /* ignore */ }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code.textContent).then(() => {
          btn.textContent = 'Copied';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        }, fallback);
      } else fallback();
    } catch { fallback(); }
  }

  return <article className="prose" ref={ref} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}
