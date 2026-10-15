// Client-only entry. Loaded lazily (import('@/lib/anims')) so lesson pages without demos never download it.
import './basics';
import './scaling';
import './data';
import './messaging';
import './reliability';
export { mountAnims, mountAnim } from './core';
