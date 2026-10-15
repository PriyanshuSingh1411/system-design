// Demos: queue / pub-sub, real-time (polling, WebSocket, SSE), saga
import { reg, RM, el, esc, rand, ri, pick, hash, hash2, fmtNum, fmtBytes, cssVar, frame, button, seg, range, mk, sub, flash, center, fly, grid, col, nextId } from './core';

/* ================= message queue / pub-sub ================= */
reg('queue', function(root, ctx){
  var f = frame(root, {title:'Message Queue vs Pub/Sub', minH:280, explain:''});
  var mode = 'queue', rate = 1, ncons = 1;
  var prod = mk('svc', 'Producer', 'Order service');
  var q = mk('queue', 'Queue', '0 waiting'), qbox = el('div', 'qbox');
  var consWrap = el('div', 'col');
  var cons = [0, 1, 2, 3].map(function(i){ var c = mk('svc', 'Consumer ' + (i + 1), 'idle'); c._busy = false; consWrap.appendChild(c); return c; });
  var subs = ['Email service', 'SMS service', 'Analytics'].map(function(n){ var s = mk('svc', n, 'subscribed'); s.hidden = true; consWrap.appendChild(s); return s; });
  var g = grid('minmax(0,.9fr) minmax(0,1.1fr) minmax(0,1fr)');
  g.appendChild(col(prod)); g.appendChild(col(q, qbox)); g.appendChild(consWrap);
  f.stage.appendChild(g);
  var backlog = [], id = 0, produced = 0, processed = 0, warned = false;
  function drawQ(){
    qbox.innerHTML = '';
    var show = Math.min(backlog.length, 8);
    for (var i = 0; i < show; i++) qbox.appendChild(el('span', 'qm', '#' + backlog[i]));
    if (backlog.length > show) qbox.appendChild(el('span', 'qm more', '+' + (backlog.length - show)));
    sub(q, mode === 'queue' ? backlog.length + ' waiting' : 'topic: order-placed');
    f.setStats({'Produced':produced, 'Processed':processed, 'Backlog':mode === 'queue' ? backlog.length : 0});
    if (backlog.length > 15 && !warned) { warned = true; f.log('Backlog badh raha hai! Producer consumers se tez hai. Consumers badhaiye (scale out).', 'warn'); }
    if (backlog.length < 5) warned = false;
  }
  function visibleCons(){ return cons.slice(0, ncons); }
  async function work(c){
    if (c._busy || !backlog.length || !ctx.alive) return;
    c._busy = true; var m = backlog.shift(); drawQ();
    await fly(ctx, f.stage, q, c, {label:'#' + m, dur:500});
    sub(c, 'processing #' + m); c.classList.add('hot');
    await ctx.wait(1700);
    c.classList.remove('hot'); sub(c, 'idle'); c._busy = false; processed++; drawQ();
    f.log('Consumer ' + (cons.indexOf(c) + 1) + ' ne #' + m + ' process kiya, ACK bheja', 'ok');
    dispatch();
  }
  function dispatch(){ visibleCons().forEach(function(c){ work(c); }); }
  async function produce(){
    var m = ++id; produced++;
    await fly(ctx, f.stage, prod, q, {label:'#' + m, dur:500});
    if (!ctx.alive) return;
    if (mode === 'queue') { backlog.push(m); drawQ(); dispatch(); return; }
    drawQ(); flash(q, 'hot', 300);
    await Promise.all(subs.map(function(s, k){ return fly(ctx, f.stage, q, s, {label:'#' + m, dur:500 + k * 120}).then(function(){ flash(s, 'flash-ok', 400); processed++; drawQ(); }); }));
    f.log('#' + m + ' ki copy teeno subscribers ko mili (fan-out)', 'acc');
  }
  var loop = null;
  function setRate(r){ rate = r; if (loop) ctx.clear(loop); loop = ctx.every(Math.round(1000 / (r * 0.5)), produce); }
  var EX = {
    queue:'<b>Queue (point-to-point):</b> har message <b>sirf ek</b> consumer ko milta hai. Producer ki speed consumer se zyada ho to <b>backlog</b> badhta hai. Consumers badhaiye, backlog ghatega. Producer ko consumer ka wait nahi karna padta.',
    pubsub:'<b>Pub/Sub (fan-out):</b> producer ek <b>topic</b> par event publish karta hai, aur <b>har subscriber</b> ko apni copy milti hai. Order place hua: Email, SMS, Analytics teeno ko khabar.'
  };
  seg(f, [['queue','Queue'], ['pubsub','Pub/Sub']], 'queue', function(v){
    mode = v; backlog = []; f.say(EX[v]);
    cons.forEach(function(c, i){ c.hidden = v !== 'queue' || i >= ncons; });
    subs.forEach(function(s){ s.hidden = v !== 'pubsub'; });
    drawQ(); dispatch();
  }, 'Mode');
  range(f, 'Producer speed', 1, 4, 2, function(x){ setRate(x); }, function(x){ return (x * 0.5) + ' msg/s'; });
  range(f, 'Consumers', 1, 4, 1, function(x){ ncons = x; if (mode === 'queue') cons.forEach(function(c, i){ c.hidden = i >= ncons; }); dispatch(); });
  cons.forEach(function(c, i){ c.hidden = i >= ncons; });
  f.say(EX.queue); drawQ(); setRate(2);
});

