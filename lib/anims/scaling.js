// Demos: scaling, load balancer, CDN, cache-aside, eviction (LRU/LFU/FIFO), index
import { reg, RM, el, esc, rand, ri, pick, hash, hash2, fmtNum, fmtBytes, cssVar, frame, button, seg, range, mk, sub, flash, center, fly, grid, col, nextId } from './core';

/* ================= vertical vs horizontal scaling ================= */
reg('scaling', function(root, ctx){
  var f = frame(root, {title:'Vertical vs Horizontal scaling', minH:240, explain:''});
  var LV = [1e3, 1e4, 5e4, 1e5, 5e5, 1e6];
  var VS = [['2 vCPU · 4 GB', 3], ['4 vCPU · 16 GB', 9], ['16 vCPU · 64 GB', 35], ['32 vCPU · 128 GB', 75], ['96 vCPU · 384 GB', 260], [null, null]];
  var mode = 'v', lvl = 0;
  var users = mk('client', 'Users', '1K');
  var right = el('div', 'scale-r');
  var g = grid('minmax(0,.7fr) minmax(0,2fr)'); g.appendChild(col(users)); g.appendChild(right);
  f.stage.appendChild(g);
  function draw(){
    var u = LV[lvl]; sub(users, fmtNum(u) + ' users');
    right.innerHTML = '';
    if (mode === 'v') {
      var spec = VS[lvl];
      if (!spec[0]) {
        right.appendChild(el('div', 'vbox over', '<b>✕ Limit hit</b><span>Itna bada single server milta hi nahi</span>'));
        f.say('<b>Vertical scaling ki limit:</b> ek machine ko kitna bhi bada karo, ek hadd ke baad bada server milta hi nahi. Aur woh <b>ek server down = poori site down</b> (Single Point of Failure).');
        f.setStats({'Servers':1, 'Per server':'max', 'Cost/month':'∞', 'SPOF':'Haan'});
        return;
      }
      var size = 64 + lvl * 26;
      var b = el('div', 'vbox', '<b>1 server</b><span>' + spec[0] + '</span>');
      b.style.width = b.style.height = Math.min(size, 190) + 'px';
      right.appendChild(b);
      f.say('<b>Vertical scaling (scale up):</b> usi ek server me zyada CPU, RAM daalo. Simple hai, code change nahi chahiye. Par mehenga hota jaata hai, limit hai, aur <b>SPOF</b> rehta hai.');
      f.setStats({'Servers':1, 'Per server':spec[0], 'Cost/month':'~₹' + fmtNum(spec[1] * 1000), 'SPOF':'Haan'});
    } else {
      var n = Math.max(1, Math.ceil(u / 25000));
      var lb = mk('edge', 'Load Balancer');
      var wrap = el('div', 'hwrap');
      var show = Math.min(n, 24);
      for (var i = 0; i < show; i++) { var c = el('div', 'cell on new', 'S'); c.style.animationDelay = (i * 25) + 'ms'; wrap.appendChild(c); }
      if (n > show) wrap.appendChild(el('div', 'cell', '+' + (n - show)));
      right.appendChild(col(lb, wrap));
      f.say('<b>Horizontal scaling (scale out):</b> same size ke aur servers jodo, aage <b>Load Balancer</b> lagao. Ek server gira to baaki chalte rahte hain. Lagbhag unlimited scale, par app ko <b>stateless</b> banana padta hai.');
      f.setStats({'Servers':n, 'Per server':'4 vCPU · 16 GB', 'Cost/month':'~₹' + fmtNum(n * 9000 + 2000), 'SPOF':'Nahi'});
    }
  }
  seg(f, [['v','Vertical'], ['h','Horizontal']], 'v', function(v){ mode = v; draw(); }, 'Scaling type');
  range(f, 'Traffic', 0, 5, 0, function(x){ lvl = x; draw(); }, function(x){ return fmtNum(LV[x]); });
  draw();
});

