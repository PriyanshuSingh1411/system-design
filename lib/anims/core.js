// Shared helpers for every live demo: frame (header/stage/footer), controls, packet animation, timers.
// Demos are plain DOM code; React components mount them with mountAnims() inside useEffect.
/* ================= helpers shared by every live demo ================= */
var A = {};
function reg(name, fn){ A[name] = fn; }
var RM = false;
try { RM = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) {}
var uid = 0;
export function nextId(){ return ++uid; }

function el(tag, cls, html){ var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function rand(a, b){ return a + Math.random() * (b - a); }
function ri(a, b){ return Math.floor(rand(a, b + 1)); }
function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
function hash(s){ var h = 5381; for (var i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0; return h; }
function hash2(s){ var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function fmtNum(n){
  var a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(a >= 1e13 ? 0 : 1) + 'T';
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K';
  if (a >= 10 || a === 0) return String(Math.round(n));
  return n.toFixed(1);
}
function fmtBytes(b){
  var u = ['B','KB','MB','GB','TB','PB','EB'], i = 0;
  while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; }
  return (b >= 100 ? Math.round(b) : b >= 10 ? b.toFixed(1) : b.toFixed(2)) + ' ' + u[i];
}
function cssVar(node, name, fb){ try { var v = getComputedStyle(node).getPropertyValue(name).trim(); return v || fb; } catch(e) { return fb; } }

function makeCtx(node){
  var tos = new Set(), ivs = new Set();
  var ctx = {alive:true, visible:true, obs:null};
  ctx.after = function(ms, fn){ var id = setTimeout(function(){ tos.delete(id); if (ctx.alive) fn(); }, ms); tos.add(id); return id; };
  ctx.every = function(ms, fn){ var id = setInterval(function(){ if (ctx.alive && ctx.visible && !document.hidden) fn(); }, ms); ivs.add(id); return id; };
  ctx.clear = function(id){ clearTimeout(id); clearInterval(id); tos.delete(id); ivs.delete(id); };
  ctx.wait = function(ms){ return new Promise(function(res){ ctx.after(RM ? Math.min(ms, 60) : ms, res); }); };
  ctx.stop = function(){
    ctx.alive = false;
    tos.forEach(function(id){ clearTimeout(id); }); ivs.forEach(function(id){ clearInterval(id); });
    tos.clear(); ivs.clear();
    if (ctx.obs) ctx.obs.disconnect();
    Array.prototype.forEach.call(node.querySelectorAll('.pkt'), function(p){ p.remove(); });
  };
  if ('IntersectionObserver' in window) {
    ctx.obs = new IntersectionObserver(function(es){ ctx.visible = es[es.length - 1].isIntersecting; }, {rootMargin:'120px'});
    ctx.obs.observe(node);
  }
  return ctx;
}

/* frame: header (tag + title + controls), stage, footer (explanation + stats + optional log) */
function frame(root, o){
  root.innerHTML = '';
  var name = root.getAttribute('data-anim') || 'x';
  var head = el('div', 'ax-head');
  head.appendChild(el('div', '', '<div class="ax-tag">' + (o.tag || 'Live demo') + '</div><div class="ax-title">' + o.title + '</div>'));
  var controls = el('div', 'ax-controls');
  head.appendChild(controls);
  var stage = el('div', 'ax-stage');
  if (o.minH) stage.style.minHeight = o.minH + 'px';
  var foot = el('div', 'ax-foot');
  var explain = el('div', 'ax-explain', o.explain || '');
  var stats = el('div', 'ax-stats');
  foot.appendChild(explain); foot.appendChild(stats);
  root.appendChild(head); root.appendChild(stage); root.appendChild(foot);
  var logBox = null;
  return {
    name:name, root:root, controls:controls, stage:stage, foot:foot, explain:explain, stats:stats,
    say: function(h){ explain.innerHTML = h; },
    setStats: function(obj){ stats.innerHTML = Object.keys(obj).map(function(k){ return '<span>' + esc(k) + ': <b>' + esc(obj[k]) + '</b></span>'; }).join(''); },
    log: function(msg, cls){
      if (!logBox) { logBox = el('div', 'ax-log'); logBox.setAttribute('aria-live', 'polite'); foot.appendChild(logBox); }
      var d = el('div', cls || ''); d.textContent = msg;
      logBox.insertBefore(d, logBox.firstChild);
      while (logBox.childNodes.length > 40) logBox.removeChild(logBox.lastChild);
    },
    clearLog: function(){ if (logBox) logBox.innerHTML = ''; }
  };
}
function button(f, label, fn, primary){
  var b = el('button', 'btn btn-sm ' + (primary ? '' : 'btn-ghost'), label);
  b.type = 'button'; b.addEventListener('click', fn); f.controls.appendChild(b); return b;
}
function seg(f, opts, cur, fn, label){
  var s = el('div', 'seg'); s.setAttribute('role', 'group'); if (label) s.setAttribute('aria-label', label);
  opts.forEach(function(o){
    var b = el('button', '', o[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(o[0] === cur));
    b.addEventListener('click', function(){
      Array.prototype.forEach.call(s.querySelectorAll('button'), function(x){ x.setAttribute('aria-pressed', String(x === b)); });
      fn(o[0]);
    });
    s.appendChild(b);
  });
  f.controls.appendChild(s); return s;
}
function range(f, label, min, max, val, fn, show){
  var w = el('label', 'ax-range');
  var id = 'ax-' + f.name + '-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + (++uid);
  w.setAttribute('for', id);
  var t = el('span', '', esc(label));
  var inp = el('input'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = 1; inp.value = val; inp.id = id;
  var v = el('b', '', esc(show ? show(val) : val));
  inp.addEventListener('input', function(){ var x = +inp.value; v.textContent = show ? show(x) : x; fn(x); });
  w.appendChild(t); w.appendChild(inp); w.appendChild(v); f.controls.appendChild(w);
  return inp;
}
function mk(type, title, sub, cls){
  var n = el('div', 'node n-' + type + (cls ? ' ' + cls : ''), '<span class="nt">' + title + '</span>' + (sub != null ? '<small>' + sub + '</small>' : ''));
  return n;
}
function sub(n, html){ var s = n.querySelector('small'); if (s) s.innerHTML = html; }
function flash(n, cls, ms){ n.classList.add(cls); setTimeout(function(){ n.classList.remove(cls); }, RM ? 120 : (ms || 500)); }
function center(stage, e){
  var s = stage.getBoundingClientRect(), r = e.getBoundingClientRect();
  return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2];
}
/* fly: move a packet from one element to another inside stage; resolves when done */
function fly(ctx, stage, from, to, o){
  o = o || {};
  if (!ctx.alive || !from || !to || !stage.isConnected) return Promise.resolve();
  var p = el('div', 'pkt' + (o.label ? ' lbl' : '') + (o.cls ? ' ' + o.cls : ''));
  if (o.label) p.textContent = o.label;
  stage.appendChild(p);
  var a = center(stage, from), b = center(stage, to);
  if (o.part != null) b = [a[0] + (b[0] - a[0]) * o.part, a[1] + (b[1] - a[1]) * o.part];
  var dur = RM ? 1 : (o.dur || 650);
  if (!p.animate) { p.remove(); return Promise.resolve(); }
  var an = p.animate([
    {transform:'translate(' + a[0] + 'px,' + a[1] + 'px) translate(-50%,-50%)', opacity:1},
    {transform:'translate(' + b[0] + 'px,' + b[1] + 'px) translate(-50%,-50%)', opacity:o.fade ? 0 : 1}
  ], {duration:dur, easing:'ease-in-out', fill:'forwards'});
  return new Promise(function(res){
    var done = function(){ if (p.parentNode) p.remove(); res(); };
    an.finished.then(done, done);
  });
}
function grid(cols){ var g = el('div', 'ax-grid'); g.style.gridTemplateColumns = cols; return g; }
function col(){ var c = el('div', 'col'); for (var i = 0; i < arguments.length; i++) c.appendChild(arguments[i]); return c; }

/* ================= mount / unmount ================= */
// Mount one demo element (<div class="anim" data-anim="name">). Returns its context, or null.
export function mountAnim(node) {
  var fn = A[node.getAttribute('data-anim')];
  if (!fn) return null;
  var ctx = makeCtx(node);
  try { fn(node, ctx); }
  catch (e) { console.error('Demo error: ' + node.getAttribute('data-anim'), e); node.innerHTML = '<div class="ax-stage">Ye demo load nahi ho paaya. Page refresh karke dekhiye.</div>'; }
  return ctx;
}

// Mount every demo inside container (or container itself). Returns a cleanup function.
export function mountAnims(container) {
  var nodes = container.matches && container.matches('.anim[data-anim]') ? [container] : Array.prototype.slice.call(container.querySelectorAll('.anim[data-anim]'));
  var list = [];
  nodes.forEach(function(n){ var c = mountAnim(n); if (c) list.push(c); });
  return function(){ list.forEach(function(c){ c.stop(); }); };
}

export { A, reg, RM, el, esc, rand, ri, pick, hash, hash2, fmtNum, fmtBytes, cssVar, makeCtx, frame, button, seg, range, mk, sub, flash, center, fly, grid, col };
