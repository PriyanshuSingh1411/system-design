# System Design Seekho (Next.js)

System design beginner se pro tak, simple Hinglish me: 86 lessons, 13 HLD case studies, LLD with Java code, 23 live animated demos, 285 interview Q&As aur 113 quiz MCQs.

Built with **Next.js 16 (App Router)** and **JavaScript**. Every page is pre-rendered as static HTML at build time, so the site is fast and SEO-friendly.

## Requirements

- Node.js **20.9 or newer** (`node -v` se check karein)
- npm (Node ke saath aata hai)

## Local par chalana

```bash
npm install
npm run dev
```

Browser me kholiye: http://localhost:3000

Production build test karna ho to:

```bash
npm run build
npm start
```

## Vercel par deploy karna

1. Is folder ko GitHub repository me push karein.
2. https://vercel.com par login karein, **Add New → Project** dabayein aur repository import karein.
3. Framework apne aap **Next.js** detect hoga. Koi setting badalne ki zaroorat nahi. **Deploy** dabayein.
4. Apna domain lagana ho to Vercel ke **Settings → Domains** me add karein, aur **Settings → Environment Variables** me ye daalein (sitemap aur social previews ke liye):

```
NEXT_PUBLIC_SITE_URL = https://aapka-domain.com
```

Domain na lagayein to Vercel ka `*.vercel.app` URL apne aap use hota hai.

## Project structure

```
app/
  layout.js                 Fonts, theme, page frame (sidebar + top bar)
  page.js                   Home: hero, roadmap
  lessons/[lessonId]/       Har lesson ka page (/lessons/dns)
  modules/[moduleId]/       Module overview (/modules/databases)
  quiz/[moduleId]/          Module quiz (/quiz/databases)
  search-index.json/        Search ke liye index (build time par banta hai)
  sitemap.js, robots.js     SEO
  globals.css               Poora design (light + dark theme)
components/                 React components (sidebar, search, quiz, lesson body...)
content/                    Saare lessons Markdown files me (yahi edit karna hai)
lib/
  content.js                content/*.md ko lessons, quizzes aur search index me badalta hai
  anims/                    23 live demos (plain JavaScript, lazily loaded)
  levels.js, routes.js, site.js
```

## Lessons kaise add ya edit karein

Saara content `content/` folder ki `.md` files me hai. Files naam ke order me padhi jaati hain (`01-...`, `02-...`). Ek module agli file me continue ho sakta hai (jaise `10a-cases.md` aur `10b-cases.md`).

### Module

```
@module databases
@title Databases
@level Intermediate
@desc Ek line ka description jo roadmap card par dikhta hai.
```

`@level` in me se ek hona chahiye: `Beginner`, `Intermediate`, `Advanced`, `Pro`.

### Lesson

```
@lesson indexing
@title Indexing

Normal markdown: ## heading, ### sub-heading, **bold**, *italic*, `code`,
- bullet lists, 1. numbered lists, | tables |, ```code blocks```, [links](https://...)

:::interview
Q: Interview ka sawaal?
A: Model answer. Kai lines aur bullet lists bhi chal jaati hain.
Q: Agla sawaal?
A: Agla answer.
:::
```

Lesson id (`indexing`) URL ban jaata hai: `/lessons/indexing`. Sirf `a-z`, `0-9` aur `-` use karein, aur har id unique honi chahiye.

### Special blocks

| Likhein | Kya banta hai |
|---|---|
| `> [!tip] Title` (aur agli lines `> ...`) | Coloured box. Types: `tip`, `analogy`, `warn`, `key`, `note`, `pro`, `interview`, `example` |
| `[[anim:load-balancer]]` | Live demo (naam `lib/anims/names.js` me hone chahiye) |
| `[[flow:client:User -> edge:CDN -> svc:Server]]` | Chhota left-to-right flow diagram |
| `[[arch Title]]` ... `[[/arch]]` | Layered architecture diagram, har line ek layer, comma se boxes, ` ~ ` ke baad note |

Box types: `client`, `edge`, `svc`, `cache`, `db`, `queue`, `store`, `ext`. Example:

```
[[arch URL shortener]]
client:Browser, client:App
edge:Load Balancer
svc:Redirect Service ~ reads aur writes alag scale
cache:Redis, db:Cassandra
[[/arch]]
```

### Module quiz

Module ki aakhri lesson ke baad:

```
@quiz
Q: Sawaal?
- Galat option
+ Sahi option (sirf ek + hona chahiye)
- Galat option
E: Explanation jo answer ke baad dikhegi.
```

Har sawaal ke beech ek khaali line. Options ka order build time par shuffle hota hai, taaki sahi answer hamesha ek hi jagah na ho.

### Galti hone par

Content me koi galti ho (unknown demo name, quiz me do sahi answers, table ki ek row me kam columns, duplicate lesson id), to `npm run build` / `npm run dev` ek saaf error message dega ki kaun si file aur kaun sa lesson theek karna hai.

## Progress kahan save hota hai

Har student ka progress (complete lessons, quiz best score, theme) **usi ke browser** me save hota hai (localStorage, key `sds.v1`). Koi login ya database nahi chahiye. Browser data clear karne par progress reset ho jaata hai.

## Naya live demo add karna

1. `lib/anims/` ki kisi file me `reg('mera-demo', function(root, ctx){ ... })` likhein. Baaki demos ko example ki tarah dekhein (`frame`, `button`, `seg`, `mk`, `fly` helpers `core.js` me hain).
2. Naam `lib/anims/names.js` me add karein.
3. Lesson me `[[anim:mera-demo]]` likhein.
