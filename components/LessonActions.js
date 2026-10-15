'use client';
// Lesson footer: mark complete, module-quiz prompt, previous / next lesson.
import { useEffect } from 'react';
import Link from 'next/link';
import { useStore } from './Store';
import { lessonHref, quizHref } from '@/lib/routes';

export default function LessonActions({ lessonId, module, isLast, prev, next }) {
  const { done, toggleDone, setLast, showToast } = useStore();
  const isDone = Boolean(done[lessonId]);

  useEffect(() => { setLast(lessonId); }, [lessonId, setLast]);

  function onToggle() {
    toggleDone(lessonId);
    showToast(isDone ? 'Complete hata diya' : 'Lesson complete! Progress saved.');
  }

  return (
    <div className="lesson-foot">
      <div className="done-row">
        <p>{isDone ? 'Ye lesson complete hai. Shabaash!' : 'Lesson samajh aa gaya? Complete mark karein, progress save ho jayega.'}</p>
        <button className={'btn ' + (isDone ? 'btn-ghost' : 'btn-ok')} type="button" id="done-btn" onClick={onToggle}>
          {isDone ? 'Complete hata dein' : 'Complete mark karein'}
        </button>
      </div>
      {isLast && (
        <div className="quiz-card">
          <div><h3>Module {module.n} khatam!</h3><p>Ab quiz se apna samajh check karein.</p></div>
          <Link className="btn" href={quizHref(module.id)}>Module quiz dein</Link>
        </div>
      )}
      <nav className="pn" aria-label="Lesson navigation">
        {prev && <Link href={lessonHref(prev.id)}><span>Pichhla</span><b>{prev.title}</b></Link>}
        {next && <Link className="next" href={lessonHref(next.id)}><span>Agla</span><b>{next.title}</b></Link>}
      </nav>
    </div>
  );
}
