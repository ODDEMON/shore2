/* 演算。二代所有「数」只在这一层算一次，谁要倍率谁来问 multipliers()。
 * 新加一个界面不需要接线：读倍率、听总线、写存档，三件事就够了。
 *
 * 玩法只有一句话：**写完一界，给下一界下一道工序指令；沿岸拾到的版样，花墨录进册。**
 *   · 幅：长卷每写完一幅产墨。
 *   · 界：每 8 幅一界，界末出一张校样单，三道工序选一（不选就沿用上一道，展品不等人）。
 *   · 版样：六种构造 × 六套色板 = 36 枚，定死的池子，录满就是录满，不生新条目。
 *   · 墨：补录、回望、重校都要花。开局先垫一份，绝不允许「没墨 → 换不到第一份资源」。
 *
 * 关于随机：这一层一个数都不掷。世界活不活，由 core/life.js 那群粒子的
 * 相互追逐负责；册页只对得上「编号」，不对得上「画面」。孤版是池子里天生
 * 固定的几枚（unit 散列），warmer 的工序能把边界上的几枚认出来——这样倍率
 * 仍有用，世界却一点没被驯化。零 Math.random、零种子。
 *
 * 取舍（_balance.mjs 盯着这里）：
 *   一路「拉满」只选同一道工序，focus 高；一路「摊平」三道轮着来，spread 高。
 *   三元组偏置的和恒为 0.30，所以两条路的总倍率只差 strength 那一档（约 5%），
 *   但 ink / log / rare 三项的分配完全不同——没有唯一最优解，只有不同的版次脾气。
 * 表驱动：改脾气改 SIM_TABLE，不改这里的一行判断。 */
window.BT = window.BT || {};

BT.SIM_TABLE = {
  inkPerPanel: 12,
  panelsPerChapter: 8,
  startingInk: 24,
  firstRunFloor: 18,      // 开卷津贴：第一幅写完若还不到一张版样的钱，垫到这个数
  cost: { log: 18, rewind: 6, reprint: 40 },
  inkCapBase: 240,      // 砚台容量：墨不会无限胀，满了就溢出（会被记下来）
  inkCapPer: 48,        // 每录一枚版样，砚台大一圈
  logRamp: 0.06,        // 册子越厚，补录越费墨
  reprintRate: 0.045,   // 旧版翻印的基础概率，乘 rare 倍率
  maxPicks: 24,           // 存档里只留最近这么多道，倍率不无限膨胀
  window: 6,              // focus / spread / bias 都只看最近 6 道
  focusWeight: 0.10,
  spreadWeight: 0.20,
  dimWeight: 0.90,
  biasScale: 0.25,
  rareLine: 0.22,         // 池子里散列低于此线的版样算「孤版」，录入时返还一点墨
  rareRefund: 6,
  motifs: ['monolith', 'aperture', 'slab', 'beacon', 'bar', 'void'],
  motifNames: ['整碑', '门洞', '浮板', '孤点', '帽线', '留白'],
  paletteNames: ['纪念', '鹦鹉螺', '雾', '苔', '沙丘', '气'],
  agenda: {
    even:  { name: '匀', en: 'EVEN',  note: '压住干扰，工工整整；墨稳、好补录',
             bias: [0.18, 0.09, 0.03],
             knobs: { impulse: 0.55, viscosity: 0.80, eventRate: 0.70, gust: 0.30 } },
    sharp: { name: '锐', en: 'SHARP', note: '放开阵风，界会来得急；墨多、版样跳',
             bias: [0.09, 0.03, 0.18],
             knobs: { impulse: 1.60, viscosity: 0.25, eventRate: 1.80, gust: 0.80 } },
    warm:  { name: '暖', en: 'WARM',  note: '留住色温，旧版样翻得回来；孤版更常见',
             bias: [0.03, 0.18, 0.09],
             knobs: { impulse: 0.90, viscosity: 0.60, eventRate: 1.10, gust: 0.55 } }
  },
  defaultAgenda: 'even'
};

