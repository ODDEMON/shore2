/* 汇流与自检。电波版的总台。
 *
 * 岸不留，册留这一套内核与再版一字不差：粒子生命场驱动、零种子、零地址回放、
 * 只把卷号 / 墨 / 工序 / 版样落盘。换掉的是纸面：暖横格纸换成高对比多巴胺色板，
 * 并且多了一层把粒子群动能翻译成信号干扰的电波层（world/mod/denpa.js）。
 *
 *   · 世界仍然是活的：活状态递推 + 粒子生命场（core/life.js）的连续扰动，
 *     不掷骰子、不播种子、不驯化、不复现、不按地址重放。
 *     每次开卷从这一刻重新长起，刷新即新的一卷，这是生命感的底线。
 *   · 册是留的：卷号、批注过的工序、录下的版样、攒下的墨，写进 localStorage。
 *     画面一个字节都不存，存档不替世界记几何。
 *   · 人可以做三件事：补录版样（E）、回望历史（← →）、翻册页（TAB）。
 *     界末不再递校样单，工序静默沿用上一道。外加一代的三件：
 *     B 低烈度（电波层的频闪与爆发一并归零）、C 调音台、F 全屏。
 *     不做拖动、不做滚轮、不做落笔——岸自己长，人不替它画。
 *
 * 视野默认仍是「完美跟随」：镜头每帧硬锁定生成前沿，笔尖恒在屏幕 84% 处。
 * 回望是另一条路：镜头脱离前沿，逐幅翻已经冻结的历史；岸仍在右边继续长，
 * 它不等你，这正是展品该有的样子。
 *
 * 地址栏只读 low / ff / panel / cam。不读、也不写回任何可分享的种子：
 * 没有种子，就没有「同一行字原样重现」这回事。
 *
 * 自检在最后：挂不上 score 就什么都不做，让页面空着，也不要假装有世界。 */
