// Search index for the search dialog, generated once at build time.
import { getSearchIndex } from '@/lib/content';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(getSearchIndex());
}
