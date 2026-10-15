// Demos: rate limiter, circuit breaker, Raft, Bloom filter, quadtree
import { reg, RM, el, esc, rand, ri, pick, hash, hash2, fmtNum, fmtBytes, cssVar, frame, button, seg, range, mk, sub, flash, center, fly, grid, col, nextId } from './core';

/* ================= rate limiter ================= */
reg('rate-limiter', function(root, ctx){
  var f = frame(root, {title:'Rate limiting: kitni requests allow karein', minH:170, explain:''});
  var algo = 'token';
  var cl = mk('client', 'Client', 'user / bot'), lim = mk('edge', 'Rate Limiter', ''), sv = mk('svc', 'API Server', 'safe');
  var vis = el('div', 'bucket');
  var g = grid('minmax(0,.8fr) minmax(0,1.3fr) minmax(0,.8fr)');
  g.appendChild(col(cl)); g.appendChild(col(lim, vis)); g.appendChild(col(sv));
  f.stage.appendChild(g);
  var CAP = 5, tokens = CAP, queue = [], count = 0, ws = performance.now(), allowed = 0, rejected = 0, auto = false, rid = 0;
  var EX = {
    token:'<b>Token Bucket:</b> bucket me max 5 tokens, har second 1 naya token. Har request ek token khaati hai. Token nahi to <b>429 Too Many Requests</b>. <b>Burst allow</b> karta hai (5 tak ek saath). Stripe, AWS isi type ka use karte hain.',
    leaky:'<b>Leaky Bucket:</b> requests ek queue (bucket) me jaati hain aur <b>fixed speed</b> (1/sec) se nikalti hain, jaise tapakta nal. Bucket full to request drop. Output ekdum smooth.',
    fixed:'<b>Fixed Window Counter:</b> har 5 second ki window me max 5 requests. Window khatam, counter reset. Simple hai, par window ke boundary par double burst ho sakta hai.'
  };
  function draw(){
    vis.innerHTML = '';
    if (algo === 'token') { for (var i = 0; i < CAP; i++) vis.appendChild(el('span', 'cell' + (i < Math.floor(tokens) ? ' on' : ''), i < Math.floor(tokens) ? '●' : '')); sub(lim, Math.floor(tokens) + '/' + CAP + ' tokens'); }
    else if (algo === 'leaky') { for (var j = 0; j < CAP; j++) vis.appendChild(el('span', 'cell' + (j < queue.length ? ' q' : ''), j < queue.length ? 'r' : '')); sub(lim, queue.length + '/' + CAP + ' queued'); }
    else {
      var left = Math.max(0, 5000 - (performance.now() - ws));
      vis.appendChild(el('div', 'fw', '<span class="meter"><i style="width:' + (count / CAP * 100) + '%"></i></span><small>' + count + '/' + CAP + ' · reset in ' + (left / 1000).toFixed(1) + 's</small>'));
      sub(lim, count + '/' + CAP + ' is window me');
    }
    f.setStats({'Allowed':allowed, 'Rejected (429)':rejected});
  }
  async function forward(label){ allowed++; draw(); await fly(ctx, f.stage, lim, sv, {cls:'okp', label:label || '200', dur:450}); flash(sv, 'flash-ok', 300); }
  async function reject(){ rejected++; draw(); flash(lim, 'flash-bad', 300); await fly(ctx, f.stage, lim, cl, {cls:'badp', label:'429', dur:450}); }
  async function request(){
    var n = ++rid;
    await fly(ctx, f.stage, cl, lim, {label:'req ' + n, dur:400});
    if (!ctx.alive) return;
    if (algo === 'token') { if (tokens >= 1) { tokens -= 1; forward(); } else reject(); }
    else if (algo === 'leaky') { if (queue.length < CAP) { queue.push(n); draw(); } else reject(); }
    else { if (performance.now() - ws >= 5000) { ws = performance.now(); count = 0; } if (count < CAP) { count++; forward(); } else reject(); }
  }
  async function burst(){ for (var i = 0; i < 8; i++) { request(); await ctx.wait(110); } }
  ctx.every(100, function(){
    if (algo === 'token') tokens = Math.min(CAP, tokens + 0.1);
    if (algo === 'fixed' && performance.now() - ws >= 5000) { ws = performance.now(); count = 0; }
    draw();
  });
  ctx.every(1000, function(){ if (algo === 'leaky' && queue.length) { var m = queue.shift(); forward('#' + m); } });
  ctx.every(700, function(){ if (auto) request(); });
  seg(f, [['token','Token bucket'], ['leaky','Leaky bucket'], ['fixed','Fixed window']], 'token', function(v){
    algo = v; tokens = CAP; queue = []; count = 0; ws = performance.now(); allowed = 0; rejected = 0; f.say(EX[v]); f.clearLog(); draw();
  }, 'Algorithm');
  button(f, '1 request', request, true);
  button(f, 'Burst ×8', burst);
  var ab = button(f, 'Auto: OFF', function(){ auto = !auto; ab.textContent = 'Auto: ' + (auto ? 'ON' : 'OFF'); });
  f.say(EX.token); draw();
});