(function () {
  function readHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var out = { low: 0, ff: 0, panel: 0, cam: '' };
    h.split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0] === 'low') out.low = p[1] === '1' ? 1 : 0;
      if (p[0] === 'ff') out.ff = /^[0-9]+(\.[0-9]+)?$/.test(p[1]) ? parseFloat(p[1]) : 0;
      if (p[0] === 'panel') out.panel = p[1] === '1' ? 1 : 0;
      if (p[0] === 'cam' && /^[a-z]+$/.test(p[1] || '')) out.cam = p[1];
      /* 不读任何能复现世界的键：岸是活的，不是一段被回放的录像。 */
    });
    var clean = [out.low ? 'low=1' : '', out.ff ? 'ff=' + out.ff : '',
                 out.panel ? 'panel=1' : '', out.cam ? 'cam=' + out.cam : '']
                .filter(Boolean).join('&');
    try { history.replaceState(null, '', '#' + clean); } catch (e) {}
    return out;
  }

  var hash = readHash();
  /* 低烈度是逃生门：连册页的读数与页饰也一起收一档。 */
  if (document.body) document.body.classList.toggle('low', !!hash.low);
  var store = BT.store, sim = BT.sim, bus = BT.bus;

  /* 开卷：册子翻过一页。岸从世界生日重新长，卷号却只增不减。 */
  var saved = store.read();
  var volume = (saved.volume || 0) + 1;
  store.write({ volume: volume });
  saved.volume = volume;

  var ctx = {
    audio: BT.audio, gen: BT.gen, bus: bus, store: store, sim: sim, ui: BT.ui,
    options: { lowPower: hash.low, panel: hash.panel },
    setCamMode: setCamMode,
    camMode: function () { return camMode; },
    toggleFullscreen: toggleFullscreen,
    isFullscreen: function () { return !!fsNow(); },
    syncFsBtn: syncFsBtn
  };

  /* 演算先起，模块挂载时读到的卷号才是这一卷的卷号。 */
  sim.init(saved);
  /* 校样单已撤。界末不再把一张工单递到眼前：直接沿用上一道工序，
     工序照样记进册、倍率照样变，只是没有人被问。展品不等人，现在连问都不问。 */
  bus.on('chapter:due', function () { sim.pick(sim.lastPick(), true); });
  BT.reg.start(ctx);

  var score = ctx.score;
  if (!score) return;
  var T = BT.SCORE_TABLES;

  /* 展品一上电先自己长一段。世界有生日，镜头前没有历史就是一片空；
     #ff= 只把这段预热换成指定的深度。上限一小时，免得一次推到内存里出不来。
     预热期间幅钩子还没挂：岸比人先到的这二十幅不记进玩家的欠账。 */
  var pre = hash.ff > 0 ? hash.ff : T.VIEW.preheat;
  var steps = Math.min(T.VIEW.maxFF * 20, pre * 20);
  for (var fi = 0; fi < steps; fi++) score.step(0.05, fi * 0.05);
  /* 按秒预热不保证幅数：补到声明的幅数为止，镜头前才真有一段可以回望。 */
  var extra = 0;
  while (score.done() < T.VIEW.preheatPanels && extra++ < 40000) {
    score.step(0.05, (steps + extra) * 0.05);
  }

  /* 册子与岸对齐幅号，然后从这一刻起每写完一幅记一笔账。 */
  sim.syncPanels(score.done());
  score.setPanelHook(function (done, snap) { sim.onPanel(done, snap); });

  var stage = document.getElementById('stage');
  var W = 800, H = 600;
  /* 三层构成占 44 格，把地面压到 88% 处，画面上方固定留出约四分之一空。 */
  var GROUND = 0.88;
  var cam = { x: 0, cell: 0, baseCell: 0 };
  var panelMode = 'follow', browsePanel = 0;

  var camMode = T.CAM.modes[hash.cam] ? hash.cam : T.CAM.defaultMode;
  function camModeDef() { return T.CAM.modes[camMode] || T.CAM.modes[T.CAM.defaultMode]; }
  function camTarget() {
    var m = camModeDef();
    var cell = cam.cell || cam.baseCell || 13;
    return score.frontierX() + m.offset - W * (T.CAM.anchor - 0.5) / cell;
  }
  function browseTarget() {
    var cell = cam.cell || cam.baseCell || 13;
    return (browsePanel + 0.5) * T.SPAN - W * (T.CAM.anchor - 0.5) / cell;
  }

  function resize() {
    W = window.innerWidth || 800;
    H = window.innerHeight || 600;
    stage.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    cam.baseCell = BT.u.clamp(H / 56, 6, 32);
    if (!cam.cell) cam.cell = cam.baseCell;
    var sky = document.getElementById('sky');
    sky.setAttribute('x', '0');
    sky.setAttribute('y', '0');
    sky.setAttribute('width', String(W));
    sky.setAttribute('height', String(H));
    paintPaper();
  }
  function applyView() {
    score.setView({ x: cam.x, cell: cam.cell, groundY: H * GROUND, w: W });
  }
  /* 纸与页饰吃同一副取景：同一条地脚线、同一个焦距、同一个镜头 x。 */
  function paintPaper(now) {
    var v = { x: cam.x, cell: cam.cell, w: W, h: H,
              groundY: H * GROUND, now: now || 0 };
    if (ctx.paper) ctx.paper.sync(v);
    if (ctx.folio) ctx.folio.sync(v);
  }
  window.addEventListener('resize', resize);
  resize();
  /* 首帧之前就把镜头坐到前沿上，不留一段从世界生日爬过来的滑动。 */
  cam.x = camTarget();
  paintPaper(0);

  /* 切档立刻把镜头坐到新目标上，不留一段追过去的过渡。 */
  function setCamMode(id) {
    if (!T.CAM.modes[id]) return false;
    camMode = id;
    if (ctx.panel) ctx.panel.syncCam(id);
    store.write({ cam: id });
    cam.x = camTarget();
    applyView();
    return true;
  }
  function buildPanel() { return ctx.panel ? ctx.panel.build() : null; }

  /* ---- 回望。脱离生成前沿，逐幅翻已经冻结的历史；岸仍在右边继续长。 ---- */
  function enterBrowse() {
    if (panelMode === 'browse') return false;
    var pay = sim.spend('rewind');
    if (!pay.ok) return false;
    browsePanel = Math.max(0, score.cur() - 2);
    panelMode = 'browse';
    store.write({ panelMode: 'browse' });
    if (ctx.hud) { ctx.hud.setMode('回望 ' + BT.ui.pad(browsePanel, 4)); ctx.hud.wake(); }
    bus.emit('view:browse', { panel: browsePanel });
    return true;
  }
  function exitBrowse() {
    if (panelMode === 'follow') return false;
    panelMode = 'follow';
    store.write({ panelMode: 'follow' });
    cam.x = camTarget();
    applyView();
    if (ctx.hud) { ctx.hud.setMode('跟随'); ctx.hud.wake(); }
    bus.emit('view:follow', {});
    return true;
  }
  function stepBrowse(d) {
    if (panelMode !== 'browse') { if (d > 0) return enterBrowse(); return false; }
    browsePanel = Math.max(0, Math.min(Math.max(0, score.cur() - 1), browsePanel + d));
    if (ctx.hud) ctx.hud.setMode('回望 ' + BT.ui.pad(browsePanel, 4));
    bus.emit('view:browse', { panel: browsePanel });
    return true;
  }

  /* ---- 补录。只拾岸上真实出现过的构造，不另抽一次奖。 ---- */
  function logFirst(id) {
    var snap = score.finishedSnap();
    var st = sim.state();
    var list = sim.offer(st.panels, snap).filter(function (o) { return !o.logged; });
    var target = null, i;
    if (id !== undefined && id !== null) {
      for (i = 0; i < list.length; i++) if (list[i].id === id) target = list[i];
    } else target = list[0];
    if (!target) return { ok: false, reason: '此幅没有可补录的新版样' };
    var r = sim.logSpecimen(target.id, st.panels);
    if (r.ok) {
      saveNow();
      if (ctx.hud) ctx.hud.wake();
      if (ctx.archive && ctx.archive.visible()) ctx.archive.refresh();
    }
    return r;
  }
  function saveNow() {
    store.write(sim.snapshot());
  }

  /* ---- 总线接线。各模块谁都不点名谁，这里只把「说出口」和「落下去」对上。 ---- */
  bus.on('agenda:pick', function (p) {
    var knobs = p.knobs || sim.agendaKnobs(p.id), k;
    if (knobs) for (k in knobs) if (knobs.hasOwnProperty(k)) score.setKnob(k, knobs[k]);
    saveNow();
    if (ctx.hud) ctx.hud.sync();
  });
  bus.on('specimen:logged', saveNow);
  bus.on('ink:spend', saveNow);
  bus.on('chapter:due', saveNow);
  bus.on('ui:log-first', function (p) { logFirst(p && p.id); });
  bus.on('ui:rewind', function () { enterBrowse(); });
  bus.on('ui:reprint', function () {
    var pay = sim.spend('reprint');
    if (!pay.ok) return;
    sim.pick(sim.lastPick(), true, false);
    saveNow();
  });
  bus.on('ui:reset-book', function () {
    var v = sim.state().volume;
    store.reset();
    sim.init({ volume: v });
    sim.syncPanels(score.done());
    saveNow();
    if (ctx.hud) { ctx.hud.sync(); ctx.hud.wake(); }
    if (ctx.archive) ctx.archive.refresh();
    bus.emit('book:reset', { volume: v });
  });

  /* ---- 灯。第十七稿：光只留在建筑站的那条地平线上。
     一条宽光带 + 一枚光穹 + 三层极扁的灯带（每层软晕 + 亮芯）。
     全部是渐变与几何：没有 filter、没有 transform，无头渲染链断不掉。 ---- */
  var NS = 'http://www.w3.org/2000/svg';
  var HAL = T.HALO;
  var BAR = HAL.bars;
  var glowG = document.getElementById('glow');
  var fogTop = document.getElementById('fogTop');
  var fogBot = document.getElementById('fogBot');

  function ell(group) {
    var e = document.createElementNS(NS, 'ellipse');
    e.setAttribute('cx', '0'); e.setAttribute('cy', '0');
    e.setAttribute('rx', '0'); e.setAttribute('ry', '0');
    group.appendChild(e);
    return e;
  }
  function stop(id, color, op) {
    var s = document.getElementById(id);
    if (!s) return;
    s.setAttribute('stop-color', color);
    s.setAttribute('stop-opacity', String(op));
  }
  function tint(id, color) {
    var s = document.getElementById(id);
    if (s) s.setAttribute('stop-color', color);
  }
  function put(e, px, py, rx, ry, fill, op) {
    e.setAttribute('cx', px.toFixed(1));
    e.setAttribute('cy', py.toFixed(1));
    e.setAttribute('rx', Math.max(0, rx).toFixed(1));
    e.setAttribute('ry', Math.max(0, ry).toFixed(1));
    e.setAttribute('fill', fill);
    e.setAttribute('fill-opacity', op.toFixed(4));
  }
  function hide(e) { e.setAttribute('rx', '0'); e.setAttribute('ry', '0'); }

  var bandEl = document.createElementNS(NS, 'rect');
  bandEl.setAttribute('id', 'band');
  bandEl.setAttribute('fill', 'url(#gband)');
  glowG.appendChild(bandEl);
  var domeEl = ell(glowG);
  domeEl.setAttribute('id', 'dome');
  var bars = [];
  for (var bi = 0; bi < BAR; bi++) bars.push({ soft: ell(glowG), core: ell(glowG) });

  function syncLight(now) {
    var L = score.light(now);
    var power = L.intensity * (score.lowPower() ? 0.35 : 1);
    var gy = H * GROUND;
    var pulse = 0.70 + 0.30 * L.pulse;
    var i, b, cx, cy, rx;

    var lc = T.mix(HAL.warm, L.neon, HAL.hue);
    var by2 = H * 0.42;
    bandEl.setAttribute('x', '0');
    bandEl.setAttribute('y', by2.toFixed(1));
    bandEl.setAttribute('width', String(W));
    bandEl.setAttribute('height', (H - by2).toFixed(1));
    stop('gbandA', lc, 0);
    stop('gbandB', lc, (HAL.rise * 0.22 * power * pulse).toFixed(4));
    stop('gbandC', lc, (HAL.rise * power * pulse).toFixed(4));
    stop('gbandD', lc, 0);

    var veil = (HAL.veil * (0.30 + 0.70 * power)).toFixed(4);
    stop('fogTa', L.bg, veil); stop('fogTb', L.bg, 0);
    stop('fogBa', L.bg, 0); stop('fogBb', L.bg, veil);

    tint('gd0a', lc); tint('gd0b', lc); tint('gd0c', lc);
    put(domeEl, W * 0.5 + W * 0.06 * L.drift, gy,
        W * HAL.domeRx * (0.96 + 0.04 * pulse), H * HAL.domeRy,
        'url(#gd0)', HAL.dome * power * pulse);

    var cols = [T.mix(L.neon, L.core, 0.25), L.neon2, L.core];
    for (i = 0; i < bars.length; i++) {
      b = bars[i];
      if (i >= L.count || power < 0.02) { hide(b.soft); hide(b.core); continue; }
      cx = W * (0.50 + 0.13 * Math.sin(now * 0.042 + i * 1.9) + 0.05 * L.drift);
      cy = gy - (1.2 + i * 2.6) * (cam.cell || 13);
      rx = W * (HAL.spread + HAL.spreadGrow * i) * (0.93 + 0.07 * pulse);
      tint('gb' + i + 'a', cols[i]);
      tint('gb' + i + 'b', cols[i]);
      put(b.soft, cx, cy, rx, H * 0.028 * (1 + i * 0.22) * pulse,
          'url(#gb' + i + ')', 0.55 * power);
      put(b.core, cx, cy, rx * 0.98, Math.max(1.2, H * 0.0042),
          'url(#gb' + i + ')', 0.95 * power * pulse);
    }
  }

  /* ---- 全屏。F 键、右下角那枚极淡的字、调音台里的同一开关，汇到一个 toggle。
     浏览器要求用户手势，所以不做预置。进/出自己重算取景，不等 resize 事件。 */
  function fsNow() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function fsCall(fn, hostel) {
    if (!fn) return;
    var out;
    try { out = fn.call(hostel); } catch (e) { return; }
    if (out && typeof out.catch === 'function') out.catch(function () {});
  }
  function toggleFullscreen() {
    var root = document.documentElement;
    if (fsNow()) fsCall(document.exitFullscreen || document.webkitExitFullscreen, document);
    else fsCall(root.requestFullscreen || root.webkitRequestFullscreen, root);
    syncFsBtn();
  }
  function syncFsBtn() {
    var on = !!fsNow();
    var bs = document.querySelectorAll('[data-fs]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      bs[i].textContent = on ? '退出 · F' : '全屏 · F';
      bs[i].title = on ? '退出全屏（F）' : '进入全屏（F）';
    }
    if (ctx.panel) ctx.panel.syncFs();
  }
  function onFsChange() { syncFsBtn(); resize(); }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  Array.prototype.forEach.call(document.querySelectorAll('#fs'), function (b) {
    b.addEventListener('click', function () { toggleFullscreen(); });
  });
  stage.addEventListener('dblclick', function () { toggleFullscreen(); });
  syncFsBtn();

  /* ---- 输入。任意输入先解锁声音（浏览器的规矩，不是展品的规矩）。 ---- */
  function unlockOnly() { if (BT.audio.unlock) BT.audio.unlock(); }
  window.addEventListener('pointerdown', unlockOnly);
  window.addEventListener('keydown', function (e) {
    unlockOnly();
    var c = e.code;
    if (c === 'KeyB') {
      score.setLowPower(!score.lowPower());
      document.body.classList.toggle('low', !!score.lowPower());
      store.write({ low: score.lowPower() ? 1 : 0 });
      e.preventDefault();
    }
    /* C：调音台。旋钮由 SCHEMA 声明，值经 setKnob / applyPreset 单点收敛。 */
    if (c === 'KeyC') { if (ctx.panel) ctx.panel.toggle(); e.preventDefault(); }
    if (c === 'KeyF' || e.key === 'f' || e.key === 'F') { toggleFullscreen(); e.preventDefault(); }
    if (c === 'Tab') {
      if (ctx.archive) ctx.archive.toggle();
      if (ctx.hud) ctx.hud.wake();
      e.preventDefault();
    }
    if (c === 'KeyE') { logFirst(); if (ctx.hud) ctx.hud.wake(); e.preventDefault(); }
    if (c === 'ArrowLeft') { stepBrowse(-1); e.preventDefault(); }
    if (c === 'ArrowRight') { stepBrowse(1); e.preventDefault(); }
    if (c === 'Digit0') { exitBrowse(); e.preventDefault(); }
    if (c === 'Escape') {
      exitBrowse();
      if (ctx.archive) ctx.archive.hide();
      if (ctx.panel) ctx.panel.close();
    }
  });
  window.addEventListener('beforeunload', saveNow);

  /* ---- 循环。相机跟着笔尖，焦距呼吸，光漂，册页按自己的节拍换气。 ---- */
  var saveT = 0, refreshT = 0;
  BT.app.onframe = function (dt, now) {
    score.step(dt, now);

    var sc = score.skyColor();
    score.setSky(sc);

    cam.cell = cam.baseCell * (1 + 0.05 * Math.sin(now * 0.09));
    if (panelMode === 'browse') cam.x = browseTarget();
    else {
      var M = camModeDef();
      var target = camTarget();
      cam.x = M.snap ? target : cam.x + (target - cam.x) * Math.min(1, dt * M.ease);
    }

    applyView();
    var half = W / 2 / cam.cell;
    var x0 = Math.floor(cam.x - half) - T.SPAN;
    var x1 = Math.ceil(cam.x + half) + T.SPAN;
    score.syncView(x0, x1);
    score.syncAir();
    score.syncMarks(x0, x1);
    paintPaper(now);
    syncLight(now);
    /* 浮尘与谱层读的是同一群粒子，不另起一条运动。 */
    if (ctx.motes) ctx.motes.sync(now, W, H, score.lowPower());
    /* 电波层读的也是同一群粒子，只读动能与位置，不消耗扰动流。
       sync 与 tick 分开：闪白衰减吃 dt，不吃帧率。 */
    if (ctx.denpa) {
      ctx.denpa.sync(now, W, H, score.lowPower());
      ctx.denpa.tick(dt);
    }
    if (ctx.lore) ctx.lore.step(dt, now);
    if (ctx.hud) { ctx.hud.tick(dt); ctx.hud.sync(); }
    if (ctx.chapter) ctx.chapter.tick(dt);
    refreshT += dt;
    if (refreshT > 0.8) {
      refreshT = 0;
      if (ctx.archive && ctx.archive.visible()) ctx.archive.refresh();
    }
    saveT += dt;
    if (saveT > 5) { saveT = 0; saveNow(); }
  };
  /* 预热跑完先摆一张纸。等第一个节拍再出字，取景器里就是一张空图。 */
  if (ctx.lore) ctx.lore.wake();
  BT.app.start();

  if (!score.step || !score.syncView || !score.halo) {
    if (window.console) console.error('score: 接口不完整');
  }

  window.__score = {
    score: score, cam: cam, ctx: ctx,
    sim: sim, store: store, bus: bus,
    volume: volume, hash: hash, GROUND: GROUND,
    camMode: function () { return camMode; },
    setCamMode: setCamMode,
    camTarget: camTarget,
    toggleFullscreen: toggleFullscreen,
    isFullscreen: function () { return !!fsNow(); },
    syncFsBtn: syncFsBtn,
    buildPanel: buildPanel,
    logFirst: logFirst, saveNow: saveNow,
    enterBrowse: enterBrowse, exitBrowse: exitBrowse, stepBrowse: stepBrowse,
    browseTarget: browseTarget,
    panelMode: function () { return panelMode; },
    browsePanel: function () { return browsePanel; }
  };
  window.__lore = ctx.lore || null;
})();