/* ================= load balancer ================= */
reg('load-balancer', function(root, ctx){
  var f = frame(root, {title:'Load Balancer algorithms', minH:270, explain:''});
  var algo = 'rr';
  var names = ['A', 'B', 'C', 'D'];
  var clients = names.map(function(n, i){ var c = mk('client', 'User ' + n, null, 'u' + (i + 1)); c._i = i; return c; });
  var lb = mk('edge', 'Load Balancer', 'Round Robin');
  var servers = [0, 1, 2, 3].map(function(i){ var s = mk('svc', 'Server ' + (i + 1), '', 'clickable'); s._a = 0; s._t = 0; s.setAttribute('role', 'button'); s.tabIndex = 0; return s; });
  var g = grid('minmax(0,.8fr) minmax(0,1fr) minmax(0,1.2fr)');
  g.appendChild(col.apply(null, clients)); g.appendChild(col(lb)); g.appendChild(col.apply(null, servers));
  f.stage.appendChild(g);
  var rr = 0, total = 0, failed = 0;
  var EX = {
    rr:'<b>Round Robin:</b> requests baari-baari se: S1, S2, S3, S4, phir S1. Simple hai, par ye nahi dekhta ki kaunsa server already busy hai.',
    lc:'<b>Least Connections:</b> jis server par abhi sabse kam active requests hain, nayi request usi ko. Jab requests ka processing time alag-alag ho tab ye best hai.',
    ip:'<b>IP Hash:</b> user ke IP ka hash leke server chuna jaata hai, to <b>same user hamesha same server</b> par jaata hai (sticky session). Packets ke colors dekhiye.',
    w:'<b>Weighted Round Robin:</b> Server 1 bada machine hai (weight 3), baaki weight 1. Bade server ko 3 guna traffic milta hai.'
  };
  var LBL = {rr:'Round Robin', lc:'Least Connections', ip:'IP Hash', w:'Weighted RR'};
  function label(s){ sub(s, s.classList.contains('down') ? 'DOWN (health check fail)' : s._a + ' active · ' + s._t + ' done' + (algo === 'w' ? ' · w=' + (s === servers[0] ? 3 : 1) : '')); }
  function upd(){ servers.forEach(label); f.setStats({'Total':total, '503 errors':failed, 'Split':servers.map(function(s){ return s._t; }).join(' / ')}); }
  function choose(c){
    var hs = servers.filter(function(s){ return !s.classList.contains('down'); });
    if (!hs.length) return null;
    if (algo === 'rr') return hs[rr++ % hs.length];
    if (algo === 'lc') { var m = Math.min.apply(null, hs.map(function(s){ return s._a; })); var best = hs.filter(function(s){ return s._a === m; }); return pick(best); }
    if (algo === 'ip') return hs[hash('10.0.0.' + (c._i * 37 + 11)) % hs.length];
    var seq = []; hs.forEach(function(s){ var w = s === servers[0] ? 3 : 1; for (var k = 0; k < w; k++) seq.push(s); });
    return seq[rr++ % seq.length];
  }
  async function request(){
    var c = pick(clients), cls = 'c' + (c._i + 1);
    await fly(ctx, f.stage, c, lb, {cls:cls, dur:450});
    if (!ctx.alive) return;
    var s = choose(c);
    total++;
    if (!s) { failed++; upd(); f.log('503: koi bhi healthy server nahi bacha!', 'bad'); await fly(ctx, f.stage, lb, c, {cls:'badp', dur:450}); return; }
    await fly(ctx, f.stage, lb, s, {cls:cls, dur:450});
    if (!ctx.alive) return;
    s._a++; upd();
    var t = rand(900, 3600) * (algo === 'w' && s === servers[0] ? 0.5 : 1);
    await ctx.wait(t);
    s._a = Math.max(0, s._a - 1); s._t++; upd();
    await fly(ctx, f.stage, s, c, {cls:'res', dur:500});
  }
  function toggle(s){
    var d = s.classList.toggle('down');
    f.log((d ? 'Health check fail: ' : 'Wapas healthy: ') + s.querySelector('.nt').textContent, d ? 'warn' : 'ok');
    upd();
  }
  servers.forEach(function(s){
    s.addEventListener('click', function(){ toggle(s); });
    s.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(s); } });
  });
  function setAlgo(a){ algo = a; rr = 0; sub(lb, LBL[a]); f.say(EX[a] + ' <i>Kisi server par click karke use down karein.</i>'); servers.forEach(function(s){ s._t = 0; }); total = 0; failed = 0; upd(); }
  seg(f, [['rr','Round Robin'], ['lc','Least Conn'], ['ip','IP Hash'], ['w','Weighted']], 'rr', setAlgo, 'Algorithm');
  setAlgo('rr');
  ctx.every(600, request);
});