/* ================= circuit breaker ================= */
reg('circuit-breaker', function(root, ctx){
  var f = frame(root, {title:'Circuit Breaker: CLOSED → OPEN → HALF-OPEN', minH:200,
    explain:'Service B ko <b>Failing</b> kariye. 3 failures ke baad breaker <b>OPEN</b> ho jaata hai: requests B tak jaati hi nahi, turant <b>fallback</b> milta hai (B ko saans lene ka time). 4 second baad <b>HALF-OPEN</b>: ek trial request. Pass hui to CLOSED, fail to wapas OPEN.'});
  var a = mk('svc', 'Service A', 'caller'), b = mk('svc', 'Service B', 'healthy');
  var cb = el('div', 'cb', '<span data-s="closed">CLOSED</span><span data-s="open">OPEN</span><span data-s="half">HALF-OPEN</span><small></small>');
  var row = el('div', 'row'); row.appendChild(a); row.appendChild(cb); row.appendChild(b); f.stage.appendChild(row);
  var state = 'closed', fails = 0, openedAt = 0, healthy = true, busy = false, st = {ok:0, fail:0, fast:0};
  function draw(){
    Array.prototype.forEach.call(cb.querySelectorAll('span'), function(s){ s.classList.toggle('on', s.getAttribute('data-s') === state); });
    var small = cb.querySelector('small');
    small.textContent = state === 'open' ? 'retry in ' + Math.max(0, (4000 - (performance.now() - openedAt)) / 1000).toFixed(1) + 's' : state === 'closed' ? 'failures: ' + fails + '/3' : 'trial request…';
    cb.className = 'cb s-' + state;
    f.setStats({'Success':st.ok, 'Failed':st.fail, 'Fast-fail (fallback)':st.fast});
  }
  function setState(s, msg, cls){ state = s; if (s === 'open') openedAt = performance.now(); if (s === 'closed') fails = 0; draw(); f.log(msg, cls); }
  async function call(){
    if (busy || !ctx.alive) return;
    if (state === 'open') {
      if (performance.now() - openedAt >= 4000) setState('half', 'Timeout khatam → HALF-OPEN: ek trial request bhejte hain', 'acc');
      else { st.fast++; draw(); busy = true; await fly(ctx, f.stage, a, cb, {dur:350}); await fly(ctx, f.stage, cb, a, {cls:'badp', label:'fallback', dur:350}); busy = false; return; }
    }
    busy = true;
    await fly(ctx, f.stage, a, b, {label:'call', dur:550});
    if (!ctx.alive) return;
    await ctx.wait(250);
    if (healthy) {
      st.ok++; await fly(ctx, f.stage, b, a, {cls:'okp', label:'200', dur:550});
      if (state === 'half') setState('closed', 'Trial pass → CLOSED. Sab normal.', 'ok'); else { fails = 0; draw(); }
    } else {
      st.fail++; fails++; await fly(ctx, f.stage, b, a, {cls:'badp', label:'500', dur:550});
      if (state === 'half') setState('open', 'Trial fail → wapas OPEN', 'bad');
      else if (fails >= 3) setState('open', '3 failures lagataar → breaker OPEN! Ab B ko call nahi karenge', 'bad');
      else draw();
    }
    busy = false;
  }
  seg(f, [['ok','B: Healthy'], ['bad','B: Failing']], 'ok', function(v){ healthy = v === 'ok'; sub(b, healthy ? 'healthy' : 'errors / timeout'); b.classList.toggle('flash-bad', !healthy); f.log('Service B ab ' + (healthy ? 'healthy' : 'fail ho raha hai'), healthy ? 'ok' : 'warn'); }, 'Service B');
  ctx.every(900, call);
  ctx.every(200, draw);
  draw();
});

