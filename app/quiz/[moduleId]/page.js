import Link from 'next/link';
import { notFound } from 'next/navigation';
import Quiz from '@/components/Quiz';
import { getCourse, getModule } from '@/lib/content';
import { moduleHref } from '@/lib/routes';

export const dynamicParams = false;

export function generateStaticParams() {
  return getCourse().modules.map((m) => ({ moduleId: m.id }));
}

export async function generateMetadata({ params }) {
  const { moduleId } = await params;
  const m = getModule(moduleId);
  if (!m) return {};
  return { title: `${m.title}: Quiz`, description: `${m.quiz.length} MCQs with explanations: ${m.desc}`, alternates: { canonical: `/quiz/${moduleId}` } };
}

export default async function QuizPage({ params }) {
  const { moduleId } = await params;
  const m = getModule(moduleId);
  if (!m) notFound();
  const mods = getCourse().modules;
  const next = mods[m.n] ? { id: mods[m.n].id, title: mods[m.n].title } : null;
  return (
    <div className="view">
      <div className="crumbs">
        <Link href="/">Home</Link><span className="sep">/</span>
        <Link href={moduleHref(m.id)}>Module {m.n} · {m.title}</Link><span className="sep">/</span><span>Quiz</span>
      </div>
      <h1 className="page-h1">{m.title}: Quiz</h1>
      <p className="page-sub">Har sawaal ka ek sahi answer hai. Option chunte hi explanation dikhega.</p>
      <Quiz module={{ id: m.id, n: m.n, title: m.title }} questions={m.quiz} nextModule={next} />
    </div>
  );
}
