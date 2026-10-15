// Demos: replication, sharding, consistent hashing, CAP
import { reg, RM, el, esc, rand, ri, pick, hash, hash2, fmtNum, fmtBytes, cssVar, frame, button, seg, range, mk, sub, flash, center, fly, grid, col, nextId } from './core';

/* ================= replication ================= */
reg('replication', function(root, ctx){
  var f = frame(root, {title:'Leader-Follower replication', minH:270, explain:''});
  var client = mk('client', 'Client', 'app server');
  var dbs = [0, 1, 2].map(function(i){ var d = mk('db', 'N' + (i + 1), ''); d._v = 0; d._up = true; return d; });
  var g = grid('minmax(0,.8fr) minmax(0,1.3fr)');
  g.appendChild(col(client)); g.appendChild(col.apply(null, dbs));
  f.stage.appendChild(g);
  var leader = 0, mode = 'async', x = 0, busy = false;
  function draw(){
    dbs.forEach(function(d, i){
      d.querySelector('.nt').textContent = 'N' + (i + 1) + ' · ' + (!d._up ? 'Crashed' : i === leader ? 'Leader' : 'Follower');
      sub(d, 'x = ' + d._v + (d._up && i !== leader && d._v < dbs[leader]._v ? ' <b class="stale">stale</b>' : ''));
      d.classList.toggle('hot', i === leader && d._up); d.classList.toggle('down', !d._up);
    });
    f.setStats({'Latest x':x, 'Mode':mode.toUpperCase(), 'Leader':'N' + (leader + 1)});
  }
  var EX = {
    async:'<b>Async replication:</b> leader write karke turant "OK" bol deta hai, followers thodi der baad update hote hain. Fast, par follower se padhoge to <b>purana (stale)</b> data mil sakta hai, aur leader crash hua to last writes kho sakti hain.',
    sync:'<b>Sync replication:</b> leader tab tak "OK" nahi bolta jab tak followers confirm na karein. Data safe aur consistent, par har write <b>slow</b> ho jaata hai.'
  };
  async function write(){
    if (busy) return;
    var L = dbs[leader];
    if (!L._up) { f.log('Leader down hai! Failover ka wait kijiye.', 'bad'); return; }
    busy = true; var val = x + 1;
    await fly(ctx, f.stage, client, L, {label:'SET x=' + val, dur:600});
    if (!ctx.alive) return;
    L._v = val; x = val; draw();
    var fol = dbs.filter(function(d, i){ return i !== leader && d._up; });
    if (mode === 'sync') {
      await Promise.all(fol.map(function(d, k){ return fly(ctx, f.stage, L, d, {label:'x=' + val, dur:650 + k * 350}).then(function(){ d._v = val; draw(); }); }));
      await fly(ctx, f.stage, L, client, {cls:'okp', label:'OK', dur:600});
      f.log('SYNC write x=' + val + ': sab followers ke confirm ke baad OK (slow, ~3× latency)', 'ok');
      busy = false; return;
    }
    await fly(ctx, f.stage, L, client, {cls:'okp', label:'OK', dur:600});
    f.log('ASYNC write x=' + val + ': leader ne turant OK bola, followers baad me update honge', 'acc');
    busy = false;
    fol.forEach(function(d, k){
      ctx.after(900 + k * 1900, async function(){
        if (!L._up || !d._up) return;
        await fly(ctx, f.stage, L, d, {label:'x=' + val, dur:600});
        if (d._v < val && d._up) d._v = val; draw();
      });
    });
  }
  async function read(){
    var fs = dbs.filter(function(d, i){ return i !== leader && d._up; });
    if (!fs.length) { f.log('Koi follower available nahi', 'bad'); return; }
    var d = fs[fs.length - 1];
    await fly(ctx, f.stage, client, d, {label:'GET x', dur:600});
    var v = d._v;
    await fly(ctx, f.stage, d, client, {label:'x=' + v, cls:v < x ? 'badp' : 'okp', dur:600});
    if (!ctx.alive) return;
    f.log(v < x ? 'STALE READ: follower ne x=' + v + ' diya, latest x=' + x + ' hai (replication lag)' : 'Read OK: x=' + v + ' (latest)', v < x ? 'warn' : 'ok');
  }
  async function crash(){
    var L = dbs[leader];
    if (!L._up) return;
    L._up = false; draw(); f.log('Leader N' + (leader + 1) + ' crash ho gaya! Writes ruk gaye...', 'bad');
    await ctx.wait(1400);
    var c = dbs.map(function(d, i){ return [d, i]; }).filter(function(p){ return p[0]._up; }).sort(function(a, b){ return b[0]._v - a[0]._v; });
    if (!c.length) return;
    leader = c[0][1];
    if (dbs[leader]._v < x) { f.log('Failover: N' + (leader + 1) + ' naya leader, par uske paas x=' + dbs[leader]._v + ' tha. Last writes LOST (async ka risk)!', 'warn'); x = dbs[leader]._v; }
    else f.log('Failover: N' + (leader + 1) + ' ko promote karke naya leader banaya. Koi data loss nahi.', 'ok');
    draw();
  }
  async function recover(){
    var L = dbs[leader];
    for (var i = 0; i < dbs.length; i++) {
      var d = dbs[i];
      if (d._up) continue;
      d._up = true; draw(); f.log('N' + (i + 1) + ' wapas aaya, ab follower ban ke leader se catch-up karega', 'acc');
      await fly(ctx, f.stage, L, d, {label:'sync', dur:700});
      d._v = L._v; draw();
    }
  }
  seg(f, [['async','Async'], ['sync','Sync']], 'async', function(v){ mode = v; f.say(EX[v]); draw(); }, 'Replication mode');
  button(f, 'Write x+1', write, true);
  button(f, 'Read (follower se)', read);
  button(f, 'Leader crash', crash);
  button(f, 'Recover', recover);
  f.say(EX.async); draw();
});