/* ================= Raft leader election ================= */
reg('raft', function(root, ctx){
  var f = frame(root, {title:'Raft: leader election', minH:330,
    explain:'Leader har ~1 s me <b>heartbeat</b> bhejta hai. Follower ko heartbeat na mile to uska timer (ring) khatam hota hai, woh <b>candidate</b> banke vote maangta hai. <b>Majority (3/5)</b> mili to naya leader. Kisi node par click karke crash/revive karein.'});
  var ring = el('div', 'raft'); f.stage.appendChild(ring);
  var N = 5, nodes = [];
  function tmo(){ return rand(2600, 4200); }
  for (var i = 0; i < N; i++) {
    var a = (-90 + i * 72) * Math.PI / 180;
    var e = el('div', 'rnode', '<b></b><small></small>'); e.setAttribute('role', 'button'); e.tabIndex = 0;
    e.style.left = (50 + 37 * Math.cos(a)) + '%'; e.style.top = (50 + 37 * Math.sin(a)) + '%';
    ring.appendChild(e);
    nodes.push({e:e, i:i, role:'F', term:1, up:true, voted:null, dl:performance.now() + tmo(), len:3000});
  }
  nodes[0].role = 'L';
  function draw(){
    var now = performance.now(), lead = nodes.filter(function(n){ return n.up && n.role === 'L'; })[0];
    nodes.forEach(function(n){
      n.e.className = 'rnode r-' + (n.up ? n.role : 'X');
      n.e.querySelector('b').textContent = 'N' + (n.i + 1);
      n.e.querySelector('small').textContent = n.up ? ({L:'Leader', C:'Candidate', F:'Follower'}[n.role] + ' · T' + n.term) : 'crashed';
      var p = n.up && n.role !== 'L' ? Math.max(0, Math.min(1, (n.dl - now) / n.len)) : 0;
      n.e.style.setProperty('--p', (p * 360).toFixed(0) + 'deg');
    });
    var mt = Math.max.apply(null, nodes.map(function(n){ return n.term; }));
    f.setStats({'Term':mt, 'Leader':lead ? 'N' + (lead.i + 1) : 'koi nahi', 'Alive':nodes.filter(function(n){ return n.up; }).length + '/5'});
  }
  function reset(n){ n.len = tmo(); n.dl = performance.now() + n.len; }
  async function heartbeat(){
    var L = nodes.filter(function(n){ return n.up && n.role === 'L'; })[0];
    if (!L) return;
    nodes.forEach(function(n){
      if (n === L || !n.up) return;
      fly(ctx, ring, L.e, n.e, {dur:420}).then(function(){
        if (!L.up || L.role !== 'L' || !n.up) return;
        if (L.term >= n.term) { n.term = L.term; n.role = 'F'; n.voted = null; reset(n); }
      });
    });
  }
  function elect(c){
    c.role = 'C'; c.term++; c.voted = c.term; reset(c);
    var term = c.term, votes = 1;
    f.log('N' + (c.i + 1) + ' ka timer khatam → Candidate (term ' + term + '), votes maang raha hai', 'warn');
    nodes.forEach(function(n){
      if (n === c || !n.up) return;
      fly(ctx, ring, c.e, n.e, {label:'vote?', dur:450}).then(function(){
        if (!n.up || !c.up || c.term !== term) return;
        if (n.term < term || (n.term === term && n.voted !== term && n.role !== 'C')) {
          n.term = term; n.voted = term; n.role = 'F'; reset(n);
          fly(ctx, ring, n.e, c.e, {cls:'okp', label:'yes', dur:450}).then(function(){
            if (!c.up || c.term !== term || c.role !== 'C') return;
            votes++;
            if (votes >= 3) { c.role = 'L'; f.log('N' + (c.i + 1) + ' ko majority mili (' + votes + '/5) → naya LEADER, term ' + term, 'ok'); draw(); heartbeat(); }
          });
        }
      });
    });
  }
  function tick(){
    var now = performance.now();
    nodes.forEach(function(n){ if (n.up && n.role !== 'L' && now > n.dl) elect(n); });
    draw();
  }
  function toggle(n){
    n.up = !n.up;
    if (n.up) { n.role = 'F'; reset(n); f.log('N' + (n.i + 1) + ' wapas aaya (follower). Leader ke heartbeat se term update karega.', 'acc'); }
    else f.log('N' + (n.i + 1) + ' crash!' + (n.role === 'L' ? ' Leader gaya, ab election hoga…' : ''), 'bad');
    if (nodes.filter(function(x){ return x.up; }).length < 3) f.log('Sirf ' + nodes.filter(function(x){ return x.up; }).length + ' nodes zinda: majority (3) nahi ban sakti, koi leader nahi chunega', 'bad');
    draw();
  }
  nodes.forEach(function(n){
    n.e.addEventListener('click', function(){ toggle(n); });
    n.e.addEventListener('keydown', function(ev){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(n); } });
  });
  button(f, 'Leader crash', function(){ var L = nodes.filter(function(n){ return n.up && n.role === 'L'; })[0]; if (L) toggle(L); }, true);
  button(f, 'Sab revive', function(){ nodes.forEach(function(n){ if (!n.up) toggle(n); }); });
  ctx.every(900, heartbeat);
  ctx.every(100, tick);
  draw();
});

