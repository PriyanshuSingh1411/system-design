// Public URL of the site, used for sitemap.xml and social previews.
// On Vercel this is picked up automatically; set NEXT_PUBLIC_SITE_URL to use your own domain.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
).replace(/\/+$/, '');

export const SITE_NAME = 'System Design Seekho';
export const SITE_DESCRIPTION = 'System design beginner se pro tak, simple Hinglish me: HLD, LLD, 13 case studies, live animations, interview questions aur quizzes.';