/* ================= CDN ================= */
reg('cdn', function(root, ctx){
  var f = frame(root, {title:'CDN: content user ke paas', minH:250, explain:''});
  var R = [['Mumbai', 230], ['London', 90], ['Sydney', 210]];
  var users = R.map(function(r){ return mk('client', 'User', r[0]); });
  var edges = R.map(function(r){ var e = mk('store', 'CDN Edge', r[0] + ' · khaali'); e._c = false; e._r = r[0]; return e; });
  var origin = mk('svc', 'Origin server', 'Virginia, USA');
  var g = grid('repeat(3, minmax(0,1fr))');
  g.appendChild(col.apply(null, users)); g.appendChild(col.apply(null, edges)); g.appendChild(col(origin));
  f.stage.appendChild(g);
  var on = false, n = 0, lat = 0, hits = 0, orig = 0;
  function upd(){ f.setStats({'Requests':n, 'Avg latency':(n ? Math.round(lat / n) : 0) + ' ms', 'CDN hits':hits, 'Origin load':orig}); }
  function setOn(v){
    on = v; edges.forEach(function(e){ e.classList.toggle('down', !on); });
    n = lat = hits = orig = 0; upd();
    f.say(on ? '<b>CDN ON:</b> pehli request edge par <b>miss</b> hoti hai (origin se laata hai aur cache karta hai). Uske baad usi city ke users ko file <b>~15 ms</b> me mil jaati hai. Origin ka load bhi kam.'
             : '<b>CDN OFF:</b> har user ki request USA ke origin tak jaati hai. Mumbai se ~230 ms ka round trip! Ab CDN ON karke farak dekhiye.');
  }
  async function request(){
    var k = ri(0, 2), u = users[k], e = edges[k], d = R[k][1];
    if (!on) {
      await fly(ctx, f.stage, u, origin, {label:'logo.png', dur:300 + d * 2.5});
      orig++; flash(origin, 'hot', 300);
      await fly(ctx, f.stage, origin, u, {cls:'res', dur:300 + d * 2.5});
      if (!ctx.alive) return;
      n++; lat += d; upd(); return;
    }
    await fly(ctx, f.stage, u, e, {label:'logo.png', dur:320});
    if (!ctx.alive) return;
    if (e._c) {
      flash(e, 'flash-ok', 400); hits++;
      await fly(ctx, f.stage, e, u, {cls:'okp', dur:320});
      if (!ctx.alive) return;
      n++; lat += 15; upd(); f.log(e._r + ': cache HIT → 15 ms', 'ok'); return;
    }
    flash(e, 'flash-bad', 400);
    await fly(ctx, f.stage, e, origin, {dur:300 + d * 2});
    orig++;
    await fly(ctx, f.stage, origin, e, {cls:'res', dur:300 + d * 2});
    if (!ctx.alive) return;
    e._c = true; sub(e, e._r + ' · cached');
    await fly(ctx, f.stage, e, u, {cls:'res', dur:320});
    if (!ctx.alive) return;
    n++; lat += d + 15; upd(); f.log(e._r + ': cache MISS → origin se laaya, ab cached (' + (d + 15) + ' ms)', 'warn');
  }
  seg(f, [['off','CDN OFF'], ['on','CDN ON']], 'off', function(v){ setOn(v === 'on'); }, 'CDN');
  button(f, 'Edge cache clear', function(){ edges.forEach(function(e){ e._c = false; sub(e, e._r + ' · khaali'); }); f.log('Saare edge caches clear (cache purge)', 'acc'); });
  setOn(false);
  ctx.every(1300, request); ctx.after(300, request);
});

