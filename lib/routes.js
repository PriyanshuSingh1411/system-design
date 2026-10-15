// URL helpers so every link in the site is built the same way.
export const lessonHref = (id) => `/lessons/${id}`;
export const moduleHref = (id) => `/modules/${id}`;
export const quizHref = (id) => `/quiz/${id}`;

// "/lessons/dns" -> { type: 'lesson', id: 'dns' }
export function parsePath(pathname) {
  const m = (pathname || '/').match(/^\/(lessons|modules|quiz)\/([^/]+)\/?$/);
  if (!m) return { type: pathname === '/' ? 'home' : 'other', id: null };
  return { type: { lessons: 'lesson', modules: 'module', quiz: 'quiz' }[m[1]], id: decodeURIComponent(m[2]) };
}
