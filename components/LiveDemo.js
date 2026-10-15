'use client';
// A single live demo by name (used on the home page hero).
import { useEffect, useRef } from 'react';

export default function LiveDemo({ name }) {
  const ref = useRef(null);
  useEffect(() => {
    let cleanup = null, dead = false;
    import('@/lib/anims').then((m) => { if (!dead && ref.current) cleanup = m.mountAnims(ref.current); });
    return () => { dead = true; if (cleanup) cleanup(); };
  }, [name]);
  return <div className="anim" data-anim={name} ref={ref} />;
}
