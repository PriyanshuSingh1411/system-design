// Demos: hero, client-server, DNS, TCP/UDP, latency numbers, estimation calculator
import { reg, RM, el, esc, rand, ri, pick, hash, hash2, fmtNum, fmtBytes, cssVar, frame, button, seg, range, mk, sub, flash, center, fly, grid, col, nextId } from './core';

/* ================= HERO: one request's journey ================= */
reg('hero', function(root, ctx){
  var f = frame(root, {tag:'Live system', title:'Ek request ka safar',
    explain:'Request <b>Load Balancer</b> se kisi server tak jaati hai. Server pehle <b>Cache</b> dekhta hai (fast), nahi mila to <b>Database</b> (slow). Kisi App server par click karke use down karein.'});
  var users = [], servers = [];
  for (var i = 0; i < 3; i++) users.push(mk('client', 'User ' + (i + 1)));
  var lb = mk('edge', 'Load Balancer');
  for (i = 0; i < 3; i++) { var s = mk('svc', 'App ' + (i + 1), 'up', 'clickable'); s.setAttribute('role', 'button'); s.tabIndex = 0; servers.push(s); }
  var cache = mk('cache', 'Cache', '~2 ms'), db = mk('db', 'Database', '~40 ms');
  var g = grid('repeat(4, minmax(0,1fr))');
  g.appendChild(col.apply(null, users)); g.appendChild(col(lb)); g.appendChild(col.apply(null, servers)); g.appendChild(col(cache, db));
  f.stage.appendChild(g);
  var rr = 0, st = {served:0, hits:0, lat:0, fail:0};
  function upd(){ f.setStats({'Served':st.served, 'Cache hit':(st.served ? Math.round(st.hits * 100 / st.served) : 0) + '%', 'Avg latency':(st.served ? Math.round(st.lat / st.served) : 0) + ' ms', 'Failed':st.fail}); }
  function toggle(s){ var d = s.classList.toggle('down'); sub(s, d ? 'DOWN' : 'up'); }
  servers.forEach(function(s){
    s.addEventListener('click', function(){ toggle(s); });
    s.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(s); } });
  });
  async function request(){
    var u = pick(users);
    await fly(ctx, f.stage, u, lb, {dur:420});
    var hs = servers.filter(function(x){ return !x.classList.contains('down'); });
    if (!ctx.alive) return;
    if (!hs.length) { await fly(ctx, f.stage, lb, u, {cls:'badp', dur:420}); st.fail++; upd(); return; }
    var s = hs[rr++ % hs.length];
    await fly(ctx, f.stage, lb, s, {dur:420});
    await fly(ctx, f.stage, s, cache, {dur:360});
    if (Math.random() < 0.72) { flash(cache, 'flash-ok', 300); st.hits++; st.lat += ri(2, 6); await fly(ctx, f.stage, cache, s, {cls:'okp', dur:360}); }
    else { flash(cache, 'flash-bad', 300); st.lat += ri(38, 55); await fly(ctx, f.stage, s, db, {dur:420}); await fly(ctx, f.stage, db, s, {cls:'okp', dur:420}); }
    await fly(ctx, f.stage, s, lb, {cls:'res', dur:380});
    await fly(ctx, f.stage, lb, u, {cls:'res', dur:380});
    if (!ctx.alive) return;
    st.served++; upd();
  }
  var loop = null;
  function speed(ms){ if (loop) ctx.clear(loop); loop = ctx.every(ms, request); }
  seg(f, [['low','Kam traffic'], ['high','Zyada traffic']], 'low', function(v){ speed(v === 'low' ? 900 : 280); }, 'Traffic');
  speed(900); upd(); ctx.after(300, request);
});