/* ================= Bloom filter ================= */
reg('bloom', function(root, ctx){
  var f = frame(root, {title:'Bloom filter: "shayad hai" ya "pakka nahi hai"', minH:200, explain:''});
  var M = 16, bits = new Array(M).fill(0), added = {};
  var id = 'ax-bloom-' + nextId();
  var form = el('div', 'bf-form', '<label class="vh" for="' + id + '">Word</label>');
  var inp = el('input'); inp.type = 'text'; inp.id = id; inp.placeholder = 'koi city likhiye'; inp.autocomplete = 'off'; inp.maxLength = 20;
  form.appendChild(inp);
  var bAdd = el('button', 'btn btn-sm', 'Add'); bAdd.type = 'button';
  var bChk = el('button', 'btn btn-sm btn-ghost', 'Check'); bChk.type = 'button';
  form.appendChild(bAdd); form.appendChild(bChk);
  var arr = el('div', 'bits');
  for (var i = 0; i < M; i++) arr.appendChild(el('span', 'cell', '<b>0</b><small>' + i + '</small>'));
  var chips = el('div', 'bf-chips');
  var res = el('div', 'bf-res');
  f.stage.appendChild(form); f.stage.appendChild(arr); f.stage.appendChild(chips); f.stage.appendChild(res);
  function pos(w){ var a = hash(w) % M, b = hash2(w) % M; return a === b ? [a] : [a, b]; }
  function draw(hl){
    Array.prototype.forEach.call(arr.children, function(c, k){
      c.className = 'cell' + (bits[k] ? ' on' : '') + (hl && hl.indexOf(k) >= 0 ? (bits[k] ? ' hl' : ' miss') : '');
      c.querySelector('b').textContent = bits[k];
    });
    var n = Object.keys(added).length, set = bits.filter(Boolean).length, k = 2;
    f.setStats({'Words added':n, 'Bits set':set + '/' + M, 'False positive chance':Math.round(Math.pow(1 - Math.exp(-k * n / M), k) * 100) + '%'});
  }
  function add(w){
    w = (w || '').trim().toLowerCase(); if (!w) return;
    var p = pos(w); p.forEach(function(k){ bits[k] = 1; }); added[w] = 1; draw(p);
    res.innerHTML = '<span class="badge acc">ADD</span> <b>' + esc(w) + '</b> → h1, h2 = bits ' + p.join(', ') + ' ko 1 kiya';
    buildChips();
  }
  function check(w){
    w = (w || '').trim().toLowerCase(); if (!w) return;
    var p = pos(w), all = p.every(function(k){ return bits[k]; }); draw(p);
    var t = '<b>' + esc(w) + '</b> → bits ' + p.join(', ') + ': ';
    if (!all) res.innerHTML = '<span class="badge bad">PAKKA NAHI</span> ' + t + 'koi bit 0 hai, to ye word <b>definitely add nahi hua</b>.';
    else if (added[w]) res.innerHTML = '<span class="badge ok">SHAYAD HAI</span> ' + t + 'saari bits 1 hain, aur sach me add hua tha.';
    else res.innerHTML = '<span class="badge warn">FALSE POSITIVE</span> ' + t + 'saari bits 1 hain (doosre words ki wajah se), par ye word <b>kabhi add nahi hua</b>! Isliye Bloom filter kehta hai "shayad".';
  }
  var CANDS = ['goa', 'agra', 'kochi', 'indore', 'patna', 'nagpur', 'jaipur', 'ranchi', 'bhopal', 'nashik', 'mysore', 'shimla', 'thane', 'vapi', 'udaipur', 'kanpur', 'meerut', 'rajkot', 'jammu', 'cuttack'];
  function buildChips(){
    chips.innerHTML = '<span class="mini-l">Check karke dekhiye:</span>';
    var fp = CANDS.filter(function(w){ return !added[w] && pos(w).every(function(k){ return bits[k]; }); }).slice(0, 2);
    var no = CANDS.filter(function(w){ return !added[w] && !pos(w).every(function(k){ return bits[k]; }); }).slice(0, 2);
    var yes = Object.keys(added).slice(0, 1);
    yes.concat(no, fp).forEach(function(w){ var c = el('button', 'chip-k', esc(w)); c.type = 'button'; c.addEventListener('click', function(){ inp.value = w; check(w); }); chips.appendChild(c); });
  }
  bAdd.addEventListener('click', function(){ add(inp.value); inp.value = ''; inp.focus(); });
  bChk.addEventListener('click', function(){ check(inp.value); });
  inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); check(inp.value); } });
  f.say('16 bits ka array aur 2 hash functions. <b>Add</b>: dono hash positions par bit 1. <b>Check</b>: koi bhi bit 0 = <b>pakka nahi hai</b>; sab 1 = <b>shayad hai</b> (false positive possible, false negative kabhi nahi). Kam memory me "kya ye pehle dekha hai?" ka jawab.');
  button(f, 'Reset', function(){ bits = new Array(M).fill(0); added = {}; res.innerHTML = ''; ['mumbai', 'delhi', 'pune', 'surat'].forEach(add); res.innerHTML = 'mumbai, delhi, pune, surat add kiye. Ab chips se check kariye.'; });
  ['mumbai', 'delhi', 'pune', 'surat'].forEach(add);
  res.innerHTML = 'Shuruaat me <b>mumbai, delhi, pune, surat</b> add kiye hain. Neeche ke chips se check kariye.';
});

