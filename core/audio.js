/* 音。全部由现成振荡器现场发，不加载任何采样，断网照样响。
 *
 * 规矩：
 *   - 音阶不写死：事件换界时由谱层送来一条 MODES 表，旋律的骨相跟着换。
 *   - 音色不是一个：五种内置 + 现场导入的（JSON，见 TSPEC）。
 *     每个事件带一个音色池，落笔的笔序在池里轮换。
 *   - 声部是多的：主旋律 / 三度叠置 / 琶音 / 低音 / 泛音闪光，各唱各的拍。
 *     谱层决定「唱哪个音、什么时候唱」，这一层只负责把半音数唱出质感。
 *   - 有间：一条 0.34s 的反馈延迟当房间，反馈里挂低通。没有采样，没有卷积。
 *   - 没有交互音。屏保不等人按键。
 *
 * 一条硬规矩（踩过，真机上是一声巨响）：
 *   **上下文没有真的跑起来之前，一个音符都不排。**
 *   早先 voice() 里先 ensure() 再排，于是预热的上千笔全排在 currentTime = 0；
 *   用户第一次点屏幕、上下文 resume 的那一瞬，上千个振荡器同时起振——
 *   就是启动时那声「咚」。现在三道闸：
 *     1. 没手势不建上下文（ensure 只由 unlock 调）；
 *     2. 状态不是 running 就直接丢弃，不排队；
 *     3. 每秒 26 声的限流兜底（后台回来、长掉帧时的一次性冲击）。
 */
window.BT = window.BT || {};