/* ================= client-server ================= */
reg('client-server', function(root, ctx){
  var f = frame(root, {title:'Client aur Server ki baat-cheet',
    explain:'Client <b>request</b> bhejta hai, server use process karke <b>response</b> lautata hai. Server OFF karke dekhiye: request jaati hai par jawab nahi aata.'});
  var cl = mk('client', 'Client', 'Browser / App'), sv = mk('svc', 'Server', 'api.shop.com');
  var row = el('div', 'row'); var wire = el('div', 'wire');
  row.appendChild(cl); row.appendChild(wire); row.appendChild(sv);
  f.stage.appendChild(row);
  var on = true, st = {Requests:0, Success:0, Failed:0};
  function upd(){ f.setStats(st); }
  async function send(method, path, status){
    st.Requests++; upd();
    f.log('→ ' + method + ' ' + path, 'acc');
    await fly(ctx, f.stage, cl, sv, {label:method + ' ' + path, dur:850});
    if (!ctx.alive) return;
    if (!on) { await ctx.wait(700); f.log('✕ ' + method + ' ' + path + ': server down, response nahi aaya (timeout)', 'bad'); st.Failed++; upd(); flash(cl, 'flash-bad', 600); return; }
    sv.classList.add('hot'); sub(sv, 'processing…');
    await ctx.wait(550);
    sv.classList.remove('hot'); sub(sv, 'api.shop.com');
    await fly(ctx, f.stage, sv, cl, {label:status, cls:'res', dur:850});
    if (!ctx.alive) return;
    f.log('← ' + status + '  (' + method + ' ' + path + ')', 'ok'); st.Success++; upd(); flash(cl, 'flash-ok', 500);
  }
  button(f, 'GET /products', function(){ send('GET', '/products', '200 OK · JSON'); }, true);
  button(f, 'POST /order', function(){ send('POST', '/order', '201 Created'); });
  var tb = button(f, 'Server: ON', function(){
    on = !on; sv.classList.toggle('down', !on); tb.textContent = 'Server: ' + (on ? 'ON' : 'OFF');
    f.log(on ? 'Server wapas ON' : 'Server OFF kar diya', 'warn');
  });
  upd();
  ctx.after(700, function(){ send('GET', '/products', '200 OK · JSON'); });
});

/* ================= DNS ================= */
reg('dns', function(root, ctx){
  var f = frame(root, {title:'DNS lookup: naam se IP address tak', minH:250,
    explain:'<b>Next step</b> dabaiye aur dekhiye ki <b>www.example.com</b> ka IP address kaise milta hai.'});
  var br = mk('client', 'Browser', 'cache: khaali'), rs = mk('edge', 'DNS Resolver', 'ISP / 8.8.8.8');
  var rt = mk('ext', 'Root server', '"."'), tld = mk('ext', 'TLD server', '.com'), au = mk('db', 'Authoritative', 'example.com');
  var g = grid('minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr)');
  g.appendChild(col(br)); g.appendChild(col(rs)); g.appendChild(col(rt, tld, au));
  f.stage.appendChild(g);
  var i = 0, ms = 0, busy = false, cached = false;
  var S = f.stage;
  var steps = [
    {t:'Aapne browser me <b>www.example.com</b> likha. Browser (aur OS) apna cache dekhta hai: IP nahi mila.', ms:0, run:async function(){ flash(br, 'flash-bad', 800); await ctx.wait(500); }},
    {t:'Browser query <b>DNS Resolver</b> ko bhejta hai (ye aapke ISP ka ya 8.8.8.8 jaisa public resolver hota hai).', ms:10, run:function(){ return fly(ctx, S, br, rs, {label:'example.com?'}); }},
    {t:'Resolver <b>Root server</b> se poochta hai. Root kehta hai: ".com ka hisaab TLD server ke paas hai, wahan poochho."', ms:20, run:async function(){ await fly(ctx, S, rs, rt, {label:'?'}); await fly(ctx, S, rt, rs, {label:'.com TLD', cls:'res'}); }},
    {t:'<b>.com TLD server</b> kehta hai: "example.com ka authoritative server ns1.example.com hai."', ms:20, run:async function(){ await fly(ctx, S, rs, tld, {label:'?'}); await fly(ctx, S, tld, rs, {label:'ns1', cls:'res'}); }},
    {t:'<b>Authoritative server</b> ke paas asli record hai: <b>A record = 93.184.216.34</b>', ms:20, run:async function(){ await fly(ctx, S, rs, au, {label:'?'}); await fly(ctx, S, au, rs, {label:'93.184.216.34', cls:'okp'}); }},
    {t:'Resolver IP browser ko deta hai aur <b>TTL</b> tak cache kar leta hai. Ab browser is IP se TCP connection banayega. Lookup complete!', ms:10, run:async function(){ await fly(ctx, S, rs, br, {label:'93.184.216.34', cls:'okp'}); sub(br, 'cache: 93.184.216.34'); flash(br, 'flash-ok', 800); cached = true; }}
  ];
  function upd(){ f.setStats({'Step':Math.min(i, steps.length) + '/' + steps.length, 'Time':'~' + ms + ' ms'}); }
  async function next(){
    if (busy || !ctx.alive) return;
    if (i >= steps.length) { f.say('Lookup ho chuka hai. <b>Cached lookup</b> try kariye ya <b>Reset</b> kariye.'); return; }
    busy = true;
    var s = steps[i++]; f.say('<b>Step ' + i + ':</b> ' + s.t); ms += s.ms; upd();
    await s.run(); busy = false;
  }
  async function auto(){ while (ctx.alive && i < steps.length) { await next(); await ctx.wait(700); } }
  async function cachedLookup(){
    if (busy) return;
    if (!cached) { f.say('Pehle ek poora lookup chalaiye, tabhi cache me IP hoga.'); return; }
    busy = true; flash(br, 'flash-ok', 900);
    f.say('<b>Cache hit!</b> Browser ke cache me IP pehle se hai, koi network call nahi. Time: <b>~0 ms</b>. Isliye DNS ka TTL aur caching itna important hai.');
    f.setStats({'Step':'cache', 'Time':'~0 ms'}); await ctx.wait(600); busy = false;
  }
  button(f, 'Next step', next, true);
  button(f, 'Auto play', auto);
  button(f, 'Cached lookup', cachedLookup);
  button(f, 'Reset', function(){ if (busy) return; i = 0; ms = 0; cached = false; sub(br, 'cache: khaali'); f.say('Reset ho gaya. <b>Next step</b> dabaiye.'); upd(); });
  upd();
});

