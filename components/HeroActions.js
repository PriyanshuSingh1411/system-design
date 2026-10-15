'use client';
// Home page buttons that depend on saved progress ("continue where you left off").
import Link from 'next/link';
import { useStore } from './Store';
import { lessonHref } from '@/lib/routes';

export function HeroActions({ firstLessonId }) {
  const { last, lessonIndex } = useStore();
  const lastLesson = last && lessonIndex[last];
  if (lastLesson) {
    return (
      <div className="hero-cta">
        <Link className="btn" href={lessonHref(lastLesson.id)}>Wahan se continue karein</Link>
        <Link className="btn btn-ghost" href={lessonHref(firstLessonId)}>Shuru se</Link>
      </div>
    );
  }
  return (
    <div className="hero-cta">
      <Link className="btn" href={lessonHref(firstLessonId)}>Pehla lesson shuru karein</Link>
      <a className="btn btn-ghost" href="#roadmap">Roadmap dekhein</a>
    </div>
  );
}

export function ContinueRow() {
  const { last, lessonIndex, done, outline } = useStore();
  const lastLesson = last && lessonIndex[last];
  if (!lastLesson) return null;
  const total = outline.reduce((a, m) => a + m.lessons.length, 0);
  const finished = outline.reduce((a, m) => a + m.lessons.filter((l) => done[l.id]).length, 0);
  return (
    <div className="done-row">
      <p>Aapne <b>{finished} / {total}</b> lessons complete kiye hain. Last padha: <b>{lastLesson.title}</b></p>
      <Link className="btn btn-sm" href={lessonHref(lastLesson.id)}>Continue</Link>
    </div>
  );
}