/* ================= sharding ================= */
reg('sharding', function(root, ctx){
  var f = frame(root, {title:'Sharding: hash vs range', minH:240, explain:''});
  var ALL = ['Aarav', 'Ananya', 'Arjun', 'Aditi', 'Ayaan', 'Bhavya', 'Dev', 'Diya', 'Ishaan', 'Kabir', 'Meera', 'Neha', 'Om', 'Priya', 'Rohan', 'Sara', 'Tanvi', 'Vihaan', 'Zoya', 'Krish'];
  var keys = ALL.slice(0, 12), n = 3, strat = 'hash', moved = {};
  var box = el('div', 'shards');
  f.stage.appendChild(box);
  function shardOf(k, N){ if (strat === 'hash') return hash(k) % N; return Math.min(N - 1, Math.floor((k.charCodeAt(0) - 65) * N / 26)); }
  function rangeLabel(i){ var a = Math.ceil(i * 26 / n), b = Math.ceil((i + 1) * 26 / n) - 1; return String.fromCharCode(65 + a) + '–' + String.fromCharCode(65 + b); }
  function draw(){
    box.innerHTML = '';
    box.style.gridTemplateColumns = 'repeat(' + n + ', minmax(0,1fr))';
    var groups = []; for (var i = 0; i < n; i++) groups.push([]);
    keys.forEach(function(k){ groups[shardOf(k, n)].push(k); });
    var avg = keys.length / n, max = 0;
    groups.forEach(function(gp){ max = Math.max(max, gp.length); });
    groups.forEach(function(gp, i){
      var hot = gp.length === max && gp.length >= Math.max(4, avg * 1.6);
      var s = el('div', 'shard' + (hot ? ' hotspot' : ''), '<div class="shard-h"><b>Shard ' + (i + 1) + '</b><small>' + (strat === 'hash' ? 'hash % ' + n + ' = ' + i : 'naam ' + rangeLabel(i)) + '</small></div>');
      var list = el('div', 'shard-k');
      gp.forEach(function(k){ list.appendChild(el('span', 'chip-k' + (moved[k] ? ' moved' : ''), k)); });
      s.appendChild(list);
      s.appendChild(el('div', 'shard-f', gp.length + ' keys' + (hot ? ' · HOTSPOT!' : '')));
      box.appendChild(s);
    });
    f.setStats({'Keys':keys.length, 'Shards':n, 'Max/Min load':max + ' / ' + Math.min.apply(null, groups.map(function(x){ return x.length; }))});
  }
  function change(newN){
    var before = {}; keys.forEach(function(k){ before[k] = shardOf(k, n); });
    var oldN = n; n = newN; moved = {}; var c = 0;
    keys.forEach(function(k){ if (shardOf(k, n) !== before[k]) { moved[k] = 1; c++; } });
    draw();
    f.log(oldN + ' → ' + n + ' shards: ' + c + '/' + keys.length + ' keys ko move karna pada' + (strat === 'hash' && c > keys.length / 2 ? ' (hash % N ki problem, consistent hashing iska solution hai)' : ''), c > keys.length / 2 ? 'bad' : 'warn');
  }
  var EX = {
    hash:'<b>Hash sharding:</b> shard = hash(key) % N. Data barabar bat-ta hai. Par N badla (shard add/remove) to <b>zyadatar keys move</b> karni padti hain. Highlighted chips dekhiye.',
    range:'<b>Range sharding:</b> naam ke pehle letter se shard (A–I, J–R...). Range queries easy. Par bahut naam "A" se shuru hote hain, to ek shard par <b>hotspot</b> ban jaata hai.'
  };
  seg(f, [['hash','Hash'], ['range','Range']], 'hash', function(v){ strat = v; moved = {}; f.say(EX[v]); draw(); }, 'Strategy');
  button(f, '+ Shard', function(){ if (n < 5) change(n + 1); }, true);
  button(f, '− Shard', function(){ if (n > 2) change(n - 1); });
  button(f, '+ Users', function(){ if (keys.length < ALL.length) { var add = ALL.slice(keys.length, keys.length + 4); keys = keys.concat(add); moved = {}; add.forEach(function(k){ moved[k] = 1; }); draw(); f.log('Naye users add: ' + add.join(', '), 'acc'); } });
  f.say(EX.hash); draw();
});