/* ================= TCP vs UDP ================= */
reg('tcp', function(root, ctx){
  var f = frame(root, {title:'TCP handshake vs UDP', minH:200, explain:''});
  var mode = 'tcp', gen = 0;
  var seq = el('div', 'seq', '<div class="seq-h"><span>Client</span><span>Server</span></div><div class="seq-body"></div>');
  f.stage.appendChild(seq);
  var body = seq.querySelector('.seq-body');
  var TCP = [['c','SYN (seq=100)'], ['s','SYN-ACK (seq=300, ack=101)'], ['c','ACK (ack=301)'], ['n','Connection ready: 3-way handshake complete'],
    ['c','Data: packet 1'], ['s','ACK 1'], ['c','Data: packet 2', 1], ['n','ACK 2 nahi aaya → timeout → retransmit'],
    ['c','Data: packet 2 (dobara)'], ['s','ACK 2'], ['c','FIN (band karo)'], ['s','FIN-ACK']];
  var UDP = [['c','Datagram 1'], ['c','Datagram 2', 1], ['c','Datagram 3'], ['c','Datagram 4'],
    ['n','Na handshake, na ACK. Datagram 2 gaya to gaya. Fast hai, par delivery ki guarantee nahi.']];
  var EX = {tcp:'<b>TCP</b>: pehle 3-way handshake (SYN, SYN-ACK, ACK), phir har packet ka ACK. Packet lost hua to dobara bheja jaata hai. <b>Reliable aur ordered</b>, isliye web, email, payments TCP par chalte hain.',
    udp:'<b>UDP</b>: seedha data bhejo, koi handshake ya ACK nahi. Lost packet wapas nahi aata. <b>Fast aur low latency</b>, isliye video call, live gaming, DNS UDP use karte hain.'};
  async function play(){
    var my = ++gen; body.innerHTML = ''; f.say(EX[mode]);
    var list = mode === 'tcp' ? TCP : UDP, sent = 0, lost = 0;
    for (var k = 0; k < list.length; k++) {
      if (my !== gen || !ctx.alive) return;
      var m = list[k], r;
      if (m[0] === 'n') r = el('div', 'seq-note', esc(m[1]));
      else { r = el('div', 'seq-msg ' + (m[0] === 'c' ? 'to-s' : 'to-c') + (m[2] ? ' lost' : ''), '<span class="seq-l">' + esc(m[1]) + (m[2] ? ' (lost)' : '') + '</span><i></i>'); sent++; if (m[2]) lost++; }
      body.appendChild(r);
      f.setStats({'Protocol':mode.toUpperCase(), 'Messages':sent, 'Lost':lost, 'Retransmit':mode === 'tcp' && k >= 8 ? 1 : 0});
      await ctx.wait(800);
    }
  }
  seg(f, [['tcp','TCP'], ['udp','UDP']], 'tcp', function(v){ mode = v; play(); }, 'Protocol');
  button(f, 'Replay', play, true);
  play();
});