/* ================= cache-aside ================= */
reg('cache', function(root, ctx){
  var f = frame(root, {title:'Cache-aside: hit vs miss', minH:220, explain:''});
  var app = mk('svc', 'App Server'), cache = mk('cache', 'Redis Cache', 'capacity: 4 keys'), db = mk('db', 'Database', '~50 ms');
  var slots = el('div', 'slots');
  var g = grid('repeat(3, minmax(0,1fr))');
  g.appendChild(col(app)); g.appendChild(col(cache, slots)); g.appendChild(col(db));
  f.stage.appendChild(g);
  var keys = [['user:1', 35], ['user:2', 22], ['user:3', 15], ['user:4', 10], ['user:5', 8], ['user:6', 6], ['user:7', 4]];
  var on = true, mem = [], st = {n:0, hit:0, lat:0, dbq:0}, auto = true;
  function draw(){ slots.innerHTML = ''; for (var i = 0; i < 4; i++) slots.appendChild(el('div', 'cell' + (mem[i] ? ' on' : ''), mem[i] ? esc(mem[i].replace('user:', 'u')) : '·')); }
  function upd(){ f.setStats({'Requests':st.n, 'Hit ratio':(st.n ? Math.round(st.hit * 100 / st.n) : 0) + '%', 'Avg latency':(st.n ? Math.round(st.lat / st.n) : 0) + ' ms', 'DB queries':st.dbq}); }
  function pickKey(){ var r = Math.random() * 100, a = 0; for (var i = 0; i < keys.length; i++) { a += keys[i][1]; if (r < a) return keys[i][0]; } return keys[0][0]; }
  async function request(){
    var k = pickKey();
    if (!on) {
      await fly(ctx, f.stage, app, db, {label:k, dur:600}); st.dbq++;
      await fly(ctx, f.stage, db, app, {cls:'res', dur:600});
      if (!ctx.alive) return;
      st.n++; st.lat += 50; upd(); return;
    }
    await fly(ctx, f.stage, app, cache, {label:k, dur:420});
    if (!ctx.alive) return;
    var idx = mem.indexOf(k);
    if (idx >= 0) {
      mem.splice(idx, 1); mem.unshift(k); draw(); flash(cache, 'flash-ok', 350);
      await fly(ctx, f.stage, cache, app, {cls:'okp', dur:420});
      if (!ctx.alive) return;
      st.n++; st.hit++; st.lat += 2; upd(); f.log('HIT  ' + k + ' → 2 ms', 'ok'); return;
    }
    flash(cache, 'flash-bad', 350);
    await fly(ctx, f.stage, cache, app, {cls:'badp', label:'miss', dur:380});
    await fly(ctx, f.stage, app, db, {label:k, dur:520}); st.dbq++;
    await fly(ctx, f.stage, db, app, {cls:'res', dur:520});
    await fly(ctx, f.stage, app, cache, {label:'SET ' + k, dur:420});
    if (!ctx.alive) return;
    if (mem.indexOf(k) < 0) { mem.unshift(k); if (mem.length > 4) { var ev = mem.pop(); f.log('Evict (LRU): ' + ev, 'warn'); } }
    draw();
    st.n++; st.lat += 54; upd(); f.log('MISS ' + k + ' → DB se laaya, cache me SET (54 ms)', 'bad');
  }
  seg(f, [['on','Cache ON'], ['off','Cache OFF']], 'on', function(v){ on = v === 'on'; st = {n:0, hit:0, lat:0, dbq:0}; upd(); f.say(on ? EXON : EXOFF); }, 'Cache');
  var ab = button(f, 'Auto: ON', function(){ auto = !auto; ab.textContent = 'Auto: ' + (auto ? 'ON' : 'OFF'); });
  button(f, 'Ek request', request, true);
  button(f, 'Cache clear', function(){ mem = []; draw(); f.log('Cache flush ho gaya: ab sab miss honge', 'acc'); });
  var EXON = '<b>Cache-aside:</b> app pehle cache me dekhta hai. Mila (<b>hit</b>) to 2 ms me jawab. Nahi mila (<b>miss</b>) to DB se laata hai aur cache me rakh deta hai. Popular keys baar-baar maangi jaati hain, isliye hit ratio jaldi badhta hai.';
  var EXOFF = '<b>Cache OFF:</b> har request database tak jaati hai: zyada latency aur DB par poora load. Hit ratio 0%.';
  f.say(EXON); draw(); upd();
  ctx.every(1150, function(){ if (auto) request(); });
});

