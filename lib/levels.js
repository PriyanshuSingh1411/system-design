// Course levels in roadmap order. Shared by server pages and client components.
export const LEVELS = [
  { id: 'Beginner', hint: 'Internet, APIs aur scaling ki basics' },
  { id: 'Intermediate', hint: 'Databases, caching aur messaging' },
  { id: 'Advanced', hint: 'Architecture, reliability, data, security' },
  { id: 'Pro', hint: 'Case studies, LLD aur interview prep' },
];
export const LEVEL_IDS = LEVELS.map((l) => l.id);
