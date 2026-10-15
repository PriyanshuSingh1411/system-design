import { getCourse } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

export default function sitemap() {
  const mods = getCourse().modules;
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    ...mods.map((m) => ({ url: `${SITE_URL}/modules/${m.id}`, changeFrequency: 'monthly', priority: 0.8 })),
    ...mods.flatMap((m) => m.lessons.map((l) => ({ url: `${SITE_URL}/lessons/${l.id}`, changeFrequency: 'monthly', priority: 0.7 }))),
    ...mods.map((m) => ({ url: `${SITE_URL}/quiz/${m.id}`, changeFrequency: 'monthly', priority: 0.5 })),
  ];
}
