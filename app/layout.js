import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/ibm-plex-sans';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import AppShell from '@/components/AppShell';
import { getOutline } from '@/lib/content';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: 'website', siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION, locale: 'en_IN' },
  twitter: { card: 'summary', title: SITE_NAME, description: SITE_DESCRIPTION },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F1F4F8' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1322' },
  ],
};

// Apply the saved light/dark choice before first paint (no flash of the wrong theme).
const THEME_SCRIPT = `try{var s=JSON.parse(localStorage.getItem('sds.v1')||'{}');if(s.theme==='dark'||s.theme==='light')document.documentElement.setAttribute('data-theme',s.theme)}catch(e){}`;

export default function RootLayout({ children }) {
  const outline = getOutline();
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AppShell outline={outline}>{children}</AppShell>
      </body>
    </html>
  );
}