/* ================= latency numbers ================= */
reg('latency', function(root, ctx){
  var f = frame(root, {tag:'Interactive chart', title:'Latency numbers har engineer ko pata hone chahiye',
    explain:'Bar ki length <b>log scale</b> par hai: har grid line (0.1 ns se 1 s tak) 10 guna farak hai. <b>Human scale</b> me dekhiye: agar 1 nanosecond = 1 second hota, to kaun sa kaam kitna lamba lagta. Numbers approximate hain, ratio yaad rakhiye.'});
  var L = [['L1 cache reference', 0.5, 'm'], ['Branch mispredict', 5, 'm'], ['L2 cache reference', 7, 'm'], ['Mutex lock/unlock', 25, 'm'],
    ['RAM (main memory) reference', 100, 'm'], ['Compress 1 KB (Snappy)', 3e3, 'm'], ['Send 1 KB over 1 Gbps network', 1e4, 'n'],
    ['SSD random read (4 KB)', 1.5e5, 'd'], ['Read 1 MB sequentially from RAM', 2.5e5, 'm'], ['Round trip, same datacenter', 5e5, 'n'],
    ['Read 1 MB sequentially from SSD', 1e6, 'd'], ['HDD disk seek', 1e7, 'd'], ['Read 1 MB sequentially from HDD', 2e7, 'd'],
    ['Packet Mumbai → California → Mumbai', 2.3e8, 'n']];
  var lo = -1, hi = 9;
  var box = el('div', 'lat');
  L.forEach(function(r){
    var row = el('div', 'lat-row lat-' + r[2], '<span class="lat-l">' + esc(r[0]) + '</span><span class="lat-b"><i></i></span><span class="lat-v"></span>');
    row._ns = r[1]; box.appendChild(row);
  });
  f.stage.appendChild(box);
  function real(ns){ return ns < 1e3 ? ns + ' ns' : ns < 1e6 ? (ns / 1e3) + ' µs' : (ns / 1e6) + ' ms'; }
  function human(ns){
    var s = ns;
    if (s < 60) return s + ' sec';
    if (s < 3600) return (s / 60).toFixed(1) + ' min';
    if (s < 86400) return (s / 3600).toFixed(1) + ' hours';
    if (s < 86400 * 30) return (s / 86400).toFixed(1) + ' days';
    if (s < 86400 * 365) return (s / 86400 / 30).toFixed(1) + ' months';
    return (s / 86400 / 365).toFixed(1) + ' years';
  }
  var mode = 'real';
  function draw(){
    Array.prototype.forEach.call(box.children, function(row){
      row.querySelector('.lat-v').textContent = mode === 'real' ? real(row._ns) : human(row._ns);
      row.querySelector('i').style.width = ((Math.log10(row._ns) - lo) / (hi - lo) * 100).toFixed(1) + '%';
    });
  }
  seg(f, [['real','Real numbers'], ['human','Human scale']], 'real', function(v){ mode = v; draw(); }, 'Scale');
  f.stats.innerHTML = '<span class="lg lat-m"><i></i>Memory / CPU</span><span class="lg lat-n"><i></i>Network</span><span class="lg lat-d"><i></i>Disk / SSD</span>';
  ctx.after(120, draw);
});

