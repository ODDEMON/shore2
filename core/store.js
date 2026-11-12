/* 存档。二代不存世界，只存册。
 *
 * 一代说「刷新一次就是另一条谱，这是定义」；二代把这句话保住，并往前推一步：
 * **岸不留，册留。** 刷新即新的一卷岸，从头长起，粒子生命不驯化；
 * 但你批注过的工序、录下的版样、攒下的墨，按「卷 / 幅」留在册子里。
 * 所以这里一个画面数据都没有：不存 seed、不存幅、不存几何、不存色板。
 *
 * 规矩：
 *   - 坏存档（手改、旧版本、跨项目串来的）安静回退到干净的开卷，不弹窗。
 *   - file:// 下 localStorage 是 opaque origin，会抛；全部吞掉，退化成「这一趟不落盘」。
 *   - 写入是 patch 语义：谁改了哪几项谁写哪几项，不整份覆盖，免得两个模块互相抹。 */
window.BT = window.BT || {};

BT.store = (function () {
  var KEY = 'shore2.save.v1';
  var VERSION = 2;
  var FRESH = {
    version: VERSION,
    volume: 0,          // 0 = 还没开过卷；汇流层每次开卷 +1，第一次就是卷 001
    totalPanels: 0,     // 跨卷累计写过多少幅，只做档案统计，绝不拿来还原画面
    ink: 0,
    picks: [],          // 工序选择序列（跨卷累积，倍率只看最近 6 道）
    logged: [],         // 已录入的版样编号（36 枚定死的池子，与种子无关）
    entries: {},        // 编号 -> { volume, panel, chapter }
    low: 0,
    cam: 'perfect',
    panelMode: 'follow'
  };

  function fresh() {
    var o = {}, k;
    for (k in FRESH) if (FRESH.hasOwnProperty(k)) {
      o[k] = (k === 'picks' || k === 'logged') ? [] : (k === 'entries' ? {} : FRESH[k]);
    }
    return o;
  }
  function clean(raw) {
    var o = fresh(), k, v;
    if (!raw || typeof raw !== 'object' || raw.version !== VERSION) return o;
    for (k in FRESH) if (FRESH.hasOwnProperty(k) && k !== 'version') {
      v = raw[k];
      if (v === undefined || v === null) continue;
      if (k === 'picks' || k === 'logged') {
        if (Object.prototype.toString.call(v) === '[object Array]') o[k] = v.slice(0, 4096);
      } else if (k === 'entries') {
        if (v && typeof v === 'object' && Object.prototype.toString.call(v) !== '[object Array]') o[k] = v;
      } else if (typeof v === 'number' && isFinite(v)) {
        o[k] = v;
      } else if (typeof v === 'string' && (k === 'cam' || k === 'panelMode')) {
        o[k] = v.slice(0, 120);
      }
    }
    return o;
  }
  function available() {
    try {
      var t = '__shore2_probe__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return true;
    } catch (e) { return false; }
  }
  function read() {
    try { return clean(JSON.parse(window.localStorage.getItem(KEY))); }
    catch (e) { return fresh(); }
  }
  function write(patch) {
    var cur = read(), k;
    if (patch && typeof patch === 'object') {
      for (k in patch) if (patch.hasOwnProperty(k) && FRESH.hasOwnProperty(k)) cur[k] = patch[k];
    }
    cur.version = VERSION;
    try { window.localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) {}
    return cur;
  }
  function reset() {
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    return fresh();
  }

  return {
    KEY: KEY, VERSION: VERSION, DEFAULTS: FRESH,
    read: read, write: write, reset: reset, fresh: fresh,
    available: available
  };
})();