/* ================= LRU / LFU / FIFO ================= */
reg('lru', function(root, ctx){
  var f = frame(root, {title:'Eviction policies: LRU, LFU, FIFO', minH:180, explain:''});
  var pol = 'lru', cap = 4, items = [], clock = 0, busy = false, hits = 0, miss = 0;
  var keysRow = el('div', 'keys'), lab = el('div', 'slot-lab'), slots = el('div', 'slots big');
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(function(k){
    var b = el('button', 'cell key', k); b.type = 'button'; b.setAttribute('aria-label', 'Access key ' + k);
    b.addEventListener('click', function(){ access(k); }); keysRow.appendChild(b);
  });
  f.stage.appendChild(el('div', 'mini-l', 'Key par click karke access karein:'));
  f.stage.appendChild(keysRow); f.stage.appendChild(el('div', 'mini-l', 'Cache (capacity 4):'));
  f.stage.appendChild(slots); f.stage.appendChild(lab);
  var EX = {
    lru:'<b>LRU (Least Recently Used):</b> jo key sabse lambe time se use nahi hui, wahi bahar. Left = abhi-abhi use hui, right = sabse purani. Sabse popular policy (Redis, browsers).',
    lfu:'<b>LFU (Least Frequently Used):</b> jo key sabse kam baar use hui, wahi bahar (count dekhiye). Popular items lambe time tak bache rehte hain.',
    fifo:'<b>FIFO (First In First Out):</b> jo sabse pehle aaya, wahi pehle jaata hai, chahe kitna bhi use ho raha ho. Simple par aksar kam hit ratio.'
  };
  function order(){
    var a = items.slice();
    if (pol === 'lru') a.sort(function(x, y){ return y.t - x.t; });
    else if (pol === 'lfu') a.sort(function(x, y){ return y.f - x.f || y.t - x.t; });
    else a.sort(function(x, y){ return y.ins - x.ins; });
    return a;
  }
  function victim(){ var a = order(); return a[a.length - 1]; }
  function draw(flashKey, cls){
    slots.innerHTML = '';
    var a = order();
    for (var i = 0; i < cap; i++) {
      var it = a[i];
      var c = el('div', 'cell slot' + (it && it.k === flashKey ? ' ' + cls : ''), it ? '<b>' + it.k + '</b><small>' + (pol === 'lfu' ? '×' + it.f : pol === 'fifo' ? '#' + it.ins : 't' + it.t) + '</small>' : '·');
      slots.appendChild(c);
    }
    lab.innerHTML = pol === 'lru' ? '<span>← Most recent</span><span>Least recent (next evict) →</span>' : pol === 'lfu' ? '<span>← Sabse zyada use</span><span>Sabse kam (next evict) →</span>' : '<span>← Newest</span><span>Oldest (next evict) →</span>';
    f.setStats({'Hits':hits, 'Misses':miss, 'Hit ratio':(hits + miss ? Math.round(hits * 100 / (hits + miss)) : 0) + '%'});
  }
  async function access(k){
    if (busy || !ctx.alive) return;
    busy = true; clock++;
    var it = items.filter(function(x){ return x.k === k; })[0];
    if (it) { it.t = clock; it.f++; hits++; draw(k, 'hit'); f.log('HIT ' + k, 'ok'); await ctx.wait(450); busy = false; return; }
    miss++;
    if (items.length >= cap) {
      var v = victim();
      var a = order(), idx = a.indexOf(v);
      if (slots.children[idx]) slots.children[idx].classList.add('miss');
      f.log('MISS ' + k + ' → evict ' + v.k + ' (' + pol.toUpperCase() + ')', 'bad');
      await ctx.wait(550);
      items.splice(items.indexOf(v), 1);
    } else f.log('MISS ' + k + ' → khaali jagah me add', 'warn');
    items.push({k:k, t:clock, f:1, ins:clock});
    draw(k, 'new'); await ctx.wait(350); busy = false;
  }
  async function play(){
    var s = ['A', 'B', 'C', 'A', 'D', 'A', 'E', 'B', 'A', 'F', 'C', 'A'];
    reset();
    for (var i = 0; i < s.length; i++) { if (!ctx.alive) return; while (busy) await ctx.wait(80); await access(s[i]); await ctx.wait(450); }
  }
  function reset(){ items = []; clock = 0; hits = 0; miss = 0; f.clearLog(); draw(); }
  seg(f, [['lru','LRU'], ['lfu','LFU'], ['fifo','FIFO']], 'lru', function(v){ pol = v; f.say(EX[v]); draw(); }, 'Policy');
  button(f, 'Sequence chalao', play, true);
  button(f, 'Reset', function(){ if (!busy) reset(); });
  f.say(EX.lru); draw();
});