/* ================= back-of-the-envelope calculator ================= */
reg('estimation', function(root, ctx){
  var f = frame(root, {tag:'Calculator', title:'Back-of-the-envelope estimation',
    explain:'Preset chuniye ya numbers badaliye. Interview me exact answer nahi, <b>sahi order of magnitude</b> chahiye. Trick: 1 din ≈ 86,400 s ≈ <b>10<sup>5</sup> seconds</b>.'});
  var P = {
    twitter:{dau:200, w:2, r:100, kb:1, yrs:5, peak:3},
    url:{dau:100, w:0.1, r:100, kb:0.5, yrs:10, peak:2},
    chat:{dau:2000, w:40, r:1, kb:0.1, yrs:1, peak:3}
  };
  var fields = [['dau','Daily active users (millions)'], ['w','Writes per user per day'], ['r','Reads per write'], ['kb','Avg size per write (KB)'], ['yrs','Data kitne saal rakhna hai'], ['peak','Peak factor (× average)']];
  var form = el('div', 'est');
  var inputs = {};
  fields.forEach(function(fd){
    var id = 'ax-est-' + fd[0] + '-' + nextId();
    var w = el('label', 'est-f', '<span>' + esc(fd[1]) + '</span>');
    w.setAttribute('for', id);
    var inp = el('input'); inp.type = 'number'; inp.min = '0'; inp.step = 'any'; inp.id = id; inp.inputMode = 'decimal';
    inp.addEventListener('input', calc);
    w.appendChild(inp); form.appendChild(w); inputs[fd[0]] = inp;
  });
  var out = el('div', 'table-wrap est-out');
  f.stage.appendChild(form); f.stage.appendChild(out);
  function v(k){ var x = parseFloat(inputs[k].value); return isFinite(x) && x >= 0 ? x : 0; }
  function calc(){
    var dau = v('dau') * 1e6, w = v('w'), r = v('r'), kb = v('kb'), yrs = v('yrs'), pk = v('peak') || 1;
    var wpd = dau * w, wq = wpd / 86400, rq = wq * r, peak = (wq + rq) * pk;
    var spd = wpd * kb * 1000, tot = spd * 365 * yrs;
    var rows = [
      ['Writes / day', fmtNum(dau) + ' × ' + w, fmtNum(wpd)],
      ['Write QPS', fmtNum(wpd) + ' ÷ 86,400', fmtNum(wq) + '/s'],
      ['Read QPS', fmtNum(wq) + ' × ' + r, fmtNum(rq) + '/s'],
      ['Peak QPS', '(' + fmtNum(wq) + ' + ' + fmtNum(rq) + ') × ' + pk, fmtNum(peak) + '/s'],
      ['Storage / day', fmtNum(wpd) + ' × ' + kb + ' KB', fmtBytes(spd)],
      ['Total storage', fmtBytes(spd) + ' × 365 × ' + yrs, fmtBytes(tot)],
      ['With 3× replication', fmtBytes(tot) + ' × 3', fmtBytes(tot * 3)],
      ['Incoming bandwidth', fmtNum(wq) + '/s × ' + kb + ' KB', fmtBytes(wq * kb * 1000) + '/s'],
      ['Outgoing bandwidth', fmtNum(rq) + '/s × ' + kb + ' KB', fmtBytes(rq * kb * 1000) + '/s']
    ];
    out.innerHTML = '<table><thead><tr><th>Kya nikaala</th><th>Formula</th><th>Answer</th></tr></thead><tbody>' +
      rows.map(function(x){ return '<tr><td>' + x[0] + '</td><td class="mono">' + esc(x[1]) + '</td><td class="mono strong">' + esc(x[2]) + '</td></tr>'; }).join('') + '</tbody></table>';
    var servers = Math.max(1, Math.ceil(peak / 5000));
    f.setStats({'Peak QPS':fmtNum(peak), 'Approx app servers (5K QPS each)':servers});
  }
  function load(k){ var p = P[k]; Object.keys(p).forEach(function(x){ inputs[x].value = p[x]; }); calc(); }
  seg(f, [['twitter','Twitter jaisa'], ['url','URL shortener'], ['chat','WhatsApp jaisa']], 'twitter', load, 'Preset');
  load('twitter');
});