/* ================= Quadtree ================= */
reg('quadtree', function(root, ctx){
  var f = frame(root, {title:'Quadtree: nearby drivers dhoondhna', minH:300, explain:''});
  var W = 360, CAP = 3, MAXD = 6;
  var cv = el('canvas', 'qt'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Map with drivers split into quadtree cells');
  f.stage.appendChild(cv);
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = W * dpr;
  var g2 = cv.getContext('2d');
  var mode = 'add', pts = [], tree, search = null;
  function node(x, y, w, d){ return {x:x, y:y, w:w, d:d, pts:[], kids:null}; }
  function ins(n, p){
    if (p.x < n.x || p.x >= n.x + n.w || p.y < n.y || p.y >= n.y + n.w) return false;
    if (!n.kids) {
      if (n.pts.length < CAP || n.d >= MAXD) { n.pts.push(p); return true; }
      var h = n.w / 2; n.kids = [node(n.x, n.y, h, n.d + 1), node(n.x + h, n.y, h, n.d + 1), node(n.x, n.y + h, h, n.d + 1), node(n.x + h, n.y + h, h, n.d + 1)];
      var old = n.pts; n.pts = [];
      old.forEach(function(q){ for (var i = 0; i < 4; i++) if (ins(n.kids[i], q)) break; });
    }
    for (var i = 0; i < 4; i++) if (ins(n.kids[i], p)) return true;
    return false;
  }
  function build(){ tree = node(0, 0, W, 0); pts.forEach(function(p){ ins(tree, p); }); }
  function cells(n){ return n.kids ? n.kids.reduce(function(a, k){ return a + cells(k); }, 0) : 1; }
  function query(n, c, out){
    var dx = Math.max(n.x - c.x, 0, c.x - (n.x + n.w)), dy = Math.max(n.y - c.y, 0, c.y - (n.y + n.w));
    if (dx * dx + dy * dy > c.r * c.r) return;
    if (!n.kids) { out.cells.push(n); n.pts.forEach(function(p){ out.checked++; if ((p.x - c.x) * (p.x - c.x) + (p.y - c.y) * (p.y - c.y) <= c.r * c.r) out.found.push(p); }); return; }
    n.kids.forEach(function(k){ query(k, c, out); });
  }
  function draw(){
    var ink = cssVar(root, '--line-2', '#999'), dot = cssVar(root, '--t-svc', '#1D4ED8'), ok = cssVar(root, '--ok', '#2B8A3E'), am = cssVar(root, '--amber', '#F59F00'), bg = cssVar(root, '--card', '#fff'), tint = cssVar(root, '--accent-soft', '#E2E9FB');
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    g2.fillStyle = bg; g2.fillRect(0, 0, W, W);
    if (search) { g2.fillStyle = tint; search.cells.forEach(function(n){ g2.fillRect(n.x, n.y, n.w, n.w); }); }
    g2.strokeStyle = ink; g2.lineWidth = 1;
    (function walk(n){ g2.strokeRect(n.x + .5, n.y + .5, n.w - 1, n.w - 1); if (n.kids) n.kids.forEach(walk); })(tree);
    pts.forEach(function(p){ g2.beginPath(); g2.arc(p.x, p.y, 4, 0, 7); g2.fillStyle = search && search.found.indexOf(p) >= 0 ? ok : dot; g2.fill(); });
    if (search) { g2.beginPath(); g2.arc(search.c.x, search.c.y, search.c.r, 0, 7); g2.strokeStyle = am; g2.lineWidth = 2; g2.stroke(); g2.beginPath(); g2.arc(search.c.x, search.c.y, 5, 0, 7); g2.fillStyle = am; g2.fill(); }
    var s = {'Drivers':pts.length, 'Cells':cells(tree)};
    if (search) s['Last search'] = search.found.length + ' paas me · ' + search.checked + '/' + pts.length + ' check kiye';
    f.setStats(s);
  }
  function addRandom(k){
    for (var i = 0; i < k; i++) {
      var cl = Math.random() < 0.6;
      var x = cl ? 250 + (Math.random() + Math.random() - 1) * 70 : rand(8, W - 8), y = cl ? 110 + (Math.random() + Math.random() - 1) * 70 : rand(8, W - 8);
      pts.push({x:Math.max(4, Math.min(W - 4, x)), y:Math.max(4, Math.min(W - 4, y))});
    }
    search = null; build(); draw();
  }
  cv.addEventListener('click', function(e){
    var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * W / r.height;
    if (mode === 'add') { pts.push({x:x, y:y}); search = null; build(); }
    else { var out = {cells:[], found:[], checked:0, c:{x:x, y:y, r:60}}; query(tree, out.c, out); search = out; f.log('Search: ' + out.found.length + ' drivers mile. Sirf ' + out.checked + ' check karne pade (total ' + pts.length + ')', 'ok'); }
    draw();
  });
  f.say('Map ko 4 hisson me baanto, jis hisse me <b>3 se zyada drivers</b> ho use phir 4 me baanto. Bheed wale area me chhote cells, khaali area me bade. <b>Nearby search</b> mode me map par click karke dekhiye: sirf paas ke cells check hote hain, saare drivers nahi.');
  seg(f, [['add','Driver add'], ['search','Nearby search']], 'add', function(v){ mode = v; }, 'Mode');
  button(f, '+10 drivers', function(){ addRandom(10); }, true);
  button(f, 'Clear', function(){ pts = []; search = null; build(); draw(); });
  addRandom(26);
  if (window.matchMedia) { try { var mq = matchMedia('(prefers-color-scheme: dark)'); var h = function(){ if (ctx.alive) draw(); }; if (mq.addEventListener) mq.addEventListener('change', h); } catch(e) {} }
  var mo = new MutationObserver(function(){ if (ctx.alive) draw(); }); mo.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  var st = ctx.stop; ctx.stop = function(){ mo.disconnect(); st(); };
});