/* ================= real-time: polling vs long polling vs websocket vs SSE ================= */
reg('realtime', function(root, ctx){
  var f = frame(root, {title:'Real-time updates kaise milte hain', minH:170, explain:''});
  var cl = mk('client', 'Client', 'chat app'), sv = mk('svc', 'Server', '0 naye msg');
  var wire = el('div', 'wire'), row = el('div', 'row');
  row.appendChild(cl); row.appendChild(wire); row.appendChild(sv); f.stage.appendChild(row);
  var mode = 'short', gen = 0, pending = [], connected = false, st;
  var EX = {
    short:'<b>Short polling:</b> client har 2 second me poochta hai "kuch naya?" Zyadatar jawab "nahi" hota hai: <b>bahut saari bekaar requests</b>, aur message milne me delay.',
    long:'<b>Long polling:</b> client poochta hai, server <b>tab tak connection hold karta hai</b> jab tak naya message na aaye (ya timeout). Message aate hi jawab, phir client turant nayi request bhejta hai.',
    ws:'<b>WebSocket:</b> ek baar HTTP Upgrade handshake, phir <b>ek hi connection hamesha khula</b>. Server aur client dono kabhi bhi message bhej sakte hain (two-way). Chat, gaming ke liye best.',
    sse:'<b>Server-Sent Events:</b> ek khula HTTP stream jisme <b>sirf server → client</b> events aate hain. Live score, notifications ke liye simple. Client ko kuch bhejna ho to alag HTTP request.'
  };
  function upd(){ f.setStats({'Requests':st.req, 'Empty responses':st.empty, 'Delivered':st.del, 'Avg delay':(st.del ? (st.delay / st.del / 1000).toFixed(1) : '0.0') + ' s'}); sub(sv, pending.length + ' naye msg'); }
  function deliver(){ var now = performance.now(); pending.forEach(function(t){ st.delay += now - t; st.del++; }); var n = pending.length; pending = []; upd(); return n; }
  function schedule(my){
    ctx.after(rand(2500, 5000), function(){
      if (my !== gen) return;
      pending.push(performance.now()); upd(); flash(sv, 'hot', 400);
      if ((mode === 'ws' || mode === 'sse') && connected) push(my);
      schedule(my);
    });
  }
  async function push(my){ var n = deliver(); if (!n) return; await fly(ctx, f.stage, sv, cl, {cls:'okp', label:'push: ' + n + ' msg', dur:500}); if (my === gen) f.log('Server ne turant push kiya (delay ~0 s)', 'ok'); }
  async function shortLoop(my){
    while (ctx.alive && my === gen) {
      st.req++; upd();
      await fly(ctx, f.stage, cl, sv, {label:'kuch naya?', dur:450});
      if (my !== gen) return;
      if (pending.length) { var n = deliver(); await fly(ctx, f.stage, sv, cl, {cls:'okp', label:n + ' msg', dur:450}); }
      else { st.empty++; upd(); await fly(ctx, f.stage, sv, cl, {cls:'res', label:'nahi', dur:450}); }
      await ctx.wait(1500);
    }
  }
  async function longLoop(my){
    while (ctx.alive && my === gen) {
      st.req++; upd();
      await fly(ctx, f.stage, cl, sv, {label:'wait karo…', dur:450});
      if (my !== gen) return;
      sv.classList.add('hot'); wire.classList.add('held');
      var t0 = performance.now();
      while (ctx.alive && my === gen && !pending.length && performance.now() - t0 < 8000) await ctx.wait(100);
      sv.classList.remove('hot'); wire.classList.remove('held');
      if (my !== gen) return;
      if (pending.length) { var n = deliver(); await fly(ctx, f.stage, sv, cl, {cls:'okp', label:n + ' msg', dur:450}); }
      else { st.empty++; upd(); await fly(ctx, f.stage, sv, cl, {cls:'res', label:'timeout', dur:450}); }
    }
  }
  async function connect(my, sse){
    st.req++; upd();
    await fly(ctx, f.stage, cl, sv, {label:sse ? 'GET /stream' : 'HTTP Upgrade', dur:500});
    if (my !== gen) return;
    await fly(ctx, f.stage, sv, cl, {cls:'res', label:sse ? '200 event-stream' : '101 Switching', dur:500});
    if (my !== gen) return;
    connected = true; wire.classList.add(sse ? 'oneway' : 'open');
    f.log(sse ? 'SSE stream khul gaya: ab server events push karega' : 'WebSocket connection open: ab dono taraf se messages', 'ok');
    if (pending.length) push(my);
  }
  function setMode(m){
    mode = m; var my = ++gen; pending = []; connected = false; st = {req:0, empty:0, del:0, delay:0};
    wire.classList.remove('open', 'oneway', 'held'); sv.classList.remove('hot');
    f.say(EX[m]); f.clearLog(); upd();
    sendBtn.hidden = !(m === 'ws' || m === 'sse');
    schedule(my);
    if (m === 'short') shortLoop(my); else if (m === 'long') longLoop(my); else connect(my, m === 'sse');
  }
  seg(f, [['short','Short polling'], ['long','Long polling'], ['ws','WebSocket'], ['sse','SSE']], 'short', setMode, 'Technique');
  var sendBtn = button(f, 'Client se message', async function(){
    var my = gen;
    if (mode === 'ws' && connected) { await fly(ctx, f.stage, cl, sv, {label:'send (same socket)', dur:450}); if (my === gen) f.log('WebSocket: client ne usi connection par message bheja', 'acc'); }
    else if (mode === 'sse') { st.req++; upd(); await fly(ctx, f.stage, cl, sv, {label:'POST /msg', dur:450}); if (my === gen) f.log('SSE one-way hai: client ko alag HTTP POST bhejna pada', 'warn'); }
  });
  setMode('short');
});

