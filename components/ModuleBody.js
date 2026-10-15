'use client';
// Module page: progress, ordered lesson list with done badges, and the quiz card.
import Link from 'next/link';
import { useStore, pct, moduleDone } from './Store';
import { lessonHref, quizHref } from '@/lib/routes';

export default function ModuleBody({ moduleId }) {
  const { outline, done, quiz } = useStore();
  const m = outline.find((x) => x.id === moduleId);
  if (!m) return null;
  const d = moduleDone(m, done);
  const qs = quiz[m.id];
  return (
    <>
      <div className="mod-progress"><span className="meter"><i style={{ width: pct(d, m.lessons.length) + '%' }} /></span><span>{d}/{m.lessons.length}</span></div>
      <ol className="lesson-list">
        {m.lessons.map((l) => {
          const isDone = Boolean(done[l.id]);
          return (
            <li key={l.id}>
              <Link href={lessonHref(l.id)} className={isDone ? 'done' : ''}>
                <span className="ll-n">{isDone ? '✓' : String(l.n).padStart(2, '0')}</span>
                <span className="ll-t">{l.title}<small>{l.mins} min · {l.iqCount} interview Q{l.hasDemo ? ' · live demo' : ''}</small></span>
                <span className="ll-s">{isDone ? <span className="badge ok">Done</span> : <span className="badge">Padhna hai</span>}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="quiz-card">
        <div>
          <h3>Module {m.n} quiz</h3>
          <p>{m.quizCount} MCQs, har answer ke saath explanation.{qs && <> Aapka best score: <b>{qs.best}/{qs.total}</b></>}</p>
        </div>
        <Link className="btn" href={quizHref(m.id)}>{qs ? 'Quiz dobara dein' : 'Quiz shuru karein'}</Link>
      </div>
    </>
  );
}