BT.sim = (function () {
  var T = BT.SIM_TABLE;
  var bus = BT.bus || { emit: function () {}, on: function () { return function () {}; } };
  var S = null;

  function base() {
    return {
      volume: 1, totalPanels: 0, panels: 0,
      ink: T.startingInk, picks: [], dueHandled: 0,
      logged: [], entries: {},
      chapter: 1, autoPicks: 0, spent: 0, gained: 0, wasted: 0
    };
  }
  function emit(n, p) { if (bus && bus.emit) bus.emit(n, p); }

  function init(save) {
    S = base();
    save = save || {};
    S.volume = Math.max(1, Math.floor(save.volume || 1));
    S.totalPanels = Math.max(0, Math.floor(save.totalPanels || 0));
    S.panels = Math.max(0, Math.floor(save.panels || 0));
    /* 开卷之前岸已经自己长过一段（预热），那些界不欠校样单。 */
    S.dueHandled = Math.floor(S.panels / T.panelsPerChapter);
    S.ink = isFinite(save.ink) ? Math.max(0, save.ink) : T.startingInk;
    S.picks = (save.picks || []).slice(-T.maxPicks);
    S.logged = (save.logged || []).slice();
    S.entries = save.entries || {};
    S.chapter = Math.floor(S.panels / T.panelsPerChapter) + 1;
    /* 死结兜底：任何来源的存档（含手改过的）都不许把开局锁死。 */
    if (S.ink < T.cost.log) S.ink = T.startingInk;
    emit('sim:init', { volume: S.volume, totalPanels: S.totalPanels });
    return state();
  }

  /* 砚台的容量随册子变厚。满了不是错误，是「该花墨了」的可见边界：
     溢出的部分记在 wasted 里，HUD 与平衡体检都看得见。 */
  function inkCap() { return T.inkCapBase + S.logged.length * T.inkCapPer; }
  function windowPicks() { return S.picks.slice(-T.window); }
  function focus() {
    var a = windowPicks(), n = 0, last = a[a.length - 1], i;
    for (i = a.length - 1; i >= 0 && a[i] === last; i--) n++;
    return n;
  }
  function spread() {
    var a = windowPicks(), seen = {}, n = 0, i;
    for (i = 0; i < a.length; i++) if (!seen[a[i]]) { seen[a[i]] = 1; n++; }
    return n;
  }
  /* 唯一算倍率的地方。三条偏置的和恒为 0.30 × 窗口内道数，
     所以「摊平」与「拉满」的 total 只差 strength，差不出一个碾压解。 */
  function multipliers() {
    if (!S) init({});
    var f = focus(), sp = spread();
    var strength = T.focusWeight * f + T.spreadWeight * sp;
    var bias = [0, 0, 0], a = windowPicks(), i, A, j;
    for (i = 0; i < a.length; i++) {
      A = T.agenda[a[i]];
      if (!A) continue;
      for (j = 0; j < 3; j++) bias[j] += A.bias[j];
    }
    var d = T.dimWeight * strength;
    var ink  = 1 + d + bias[0] * T.biasScale;
    var log  = 1 + d + bias[1] * T.biasScale;
    var rare = 1 + d + bias[2] * T.biasScale;
    return {
      ink: ink, log: log, rare: rare,
      total: (ink + log + rare) / 3,
      focus: f, spread: sp, strength: strength,
      bias: bias, picks: a.length
    };
  }

  function state() {
    if (!S) init({});
    return {
      volume: S.volume, totalPanels: S.totalPanels, panels: S.panels,
      ink: Math.floor(S.ink), inkCap: inkCap(), wasted: S.wasted, chapter: S.chapter,
      totalChapters: Math.floor(S.totalPanels / T.panelsPerChapter) + 1,
      picks: S.picks.slice(), logged: S.logged.slice(),
      entries: JSON.parse(JSON.stringify(S.entries)),
      autoPicks: S.autoPicks, spent: S.spent, gained: S.gained,
      due: due(), pool: poolSize()
    };
  }
  function snapshot() {
    if (!S) init({});
    return {
      volume: S.volume, totalPanels: S.totalPanels,
      ink: Math.floor(S.ink),
      picks: S.picks.slice(), logged: S.logged.slice(),
      entries: JSON.parse(JSON.stringify(S.entries))
    };
  }
  function due() {
    if (!S) return false;
    return S.panels > 0 && S.panels % T.panelsPerChapter === 0 &&
           Math.floor(S.panels / T.panelsPerChapter) > S.dueHandled;
  }
  /* 世界比人先到：开卷时岸已经预热过一段。把册子的幅号对齐到世界，
     并认定那些界都已经结过账——玩家不该一进门就补三张校样单。
     只对齐一次，之后每幅由 onPanel 推进。 */
  function syncPanels(n) {
    if (!S) init({});
    n = Math.max(0, Math.floor(n));
    if (n < S.panels) return { ok: false, reason: '幅号只往前走' };
    S.totalPanels += n - S.panels;
    S.panels = n;
    S.dueHandled = Math.floor(n / T.panelsPerChapter);
    S.chapter = Math.floor(n / T.panelsPerChapter) + 1;
    emit('sim:sync', { panels: n, chapter: S.chapter, volume: S.volume });
    return { ok: true, panels: S.panels, chapter: S.chapter };
  }
  function poolSize() { return T.motifs.length * T.paletteNames.length; }
  function indexOf(motif, pal) {
    var m = T.motifs.indexOf(motif);
    if (m < 0 || !(pal >= 0 && pal < T.paletteNames.length)) return -1;
    return m * T.paletteNames.length + pal;
  }
  function label(id) {
    var m = Math.floor(id / T.paletteNames.length), p = id % T.paletteNames.length;
    return T.motifNames[m] + ' · ' + T.paletteNames[p] + '版';
  }
  /* 孤版是池子的固有属性，不是这一趟抽出来的签：哪一号天生难遇，
     开多少卷都一样。rare 倍率只决定「边界上那几枚今天认不认得出来」。 */
  function isRare(id) {
    return BT.gen.unit('rare|' + id) < T.rareLine * multipliers().rare;
  }
  function logged(id) { return S.logged.indexOf(id) >= 0; }
  function specimens() {
    var out = [], i;
    for (i = 0; i < poolSize(); i++) {
      out.push({ id: i, label: label(i), logged: logged(i),
                 entry: S.entries[i] || null, rare: isRare(i) });
    }
    return out;
  }

  /* 一幅写完：产墨、推进章回、必要时敲校样单。panel 是本卷幅号，从 1 起。 */
  function onPanel(panel, snap) {
    if (!S) init({});
    panel = Math.floor(panel);
    if (!(panel > S.panels)) return { ok: false, reason: '这一幅已经结过账' };
    var advanced = panel - S.panels;
    S.panels = panel;
    S.totalPanels += advanced;
    var m = multipliers();
    var raw = Math.max(1, Math.round(T.inkPerPanel * m.ink));
    var cap = inkCap(), gain = Math.max(0, Math.min(raw, cap - S.ink));
    S.ink += gain; S.gained += gain; S.wasted += raw - gain;
    /* 开卷津贴：第一幅之后若还不够录一张，垫到刚好够。只垫一次。 */
    if (panel === 1 && S.ink < T.firstRunFloor + T.cost.log) {
      S.ink = T.firstRunFloor + T.cost.log;
    }
    var oldChapter = S.chapter;
    S.chapter = Math.floor(panel / T.panelsPerChapter) + 1;
    emit('ink:gain', { panel: panel, gain: gain, ink: Math.floor(S.ink), m: m });
    emit('panel:done', { panel: panel, chapter: S.chapter,
                         volume: S.volume, snap: snap || null });
    if (S.chapter !== oldChapter) {
      emit('chapter:shift', { chapter: S.chapter, panel: panel, volume: S.volume });
    }
    if (due()) emit('chapter:due', { chapter: S.chapter, panel: panel,
                                     volume: S.volume, options: agendaOptions() });
    return { ok: true, gain: gain, ink: Math.floor(S.ink), chapter: S.chapter };
  }

  function agendaOptions() {
    return Object.keys(T.agenda).map(function (k) {
      var A = T.agenda[k];
      return { id: k, name: A.name, en: A.en, note: A.note, bias: A.bias.slice() };
    });
  }
  function agendaKnobs(id) {
    var A = T.agenda[id];
    return A ? A.knobs : null;
  }
  function lastPick() {
    return S.picks.length ? S.picks[S.picks.length - 1] : T.defaultAgenda;
  }
  /* counted=false 用于「重校」：额外多下的一道不该抵掉下一界该出的那张单。 */
  function pick(id, auto, counted) {
    if (!S) init({});
    if (!T.agenda[id]) return { ok: false, reason: '没有这道工序' };
    S.picks.push(id);
    if (S.picks.length > T.maxPicks) S.picks.shift();
    if (counted !== false) S.dueHandled++;
    if (auto) S.autoPicks++;
    var m = multipliers();
    emit('agenda:pick', { id: id, name: T.agenda[id].name, auto: !!auto,
                          chapter: S.chapter, volume: S.volume,
                          knobs: agendaKnobs(id), m: m });
    return { ok: true, id: id, knobs: agendaKnobs(id), m: m };
  }

  /* 当前幅能补录哪些版样：由这一幅真实落过的构造 × 这一幅的色板决定，
     不是随机抽一个奖。没录过的排前面，孤版标出来。 */
  function offer(panel, snap) {
    if (!S) init({});
    var motifs = (snap && snap.motifs) || [];
    var pal = (snap && typeof snap.palette === 'number') ? snap.palette : 0;
    var out = [], i, id;
    for (i = 0; i < motifs.length; i++) {
      id = indexOf(motifs[i], pal);
      if (id < 0) continue;
      out.push({ id: id, label: label(id), logged: logged(id),
                 rare: isRare(id), cost: costOf('log') });
    }
    /* 旧版翻印：极少数幅里，印厂从旧版柜翻出一枚这一幅其实没出现、
       但册子上还空着的版样。暖工序把 rare 拉高，翻出来的机会才多——
       这是「留住色温，旧版样翻得回来」这句承诺落到实处的地方。 */
    var mm = multipliers();
    if (BT.gen.unit('reprint|' + panel) < T.reprintRate * mm.rare && out.length < 6) {
      for (var q = 0; q < poolSize(); q++) {
        if (logged(q)) continue;
        var dup = false, zz;
        for (zz = 0; zz < out.length; zz++) if (out[zz].id === q) dup = true;
        if (dup) continue;
        out.push({ id: q, label: label(q), logged: false, rare: isRare(q),
                   cost: costOf('log'), found: 1 });
        break;
      }
    }
    out.sort(function (a, b) {
      return (a.logged - b.logged) || (b.rare - a.rare) || (a.id - b.id);
    });
    return out;
  }
  function costOf(kind) {
    var m = multipliers();
    var c = T.cost[kind];
    if (c === undefined) return 0;
    if (kind === 'log') return Math.max(1, Math.round(c / m.log *
      (1 + T.logRamp * S.logged.length)));
    return c;
  }
  function canAfford(kind) { return S && S.ink >= costOf(kind); }

  function spend(kind) {
    if (!S) init({});
    var c = costOf(kind);
    if (!c) return { ok: false, reason: '没有这项开销' };
    if (S.ink < c) return { ok: false, reason: '墨不足', need: c, ink: Math.floor(S.ink) };
    S.ink -= c; S.spent += c;
    emit('ink:spend', { kind: kind, cost: c, ink: Math.floor(S.ink) });
    return { ok: true, cost: c, ink: Math.floor(S.ink) };
  }

  /* 补录。先扣墨再登记，扣不动就整笔撤销——不许出现「墨没了但册上没字」。 */
  function logSpecimen(id, panel) {
    if (!S) init({});
    if (!(id >= 0 && id < poolSize())) return { ok: false, reason: '册子上没有这一号' };
    if (logged(id)) return { ok: false, reason: '已录入', id: id };
    var pay = spend('log');
    if (!pay.ok) return pay;
    S.logged.push(id);
    S.entries[id] = { volume: S.volume, panel: panel || S.panels, chapter: S.chapter };
    var rare = isRare(id), refund = 0;
    if (rare) { S.ink += T.rareRefund; refund = T.rareRefund; }
    emit('specimen:logged', { id: id, label: label(id), panel: panel || S.panels,
                              volume: S.volume, rare: rare, refund: refund,
                              count: S.logged.length, total: poolSize() });
    return { ok: true, id: id, label: label(id), rare: rare,
             refund: refund, count: S.logged.length, total: poolSize(),
             ink: Math.floor(S.ink) };
  }

  /* 测试与「重校」用：把一整轮清空，但保留卷号。 */
  function reset(volume) {
    var v = S ? S.volume : 1;
    return init({ volume: volume || v });
  }

  return {
    init: init, state: state, snapshot: snapshot, reset: reset,
    syncPanels: syncPanels, multipliers: multipliers, onPanel: onPanel,
    agendaOptions: agendaOptions, agendaKnobs: agendaKnobs, lastPick: lastPick,
    pick: pick, due: due, offer: offer,
    costOf: costOf, canAfford: canAfford, spend: spend,
    specimens: specimens, poolSize: poolSize, indexOf: indexOf, label: label,
    isRare: isRare, logged: logged, logSpecimen: logSpecimen,
    TABLE: T
  };
})();