/* ================= saga ================= */
reg('saga', function(root, ctx){
  var f = frame(root, {title:'Saga pattern: order ka distributed transaction', minH:150,
    explain:'Har service apna <b>local transaction</b> karti hai. Koi step fail hua to pichhle steps ke <b>compensating actions</b> ulte order me chalte hain (refund, cancel). Ek bada ACID transaction nahi, chhote-chhote steps.'});
  var S = [['Order', 'Order created', 'Order cancelled'], ['Payment', '₹499 deducted', '₹499 refunded'], ['Inventory', 'Stock reserved', 'Stock released'], ['Delivery', 'Rider assigned', '']];
  var orch = mk('edge', 'Saga Orchestrator', 'idle');
  var nodes = S.map(function(s){ return mk('svc', s[0] + ' Service', 'waiting'); });
  var row = el('div', 'saga-row'); nodes.forEach(function(n){ row.appendChild(n); });
  f.stage.appendChild(col(orch)); f.stage.appendChild(row);
  var gen = 0;
  function reset(){ nodes.forEach(function(n){ n.classList.remove('st-ok', 'st-bad', 'st-comp'); sub(n, 'waiting'); }); }
  async function run(fail){
    var my = ++gen; reset(); f.clearLog();
    sub(orch, 'running…');
    for (var i = 0; i < S.length; i++) {
      await fly(ctx, f.stage, orch, nodes[i], {label:'do', dur:500});
      if (my !== gen) return;
      if (fail && i === 2) {
        nodes[i].classList.add('st-bad'); sub(nodes[i], 'Out of stock!'); f.log('Inventory FAIL: stock khatam. Ab compensation shuru…', 'bad');
        await fly(ctx, f.stage, nodes[i], orch, {cls:'badp', label:'fail', dur:500});
        for (var j = i - 1; j >= 0; j--) {
          if (my !== gen) return;
          await fly(ctx, f.stage, orch, nodes[j], {cls:'c1', label:'undo', dur:500});
          if (my !== gen) return;
          nodes[j].classList.remove('st-ok'); nodes[j].classList.add('st-comp'); sub(nodes[j], S[j][2]);
          f.log('Compensate: ' + S[j][2], 'warn');
          await ctx.wait(350);
        }
        sub(orch, 'rolled back'); f.log('Saga khatam: system wapas consistent state me (paise refund, order cancel)', 'acc');
        return;
      }
      nodes[i].classList.add('st-ok'); sub(nodes[i], S[i][1]); f.log('Step ' + (i + 1) + ': ' + S[i][1], 'ok');
      await fly(ctx, f.stage, nodes[i], orch, {cls:'okp', label:'ok', dur:450});
      if (my !== gen) return;
    }
    sub(orch, 'completed'); f.log('Saga complete: order successfully place ho gaya', 'ok');
  }
  button(f, 'Happy path', function(){ run(false); }, true);
  button(f, 'Inventory fail karo', function(){ run(true); });
  ctx.after(500, function(){ run(false); });
});
