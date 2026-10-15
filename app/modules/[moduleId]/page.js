import Link from 'next/link';
import { notFound } from 'next/navigation';
import ModuleBody from '@/components/ModuleBody';
import LevelChip from '@/components/LevelChip';
import { getCourse, getModule } from '@/lib/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return getCourse().modules.map((m) => ({ moduleId: m.id }));
}

export async function generateMetadata({ params }) {
  const { moduleId } = await params;
  const m = getModule(moduleId);
  if (!m) return {};
  return { title: `Module ${m.n}: ${m.title}`, description: m.desc, alternates: { canonical: `/modules/${moduleId}` } };
}

export default async function ModulePage({ params }) {
  const { moduleId } = await params;
  const m = getModule(moduleId);
  if (!m) notFound();
  return (
    <div className="view">
      <div className="crumbs"><Link href="/">Home</Link><span className="sep">/</span><span>Module {m.n}</span></div>
      <h1 className="page-h1">{m.title}</h1>
      <p className="page-sub">{m.desc}</p>
      <div className="meta-row">
        <LevelChip level={m.level} />
        <span className="chip">{m.lessons.length} lessons</span>
        <span className="chip">{m.quiz.length} quiz questions</span>
      </div>
      <ModuleBody moduleId={m.id} />
    </div>
  );
}