/* ================= consistent hashing ================= */
reg('consistent-hashing', function(root, ctx){
  var f = frame(root, {title:'Consistent hashing ring', minH:320, explain:''});
  var COLORS = ['#F59F00', '#12B886', '#E64980', '#4DABF7', '#9775FA', '#FF922B'];
  var NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
  var nodes = ['A', 'B', 'C'], vn = false, keys = [], last = null;
  for (var i = 1; i <= 24; i++) keys.push('user' + i);
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 320 320'); svg.setAttribute('class', 'ax-svg ring');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Hash ring with nodes and keys');
  f.stage.appendChild(svg);
  var cx = 160, cy = 160, R = 112;
  function pos(s){ return hash2(s) % 3600 / 10; }
  function pt(deg, r){ var a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function points(){
    var p = [];
    nodes.forEach(function(nm){ (vn ? [1, 2, 3] : [0]).forEach(function(v){ p.push({n:nm, d:pos(v ? 'node-' + nm + '#' + v : 'node-' + nm), v:v}); }); });
    return p.sort(function(a, b){ return a.d - b.d; });
  }
  function owner(d, P){ for (var i = 0; i < P.length; i++) if (P[i].d >= d) return P[i].n; return P[0].n; }
  function assign(list){ var P = (function(){ var keep = nodes; nodes = list; var r = points(); nodes = keep; return r; })(); var o = {}; keys.forEach(function(k){ o[k] = owner(pos(k), P); }); return o; }
  function modN(list){ var o = {}; keys.forEach(function(k){ o[k] = list[hash(k) % list.length]; }); return o; }
  function color(nm){ return COLORS[NAMES.indexOf(nm)]; }
  function draw(mv){
    mv = mv || {};
    var P = points(), own = assign(nodes);
    var h = '<circle cx="160" cy="160" r="' + R + '" style="fill:none;stroke:var(--line-2);stroke-width:2;stroke-dasharray:3 5"/>';
    keys.forEach(function(k){ var q = pt(pos(k), R); h += '<circle class="kdot' + (mv[k] ? ' mv' : '') + '" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + (mv[k] ? 6.5 : 4.5) + '" style="fill:' + color(own[k]) + ';stroke:var(--card);stroke-width:1.5"/>'; });
    P.forEach(function(p){
      var q = pt(p.d, R), t = pt(p.d, R + 26), r = p.v ? 9 : 12;
      h += '<rect x="' + (q[0] - r).toFixed(1) + '" y="' + (q[1] - r).toFixed(1) + '" width="' + 2 * r + '" height="' + 2 * r + '" rx="4" style="fill:' + color(p.n) + ';stroke:var(--card);stroke-width:2"/>';
      h += '<text x="' + t[0].toFixed(1) + '" y="' + (t[1] + 4).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700">' + p.n + (p.v ? p.v : '') + '</text>';
    });
    h += '<text x="160" y="156" text-anchor="middle" font-size="12" style="fill:var(--ink-2)">' + keys.length + ' keys</text><text x="160" y="173" text-anchor="middle" font-size="11" style="fill:var(--ink-3)">clockwise owner</text>';
    svg.innerHTML = h;
    var cnt = {}; nodes.forEach(function(nm){ cnt[nm] = 0; }); keys.forEach(function(k){ cnt[own[k]]++; });
    var s = {'Load':nodes.map(function(nm){ return nm + ':' + cnt[nm]; }).join(' ')};
    if (last) { s['Moved (ring)'] = last[0] + '/' + keys.length; s['Moved (mod N)'] = last[1] + '/' + keys.length; }
    f.setStats(s);
  }
  function change(list){
    var a = assign(nodes), b = assign(list), ma = modN(nodes), mb = modN(list);
    var mv = {}, c = 0, cm = 0;
    keys.forEach(function(k){ if (a[k] !== b[k]) { mv[k] = 1; c++; } if (ma[k] !== mb[k]) cm++; });
    nodes = list; last = [c, cm]; draw(mv);
    f.log('Ring: ' + c + ' keys move hui. Agar hash % N hota to ' + cm + ' keys move hoti.', c < cm ? 'ok' : 'warn');
  }
  f.say('Nodes aur keys dono ek <b>ring</b> par hash hote hain. Har key <b>clockwise</b> chalke pehle node ki hoti hai. Node add/remove karne par sirf <b>pados ki keys</b> move hoti hain. <b>Virtual nodes</b> ON karke load barabar hota dekhiye.');
  button(f, '+ Node', function(){ if (nodes.length < 6) { var nx = NAMES.filter(function(x){ return nodes.indexOf(x) < 0; })[0]; change(nodes.concat([nx])); } }, true);
  button(f, '− Node', function(){ if (nodes.length > 2) change(nodes.slice(0, -1)); });
  seg(f, [['off','Virtual nodes OFF'], ['on','ON (×3)']], 'off', function(v){ vn = v === 'on'; last = null; draw(); f.log(vn ? 'Virtual nodes ON: har server ring par 3 jagah, load zyada barabar' : 'Virtual nodes OFF', 'acc'); }, 'Virtual nodes');
  draw();
});

/* ================= CAP ================= */
reg('cap', function(root, ctx){
  var f = frame(root, {title:'CAP: network partition me kya choose karein', minH:110, explain:''});
  var c1 = mk('client', 'Client 1', 'write'), n1 = mk('db', 'Node 1', 'x = 1'), n2 = mk('db', 'Node 2', 'x = 1'), c2 = mk('client', 'Client 2', 'read');
  var link = el('div', 'wire cap-link');
  var g = grid('minmax(0,.8fr) minmax(0,1fr) minmax(24px,.5fr) minmax(0,1fr) minmax(0,.8fr)');
  g.appendChild(col(c1)); g.appendChild(col(n1)); g.appendChild(link); g.appendChild(col(n2)); g.appendChild(col(c2));
  f.stage.appendChild(g);
  var v1 = 1, v2 = 1, part = false, mode = 'cp', busy = false;
  function draw(){ sub(n1, 'x = ' + v1); sub(n2, 'x = ' + v2 + (v2 !== v1 ? ' <b class="stale">stale</b>' : '')); link.classList.toggle('cut', part); f.setStats({'Mode':mode.toUpperCase(), 'Partition':part ? 'Haan' : 'Nahi', 'In sync':v1 === v2 ? 'Haan' : 'Nahi'}); }
  var EX = {cp:'<b>CP (Consistency + Partition tolerance):</b> partition ke time system galat/purana data dene se behtar <b>error</b> deta hai. Banking, payments, inventory jaise systems.',
            ap:'<b>AP (Availability + Partition tolerance):</b> partition ke time bhi har node jawab deta hai, chahe data <b>purana</b> ho. Baad me sync ho jaata hai (eventual consistency). Social feed, likes, DNS.'};
  async function write(){
    if (busy) return; busy = true;
    var val = v1 + 1;
    await fly(ctx, f.stage, c1, n1, {label:'SET x=' + val, dur:550});
    if (!part) {
      v1 = val; draw();
      await fly(ctx, f.stage, n1, n2, {label:'replicate', dur:550}); v2 = val; draw();
      await fly(ctx, f.stage, n1, c1, {cls:'okp', label:'OK', dur:550});
      f.log('Write x=' + val + ': dono nodes updated', 'ok');
    } else if (mode === 'cp') {
      await fly(ctx, f.stage, n1, n2, {label:'replicate', dur:500, part:0.5, fade:true});
      await fly(ctx, f.stage, n1, c1, {cls:'badp', label:'ERROR', dur:550});
      f.log('CP: Node 2 tak pahunch nahi sakte, isliye write REJECT. Consistency bachi, availability gayi.', 'bad');
    } else {
      v1 = val; draw();
      await fly(ctx, f.stage, n1, n2, {label:'replicate', dur:500, part:0.5, fade:true});
      await fly(ctx, f.stage, n1, c1, {cls:'okp', label:'OK', dur:550});
      f.log('AP: write ACCEPT on Node 1, par Node 2 ko khabar nahi. Nodes out of sync.', 'warn');
    }
    busy = false;
  }
  async function read(){
    if (busy) return; busy = true;
    await fly(ctx, f.stage, c2, n2, {label:'GET x', dur:550});
    if (part && mode === 'cp') { await fly(ctx, f.stage, n2, c2, {cls:'badp', label:'unavailable', dur:550}); f.log('CP: Node 2 confirm nahi kar sakta ki uska data latest hai, isliye ERROR.', 'bad'); }
    else { var stale = v2 !== v1; await fly(ctx, f.stage, n2, c2, {cls:stale ? 'badp' : 'okp', label:'x=' + v2, dur:550}); f.log(stale ? 'AP: Node 2 ne purana x=' + v2 + ' diya (latest ' + v1 + '). Available, par stale.' : 'Read x=' + v2 + ' (latest)', stale ? 'warn' : 'ok'); }
    busy = false;
  }
  async function togglePart(){
    if (busy) return;
    part = !part; draw();
    pb.textContent = part ? 'Network jodo' : 'Network kaato';
    if (part) { f.log('Network PARTITION! Node 1 aur Node 2 ek doosre se baat nahi kar sakte.', 'bad'); return; }
    if (v1 !== v2) { busy = true; await fly(ctx, f.stage, n1, n2, {label:'sync x=' + v1, dur:650}); v2 = v1; draw(); busy = false; f.log('Partition heal: nodes sync ho gaye (eventual consistency)', 'ok'); }
    else f.log('Network wapas jud gaya', 'ok');
  }
  seg(f, [['cp','CP'], ['ap','AP']], 'cp', function(v){ mode = v; f.say(EX[v]); draw(); }, 'Choice');
  button(f, 'Write (Node 1)', write, true);
  button(f, 'Read (Node 2)', read);
  var pb = button(f, 'Network kaato', togglePart);
  f.say(EX.cp); draw();
});
