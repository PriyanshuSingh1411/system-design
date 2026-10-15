'use client';
// Home page roadmap: levels as columns, module cards with progress bars.
import Link from 'next/link';
import { useStore, pct, moduleDone } from './Store';
import { LEVELS } from '@/lib/levels';
import { moduleHref } from '@/lib/routes';

export default function Roadmap() {
  const { outline, done } = useStore();
  return (
    <div className="roadmap">
      {LEVELS.map((L) => {
        const mods = outline.filter((m) => m.level === L.id);
        const count = mods.reduce((a, m) => a + m.lessons.length, 0);
        return (
          <div className={`rm-col lvl-${L.id}`} key={L.id}>
            <div className="rm-h"><b>{L.id}</b><span>{count} lessons</span></div>
            {mods.map((m) => {
              const d = moduleDone(m, done);
              return (
                <Link className="mod-card" href={moduleHref(m.id)} key={m.id}>
                  <span className="mc-n">MODULE {m.n}</span>
                  <span className="mc-t">{m.title}</span>
                  <span className="mc-d">{m.desc}</span>
                  <span className="mc-p"><span className="meter"><i style={{ width: pct(d, m.lessons.length) + '%' }} /></span>{d}/{m.lessons.length}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