/* ================= index: full scan vs B-tree ================= */
reg('index', function(root, ctx){
  var f = frame(root, {title:'Index ka jaadu: Full scan vs B-Tree', minH:260,
    explain:'Table me <b>10,000 rows</b> hain. Bina index ke database ko row-by-row padhna padta hai (<b>O(n)</b>). B-Tree index ke saath sirf 3 levels utarne padte hain (<b>O(log n)</b>).'});
  var scan = el('div', 'lane', '<div class="lane-h"><b>Full table scan</b><span class="badge">0 rows padhi</span></div><div class="meter"><i></i></div>');
  var tree = el('div', 'lane', '<div class="lane-h"><b>B-Tree index</b><span class="badge">0 reads</span></div><div class="bt"></div>');
  f.stage.appendChild(scan); f.stage.appendChild(tree);
  var sBadge = scan.querySelector('.badge'), sBar = scan.querySelector('i'), tBadge = tree.querySelector('.badge'), bt = tree.querySelector('.bt');
  var gen = 0;
  function parts(lo, hi){ var out = [], step = (hi - lo + 1) / 4; for (var i = 0; i < 4; i++) out.push([Math.round(lo + step * i), Math.round(lo + step * (i + 1)) - 1]); out[3][1] = hi; return out; }
  function lvl(ranges, label){
    var r = el('div', 'bt-l', '<span class="bt-n">' + label + '</span>');
    ranges.forEach(function(x){ r.appendChild(el('span', 'cell', x[0] + '–' + x[1])); });
    bt.appendChild(r); return r;
  }
  async function run(){
    var my = ++gen, id = ri(2000, 9999);
    f.setStats({'Searching':'user_id = ' + id});
    bt.innerHTML = ''; sBar.style.width = '0'; sBadge.className = 'badge'; tBadge.className = 'badge'; tBadge.textContent = '0 reads';
    var t0 = performance.now(), D = RM ? 50 : 2600;
    (async function(){
      while (ctx.alive && my === gen) {
        var p = Math.min(1, (performance.now() - t0) / D), rows = Math.round(p * id);
        sBadge.textContent = rows.toLocaleString('en-IN') + ' rows padhi'; sBar.style.width = (rows / 100) + '%';
        if (p >= 1) { sBadge.className = 'badge warn'; sBadge.textContent = 'Mila! ' + id.toLocaleString('en-IN') + ' rows padhni padi'; break; }
        await ctx.wait(40);
      }
    })();
    var lo = 1, hi = 10000, names = ['Root', 'Internal', 'Leaf'];
    for (var L = 0; L < 3; L++) {
      await ctx.wait(450); if (my !== gen) return;
      var ps = parts(lo, hi), row = lvl(ps, names[L]);
      for (var i = 0; i < 4; i++) if (id >= ps[i][0] && id <= ps[i][1]) { row.children[i + 1].classList.add('hit'); lo = ps[i][0]; hi = ps[i][1]; }
      tBadge.textContent = (L + 1) + ' read' + (L ? 's' : '');
    }
    await ctx.wait(300); if (my !== gen) return;
    bt.appendChild(el('div', 'bt-f', 'Leaf page me <b>user_id ' + id + '</b> → row pointer. Sirf 3 reads!'));
    tBadge.className = 'badge ok'; tBadge.textContent = 'Mila! 3 reads';
  }
  button(f, 'Search user_id', run, true);
  ctx.after(400, run);
});