BT.audio = (function () {
  var ac = null, master = null, dry = null, send = null, delay = null, damp = null;
  var mode = [0, 2, 4, 7, 9];
  var root = 220;
  var ti = 0;
  var BASE = 0.15;          // 主音量
  var LIMIT = 26, WINDOW = 1.0;
  var times = [];
  var KEY = 'shore.timbres.v1';

  /* 五种内置音色。partial 是分音倍率（钟的泛音列），cut 是低通截止（簧片的闷），
     atk 是起音（pad 的慢醒）。没有采样，没有文件，全是振荡器的物理。 */
  var BUILTIN = [
    { name: '玻璃', type: 'sine',     dur: 0.85, gain: 0.30, atk: 0.008, partial: 3.002, pmix: 0.24 },
    { name: '木鱼', type: 'triangle', dur: 0.55, gain: 0.26, atk: 0.006 },
    { name: '簧片', type: 'sawtooth', dur: 0.50, gain: 0.13, atk: 0.010, cut: 2100 },
    { name: '管',   type: 'square',   dur: 0.80, gain: 0.10, atk: 0.012, partial: 1.502, pmix: 0.12, cut: 2200 },
    { name: '长垫', type: 'sine',     dur: 2.10, gain: 0.18, atk: 0.180 }
  ];
  var TIMBRES = BUILTIN.slice();

  /* 两个「声部专用」音色：不进音色池，所以 timbreCount 仍然是 5。 */
  var BASS = { name: '低音', type: 'sine', dur: 2.60, gain: 0.17, atk: 0.055, cut: 380,
               harm: [[2.0, 0.22]] };
  var SHIM = { name: '闪光', type: 'sine', dur: 0.70, gain: 0.09, atk: 0.004,
               harm: [[2.002, 0.55], [4.01, 0.22]] };

  /* 导入规约。越界一律夹紧，不拒绝——音色是给人玩的，不是给人交作业的。 */
  var TSPEC = {
    types: ['sine', 'triangle', 'sawtooth', 'square'],
    pool: 32,        // 池子上限（内置 5 + 最多 27 个导入）
    harm: 8,         // 每个音色最多几个分音
    dur: [0.05, 6], gain: [0.01, 0.5], atk: [0.001, 1.5],
    cut: [0, 12000], det: [-40, 40], ratio: [0.5, 16], pmix: [0, 1]
  };

  function num(v, lo, hi, def) {
    v = parseFloat(v);
    if (!isFinite(v)) return def;
    return v < lo ? lo : (v > hi ? hi : v);
  }
  function wrap(v, n) { return ((v % n) + n) % n; }

  /* ---- 上下文。只有 unlock() 能建。 ---- */
  function ensure() {
    if (ac) return ac;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = BASE * 0.9;
      master.connect(ac.destination);
      dry = ac.createGain();
      dry.gain.value = 0.86;
      dry.connect(master);
      /* 房间：干声 86%，另一路进 0.34s 延迟，反馈里挂低通——尾巴越回越暗。 */
      send = ac.createGain();
      send.gain.value = 0.22;
      delay = ac.createDelay(1.0);
      delay.delayTime.value = 0.34;
      damp = ac.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 1600;
      var fb = ac.createGain();
      fb.gain.value = 0.30;
      send.connect(delay);
      delay.connect(damp);
      damp.connect(master);
      delay.connect(fb);
      fb.connect(delay);
    } catch (e) { ac = null; }
    return ac;
  }
  /* 只有真的在跑，才算有上下文。这一句就是那声「咚」的解药。 */
  function live() { return ac && ac.state === 'running' ? ac : null; }

  function allow(t0) {
    while (times.length && t0 - times[0] > WINDOW) times.shift();
    if (times.length >= LIMIT) return false;
    times.push(t0);
    return true;
  }

  function freq(semi) { return root * Math.pow(2, semi / 12); }

  function osc(c, type, f, det, amp, dest, t0, stop) {
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    if (det && o.detune) o.detune.value = det;
    g.gain.value = amp;
    o.connect(g);
    g.connect(dest);
    o.start(t0);
    o.stop(stop);
  }

  /* 一口气 = 主振 + 任意分音 + 可选低通 + 一条包络 + 一点房间。 */
  function voice(semi, t, gm, at) {
    var c = live();
    if (!c) return;
    var t0 = c.currentTime + (at || 0);
    if (!allow(t0)) return;
    var f0 = freq(semi);
    if (!isFinite(f0) || f0 < 16 || f0 > 12000) return;
    var amp = Math.max(0.0006, (t.gain || 0.2) * (gm === undefined ? 1 : gm));
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(amp, t0 + (t.atk || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (t.dur || 0.8));
    var stop = t0 + (t.dur || 0.8) + 0.06;

    osc(c, t.type, f0, t.det, 1, g, t0, stop);
    var hs = t.harm;
    if (!hs && t.partial) hs = [[t.partial, t.pmix]];
    if (hs) {
      var n = Math.min(hs.length, TSPEC.harm);
      for (var i = 0; i < n; i++) {
        osc(c, t.type, f0 * hs[i][0], t.det, hs[i][1], g, t0, stop);
      }
    }
    var out = g;
    if (t.cut) {
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = t.cut;
      g.connect(f);
      out = f;
    }
    out.connect(dry);
    out.connect(send);
  }

  function pick(i) {
    if (i === undefined || i === null) return TIMBRES[wrap(ti, TIMBRES.length)];
    return TIMBRES[wrap(i, TIMBRES.length)];
  }

  /* ---- 导入。 ---- */
  function normalize(one, i) {
    if (!one || typeof one !== 'object') return null;
    var type = String(one.type || 'sine').toLowerCase();
    if (TSPEC.types.indexOf(type) < 0) type = 'sine';
    var harm = [], src = one.harm || one.harmonics, j, p, r, g;
    if (Object.prototype.toString.call(src) === '[object Array]') {
      for (j = 0; j < src.length && harm.length < TSPEC.harm; j++) {
        p = src[j];
        if (Object.prototype.toString.call(p) !== '[object Array]') continue;
        r = num(p[0], TSPEC.ratio[0], TSPEC.ratio[1], 0);
        g = num(p[1], 0, 1, 0);
        if (r > 0 && g > 0) harm.push([r, g]);
      }
    } else if (one.partial) {
      r = num(one.partial, TSPEC.ratio[0], TSPEC.ratio[1], 0);
      g = num(one.pmix, TSPEC.pmix[0], TSPEC.pmix[1], 0.2);
      if (r > 0 && g > 0) harm.push([r, g]);
    }
    return {
      name: String(one.name || ('导入 ' + i)).slice(0, 24),
      type: type,
      dur: num(one.dur, TSPEC.dur[0], TSPEC.dur[1], 0.8),
      gain: num(one.gain, TSPEC.gain[0], TSPEC.gain[1], 0.2),
      atk: num(one.atk, TSPEC.atk[0], TSPEC.atk[1], 0.01),
      cut: num(one.cut, TSPEC.cut[0], TSPEC.cut[1], 0),
      det: num(one.det, TSPEC.det[0], TSPEC.det[1], 0),
      harm: harm,
      src: 'import'
    };
  }

  function save() {
    try {
      var keep = [];
      for (var i = 0; i < TIMBRES.length; i++) if (TIMBRES[i].src === 'import') keep.push(TIMBRES[i]);
      window.localStorage.setItem(KEY, JSON.stringify(keep));
    } catch (e) {}
  }
  function restore() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) {}
    if (raw) add(raw, true);
  }

  function add(input, silent) {
    var data = input;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); }
      catch (e) { return { ok: false, added: 0, bad: 0, total: TIMBRES.length, error: 'JSON 解析失败' }; }
    }
    var list;
    if (Object.prototype.toString.call(data) === '[object Array]') list = data;
    else if (data && Object.prototype.toString.call(data.timbres) === '[object Array]') list = data.timbres;
    else if (data && typeof data === 'object') list = [data];
    else list = [];

    var added = 0, bad = 0;
    for (var i = 0; i < list.length; i++) {
      if (TIMBRES.length >= TSPEC.pool) { bad += list.length - i; break; }
      var t = normalize(list[i], TIMBRES.length);
      if (t) { TIMBRES.push(t); added++; } else bad++;
    }
    if (added && !silent) save();
    return { ok: added > 0, added: added, bad: bad, total: TIMBRES.length };
  }

  restore();

  return {
    unlock: function () {
      if (!ensure()) return false;
      if (ac.state === 'suspended' && ac.resume) { try { ac.resume(); } catch (e) {} }
      return true;
    },
    running: function () { return !!live(); },
    setMode: function (m) { if (m && m.length) mode = m; },
    setRoot: function (f) { if (f > 0) root = f; },
    setTimbre: function (i) { ti = wrap(i, TIMBRES.length); },
    timbreCount: function () { return TIMBRES.length; },
    timbres: function () { return TIMBRES.map(function (t) { return t.name; }); },
    /* 给面板做提示、给测试做检查用：一份拷贝，改不动里面的表。 */
    timbreAt: function (i) {
      var t = TIMBRES[wrap(i, TIMBRES.length)];
      return t ? JSON.parse(JSON.stringify(t)) : null;
    },
    importTimbres: function (x) { return add(x, false); },
    clearTimbres: function () {
      TIMBRES = BUILTIN.slice();
      try { window.localStorage.removeItem(KEY); } catch (e) {}
      return TIMBRES.length;
    },
    modeCount: function () { return mode.length; },

    /* 五个声部。i 是音色下标（不传就用当前音色），gm 是相对音量，
       at 是相对现在的延迟（秒）——琶音靠它稍微晚一点，像拨弦。 */
    land: function (s, i, gm) { voice(s, pick(i), gm === undefined ? 1 : gm); },
    harm: function (s, i, gm) { voice(s, pick(i), gm === undefined ? 0.5 : gm); },
    arp:  function (s, i, gm) { voice(s, pick(i), gm === undefined ? 0.32 : gm, 0.055); },
    bass: function (s, gm) { voice(s, BASS, gm === undefined ? 0.9 : gm); },
    shim: function (s, gm) { voice(s, SHIM, gm === undefined ? 0.55 : gm, 0.02); },
    mark: function (s, i) {
      var t = pick(i);
      voice(s, t, 1.1);
      voice(s + 7, t, 0.7);
    },
    bell: function (s) { voice(s + 12, TIMBRES[0], 0.9); voice(s + 19, TIMBRES[0], 0.4); },
    pad: function (s) { voice(s, TIMBRES[4], 1); voice(s + 7, TIMBRES[4], 0.5); }
  };
})();
