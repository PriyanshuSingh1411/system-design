'use client';
// Page frame: top bar, contents sidebar, main column, search dialog and toast.
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { StoreProvider, useStore } from './Store';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import SearchDialog from './SearchDialog';

function Frame({ children }) {
  const pathname = usePathname();
  const { toast } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // close the mobile menu whenever the page changes
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // "/" opens search, Esc closes menu
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target.tagName || '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea' && !e.target.isContentEditable) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Content par jaayein</a>
      <div className="app">
        <Topbar menuOpen={menuOpen} onMenu={() => setMenuOpen((v) => !v)} onSearch={() => setSearchOpen(true)} />
        {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
        <Sidebar open={menuOpen} />
        <main className="main" id="main" tabIndex={-1}>{children}</main>
      </div>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </>
  );
}

export default function AppShell({ outline, children }) {
  return (
    <StoreProvider outline={outline}>
      <Frame>{children}</Frame>
    </StoreProvider>
  );
}
