import Link from 'next/link';
import { notFound } from 'next/navigation';
import LessonBody from '@/components/LessonBody';
import LessonActions from '@/components/LessonActions';
import LevelChip from '@/components/LevelChip';
import { getAllLessons, getLesson } from '@/lib/content';
import { moduleHref } from '@/lib/routes';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllLessons().map((l) => ({ lessonId: l.id }));
}

export async function generateMetadata({ params }) {
  const { lessonId } = await params;
  const data = getLesson(lessonId);
  if (!data) return {};
  return {
    title: data.lesson.title,
    description: data.summary,
    alternates: { canonical: `/lessons/${lessonId}` },
    openGraph: { title: data.lesson.title, description: data.summary, type: 'article' },
  };
}

export default async function LessonPage({ params }) {
  const { lessonId } = await params;
  const data = getLesson(lessonId);
  if (!data) notFound();
  const { lesson, module: mod, prev, next } = data;

  return (
    <div className="view">
      <div className="crumbs">
        <Link href="/">Home</Link><span className="sep">/</span>
        <Link href={moduleHref(mod.id)}>Module {mod.n} · {mod.title}</Link>
      </div>
      <h1 className="page-h1">{lesson.title}</h1>
      <div className="meta-row">
        <LevelChip level={mod.level} />
        <span className="chip">{lesson.mins} min read</span>
        <span className="chip">Lesson {lesson.n} / {mod.count}</span>
        {lesson.anims.length > 0 && <span className="chip">Live demo inside</span>}
      </div>

      <LessonBody html={lesson.html} />

      {lesson.iq.length > 0 && (
        <section className="iq" aria-labelledby="iqh">
          <h2 className="iq-h" id="iqh">Interview me poochhe jaate hain</h2>
          <p className="iq-sub">Pehle khud bolkar answer dein, phir model answer kholkar check karein.</p>
          {lesson.iq.map((q, i) => (
            <details key={i}>
              <summary>
                <span className="qn">Q{i + 1}</span>
                <span dangerouslySetInnerHTML={{ __html: q.q }} />
                <span className="tw" aria-hidden="true" />
              </summary>
              <div className="ans">
                <div className="ans-l">Model answer</div>
                <div className="ans-c" dangerouslySetInnerHTML={{ __html: q.a }} />
              </div>
            </details>
          ))}
        </section>
      )}

      <LessonActions lessonId={lesson.id} module={mod} isLast={lesson.n === mod.count} prev={prev} next={next} />
    </div>
  );
}
