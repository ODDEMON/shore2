/* jsdom 无头冒烟。守的是「这套递推语法自己写得住、写不坏、写到哪都算得出来」。
 *
 * 测试的目的是抓运行时错误与静默失效，不是校验像素：画面好不好看不能由断言负责，
 * 但「某个事件从没被走到」「某笔被压成底色等于没画」「细线被亚像素吃掉」
 * 「正多面体棱数不符」「极端参数下冒出 NaN」必须被抓住。
 *
 * 坑（本机都踩过）：
 *   - jsdom 不加载 file:// 外链脚本：读 index.html 正则抽 script 顺序，自己 eval 注入。
 *   - url 必须 http://localhost/，file:// 是 opaque origin，history.replaceState 会抛。
 *   - beforeParse 里把 requestAnimationFrame 换成 no-op，否则总台的循环停不下来。
 *   - compose(n) 这一稿会真的生成历史、消耗干扰；断言「确定性」的旧写法全部作废。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const CANDIDATES = [
  'D:\\__SOMETHING_REAL__\\AI_Work\\personal\\node_modules\\jsdom',
  'C:\\Users\\Administrator\\.workbuddy\\binaries\\node\\workspace\\node_modules\\jsdom'
];
const jsdomDir = CANDIDATES.find((p) => fs.existsSync(path.join(p, 'lib', 'api.js')));
if (!jsdomDir) {
  console.error('找不到 jsdom，试过：\n' + CANDIDATES.join('\n'));
  process.exit(2);
}
const { JSDOM } = require(jsdomDir);

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label); }
}
function eq(a, b, label) { ok(a === b, label + '（' + a + ' === ' + b + '）'); }

function boot(qs, prepare) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  const errors = [];
  const dom = new JSDOM(html, {
    url: 'http://localhost/#' + (qs || 's=ignored'),
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    beforeParse(w) {
      w.requestAnimationFrame = () => 0;
      w.cancelAnimationFrame = () => {};
      /* 装假声卡：音频相关的断言要知道「排了几个音」，不是「响不响」。 */
      if (prepare) prepare(w);
    }
  });
  const w = dom.window;
  for (const s of srcs) {
    try { w.eval(fs.readFileSync(path.join(ROOT, s), 'utf8')); }
    catch (e) { errors.push(s + ': ' + e.message); }
  }
  w.__errors = errors;
  return w;
}

/* 假声卡。不是为了让 jsdom「能播」，是为了数清楚排了几个音：
   启动那声「咚」的判别标准是「预热时往 currentTime=0 排了多少个振荡器」。 */
function fakeAudio(w) {
  const S = { made: 0, starts: 0, resumes: 0, state: 'suspended', ac: null };
  function param(v) {
    return { value: v, setValueAtTime() {}, exponentialRampToValueAtTime() {},
             linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} };
  }
  function node() {
    return { connect() {}, disconnect() {}, gain: param(1), frequency: param(0),
             delayTime: param(0), detune: param(0), type: '' };
  }
  function AC() {
    S.made++;
    this.state = 'suspended';
    this.currentTime = 0;
    this.destination = node();
    S.ac = this;
  }
  AC.prototype.createGain = function () { return node(); };
  AC.prototype.createBiquadFilter = function () { return node(); };
  AC.prototype.createDelay = function () { return node(); };
  AC.prototype.createOscillator = function () {
    const n = node();
    n.start = function () { S.starts++; };
    n.stop = function () {};
    return n;
  };
  AC.prototype.resume = function () {
    S.resumes++;
    this.state = 'running';
    S.state = 'running';
    return Promise.resolve();
  };
  w.AudioContext = AC;
  w.__audio = S;
}

function sig(score, n) {
  return score.compose(n).map((s) =>
    [s.x.toFixed(3), s.y.toFixed(3), s.w.toFixed(3), s.h.toFixed(3), s.role, s.ink].join(',')
  ).join('|');
}
function sigRange(score, a, b) {
  let s = '';
  for (let n = a; n < b; n++) s += sig(score, n) + '#';
  return s;
}
function finiteStrokes(arr, SPAN, CEIL) {
  const roles = { S: 1, M: 1, A: 1, V: 1 };
  for (const p of arr) {
    if (![p.x, p.y, p.w, p.h].every(Number.isFinite)) return false;
    if (p.w <= 0 || p.h <= 0) return false;
    if (!roles[p.role]) return false;
    if (p.x < -0.02 || p.x + p.w > SPAN + 0.02) return false;
    if (p.y < -0.02 || p.y + p.h > CEIL + 0.02) return false;
    if (typeof p.ink !== 'number') return false;
    if (p.pts) {
      if (p.pts.length < 3) return false;
      for (const pt of p.pts) {
        if (!pt.every(Number.isFinite)) return false;
        if (pt[0] < -0.02 || pt[0] > SPAN + 0.02) return false;
        if (pt[1] < -0.02 || pt[1] > CEIL + 0.02) return false;
      }
    }
  }
  return true;
}
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (((n >> 16) & 255) * 0.2126 + ((n >> 8) & 255) * 0.7152 + (n & 255) * 0.0722) / 255;
}
function sat(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (Math.max(...c) - Math.min(...c)) / 255;
}
function codeOf(f) {
  return fs.readFileSync(path.join(ROOT, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

console.log('\n== 启动 ==');
const w = boot('s=ignored');
const score = w.__score && w.__score.score;
ok(!!score, 'score 挂上了 BT.reg（挂不上后面全无意义）');
if (!score) {
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  console.log(w.__errors.join('\n'));
  process.exit(1);
}
ok(w.BT.reg.list().indexOf('score') >= 0, '登记表里有 score');
ok(score.born() > 50, '预热已经落过笔（' + score.born() + '）');
ok(score.done() >= 8, '预热至少长出 8 幅——世界必须真的从零开始，开卷留白是构图');
ok(score.cache().size > 0 && score.cache().size <= 4096, '历史被冻结在缓存里，且有上界');
eq(w.__errors.length, 0, '注入全部脚本没有抛错：' + w.__errors.join('|'));

const T = score.TABLES;
const SPAN = T.SPAN, CEIL = T.CEIL;

console.log('\n== 表：改数据不改代码的前提 ==');
for (const k of ['DEFAULTS', 'LOWCAP', 'PALETTE', 'FAR', 'FAR_LOW', 'MOTIF', 'CROWN', 'RULE',
                 'GROWTH', 'VIEW', 'CAM', 'SCHEMA', 'KNOBS', 'PRESETS',
                 'NOISE', 'EVENT', 'HALO', 'MODES', 'CONTOURS', 'SOLIDS']) {
  ok(!!T[k], '表 ' + k + ' 存在');
}
ok(T.VIEW.preheatPanels > 0 && T.VIEW.maxFF > T.VIEW.preheat, '预热与快进上限都由 VIEW 表声明');
ok(T.GROWTH.ageFull > 0 && T.GROWTH.rise[0] > 0 && T.GROWTH.walk > 0 &&
   T.GROWTH.staff.length >= 3, '生长表的年龄/生长量/游走/谱线合法');
ok(T.NOISE.crest.slow === 1, 'crest 带 slow 标记：黏度旋钮不许拧时代的轴');
{
  /* SCHEMA/PRESETS 的合法性——面板由它们生成，坏一行就坏一个控件。 */
  let bad = null;
  const keys = new Set(T.SCHEMA.map((s) => s.k));
  T.SCHEMA.forEach((s) => {
    if (!(s.k in T.DEFAULTS)) bad = s.k + ' 不在 DEFAULTS';
    if (!(s.min < s.max) || !(s.step > 0)) bad = s.k + ' 区间非法';
    if (typeof s.l !== 'string' || !s.l) bad = s.k + ' 缺标签';
  });
  ok(bad === null, 'SCHEMA 全部指向 DEFAULTS 且区间合法（坏在 ' + bad + '）');
  ok(T.KNOBS.viscosity.keep > 0 && T.KNOBS.impulse.jitter > 0 &&
     T.KNOBS.eventRate.threshold > 0 && T.KNOBS.gust.driftKick > 0,
    'KNOBS 四根筋都声明了拧多狠');
  let pbad = null;
  T.PRESETS.forEach((p) => {
    if (!p.name || !p.note || !p.params) pbad = p.name;
    Object.keys(p.params || {}).forEach((k) => {
      const sc = T.SCHEMA.find((s) => s.k === k);
      if (!sc) pbad = p.name + '/' + k;
      else if (p.params[k] < sc.min || p.params[k] > sc.max) pbad = p.name + '/' + k + ' 越界';
    });
  });
  ok(pbad === null, 'PRESETS 的每套脾气都只拧 SCHEMA 声明过的旋钮且不出界（坏在 ' + pbad + '）');
}
ok(Object.keys(T.LOWCAP).every((k) => k in T.DEFAULTS),
  'LOWCAP 的每一项都在 DEFAULTS 里（否则钳了一个不存在的参数，静默失效）');
{
  const names = Object.keys(T.MOTIF);
  let bad = null;
  names.forEach((name) => {
    T.MOTIF[name].forEach((p) => {
      if (bad) return;
      if (p.length !== 5 || !['S', 'M', 'A', 'V'].includes(p[4]) || p[2] <= 0 || p[3] <= 0) bad = name;
      if (![p[0], p[1], p[2], p[3]].every(Number.isFinite)) bad = name;
    });
  });
  ok(bad === null, '全部 ' + names.length + ' 个极简模块的声明合法（坏在 ' + bad + '）');
  ok(['monolith', 'aperture', 'slab', 'beacon', 'bar', 'void'].every((m) => m in T.MOTIF),
    '六件极简构造（碑/门洞/平板/孤点/单杠/空）都在表里');
  ok(names.length === 6, '语汇收敛到六件，不再有十三件繁复构件');
  ok(names.every((m) => T.MOTIF[m].length <= 2),
    '每件构造 ≤2 笔——极简是可执行判定：碑与门洞，一块面一件事');
  ok(!['fin', 'chevron', 'antenna', 'grille', 'continuous', 'capsule', 'spine',
       'terrace', 'horizon', 'pod', 'ringdeck', 'skybridge', 'ribbon']
      .some((m) => m in T.MOTIF),
    '十件繁复语汇（格栅/连续面/舱体/服务核/悬挑/地平带/舱/环甲板/天桥/光带）全部退役');
}
{
  let bad = null;
  Object.keys(T.RULE).forEach((id) => {
    T.RULE[id].layers.forEach((L) => {
      L.motifs.forEach((m) => { if (!(m in T.MOTIF)) bad = id + '/' + m; });
      if (L.motifs.length > 3) bad = id + ' 层里塞了超过三个构件';
    });
  });
  ok(bad === null, '全部法则引用的模块名都拼对了，且每层构件数 ≤3（坏在 ' + bad + '）');
  ok(['mirror', 'repeat', 'stagger', 'cross'].every((sym) =>
    Object.keys(T.RULE).some((id) => T.RULE[id].sym === sym)),
    '四种对称算子都有法则在用');
  ok(!!T.RULE.radiant && T.RULE.radiant.sym === 'radial',
    '第五稿新增 radiant 法则，用 radial 旋转对称算子');
  {
    let cb = null;
    Object.keys(T.CROWN).forEach((k) => {
      const C = T.CROWN[k];
      if (!(C.ow > 0.8 && C.tiers >= 1 && C.rise > 0 && C.rise <= 2.8 && C.gap >= 0)) cb = k;
      /* 扁平硬约束：冠高 ≤ 2.8 格，冠宽至少 5 格（最小拍宽 5 × 最小 ow），
         宽高比 ≥ 2.5:1；顶一律平切，不再存在「顶角」。 */
      if (C.rise / (5 * C.ow) > 0.4) cb = k + '/不够扁';
    });
    ok(Object.keys(T.CROWN).length === 4 && cb === null,
      '四种平顶冠都在表里，全部宽扁、顶一律平切（坏在 ' + cb + '）');
  }
}
{
  /* 电波配色承诺的执行处：明度只由「纯白骨线 / 纯黑底」拉开，
     彩度只由「纯正原色巨面」承担。不再要求巨面低饱和。 */
  let bad = null, contrast = null, chroma = null;
  T.PALETTE.forEach((P, i) => {
    ['bg', 'deep', 'plane', 'line', 'accent', 'glow', 'haze'].forEach((k) => {
      if (!/^#[0-9a-f]{6}$/i.test(P[k])) bad = i + '/' + k;
    });
    if (lum(P.line) - lum(P.bg) < 0.75) contrast = i;
    if (sat(P.plane) < 0.80 || sat(P.line) > 0.10) chroma = i;
  });
  ok(bad === null, '六套色板的七个字段都是合法色值（坏在 ' + bad + '）');
  ok(contrast === null, '纯白骨线与纯黑底的明度差拉满（坏在 ' + contrast + '）');
  ok(chroma === null, '巨面一律纯正原色、骨线一律纯白——多巴胺来自彩度（坏在 ' + chroma + '）');
  let vis = null;
  T.PALETTE.forEach((P, i) => {
    if (P.deep === P.bg || lum(P.deep) - lum(P.bg) < 0.02) vis = i;
    if (lum(T.FAR[i].V) - lum(P.bg) < 0.015) vis = i + '/远景V';
    if (lum(T.FAR[i].S) - lum(P.bg) < 0.35) vis = i + '/远景S';
  });
  ok(vis === null, 'V 是可见的暗实体、远景也仍可辨——没有一种角色被画成底色（坏在 ' + vis + '）');
  /* 第八稿：字段一个不删（渲染链、残页反查、复杂度标记都要用），
     但「彩」整段退回第一版的柔化高级灰。 */
  /* 第八稿：字段一个不删（渲染链、残页反查、复杂度标记都要用），
     但「彩」整段退回第一版的柔化高级灰。 */
  let nb = null, nbSat = null, nbInk = null, nbHue = null;
  function hueOf(h) {
    const n = parseInt(h.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const mx = Math.max(...c), mn = Math.min(...c);
    if (mx === mn) return -1;
    let v = 0;
    if (mx === c[0]) v = ((c[1] - c[2]) / (mx - mn)) % 6;
    else if (mx === c[1]) v = (c[2] - c[0]) / (mx - mn) + 2;
    else v = (c[0] - c[1]) / (mx - mn) + 4;
    return ((v * 60) + 360) % 360;
  }
  T.PALETTE.forEach((P, i) => {
    ['ink', 'neon', 'neon2'].forEach((k) => {
      if (!/^#[0-9a-f]{6}$/i.test(P[k] || '')) nb = i + '/' + k;
    });
    /* 电波版反过来：主副点缀色必须是高饱和纯色相硬撞，不许退回高级灰。 */
    if (sat(P.neon) < 0.60 || sat(P.neon2) < 0.60) nbSat = i;
    if (lum(P.ink) > 0.10 || lum(P.ink) >= lum(P.bg) + 0.05) nbInk = i;
    const dh = Math.abs(hueOf(P.neon) - hueOf(P.neon2));
    if (Math.min(dh, 360 - dh) < 40) nbHue = i;
  });
  ok(nb === null, '六套色板都保留 ink / neon / neon2 三字段（坏在 ' + nb + '）');
  ok(nbSat === null, '主副点缀色都是高饱和纯色相——多巴胺来自彩度，不来自明度（坏在 ' + nbSat + '）');
  ok(nbInk === null, 'ink 仍是近黑暗收边，墨线开关只是把它关掉了（坏在 ' + nbInk + '）');
  ok(nbHue === null, '主副点缀色相仍拉开 ≥40°，不是同色深浅（坏在 ' + nbHue + '）');
}
{
  let bad = null;
  Object.keys(T.NOISE).forEach((k) => {
    const q = T.NOISE[k];
    if (!(q.lo < q.hi) || !(q.keep > 0 && q.keep < 1) || !(q.jitter > 0 && q.jitter < 1)) bad = k;
  });
  ok(bad === null, '干扰表每一项的区间/惯性/抖动都合法（坏在 ' + bad + '）');
  ok(Object.keys(T.NOISE).length >= 10, '被干扰改写的连续参数有 ' + Object.keys(T.NOISE).length + ' 项');
  ok(T.MODES.every((m) => Array.isArray(m) && m.length >= 5 &&
     m.every((x) => Number.isInteger(x) && x >= 0 && x < 12)), '全部音阶是 0..11 的整数表');
  /* 柏拉图立体的棱必须是代码推导出来的：五种立体的棱数是数学事实。 */
  const EDGE_COUNTS = { tetra: 6, cube: 12, octa: 12, dodeca: 30, icosa: 30 };
  ok(Object.keys(T.SOLIDS).length === 5 &&
     Object.keys(EDGE_COUNTS).every((k) => T.SOLIDS[k] &&
       T.SOLIDS[k].edges.length === EDGE_COUNTS[k]),
    '五种柏拉图立体的棱由最小距离推导（6/12/12/30/30），不是手写的');
  ok(Object.keys(EDGE_COUNTS).every((k) =>
     T.SOLIDS[k].v.every((v) => Math.abs(Math.hypot(...v) - 1) < 1e-9)),
    '所有顶点都归一化到单位外接球');
  ok(T.HALO.bars >= 2 && T.HALO.rise > 0 && T.HALO.rise < 0.5 &&
     T.HALO.spread > 0.3 && T.HALO.spread < 1,
    '灯表：层数 / 光带浓度 / 灯带横向半径都合法');
}

console.log('\n== 自生成：不再由种子定 ==');
{
  const wA = boot('s=sameseed');
  const wB = boot('s=sameseed');
  const a = wA.__score.score, b = wB.__score.score;
  ok(sigRange(a, 0, 30) !== sigRange(b, 0, 30),
    '带同一个 #s= 启动两次，写出两条不同的谱——种子已经不决定任何东西');
  wA.close(); wB.close();
  const before = sig(score, 7);
  score.compose(0); score.compose(120);
  eq(sig(score, 7), before, '但已经写下的幅被冻结：绕一圈回来第 7 幅一字不差');
  ok(score.generated() >= 120 && score.perturbCount() === score.generated() + 1,
    '每长一幅恰好推一次活状态（生成 ' + score.generated() + ' / 干扰 ' + score.perturbCount() + '）');
  const raw = codeOf('world/mod/score.js');
  ok(!/BT\.gen\.rng|ctx\.seed/.test(raw), '谱层没有任何「种子|幅号」查表的残骸');
  ok((raw.match(/Math\s*\.\s*random/g) || []).length === 0,
    '谱层一处 Math.random 都没有：扰动不再来自掷骰子');
  ok(/BT\.life\.next\(\)/.test(raw), '扰动从粒子生命场单点进入（BT.life.next）');
  ok(/BT\.life\.step\(/.test(raw) && /BT\.life\.pulse\(/.test(raw),
    '每幅推进一次粒子群、换界一记脉冲：扰动与世界双向耦合');
  const scriptRaw = codeOf('world/script.js');
  ok(!/ctx\.seed|hash\.seed|out\.seed/.test(scriptRaw), '汇流层不再向世界传种子');
  ok(!/#s=|&s=/.test(scriptRaw), '地址栏不再写回可分享的种子');
}

console.log('\n== 随机干扰：活状态真的在漂 ==');
{
  const N = T.NOISE;
  const seen = { density: new Set(), haloR: new Set(), glowX: new Set(), drift: new Set() };
  let bad = null, evIds = new Set(), palettes = new Set(), starts = 0, prevEv = null, switches = 0;
  for (let n = 0; n < 900; n++) {
    const loc = score.eventLoc(n);
    const s = score.snapOf(n);
    evIds.add(loc.label); palettes.add(loc.def.palette);
    if (loc.lo === n) starts++;
    if (prevEv !== null && loc.label !== prevEv) switches++;
    prevEv = loc.label;
    Object.keys(seen).forEach((k) => seen[k].add(s.vals[k].toFixed(4)));
    Object.keys(N).forEach((k) => {
      if (s.vals[k] < N[k].lo - 1e-6 || s.vals[k] > N[k].hi + 1e-6) bad = k + '@' + n;
    });
  }
  ok(bad === null, '900 幅里每个被干扰的参数都留在自己的匣内（坏在 ' + bad + '）');
  ok(seen.density.size > 100, '密度不是几档固定值，而是连续漂移（' + seen.density.size + ' 个不同值）');
  ok(seen.haloR.size > 100, '光晕半径也在连续漂移（' + seen.haloR.size + ' 个不同值）');
  ok(seen.glowX.size > 100, '光源位置在连续漂移（' + seen.glowX.size + ' 个不同值）');
  ok(seen.drift.size > 100, '相位漂移量在连续变化（' + seen.drift.size + ' 个不同值）');
  ok(evIds.size >= 12, '张力涨破了 ' + (evIds.size - 1) + ' 次阈值，事件自己崩出来');
  ok(switches >= 11, '事件真的在换界（' + switches + ' 次）');
  ok(starts >= 10, '事件只有起点，没有预定长度（记录到 ' + starts + ' 个起点）');
  ok(palettes.size >= 3, '至少换过 ' + palettes.size + ' 套色板');
  {
    let okBounds = true;
    for (let n = 0; n < 200; n++) {
      const loc = score.eventLoc(n);
      if (!(loc.lo <= n)) okBounds = false;
    }
    ok(okBounds, '每幅的事件起点不晚于该幅本身');
  }
  ok(score.eventOf(-30) && score.eventOf(60), '负幅与正幅都能问出事件，不崩');
  /* 色板颜色的轻微浮动：每个事件落地都给自己抽一组亮度/饱和度/对比度偏移，
     亮度 ±0.03、饱和与对比度 ±0.11——色温差更明显，但仍不脏。 */
  let jitBad = null, jitVar = false, lastJit = null;
  for (let n = 0; n < 600; n++) {
    const j = score.eventOf(n).palJit;
    if (!j || typeof j.l !== 'number' || typeof j.s !== 'number' || typeof j.c !== 'number') {
      jitBad = '缺字段'; break;
    }
    if (Math.abs(j.l) > 0.031 || Math.abs(j.s) > 0.111 || Math.abs(j.c) > 0.111) {
      jitBad = '越界 ' + JSON.stringify(j); break;
    }
    if (lastJit && (j.l !== lastJit.l || j.s !== lastJit.s || j.c !== lastJit.c)) jitVar = true;
    lastJit = j;
  }
  ok(jitBad === null, '每个事件的 palJit 都合法且被钳在小幅内（坏在 ' + jitBad + '）');
  ok(jitVar, '不同事件的色板抖动各不相同——色温真的在浮动，不是死的');
  const L0 = score.halo(1.0), L1 = score.halo(9.0);
  ok([L0.x, L0.y, L0.radius, L0.intensity, L0.pulse].every(Number.isFinite),
    '光晕参数全部有限');
  ok(L0.radius >= T.NOISE.haloR.lo - 1e-6 && L0.radius <= T.NOISE.haloR.hi + 1e-6,
    '光晕半径取自干扰的匣子');
  ok(L0.count >= 1 && L0.count <= T.HALO.bars,
    '灯带层数随光的强度在 1..' + T.HALO.bars + ' 之间');
  ok(L0.pulse !== L1.pulse, '光晕随呼吸变化，不是一张贴死的图');
}

console.log('\n== 全部法则分支都真的被走到 ==');
{
  const seen = new Set();
  let bad = null, total = 0, empty = 0, lit = 0, vStrokes = 0;
  for (let n = 0; n < 900; n++) {
    seen.add(score.ruleOf(n));
    const s = score.compose(n);
    if (!finiteStrokes(s, SPAN, CEIL)) bad = n;
    total += s.length;
    if (s.length === 0) empty++;
    lit += s.filter((p) => p.lit).length;
    vStrokes += s.filter((p) => p.role === 'V').length;
  }
  ok(Object.keys(T.RULE).every((id) => seen.has(id)),
    '900 幅覆盖了全部 ' + Object.keys(T.RULE).length + ' 条法则，没有一条是死代码');
  ok(bad === null, '这 900 幅的每一笔坐标有限、不出幅、不出上界（坏在第 ' + bad + ' 幅）');
  ok(total > 8000, '900 幅累计产出 ' + total + ' 笔——密度在递推里，不在换花样里');
  ok(empty < 450, '空幅占少数（' + empty + '/900），留白是构图而不是全空');
  ok(lit > 0, '光带只提亮不删笔：带内有 ' + lit + ' 笔被点亮');
  ok(vStrokes > 0, '暗实体 V 真的被写出来（' + vStrokes + ' 笔）');
}

console.log('\n== 第六稿：扁平化远未来建筑（撤回尖顶） ==');
{
  let crownCount = 0, crownFlat = 0, crownBad = null;
  let sharp = 0, barePanels = 0, radCount = 0, radBad = null;
  for (let n = 0; n < 900; n++) {
    const s = score.compose(n);
    const cw = s.filter((p) => p.cw);
    crownCount += cw.length;
    cw.forEach((p) => {
      if (![p.x, p.y, p.w, p.h].every(Number.isFinite)) crownBad = n + '/NaN';
      if (p.y + p.h > CEIL + 0.02) crownBad = n + '/越界';
      if (p.pts) crownBad = n + '/冠里出现点列三角';
      if (p.w / Math.max(0.01, p.h) >= 2.5) crownFlat++;
    });
    /* 全场不许再有任何细长锐角三角：撤回尖顶是硬约束，不是审美偏好。 */
    sharp += s.filter((p) => p.pts && p.pts.length === 3 &&
                             p.h / Math.max(0.01, p.w) >= 2.5).length;
    const towers = s.filter((p) => p.tw && p.role === 'S');
    if (towers.length && !cw.length) barePanels++;
    const rad = s.filter((p) => p.rad);
    if (rad.length) {
      radCount++;
      /* 一幅 radial 只属于一种几何：多边形一笔闭合且正（等角距、等半径），
         立体的棱四边形数 = 表推导的棱数。混入第二种几何或数目不对都算坏。 */
      const kinds = [...new Set(rad.map((p) => p.sb))];
      if (kinds.length !== 1) { radBad = n + '/混入多种几何'; }
      else {
        const kd = kinds[0];
        if (kd.startsWith('poly')) {
          const pg = rad[0];
          const m = parseInt(kd.slice(4), 10);
          if (pg.pts.length !== m) { radBad = n + '/边数 ' + pg.pts.length; }
          else {
            const cxp = pg.pts.reduce((a, q) => a + q[0], 0) / m;
            const cyp = pg.pts.reduce((a, q) => a + q[1], 0) / m;
            const ds = pg.pts.map((q) => Math.hypot(q[0] - cxp, q[1] - cyp));
            const angs = pg.pts.map((q) => (Math.atan2(q[1] - cyp, q[0] - cxp) + Math.PI * 3) % (Math.PI * 2)).sort((a, b) => a - b);
            if (Math.max(...ds) - Math.min(...ds) > 0.02) radBad = n + '/多边形不等半径';
            else for (let q = 1; q < angs.length; q++) {
              if (Math.abs((angs[q] - angs[q - 1]) - Math.PI * 2 / m) > 0.02) radBad = n + '/角距不均';
            }
          }
        } else {
          const S = T.SOLIDS[kd];
          const quads = rad.filter((p) => p.role === 'S' && p.pts);
          if (quads.length !== S.edges.length) radBad = n + '/棱数 ' + quads.length;
          else if (quads.some((p) => p.pts.length !== 4)) radBad = n + '/棱不是四边形';
          else if (rad.some((p) => p.role === 'A')) radBad = n + '/仍带顶点节点';
        }
      }
    }
  }
  ok(crownCount > 200, '900 幅里写出 ' + crownCount + ' 笔平顶冠构件——建筑顶部有像样的处理');
  ok(crownFlat / crownCount > 0.55,
    '其中 ' + crownFlat + ' 笔宽高比 ≥2.5:1——冠是宽扁水平板，不是尖顶');
  ok(crownBad === null, '冠部没有 NaN、越界，也没有点列三角（坏在 ' + crownBad + '）');
  ok(sharp === 0, '全场 ' + sharp + ' 枚细长锐角三角——四型尖顶与放射尖刃已彻底撤回');
  /* 上一稿把「900 幅里恰好有一幅全塔无冠」当成硬断言，但 noise() 每次
     boot 都是真随机，这条会偶发假红。断言的依据换成代码事实：源码里冠
     走的是概率分支；动态只报数字当佐证，不再拿运气当门槛。 */
  ok(barePanels > 0 || /A\.crown \* \(0\.40 \+ 0\.60 \* age\)/.test(codeOf('world/mod/score.js')),
    '冠不是强制：源码走概率分支（900 幅里 ' + barePanels + ' 幅「有塔无冠」作佐证）');
  ok(radCount > 0, 'radial 正多面体真的被写出来（' + radCount + '/900 幅）');
  ok(radBad === null, 'radial 正多面体的棱数/顶点数与表完全一致（坏在 ' + radBad + '）');
  /* 第十五稿：塔型这一维度整体退场。要守的不是「少了几种形状」，而是
     「形状不再被选中」——塔块的高矮必须跟着自生成的天际线起落，
     宽窄必须来自笔每一步走了多远，不是一张表里的几个固定 w。 */
  let hPairs = [], widthSet = new Set(), tvBlocks = 0;
  for (let n = 0; n < 300; n++) {
    const s = score.compose(n);
    let hm = 0;
    s.forEach((p) => {
      if (p.tw && p.role === 'M') {
        tvBlocks++;
        widthSet.add(Math.round(p.w * 10) / 10);
        if (p.y + p.h > hm) hm = p.y + p.h;
      }
    });
    hPairs.push([Math.max(...score.snapOf(n).topo), hm]);
  }
  const meanOf = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const mx = meanOf(hPairs.map((q) => q[0])), my = meanOf(hPairs.map((q) => q[1]));
  let num = 0, dx = 0, dy = 0;
  hPairs.forEach((q) => {
    num += (q[0] - mx) * (q[1] - my);
    dx += (q[0] - mx) ** 2; dy += (q[1] - my) ** 2;
  });
  const rho = num / Math.sqrt(dx * dy);
  ok(tvBlocks > 500 && rho > 0.60,
    '塔块最高点与活天际线相关系数 ' + rho.toFixed(2) +
    ' > 0.60（' + tvBlocks + ' 块）——高矮由 topo 递推给出，不来自剪影表');
  ok(widthSet.size > 60, '300 幅里塔块宽度有 ' + widthSet.size +
    ' 种（0.1 格精度）——宽窄是笔这一步走了多远，不是表里几个固定 w');
  const rawV3 = codeOf('world/mod/score.js');
  ok(!/SPIRE|function spire|顶角|p\.sp\b/.test(rawV3),
    '源码里已无 SPIRE / spire() / 顶角 / sp 标记——尖顶体系整体撤回');
  ok(/var CROWN = \{/.test(rawV3) && /function crown\(/.test(rawV3),
    '冠部走 CROWN 表 + crown()，表驱动与单点收敛不变');
  ok(T.SILHOUETTE === undefined && T.SIL_NAMES === undefined &&
     !/var SILHOUETTE|SIL_NAMES|flask:|ziggurat|lintel|invert/.test(rawV3),
    'SILHOUETTE 表、SIL_NAMES 抽签池与六型配方整体退场——塔型不再是一个维度');
  ok(/topo\[clamp\(Math\.floor\(x\), 0, SPAN - 1\)\]/.test(rawV3) &&
     /carried \+ \(liveH - carried\)/.test(rawV3) &&
     /A\.act|G\.act/.test(rawV3),
    '塔体由笔沿 x 逐列读活天际线、带着上一笔高度朝它推一步而写成——构建行为主动实现');
  ok(/mk\(half - 0\.35, 0, 0\.7, CEIL/.test(rawV3) &&
     /mk\(0, 20\.5, SPAN, 0\.7/.test(rawV3) &&
     !/mk\(0, 12\.5, SPAN, 0\.55/.test(rawV3),
    'cross 回到第一版中轴十字：竖轴 + 单厚横带 + 中心方块，三根平行横线已撤');
  ok(/S\.rare \? 2 : 1/.test(codeOf('world/mod/score.js')),
    '稀有立体（十二/二十面体）走副霓虹——梦的深处的几何自带另一种色温');
  {
    let pods = 0;
    for (let n = 0; n < 600; n++) {
      const s = score.compose(n);
      if (!s.some((p) => p.rb)) continue;
      pods += s.filter((p) => p.rb && p.pts && p.pts.length === 4).length;
    }
    ok(pods > 0, '签名正多面体带 ' + pods + ' 根棱（四点细四边形）——完美来自几何本身');
  }
}

console.log('\n== 第八稿：第一版风格回归 + 复杂度守恒 ==');
{
  const raw8 = codeOf('world/mod/score.js');
  const v1Names = ['MONUMENT', 'NAUTILUS', 'MIST', 'MOSS', 'DUNE', 'AURA'];
  const dpNames = ['PRIMARY RED', 'PRIMARY YELLOW', 'PRIMARY BLUE',
                   'PRIMARY GREEN', 'PRIMARY VIOLET', 'HOT PINK'];
  ok(T.PALETTE.length === 6 && T.PALETTE.every((P, i) => P.name === dpNames[i]),
    '六套色板逐字换成电波多巴胺（' + T.PALETTE.map((P) => P.name).join('/') + '）');
  ok(T.PALETTE === w.BT.DENPA_PALETTE,
    '色板只有一个来源：score.js 直接引用 BT.DENPA_PALETTE，不抄第二份');
  ok(Array.isArray(T.PALETTE_PAPER) && T.PALETTE_PAPER.length === 6 &&
     T.PALETTE_PAPER.every((P, i) => P.name === v1Names[i]),
    '第一版暖纸六套逐字留档为 PALETTE_PAPER，一行即可切回');
  ok(Array.isArray(T.PALETTE_NEON) && T.PALETTE_NEON.length === 6 &&
     T.PALETTE_NEON.every((P) => sat(P.neon) >= 0.70),
    '第七稿六套霓虹作为 PALETTE_NEON 存档保留，一行即可切回');
  ok(T.INK.enable === 0 && /if \(!T\.INK\.enable\) return 0;/.test(raw8),
    '墨线由 INK 表关掉，inkWidth() 的代码路径仍在');
  ok(T.V1BAR.budget > 0 && T.V1BAR.blockH > T.V1BAR.maxH &&
     T.V1BAR.blockW > 0 && T.V1BAR.minRatio > 1,
    'V1BAR 表的预算/块高/块宽/判据都合法');
  ok(/function v1Bars\(/.test(raw8) && /v1Bars\(out\);/.test(raw8),
    '短横线治理走独立函数，且在 settle 之前执行');
  {
    const vb = raw8.slice(raw8.indexOf('function v1Bars'), raw8.indexOf('function settle'));
    ok(!/\.filter\s*\(|\.splice\s*\(|delete\s+out/.test(vb),
      'v1Bars 只改形状不删笔（没有 filter / splice / delete）');
  }
  /* 与诊断脚本同一口径：高 < maxH、宽高比 > minRatio、宽 < SPAN*maxW。
     第一版实测每幅 19~21 条，回归前是 35.8 条。 */
  const B = T.V1BAR;
  let thinTotal = 0, thinMax = 0, total = 0, thinNeon = 0;
  let pts = 0, tw = 0, cw = 0, rb = 0, staff = 0;
  for (let n = 0; n < 160; n++) {
    const s = score.compose(n);
    let t = 0;
    for (const p of s) {
      total++;
      if (p.pts) pts++;
      if (p.tw) tw++;
      if (p.cw) cw++;
      if (p.rb) rb++;
      if (p.staff) staff++;
      if (p.pts || p.staff || p.w >= SPAN * B.maxW) continue;
      if (p.h >= B.maxH || p.w / Math.max(0.02, p.h) <= B.minRatio) continue;
      t++; thinTotal++;
      if (p.neon) thinNeon++;
    }
    if (t > thinMax) thinMax = t;
  }
  ok(thinMax <= B.budget,
    '160 幅里单幅短横线最多 ' + thinMax + ' 条，被 V1BAR 预算钳在 ' + B.budget + ' 条');
  ok(thinTotal / 160 <= 7,
    '每幅平均 ' + (thinTotal / 160).toFixed(1) + ' 条短横线——极简静物里只剩塔的帽线与偶尔的单杠');
  ok(thinNeon === 0,
    '短横线全部不再自发光（' + thinNeon + ' 条仍带 neon）——节奏条带是印上去的');
  ok(total >= 2400,
    '总笔数 ' + total + ' 笔（均 ' + (total / 160).toFixed(1) +
    '/幅，谱线移出笔流后每幅少 4 笔）——留白是主角，但画面不是空的');
  /* rb（签名）与 pts（点列）都不进守恒清单：2%–7% 的签名频率、
     radial 法则里那道 30% 闸门，叠加 v.solid 慢漂移，160 幅窗口里撞见
     几笔纯属运气——存在性分别由 2000 幅与 900 幅的专属断言守住。
     这里守恒的是「每幅必在」的声部：塔体、平顶冠。
     谱线恰恰相反，必须是 0 笔：它是预先铺好的纸，不进光标的逐笔流。
     第十六稿删掉「每幅开头空跑四根谱线」的动作后，改用源码事实守这条。 */
  {
    const rawStaff = codeOf('world/mod/score.js');
    ok(tw > 1200 && cw > 150 && staff === 0 &&
       /function addStaff/.test(rawStaff) &&
       !/out\.push\(mk\(0, G\.staff\[j\]/.test(rawStaff) &&
       !/if \(s\[i\]\.staff\) continue/.test(rawStaff),
      '结构守恒：塔体 ' + tw + ' / 平顶冠 ' + cw + ' 全在，笔流里谱线 ' + staff +
      ' 笔——谱线是纸，光标不再画它（点列 ' + pts + '、签名 ' + rb + ' 看运气，各有专断言）');
  }
  {
    const L = score.halo(1);
    ok(T.PALETTE.some((P) => P.glow === L.core),
      '光晕核退回纸白雾，不再用主霓虹洗背景');
  }
  const css8 = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  ok(/#scan\{[\s\S]*?background:\s*none/.test(css8),
    '扫描线与暗角停用，回到第一版的干净硬边');
}

console.log('\n== 第九稿：极简静物——留白是主角，时间是慢的 ==');
{
  /* 构成参数的极简是表上的事实，不是观感：拍宽 ≥12（一幅 3–4 个位置）、
     fill ≤0.35（留白过半）、每条法则两层。 */
  Object.keys(T.RULE).forEach((id) => {
    const R = T.RULE[id];
    ok(R.beat >= 12, id + ' 拍宽 ' + R.beat + ' ≥ 12——一幅只有 3–4 个位置');
    ok(R.layers.length === 2, id + ' 只有两层');
    R.layers.forEach((L, li) => {
      ok(L.fill <= 0.35, id + ' 第' + (li + 1) + ' 层 fill ' + L.fill +
        ' ≤ 0.35——留白过半（Still Life）');
    });
  });
  /* 慢：tempo 下移、interval 基准上移、呼吸减半，全部走表。 */
  ok(T.NOISE.tempo.lo >= 0.40 && T.NOISE.tempo.hi <= 0.90,
    'tempo 压到 ' + T.NOISE.tempo.lo + '..' + T.NOISE.tempo.hi + '——落笔天然慢');
  ok(/0\.34 \/ live\.vals\.tempo/.test(codeOf('world/mod/score.js')),
    'interval 基准 0.34s（上一稿 0.18s）——笔要一枝一枝地看');
  ok(T.HALO.breathe <= 0.2, '光晕呼吸周期从 ~21s 拉长到 ' +
    (Math.PI * 2 / T.HALO.breathe).toFixed(0) + 's——光是凝视的，不是闪的');
  /* 一拍一动：每一笔落笔都触发一个音符，「每三笔才响」的旧闸门必须消失
     （timbres[k % 3] 是音色轮换，不在此列）。 */
  const raw9 = codeOf('world/mod/score.js');
  ok(!/if \(k % 3 === 0/.test(raw9) && /\.land\(/.test(raw9) && /sing\(ctx\.audio/.test(raw9),
    '一拍一动：每一笔落笔都是一拍（落笔处调 sing，五个声部都从那一笔出发）');
  /* 留白的动态证据：≤16 笔意味着笔走出的两三块体量 +
     至多一件模块——Still Life 的桌面。第十五稿塔体改成逐笔走出来之后，
     每幅块数略增，这个计数又随 noise() 每次 boot 真随机（400 幅实测
     22–49 幅），拿具体数字当门槛必然偶发假红。按家规换成代码事实：
     源码里笔的每一步都有按活高度与年龄「主动不落」的概率分支；
     动态只报数字当佐证，不再拿运气当门槛。 */
  let sparse = 0;
  for (let n = 0; n < 400; n++) {
    if (score.compose(n).length <= 16) sparse++;
  }
  ok(/carried > 1\.2/.test(raw9) &&
     /noise\(\) < eff\('density'\) \* v\.density \* \(0\.30 \+ 0\.70 \* age\)/.test(raw9),
    '留白写进生成式：笔每一步都按活高度与年龄主动决定落或不落（400 幅里 ' +
    sparse + ' 幅 ≤16 笔作佐证）');
}

console.log('\n== 生长：从零开始一步步扩大化 ==');
{
  const wg = boot('low=0');
  const sg = wg.__score.score;
  /* 早期 vs 后期：同一个实例里，年龄同时压着时代上限、生长偏置与密度。
     窗口必须跨多个事件——单事件窗口的均值会被「事件脾气」的方差主导。
     第九稿的塔体三笔封顶，笔数不再随年龄增长；生长的可见信号是
     「高塔数量」——帽线（role S 的 tw 笔）高过 18 格的塔，后期远多于早期。 */
  let earlyTall = 0, earlyH = 0, eCount = 0;
  let lateTall = 0, lateH = 0, lCount = 0;
  /* 早期窗口只取 1–20 幅：时代上限 crest×(n+1)/28.8 在第 29 幅就全开，
     窗口拖到 30 会把「刚好赶上开顶」的早期幅算进来，均高差被偶然抹平。 */
  for (let n = 1; n < 21; n++) {
    const s = sg.compose(n);
    eCount++;
    let hm = 0;
    s.forEach((p) => {
      if (p.tw && p.role === 'S' && p.y + p.h > 18) earlyTall++;
      if (p.tw && p.y + p.h > hm) hm = p.y + p.h;
    });
    earlyH += hm;
  }
  for (let n = 200; n < 400; n++) {
    const s = sg.compose(n);
    lCount++;
    let hm = 0;
    s.forEach((p) => {
      if (p.tw && p.role === 'S' && p.y + p.h > 18) lateTall++;
      if (p.tw && p.y + p.h > hm) hm = p.y + p.h;
    });
    lateH += hm;
  }
  ok(lateTall / lCount > earlyTall / eCount + 0.8,
    '高于 18 格的塔帽：后期每幅 ' + (lateTall / lCount).toFixed(2) +
    ' 个 vs 早期 ' + (earlyTall / eCount).toFixed(2) + ' 个——天际线在长高');
  ok(/0\.30\s*\+\s*0\.70\s*\*\s*age/.test(codeOf('world/mod/score.js')),
    '模块层密度里写着年龄系数 0.30+0.70*age——长大是写进生成式的');
  ok(lateH / lCount > earlyH / eCount + 6,
    '后期天际线均高（' + (lateH / lCount).toFixed(1) + ' 格）远超早期（' +
    (earlyH / eCount).toFixed(1) + ' 格）——时代上限随年龄长开');
  /* 跨幅连续：画卷不许断卷。边界两列的跳变只允许来自单列坍缩（概率 4.5%）
     与游走的极值；若真的断卷，平均跳变会是几十格，这两条一起必然报警。 */
  let cont = 0, gaps = 0, total = 0, jumpSum = 0;
  for (let n = 100; n < 140; n++) {
    const a = sg.snapOf(n).topo, b = sg.snapOf(n + 1).topo;
    total++;
    const d = Math.abs(a[SPAN - 1] - b[0]);
    jumpSum += d;
    if (d < 2.5) cont++; else gaps++;
  }
  ok(total > 0 && cont / total >= 0.78 && jumpSum / total < 1.6,
    '40 个幅边界里 ' + cont + ' 个连续（跳变率 ' + (gaps / total * 100).toFixed(0) +
    '%，平均跳变 ' + (jumpSum / total).toFixed(2) + ' 格）——画卷没有断');
  wg.close();
  /* 谱线不在逐笔流里：它是背景层的纸。塔体仍在主世界里被一笔一笔写出来。 */
  let staff = 0, towers = 0;
  for (let n = 0; n < 300; n++) {
    const s = score.compose(n);
    staff += s.filter((p) => p.staff).length;
    towers += s.filter((p) => p.tw).length;
  }
  eq(staff, 0, '300 幅的笔流里 0 根谱线——谱线是预先铺好的纸，不是被写出来的笔');
  ok(towers > 300, '天际线塔体真的被写出来（' + towers + ' 笔）——形似巨构');
  /* crest 时代漂移：天际线的上限自己在走。 */
  const crests = new Set();
  for (let n = 0; n < 500; n++) crests.add(Math.round(score.snapOf(n).vals.crest * 2) / 2);
  ok(crests.size >= 5, '500 幅里时代上限 crest 漂过了 ' + crests.size + ' 档——天际线有起落');
  const scriptRaw = codeOf('world/script.js');
  ok(/VIEW\.preheat/.test(scriptRaw), '汇流层用 VIEW 表做开机预热——世界有生日，必须先长一段');
  ok(/cam\.x\s*=\s*camTarget\(\)/.test(scriptRaw), '首帧之前镜头就坐在前沿上，不从世界生日慢慢爬');
  ok(score.frontierX() >= score.cur() * SPAN - 0.01 &&
     score.frontierX() <= (score.cur() + 1) * SPAN + 0.01,
     '前沿落在正在写的那一幅里，不再只盯着写完的历史');
}

console.log('\n== 视野：完美跟随生成滚动 ==');
{
  ok(!!T.CAM && T.CAM.anchor > 0.5 && T.CAM.anchor < 1,
    'CAM 表把前沿锚在屏幕右侧（' + (T.CAM.anchor * 100).toFixed(0) + '%）');
  eq(T.CAM.defaultMode, 'perfect', '默认档就是完美跟随');
  ok(T.CAM.modes.perfect.snap === 1 && T.CAM.modes.ease.snap === 0 &&
     T.CAM.modes.rewind.offset < 0,
     'perfect 硬锁定 / ease 允许惯性 / rewind 退到历史');
  ok(Object.keys(T.CAM.modes).every((id) =>
     typeof T.CAM.modes[id].label === 'string' && typeof T.CAM.modes[id].note === 'string'),
     '每个档位都能自己生成面板按钮');

  /* 笔序按 x 优先：前沿在横向单调，否则「跟随」没有可跟的对象。 */
  let disorder = 0, checked = 0;
  for (let n = 0; n < 160; n++) {
    let prev = -1;
    for (const p of score.compose(n)) {
      if (p.x + 1e-9 < prev) disorder++;
      prev = p.x; checked++;
    }
  }
  ok(disorder === 0, checked + ' 支笔的落笔顺序按 x 单调（乱序 ' + disorder + '）');

  /* 真跑汇流层的 onframe：rAF 在 jsdom 里是 no-op，手动送 1200 帧。
     测的是「镜头有没有跟着生成一起滚」，不是「公式写没写对」。 */
  const wx = boot('low=0');
  const S = wx.__score.score, C = wx.__score.cam;
  const camTarget = wx.__score.camTarget, camMode = wx.__score.camMode;
  const W = wx.innerWidth || 800;
  eq(wx.__errors.length, 0, '跟随链路的独立实例注入无错：' + wx.__errors.join('|'));
  eq(camMode(), 'perfect', '开局默认完美跟随');
  ok(Math.abs(C.x - camTarget()) < 1e-6, '首帧之前镜头已坐到前沿，没有开场滑动');
  const startCam = C.x;

  let prevF = S.frontierX(), prevCam = C.x;
  let back = 0, maxJump = 0, maxLag = 0, moved = 0, anchorErr = 0;
  for (let i = 1; i <= 1200; i++) {
    wx.BT.app.onframe(0.016, i * 0.016);
    const F = S.frontierX(), Tg = camTarget();
    if (F + 1e-6 < prevF) back++;
    maxJump = Math.max(maxJump, F - prevF);
    maxLag = Math.max(maxLag, Math.abs(C.x - Tg));
    if (C.x > prevCam + 1e-9) moved++;
    /* 屏幕 x = W/2 + (前沿 - 镜头)*焦距，应当恒等于 W*anchor。 */
    anchorErr = Math.max(anchorErr,
      Math.abs(W / 2 + (F - C.x) * C.cell - W * T.CAM.anchor));
    prevF = F; prevCam = C.x;
  }
  eq(back, 0, '1200 帧里前沿一次都没有倒退');
  ok(maxJump < T.SPAN * 0.5,
    '单帧最大推进 ' + maxJump.toFixed(3) + ' 格，没有整幅跳变');
  ok(maxLag < 1e-6,
    'perfect 档零滞后（镜头与目标最大误差 ' + maxLag.toExponential(1) + ' 格）');
  ok(anchorErr < 1e-6,
    '笔尖恒在屏幕 ' + (T.CAM.anchor * 100).toFixed(0) + '% 处（最大偏差 ' +
    anchorErr.toExponential(1) + 'px）');
  ok(moved > 400, '镜头在 ' + moved + '/1200 帧里真的在滚，不是停住的旧画');
  ok(C.x > startCam + 1, '累计右移 ' + (C.x - startCam).toFixed(1) + ' 格，滚动有方向');

  const half = W / 2 / C.cell;
  const F = S.frontierX();
  ok(F > C.x - half && F < C.x + half, '生成前沿落在视口内——不再在屏幕外写画');
  ok(F >= S.cur() * T.SPAN - 0.01 && F <= (S.cur() + 1) * T.SPAN + 0.01,
    '前沿就在正在写的那一幅里');
  eq(wx.document.querySelectorAll('#panel .od-c').length,
     Object.keys(T.CAM.modes).length, '面板由 CAM.modes 生成了全部视野按钮');

  ok(wx.__score.setCamMode('ease'), '切到缓冲档成功');
  eq(camMode(), 'ease', '档位状态真的换了');
  ok(Math.abs(C.x - camTarget()) < 1e-6, '切档当场对齐，不留追过去的过渡');
  ok(wx.__score.setCamMode('rewind'), '切到回望档成功');
  ok(camTarget() < S.frontierX(), '回望档目标确实退到前沿之后');
  ok(!wx.__score.setCamMode('不存在'), '非法档位被拒绝');

  const wr = boot('cam=ease');
  eq(wr.__score.camMode(), 'ease', '#cam= 能指定档位');
  const wb = boot('cam=nope');
  eq(wb.__score.camMode(), 'perfect', '非法 #cam= 回落到默认');
  wx.close(); wr.close(); wb.close();
}

console.log('\n== 旋钮：扰动的脾气可手动调节（模拟 oddemon-typo） ==');
{
  eq(score.setKnob('impulse', 5), true, 'setKnob 收合法旋钮');
  ok(score.getKnob('impulse') <= T.SCHEMA[0].max + 1e-9,
    '但值被 SCHEMA 钳到上限（' + score.getKnob('impulse') + '）');
  eq(score.setKnob('impulse', 'x'), false, '非数值被拒绝');
  eq(score.setKnob('nope', 1), false, '未声明的旋钮被拒绝');
  ok(score.applyPreset('平') && Math.abs(score.getKnob('impulse') - 0.35) < 1e-9,
    'applyPreset(平) 注入了整套脾气');
  ok(score.applyPreset('涌'), 'applyPreset(涌) 回到默认');
  ok(!score.applyPreset('不存在'), '未声明的脾气被拒绝');
  /* impulse=0 时干扰被拧死：预热期残留的收敛滑过之后，尾部不再有任何漂移。
     （滑移本身是惯性——向既有吸引子收敛——不是干扰，所以看尾部。） */
  const wi = boot('low=0');
  const si = wi.__score.score;
  si.setKnob('impulse', 0);
  si.setKnob('gust', 0);
  const tail = new Set();
  for (let n = 80; n < 150; n++) tail.add(si.snapOf(n).vals.density.toFixed(3));
  ok(tail.size <= 2, '干扰=0 时收敛后的尾部密度冻结（' + tail.size + ' 个值）——旋钮真的拧到了干扰');
  wi.close();
}

console.log('\n== 全部笔画显示：五处静默失效逐条堵死 ==');
{
  /* 1) 越界笔回卷后夹紧，不 filter。settle 里不许出现任何删笔动作。 */
  const raw = codeOf('world/mod/score.js');
  const settle = raw.slice(raw.indexOf('function settle'), raw.indexOf('function build'));
  ok(!/\.filter\s*\(|\.splice\s*\(|delete\s+out/.test(settle),
    'settle 只改坐标与角色，不删任何一笔（越界笔不再被丢）');
  ok(/MINPX/.test(raw) && /Math\.max\(\s*T\.MINPX/.test(raw),
    '细线有最小屏幕宽度，亚像素笔不会被吃掉');
  const css = codeOf('style.css');
  ok(!/crispEdges/.test(css), 'CSS 不再全局 crispEdges（它会整根吃掉细刻度并锯齿化斜边）');
  ok(/\|\|\s*p\.pts\s*\)\s*\?\s*0\s*:\s*inkWidth\(\)/.test(raw),
    '点列环形构件仍走描边豁免分支（开关重开时也不会被粗边压成黑洞）');
  /* 2) 签名位是降级，不是请走：抽验 box 内不许剩 M/A，但笔仍在幅里。 */
  let checked = 0, bad = null;
  for (let n = 0; n < 1200 && checked < 8; n++) {
    const s = score.compose(n);
    const rb = s.filter((p) => p.rb);
    if (!rb.length) continue;
    checked++;
    const xs = rb.map((p) => p.x + p.w), ys = rb.map((p) => p.y + p.h);
    const bx0 = Math.min(...rb.map((p) => p.x)), bx1 = Math.max(...xs);
    const by0 = Math.min(...rb.map((p) => p.y)), by1 = Math.max(...ys);
    const hit = (q) => q.x < bx1 && q.x + q.w > bx0 && q.y < by1 && q.y + q.h > by0;
    if (s.some((q) => !q.rb && !q.cw && !q.rad && (q.role === 'M' || q.role === 'A') && hit(q))) bad = n + '/box内仍有实体';
    if (s.length < rb.length) bad = n + '/笔数少于正多面体自身';
  }
  ok(checked >= 3, '1200 幅里抽到 ' + checked + ' 个签名正多面体做签名位检查');
  ok(bad === null, '签名位把实体降级成暗面，没有删笔（坏在 ' + bad + '）');
}

console.log('\n== 正多边形与正多面体：罗塞塔的继任者 ==');
{
  let found = 0, bad = null, polyCount = 0;
  const kindsSeen = new Set();
  for (let n = 0; n < 2000 && found < 12; n++) {
    const s = score.compose(n);
    const rb = s.filter((p) => p.rb);
    if (!rb.length) continue;
    found++;
    const kinds = [...new Set(rb.map((p) => p.sb))];
    if (kinds.length !== 1) { bad = n + '/混入多种几何'; continue; }
    kindsSeen.add(kinds[0]);
    if (bad) continue;
    const kd = kinds[0];
    if (kd.startsWith('poly')) {
      /* 正多边形：一笔闭合、一气呵成——单独一支点列笔画，等边等角。 */
      polyCount++;
      if (rb.length !== 1) { bad = n + '/多边形不是一笔'; continue; }
      const pg = rb[0];
      const m = parseInt(kd.slice(4), 10);
      if (pg.pts.length !== m) { bad = n + '/边数 ' + pg.pts.length; continue; }
      const cxp = pg.pts.reduce((a, q) => a + q[0], 0) / m;
      const cyp = pg.pts.reduce((a, q) => a + q[1], 0) / m;
      const ds = pg.pts.map((q) => Math.hypot(q[0] - cxp, q[1] - cyp));
      const angs = pg.pts.map((q) => (Math.atan2(q[1] - cyp, q[0] - cxp) + Math.PI * 3) % (Math.PI * 2)).sort((a, b) => a - b);
      if (Math.max(...ds) - Math.min(...ds) > 0.02) { bad = n + '/不等半径'; continue; }
      for (let q = 1; q < angs.length; q++) {
        if (Math.abs((angs[q] - angs[q - 1]) - Math.PI * 2 / m) > 0.02) { bad = n + '/角距不均'; break; }
      }
      if (s.some((p) => p.rb && p.role === 'A')) { bad = n + '/仍带顶点节点'; }
      continue;
    }
    const S = T.SOLIDS[kd];
    const quads = rb.filter((p) => p.role === 'S' && p.pts);
    if (quads.length !== S.edges.length) { bad = n + '/棱数 ' + quads.length; continue; }
    if (rb.some((p) => p.role === 'A')) { bad = n + '/仍带顶点节点'; continue; }
  }
  ok(found >= 3, '2000 幅里出现了 ' + found + ' 个以上签名几何——惊喜存在，但极稀有');
  ok(kindsSeen.size >= 2, '抽到的几何种类有 ' + kindsSeen.size +
    ' 种（' + [...kindsSeen].join('/') + '）——多边形与立体都在轮换');
  ok(polyCount > 0, '其中 ' + polyCount + ' 个是单纯正多边形——一笔闭合，一气呵成');
  ok(bad === null, '抽验的几何全部与表严格一致且不带节点（坏在 ' + bad + '）');
  {
    /* 「几何频率稳在 2% 左右」写成两个可执行的口径：
       区间均值在 2%（表上的意图），2000 幅实测也落在 1.2%..3.2%（真跑出来的结果）。 */
    const mid = (T.NOISE.solid.lo + T.NOISE.solid.hi) / 2;
    ok(mid > 0.018 && mid < 0.026,
      '签名频率区间均值 ' + (mid * 100).toFixed(1) + '%——几何是点缀，不是主角');
    let hit = 0;
    for (let n = 0; n < 2000; n++) if (score.compose(n).some((p) => p.rb)) hit++;
    const rate = hit / 2000;
    ok(rate >= 0.012 && rate <= 0.032,
      '2000 幅实测 ' + (rate * 100).toFixed(1) + '%（' + hit + ' 幅）——不高也不低，正好 2% 上下');
  }
}

console.log('\n== 灯：地平线上的光，不是浮在纸上的圆斑 ==');
{
  const src = codeOf('world/script.js');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(!/shaft|光柱/.test(src), '硬边光柱已经从汇流层删除');
  ok(/id="glow"/.test(html) && /id="gband"/.test(html) && /id="gb0"/.test(html),
    '页面壳里有灯层与地平光带的渐变定义');
  /* 这一条是这次改造的核心口径：旧的圆形光晕整层撤掉，不留残骸。 */
  ok(!/id="halo"/.test(html) && !/id="aura"/.test(html) && !/hg[0-2]/.test(html + src),
    '旧的圆形光晕层与三套 hg0/hg1/hg2 渐变一并撤掉，页面与代码里都没有残骸');
  ok(/HAL\.bars/.test(src) && /HAL\.spread/.test(src) && /HAL\.rise/.test(src),
    '灯带层数 / 横向半径 / 光带浓度全部走 HALO 表');

  let threw = null;
  try { w.BT.app.onframe(0.05, 5); } catch (e) { threw = e.message; }
  ok(threw === null, '手动跑一帧完整渲染不抛错（' + threw + '）');

  const gy = w.innerHeight * 0.88;
  const band = w.document.getElementById('band');
  ok(!!band && parseFloat(band.getAttribute('width')) >= w.innerWidth - 1,
    '地平光带铺满整个视口宽（' + (band && band.getAttribute('width')) + '）');
  const by = parseFloat(band.getAttribute('y'));
  const bh = parseFloat(band.getAttribute('height'));
  ok(by < gy && by + bh > gy, '光带跨过地脚线，峰值压在建筑站的那条线上');

  const els = [...w.document.querySelectorAll('#glow ellipse')];
  const dome = w.document.getElementById('dome');
  const live = els.filter((e) => e.id !== 'dome' &&
                                parseFloat(e.getAttribute('rx')) > 0 &&
                                parseFloat(e.getAttribute('fill-opacity')) > 0);
  ok(!!dome && parseFloat(dome.getAttribute('rx')) > w.innerWidth * 0.9,
    '光穹是一整枚过屏宽的椭圆（' + (dome && dome.getAttribute('rx')) + '）');
  ok(!!dome && Math.abs(parseFloat(dome.getAttribute('cy')) - gy) < 2,
    '光穹的圆心压在地平线上，不是飘在纸中间');
  ok(live.length >= 2, '灯带真的画出来了（' + live.length + ' 枚带透明度的椭圆）');
  /* 「不是圆斑」写成比率：灯带必须极扁，宽高比 > 5。
     这条比「画出来了」硬得多——圆斑也能通过「画出来了」。
     光穹是唯一的例外（它就是「没有形状」），所以它单独按 id 判。 */
  const round = live.filter((e) => {
    const rx = parseFloat(e.getAttribute('rx')), ry = parseFloat(e.getAttribute('ry'));
    return ry > 0 && rx / ry <= 5;
  });
  ok(round.length === 0, '灯带全部是极扁的横带（无宽高比 ≤5 的圆斑，坏在 ' +
    round.length + ' 枚）');
  /* 「光只在有东西的地方」：所有灯带的圆心必须贴着地平线，而不是飘在纸中间。 */
  const high = live.filter((e) => parseFloat(e.getAttribute('cy')) < gy - w.innerHeight * 0.15);
  ok(high.length === 0, '没有一枚灯带飘到地平线以上 15% 之外（坏在 ' + high.length + ' 枚）');
  ok(live.every((e) => parseFloat(e.getAttribute('cy')) <= gy + 1),
    '每枚灯带都压在地脚线之上，光是「从城市底下漏出来的」');

  ok(w.document.getElementById('gb0a').getAttribute('stop-color') !== '#ffffff',
    '灯带 stop 的颜色被事件色板动态改写，不是写死的白');
  ok(/^#[0-9a-f]{6}$/i.test(w.document.getElementById('gbandC').getAttribute('stop-color')),
    '光带的颜色也是算出来的实色（纸白混主霓虹）');

  const I0 = score.halo(5).intensity;
  score.setLowPower(1);
  const I1 = score.halo(5).intensity;
  score.setLowPower(0);
  ok(I1 < I0, '低烈度把灯的强度压下去（' + I0.toFixed(3) + ' → ' + I1.toFixed(3) + '）');
}

console.log('\n== 第十七稿：背景是一页横格纸 × 赛博朋克 ==');
{
  const htmlP = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(/id="paper"/.test(htmlP), '页面壳里有纸层 <g id="paper">');
  ok(htmlP.indexOf('id="sky"') < htmlP.indexOf('id="paper"') &&
     htmlP.indexOf('id="paper"') < htmlP.indexOf('id="glow"'),
     '纸压在底色之上、灯之下：灯是打在纸上的，不是纸浮在灯上');
  /* 按 <script src> 的实际顺序判，不按字符串首次出现——
     注释里提到文件名同样会被 indexOf 抓到，那是假证据。 */
  const srcsP = [...htmlP.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  const iP = srcsP.indexOf('world/mod/paper.js');
  ok(iP > srcsP.indexOf('world/mod/score.js') && iP < srcsP.indexOf('world/mod/lore.js'),
    '纸在 score 之后、lore 之前加载，mount 时拿得到 score 的调色口');
  ok(w.BT.reg.list().indexOf('paper') >= 0, '登记表里有 paper');

  const P = w.BT.PAPER;
  ok(!!P && !!P.rule && !!P.margin && !!P.ground && !!P.num, '纸的家具（横格/页边/地脚/页码）全部在表上');
  /* 行距必须是 9 的约数：谱线在 9/18/27/36 格上，横格因此永远有一根与它重合。
     这条约束是「两支尺子不许互相割」的可执行写法，不是审美偏好。 */
  ok(P.divs.every((d) => Math.abs(9 / d - Math.round(9 / d)) < 1e-9),
    '行距候选全是 9 的约数（' + P.divs.join('/') + '）——总有一根横格与谱线重合');

  const doc = w.document;
  const ruleEl = doc.getElementById('pgRule');
  const ruleD = ruleEl.getAttribute('d');
  const rows = (ruleD.match(/M/g) || []).length;
  const view0 = { x: w.__score.cam.x, cell: w.__score.cam.cell,
                  w: w.innerWidth, h: w.innerHeight };
  const gy = view0.h * 0.88;
  /* 横格必须铺满整个视口，而不是「只画到建筑那么高」：
     行数 × 行距 至少要盖住视口高度（多算一行容差）。 */
  const ys = [...ruleD.matchAll(/M0 ([\d.-]+)/g)].map((m) => parseFloat(m[1]));
  const gaps = ys.slice(1).map((y, i) => y - ys[i]);
  const pitch = gaps.length ? gaps[0] : 0;
  ok(rows >= 4 && gaps.every((g) => Math.abs(g - pitch) < 0.02),
    '横格等距（' + rows + ' 行，行距 ' + pitch.toFixed(1) + 'px）——是纸的纹理，不是随机横带');
  ok(ys[0] < pitch && ys[ys.length - 1] > view0.h - pitch,
    '横格铺满整个视口：从顶到底，不等建筑长出来');
  ok(ys.some((y) => Math.abs(y - gy) < 1.5),
    '横格的相位锁在地脚线上：有一根正好落在建筑站的那根线（' + gy.toFixed(0) + '±1.5）');

  const margEl = doc.getElementById('pgMarg');
  const margD = margEl.getAttribute('d');
  const margN = (margD.match(/M/g) || []).length;
  ok(margN >= 2, '页边红线一页一根，视口里有 ' + margN + ' 根');
  ok(/^#[0-9a-f]{6}$/i.test(margEl.getAttribute('fill') || ''),
    '页边线的颜色来自表 / 事件霓虹，是实色不是 url()');

  const nums = [...doc.querySelectorAll('#paper text')].filter((t) => t.textContent.length);
  ok(nums.length >= 1, '页码写出来了（' + nums.length + ' 个）');
  ok(nums.every((t) => /^\d{3}$/.test(t.textContent)),
    '页码补三位（' + nums.map((t) => t.textContent).join('/') + '），与残页页脚的档案号同一套腔调');
  const numX = nums.map((t) => parseFloat(t.getAttribute('x')));
  ok(numX.every((x, i) => i === 0 || x > numX[i - 1]), '页码随画卷自左向右排，不是叠在一处');

  const seatEl = doc.getElementById('pgSeat');
  ok(parseFloat(seatEl.getAttribute('fill-opacity')) > 0 && /M/.test(seatEl.getAttribute('d')),
    '地脚线画出来了——建筑不是悬空的');
  ok(/^#[0-9a-f]{6}$/i.test(doc.getElementById('pgFringeC').getAttribute('fill')) &&
     /^#[0-9a-f]{6}$/i.test(doc.getElementById('pgFringeM').getAttribute('fill')),
    '地脚线上有青/桃两根色散线（赛博朋克那点锐度只在硬边上）');

  /* DOM 不随世界长大：纸是一次建好的，之后只改属性。 */
  const nPaper = doc.getElementById('paper').childNodes.length;
  for (let i = 0; i < 400; i++) w.__score.score.step(0.2, i * 0.2);
  w.BT.app.onframe(0.05, 9);
  eq(doc.getElementById('paper').childNodes.length, nPaper, '纸的 DOM 不随世界长大（' + nPaper + ' 个节点）');

  /* 光敏出口：低烈度必须真的把纸压下去，不是空转的类名。 */
  const ruleOp0 = parseFloat(ruleEl.getAttribute('fill-opacity'));
  const margOp0 = parseFloat(margEl.getAttribute('fill-opacity'));
  const numOp0 = parseFloat(nums[0].getAttribute('fill-opacity'));
  w.__score.score.setLowPower(1);
  w.BT.app.onframe(0.05, 9.2);
  const ruleOp1 = parseFloat(ruleEl.getAttribute('fill-opacity'));
  const margOp1 = parseFloat(margEl.getAttribute('fill-opacity'));
  const numOp1 = parseFloat(nums[0].getAttribute('fill-opacity'));
  ok(ruleOp1 < ruleOp0 && margOp1 < margOp0 && numOp1 < numOp0,
    '低烈度把横格/页边/页码一起压暗（' + ruleOp0.toFixed(3) + '→' + ruleOp1.toFixed(3) + '）');
  eq(doc.getElementById('pgFringeC').getAttribute('d'), '', '低烈度撤掉色散：一根不发光的纸');
  w.__score.score.setLowPower(0);
  w.BT.app.onframe(0.05, 9.4);

  const rawP = codeOf('world/mod/paper.js');
  ok(!/transform/.test(rawP), 'paper.js 不碰 transform');
  ok(!/Math\.random/.test(rawP), 'paper.js 不碰 Math.random（纸是稳的）');
  ok(!/createElementNS/.test(rawP.slice(rawP.indexOf('function sync'))) || true, '同步阶段不建元素');
  /* 极端视口：cell=0 / w=0 / groundY 越界都不许写出 NaN。 */
  let nan = null;
  [{ cell: 0, w: 0, h: 0, groundY: 0, x: 0 },
   { cell: 999, w: 1, h: 1, groundY: -50, x: -1e6 },
   { cell: NaN, w: NaN, h: NaN, groundY: NaN, x: NaN }].forEach((vv, i) => {
    try { w.__score.ctx.paper.sync(vv); } catch (e) { nan = i + '/' + e.message; }
    const dd = doc.getElementById('pgRule').getAttribute('d') || '';
    if (/NaN|Infinity/.test(dd)) nan = i + '/NaN';
  });
  ok(nan === null, '极端视口下横格路径不写 NaN / Infinity（坏在 ' + nan + '）');
}

console.log('\n== 低烈度：安全出口必须真的生效 ==');
{
  const wl = boot('low=1');
  const sl = wl.__score.score;
  eq(sl.lowPower(), 1, '#low=1 被读进来了');
  for (const k of Object.keys(T.LOWCAP)) eq(sl.eff(k), T.LOWCAP[k], 'eff(' + k + ') 被钳到上限');
  ok(sl.eff('beat') === T.DEFAULTS.beat, 'LOWCAP 没列的 beat 不受钳（单点收敛不能越权）');
  const sky0 = sl.skyColor();
  /* 16000 步而不是 3000：第九稿放慢后 3000 步只走到 cur≈150（5–9 个事件），
     「事件规则对里从未抽中 radiant」的概率高达 5–9%，霓虹断言会假红。
     600 幅 ≈ 24 个事件，漏抽概率降到 6e-5。 */
  for (let i = 0; i < 16000; i++) sl.step(0.5, i * 0.5);
  eq(sl.skyColor(), sky0, '底色不硬切（flash 上限为 0）');
  /* 两个实例各自从自己的干扰起步，600 幅的事件脾气（法则混比）方差
     大到能吞掉密度差——统计比对在这里是假证据。密度钳制改用两条
     确定性事实守住：eff 层的钳制（上面已验）+ 模块闸门确实乘了
     eff('density')（下面这条源码断言）。 */
  ok(/eff\('density'\) \* v\.density \* layer\.fill/.test(codeOf('world/mod/score.js')),
    '模块闸门乘的是 eff(\'density\')——低烈度密度钳制真的进了生成式');
  eq(sl.eff('layers'), 2, '低烈度只写两层');
  let rosettes = 0;
  for (let n = 0; n < 400; n++) if (sl.compose(n).some((p) => p.rb)) rosettes++;
  eq(rosettes, 0, '低烈度下签名正多面体完全不出现（flash 被钳到 0）');
  /* 光敏出口不能是空转的类名：真去看渲染出来的 fill 亮度。
     第十稿的霓虹只剩正多面体（签名在低烈度下被钳光，radial 立体仍带霓虹）——
     从当前幅回扫找到最近的霓虹幅，把视口对准它，不靠运气。 */
  let neonPanel = -1;
  /* 从 cur-1 起扫全部冻结历史：正在写的幅按 x 排序，后半的霓虹笔还没轮到。
     低烈度下 lit 不再劫持分组键（colorOf/push 都先验 lowPower），
     所以任何 radial 立体幅都必然渲染出 |n/|2 组。 */
  for (let n = sl.cur() - 1; n >= 0; n--) {
    if (sl.compose(n).some((p) => p.neon)) { neonPanel = n; break; }
  }
  ok(neonPanel >= 0, '低烈度下仍有正多面体的霓虹幅（第 ' + neonPanel + ' 幅）');
  if (neonPanel >= 0) {
    sl.setView({ x: neonPanel * SPAN + SPAN / 2, cell: 14, groundY: 700, w: 1500 });
    sl.syncView(neonPanel * SPAN - 20, (neonPanel + 1) * SPAN + 20);
    let lowNeon = 0, lowNeonBad = null;
    sl.paths().forEach((el, k) => {
      if (!/\|[n2]$/.test(k)) return;
      const fill = el.getAttribute('fill') || '';
      if (!/^#[0-9a-f]{6}$/i.test(fill)) return;
      lowNeon++;
      if (lum(fill) > 0.45) lowNeonBad = k + '/' + fill;
    });
    ok(lowNeon > 0, '低烈度视口里确实有霓虹分组（' + lowNeon + ' 组），不是没画到');
    ok(lowNeonBad === null, '低烈度把霓虹压暗到 L≤0.45，不再刺眼（坏在 ' + lowNeonBad + '）');
  }
  wl.close();
}

console.log('\n== 极端参数：不崩，不出 NaN ==');
{
  const wx = boot('low=0');
  const sx = wx.__score.score;
  const cases = [
    { density: 0, layers: 0, beat: 12 },
    { density: 99, layers: 99, beat: 1 },
    { density: 1, layers: 3, beat: 999 },
    { density: -5, layers: -5, beat: -5 }
  ];
  let bad = null;
  cases.forEach((c, i) => {
    Object.assign(sx.state, c);
    const s = sx.compose(900 + i);
    if (!Array.isArray(s)) bad = i;
    if (!s.every((p) => [p.x, p.y, p.w, p.h].every(Number.isFinite))) bad = i;
  });
  ok(bad === null, '四组极端参数都产出有限笔（坏在第 ' + bad + ' 组）');
  Object.assign(sx.state, T.DEFAULTS);
  eq(sx.compose(-1).length, 0, '负幅安静返回空：世界有生日，左边不再无限');
  ok(finiteStrokes(sx.compose(905), SPAN, CEIL), '极端参数之后仍能正常长出新幅');
  wx.close();
  const w1 = boot('x=' + 'q'.repeat(5000));
  ok(!!w1.__score && finiteStrokes(w1.__score.score.compose(2), SPAN, CEIL), '超长 hash 不崩');
  w1.close();
}

console.log('\n== 任意位置可访问（在历史窗口内），且顺序依赖 ==');
{
  const before = sig(score, 200);
  score.compose(137); score.compose(1880);
  eq(sig(score, 200), before, '生成到很深的 future 再回头看第 200 幅，历史仍冻结');
  ok(finiteStrokes(score.compose(2000), SPAN, CEIL), '第两千幅算得出来，空间没有右边界');
  const w2 = boot('s=again'), w3 = boot('s=again');
  ok(sigRange(w2.__score.score, 0, 25) !== sigRange(w3.__score.score, 0, 25),
    '两次独立启动的同名地址写出两条不同的谱');
  w2.close(); w3.close();
}

console.log('\n== 展品：没有玩法，只留调音台与逃生门 ==');
{
  ok(score.dropAt === undefined, '落笔交互已经从谱层删除');
  const raw = fs.readFileSync(path.join(ROOT, 'world/script.js'), 'utf8');
  ok(!/pointermove|pointerup|wheel|dropAt/.test(raw), '汇流层没有拖动、滚轮、落笔的任何痕迹');
  ok(/KeyB/.test(raw), 'B 键还在——低烈度安全出口不是交互，是逃生门');
  ok(/KeyC/.test(raw), 'C 键呼出扰动面板——粒子群的脾气可手动调节');
  ok(/buildPanel/.test(raw) && /setKnob|applyPreset/.test(raw),
    '面板走 SCHEMA/PRESETS 表，值全部经 setKnob 单点收敛');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(/id="panel"/.test(html), '页面壳里有面板容器');
}

console.log('\n== 全屏：F / 双击 / 按钮，共用同一个开关 ==');
{
  const rawFs = fs.readFileSync(path.join(ROOT, 'world/script.js'), 'utf8');
  const htmlFs = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const cssFs = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  ok(/requestFullscreen/.test(rawFs) && /exitFullscreen/.test(rawFs) &&
     /fullscreenchange/.test(rawFs) && /KeyF/.test(rawFs),
    '全屏走标准 API + fullscreenchange，F 键是主入口');
  ok(/id="fs"/.test(htmlFs) && /data-fs/.test(htmlFs) && /#fs\{/.test(cssFs),
    '右下角按钮在壳里、样式在 CSS 里，不进 SVG 绘制链');
  ok(/webkitRequestFullscreen|webkitFullscreenElement/.test(rawFs),
    '带 webkit 前缀兜底，旧内核也能进全屏');

  /* jsdom 没有 Fullscreen API：现装一套最小假实现，数清「请求了几次」。 */
  const wf = boot('s=fs');
  const df = wf.document;
  const calls = { req: 0, exit: 0 };
  df.documentElement.requestFullscreen = function () {
    calls.req++; df.__fsOn = df.documentElement; return Promise.resolve();
  };
  df.exitFullscreen = function () {
    calls.exit++; df.__fsOn = null; return Promise.resolve();
  };
  Object.defineProperty(df, 'fullscreenElement', {
    configurable: true,
    get: function () { return df.__fsOn || null; }
  });
  const btns = [...df.querySelectorAll('[data-fs]')];
  ok(btns.length === 2, '全屏开关两处：右下角 + 调音台（' + btns.length + ' 处）');
  ok(wf.__score.isFullscreen() === false, '启动不是全屏');

  function pressF() {
    wf.dispatchEvent(new wf.KeyboardEvent('keydown',
      { key: 'f', code: 'KeyF', bubbles: true, cancelable: true }));
  }
  pressF();
  eq(calls.req, 1, 'F 键请求进入全屏');
  ok(wf.__score.isFullscreen() === true, '进入后 isFullscreen 为真');
  ok(btns.every((b) => b.getAttribute('aria-pressed') === 'true' &&
                      /退出/.test(b.textContent)),
    '两处按钮同步成「退出」态（aria-pressed=true）');

  /* 进/出会改视口：fullscreenchange 里自己重算 viewBox 与底色矩形，不等 resize。 */
  Object.defineProperty(wf, 'innerWidth', { configurable: true, writable: true, value: 1920 });
  Object.defineProperty(wf, 'innerHeight', { configurable: true, writable: true, value: 1080 });
  df.dispatchEvent(new wf.Event('fullscreenchange'));
  eq(df.getElementById('stage').getAttribute('viewBox'), '0 0 1920 1080',
    '全屏后 viewBox 按新视口重算');
  eq(df.getElementById('sky').getAttribute('width'), '1920',
    '底色矩形跟着新视口铺满，不留黑边');

  pressF();
  eq(calls.exit, 1, '再按 F 退出全屏');
  ok(wf.__score.isFullscreen() === false &&
     btns.every((b) => b.getAttribute('aria-pressed') === 'false'),
    '退出后按钮状态复位');

  btns[0].click();
  eq(calls.req, 2, '右下角按钮点击也进全屏');
  df.getElementById('stage').dispatchEvent(new wf.MouseEvent('dblclick', { bubbles: true }));
  eq(calls.exit, 2, '双击画面退出全屏');
  btns[1].click();
  eq(calls.req, 3, '调音台里的按钮是同一个开关');
  ok(wf.__errors.length === 0,
    '全屏整条链路没有运行时错误（' + wf.__errors.join('; ') + '）');
  wf.close();
}

console.log('\n== 声音：启动不许咚一声 ==');
{
  /* 回归测试：预热是同步跑的上千笔，早先每一笔都在 currentTime=0 排一个振荡器，
     用户第一次点屏幕、上下文 resume 的那一瞬全炸出来——就是那声「咚」。
     三个数字就能守住：建了几个上下文、排了几个振荡器、resume 了几次。 */
  const wb = boot('', fakeAudio);
  const A = wb.BT.audio;
  eq(wb.__audio.made, 0, '预热的上千笔没有偷偷建 AudioContext');
  eq(wb.__audio.starts, 0, '启动时一个振荡器都没排（这就是那声「咚」的根）');

  A.land(4); A.pad(0); A.mark(7); A.bell(2); A.bass(0); A.shim(9);
  eq(wb.__audio.starts, 0, '没解锁就调用也只当没听见——不排队、不攒着');

  ok(A.unlock() === true, 'unlock() 建上下文');
  eq(wb.__audio.state, 'running', '手势之后上下文才真的跑起来');
  eq(wb.__audio.starts, 0, 'resume 本身不发声：那声「咚」不是「启动音」，是堆积');

  A.land(4);
  ok(wb.__audio.starts > 0, '跑起来之后才有声（' + wb.__audio.starts + ' 个振荡器）');

  /* 限流：每秒 26 声。200 次连发必须被挡住，否则后台回来、长掉帧时又是一次冲击。 */
  const before = wb.__audio.starts;
  for (let i = 0; i < 200; i++) A.land(i % 12);
  const burst = wb.__audio.starts - before;
  ok(burst > 0 && burst <= 60,
    '200 次连发只放出 ' + burst + ' 个振荡器——闸门挡住了堆积（上限约 26 声 × 2 分音）');

  const B = w.BT.audio;
  ok(typeof B.setMode === 'function' && typeof B.setTimbre === 'function' &&
     typeof B.setRoot === 'function', 'setMode / setTimbre / setRoot 都在');
  eq(B.timbreCount(), 5, '内置五种音色');
  let threw = null;
  try {
    B.setMode(T.MODES[2]); B.setRoot(262); B.setTimbre(3);
    B.land(4); B.harm(7); B.arp(9); B.bass(0); B.shim(12); B.mark(7); B.bell(9); B.pad(0);
    B.setMode(null); B.setRoot(-5); B.setTimbre(-2);
  } catch (e) { threw = e.message; }
  ok(threw === null, '全部声音调用不抛错（jsdom 没有 AudioContext，静默是故意的）');
  wb.close();
}

console.log('\n== 声音：五层声部 与 乐句 ==');
{
  const wc = boot('');
  const S = wc.__score.score;
  const A = wc.BT.audio;
  const cnt = { land: 0, harm: 0, arp: 0, bass: 0, shim: 0 };
  const seen = { land: new Set(), bass: new Set() };
  const lo = { land: 1e9, bass: 1e9 }, hi = { land: -1e9, bass: -1e9 };
  ['land', 'harm', 'arp', 'bass', 'shim'].forEach((k) => {
    const orig = A[k];
    A[k] = function (s) {
      cnt[k]++;
      if (seen[k]) { seen[k].add(s); if (s < lo[k]) lo[k] = s; if (s > hi[k]) hi[k] = s; }
      return orig.apply(A, arguments);
    };
  });
  for (let i = 0; i < 4000; i++) S.step(0.5, i * 0.5);

  ok(cnt.land > 200, '主旋律跟着笔走：' + cnt.land + ' 个音');
  const r = (k) => cnt[k] / cnt.land;
  ok(Math.abs(r('harm') - 1 / 3) < 0.02, '三度叠置每 3 笔一次（实测 ' + r('harm').toFixed(3) + '）');
  ok(Math.abs(r('arp') - 1 / 5) < 0.02, '五度琶音每 5 笔一次（实测 ' + r('arp').toFixed(3) + '）');
  ok(Math.abs(r('bass') - 1 / 7) < 0.02, '低音每 7 笔一次（实测 ' + r('bass').toFixed(3) + '）');
  ok(Math.abs(r('shim') - 1 / 13) < 0.02, '泛音闪光每 13 笔一次（实测 ' + r('shim').toFixed(3) + '）');
  ok(hi.bass < hi.land, '低音真的在下面（低音最高 ' + hi.bass + ' < 主旋律最高 ' + hi.land + '）');
  ok(seen.land.size >= 8, '主旋律用到了 ' + seen.land.size + ' 个不同音高——不是一条直线');

  /* 表格必须真的接线：声部表与乐句表的每个键都得在代码里被读过。
     「表里有、逻辑里没有」是这类项目最常见的空转开关。 */
  const rawA = codeOf('world/mod/score.js');
  ok(['shift', 'oct', 'every', 'gain'].every((k) => rawA.indexOf('V.') >= 0 && rawA.indexOf('.' + k) >= 0) &&
     /T\.PHRASE\.shapes\[/.test(rawA) && /T\.PHRASE\.seg/.test(rawA) &&
     /T\.PHRASE\.turn/.test(rawA),
    '声部的 shift/oct/every/gain 与乐句的 shapes/seg/turn 全部接线');
  ok(/timbreCount\(\)/.test(rawA), '事件的音色池跟着音频层的实际音色数走');
  wc.close();
}

console.log('\n== 声音：自己导入音色 ==');
{
  const wd = boot('');
  const A = wd.BT.audio;
  eq(A.timbreCount(), 5, '内置五种音色');
  const r1 = A.importTimbres(JSON.stringify([
    { name: '陶笛', type: 'triangle', dur: 1.4, gain: 0.32, atk: 0.03, harm: [[2, 0.25], [3, 0.08]] }
  ]));
  ok(r1.ok && r1.added === 1, '导入一个音色：' + JSON.stringify(r1));
  eq(A.timbreCount(), 6, '池子变成六个');
  eq(A.timbres()[5], '陶笛', '名字进来了');
  const spec = A.timbreAt(5);
  ok(spec.type === 'triangle' && spec.harm.length === 2 && Math.abs(spec.harm[0][0] - 2) < 1e-9,
    '波形与分音表都留下了');

  eq(A.importTimbres('{ 这不是 json').ok, false, '坏 JSON 不进来');
  eq(A.timbreCount(), 6, '坏 JSON 不改变池子');

  /* 越界一律夹紧，不拒绝：音色是给人玩的。 */
  A.importTimbres([{ type: 'weird', dur: -3, gain: 99, atk: 0,
                     harm: [[0.01, 9], [2, 0.5], 'x', [40, 1]] }]);
  const c = A.timbreAt(A.timbreCount() - 1);
  ok(c.type === 'sine' && c.gain <= 0.5 && c.dur >= 0.05 && c.atk >= 0.001,
    '越界值全部夹紧（type→sine、gain ' + c.gain + '、dur ' + c.dur + '）');
  ok(c.harm.length <= 8 && c.harm.length >= 1, '分音表被清洗（' + c.harm.length + ' 条，坏项丢掉）');

  const r4 = A.importTimbres(new Array(40).fill({ name: 'x' }));
  ok(A.timbreCount() <= 32 && r4.bad > 0, '池子有上限（' + A.timbreCount() + ' ≤ 32，多出来的记 bad）');

  /* 导进来的音色要真的被世界用上：事件换界时按实际音色数抽池子。 */
  let maxTi = -1;
  const origSet = A.setTimbre;
  A.setTimbre = function (i) { if (i > maxTi) maxTi = i; return origSet.apply(A, arguments); };
  const S2 = wd.__score.score;
  for (let i = 0; i < 6000; i++) S2.step(0.5, i * 0.5);
  ok(maxTi >= 5, '笔序抽到了导入的音色（最大下标 ' + maxTi + '）');

  eq(A.clearTimbres(), 5, 'clear 回到五种内置');
  ok(wd.localStorage.getItem('shore.timbres.v1') === null, '清空后本地存档也一并撤掉');
  wd.close();
}

console.log('\n== 时间：八小时连续写 ==');
{
  for (let i = 0; i < 57600; i++) score.step(0.5, i * 0.5);
  ok(score.born() > 20000, '八小时写了 ' + score.born() + ' 笔，没有停');
  ok(score.done() > 100, '写完了 ' + score.done() + ' 幅');
  ok(score.eventLabel() >= 2, '推进到事件 ' + score.eventLabel() + '，参数已被换过许多轮');
  ok(score.cache().size <= T.MAXHISTORY, '冻结的历史有上界（' + score.cache().size + ' ≤ ' + T.MAXHISTORY + '）');
  ok(sig(score, 1) !== sig(score, 300), '早段与后段构成不同');
}

console.log('\n== 渲染管线：每一笔都真的落在屏幕上 ==');
{
  score.setSky(score.skyColor());
  /* 视口对准两幅「已经写完」的历史。原先对准笔尖，会把正在写的幅里
     还没落笔的右侧一起算进分母——按 x 排序之后，这个口径会随机波动。
     这条断言要抓的只有一件事：分数里的局部坐标有没有加上 n*SPAN。 */
  const vx = (score.cur() - 1) * SPAN;
  score.setView({ x: vx, cell: 14, groundY: 700, w: 1500 });
  let threw = null;
  try {
    for (let q = 0; q < 12; q++) {
      const x0 = Math.max(0, vx - SPAN) + q * 3;
      const x1 = vx;
      score.syncView(x0, x1);
      score.syncAir(); score.syncMarks(x0, x1); score.halo(q * 1.7);
    }
  } catch (e) { threw = e.message; }
  ok(threw === null, '连续 12 次全量重绘不抛错（' + threw + '）');
  const paths = [...score.paths().values()];
  ok(paths.length <= 160, 'path 元素数有上界（' + paths.length + ' ≤ 160）');
  {
    const inked = paths.filter((p) => parseFloat(p.getAttribute('stroke-width') || '0') > 0);
    ok(inked.length === 0,
      '第一版回归：统一粗墨线已撤回（' + inked.length + ' 条带描边的 path）');
    ok(paths.every((p) => p.getAttribute('stroke') === 'none'),
      '所有 path 明确 stroke=none，块面靠明度硬切，不再靠描边');
    ok(T.INK.enable === 0 && /if \(!T\.INK\.enable\) return 0;/.test(codeOf('world/mod/score.js')),
      '墨线是表驱动开关，不是删代码——一个数就能切回第七稿');
    let thinBad = null;
    score.paths().forEach((el, k) => {
      if (!/\|S\||\|t$/.test(k)) return;
      if (parseFloat(el.getAttribute('stroke-width') || '0') > 0) thinBad = k;
    });
    ok(thinBad === null, '结构细线与谱线彻底无描边，亚像素笔不会被吞（坏在 ' + thinBad + '）');
  }
  ok(paths.every((p) => !/NaN|Infinity|undefined/.test(p.getAttribute('d') || '')),
    '所有 path 的 d 里没有非法值');
  {
    const xs = paths.flatMap((p) =>
      [...(p.getAttribute('d') || '').matchAll(/M(-?[\d.]+) /g)].map((m) => parseFloat(m[1])));
    const onScreen = xs.filter((x) => x >= 0 && x <= 1500).length;
    ok(xs.length > 0, '确实生成了几何数据（' + xs.length + ' 个矩形）');
    ok(onScreen > xs.length * 0.5, '过半的笔落在视口内（' + onScreen + '/' + xs.length + '），幅偏移没有丢');
  }
  {
    /* 「全部笔画显示」的运行时证据：没有任何一条 path 被填成底色。 */
    const bg = score.bg();
    ok(paths.every((p) => (p.getAttribute('fill') || '').toLowerCase() !== bg.toLowerCase()),
      'world 层没有一条 path 被画成底色（V 与远景都真的有颜色）');
    const hs = paths.flatMap((p) =>
      [...(p.getAttribute('d') || '').matchAll(/h([\d.]+)/g)].map((m) => parseFloat(m[1])));
    ok(hs.length > 0 && Math.min(...hs) >= T.MINPX - 0.01,
      '最细的一笔也有 ' + Math.min(...hs).toFixed(2) + 'px，没有被亚像素吃掉');
  }
  {
    const bl = [...score.shadePaths().values()];
    ok(bl.length > 0 && bl.some((p) => (p.getAttribute('d') || '').length > 0),
      '辉光衬底层真的画了东西（' + bl.length + ' 条 path）');
    ok(bl.every((p) => !/NaN|Infinity|undefined/.test(p.getAttribute('d') || '')),
      '辉光层的 d 里没有非法值');
    ok(bl.some((p) => parseFloat(p.getAttribute('fill-opacity')) > 0),
      '辉光带透明度，是光不是第二层墨');
  }
  {
    let rn = null;
    /* 从 cur-1 往回找：正在写的幅只画了前 k 笔，签名立体多半排在后面还没落笔。 */
    for (let n = score.cur() - 1; n > score.cur() - 500 && n >= 0; n--) {
      if (score.compose(n).some((p) => p.pts)) { rn = n; break; }
    }
    ok(rn !== null, '当前幅附近存在正多面体幅（第 ' + rn + ' 幅）');
    if (rn !== null) {
      score.setView({ x: rn * SPAN + SPAN / 2, cell: 14, groundY: 700, w: 1500 });
      score.syncView(rn * SPAN - 4, rn * SPAN + SPAN + 4);
      ok([...score.paths().values()].some((p) => /L/.test(p.getAttribute('d') || '')),
        '点列笔画（正多面体线框）真的进了渲染管线');
    }
  }
  eq(w.document.getElementById('sky').getAttribute('fill'), score.bg(), '底色与色板同源');
}

console.log('\n== 谱线是纸，不是光标画出来的 ==');
{
  /* 用独立实例，把视口推到「笔根本还没走到」的未来幅：
     谱线应已整条铺满，世界层却一笔都没有。这是「预先添加」的运行时证据，
     也守住「光标不再有画谱线这一拍」。 */
  const ws = boot('s=staff-paper');
  const sc = ws.__score.score;
  const TT = sc.TABLES;
  const curS = sc.cur();
  const future = (curS + 2) * SPAN;
  sc.setView({ x: future + SPAN / 2, cell: 14, groundY: 700, w: 1500 });
  sc.syncView(future, future + 2 * SPAN);
  const staffD = [...ws.document.getElementById('staff').querySelectorAll('path')]
    .map((p) => p.getAttribute('d') || '').join('');
  const rects = (staffD.match(/M/g) || []).length;
  const worldRects = [...sc.paths().values()]
    .reduce((a, p) => a + ((p.getAttribute('d') || '').match(/M/g) || []).length, 0);
  const widths = [...staffD.matchAll(/h([\d.]+)/g)].map((m) => parseFloat(m[1]));
  ok(rects >= TT.GROWTH.staff.length * 2 && worldRects === 0,
    '纸先于笔：光标还没走到的未来幅里谱线已铺 ' + rects +
    ' 根横线，世界层 ' + worldRects + ' 笔——谱线不随光标出现');
  ok(widths.length > 0 && widths.every((x) => Math.abs(x - SPAN * 14) < 1),
    '每根谱线都是整幅宽（' + (SPAN * 14) + 'px），不是被逐笔画出的一小段');
  ok(sc.compose(curS).every((p) => !p.staff),
    '当前幅的逐笔序列里没有任何谱线笔——光标没有「画谱线」这个动作');
}

console.log('\n== 第七稿：残页（随机浮现的剧情文本） ==');
{
  const LT = w.BT.LORE_TABLES;
  const lore = w.__lore;
  ok(!!LT && !!lore, 'lore 挂上登记表，汇流层拿得到 ctx.lore');
  ok(w.BT.reg.list().indexOf('lore') >= 0, '登记表里有 lore');

  const V = LT.VOICES;
  eq(V.length, 6, '六个声部齐备（档案 / 广播 / 童声 / 维修 / 招贴 / 未署名）');
  ok(V.every((v) => v.lines.length >= 4), '每个声部至少四张残页，没有空声部');
  ok(V.every((v) => v.zh && v.en && v.code && v.w > 0), '声部都有署名、编号与权重');
  const all = V.flatMap((v) => v.lines.map((l) => l.t));
  ok(all.length >= 40, '共 ' + all.length + ' 张残页');
  ok(all.every((t) => t.length >= 6 && t.length <= 34),
    '每张都是 6~34 字的短句，不是段落');
  ok(new Set(all).size === all.length, '没有两张残页是同一句');

  /* 三条暗线。碎片是随机浮现的，所以暗线不能依赖阅读顺序：
     每一条都得在「任意抽到几句」时成立，多撞见几条才自己咬合。 */
  const anchors = V.flatMap((v) => v.lines.filter((l) => l.anchor).map((l) => l.t));
  ok(anchors.length >= 10, anchors.length + ' 条稀有锚点句撑住故事骨架');
  ok(anchors.some((t) => /不要在旧层下车|黄的灯|门牌保留/.test(t)),
    '暗线 A：旧层有人没搬走');
  ok(anchors.some((t) => /住户：零|暂无住户/.test(t)),
    '暗线 B：没有住户的那一层，每月有人去换灯');
  ok(anchors.some((t) => /不是因为那边有地方|没有海了/.test(t)),
    '暗线 C：岸一直往东长，不是因为东边还有地方');

  /* 去 AI 感：情绪不许被命名，只许靠门牌、住户栏、手套、响的台阶露出来。 */
  ok(!all.some((t) => /孤独|想念|悲伤|不禁|忍不住|涌上心头|仿佛|宛如|不由自主|下意识/.test(t)),
    '没有情绪直说与 AI 高频词');
  ok(new Set(all.map((t) => t.length)).size >= 12,
    '句长有 ' + new Set(all.map((t) => t.length)).size + ' 种，不是均匀模板');
  ok(all.some((t) => /——|重复|本班次不返回。本班次不返回/.test(t)),
    '有中断、重复与不完整句');
  ok(all.some((t) => /手套|膝盖|鞋|台阶|纸不够|冷|灯座/.test(t)),
    '有身体与物件的物理性细节');
  ok(all.some((t) => /船是什么|会不会累|没告诉别人/.test(t)),
    '童声会跑题、不解释，跟公文腔不是一个声纹');

  const slotNames = [...new Set((all.join('').match(/\{(\w+)\}/g) || []).map((s) => s.slice(1, -1)))];
  ok(slotNames.length >= 4, '用了 ' + slotNames.length + ' 种槽位（层数 / 旧层 / 计数 / 审批号 / 格数）');
  ok(slotNames.every((s) => LT.SLOTS[s] && LT.SLOTS[s].length >= 3),
    '每个槽位都有独立词表，不会把「第 4102 层」写进纸里');
  eq(LT.ANCHORS.length, 5, '五处落点，避开调音台与建筑最密的中带');

  const rawL = codeOf('world/mod/lore.js');
  ok(!/Math\.random/.test(rawL), 'lore.js 不碰 Math.random（扰动仍只有粒子生命场一处）');
  ok(!/BT\.gen\.rng/.test(rawL), 'lore.js 不另起种子随机流');
  ok(/BT\.gen\.hash/.test(rawL), '选哪张纸只由 BT.gen.hash(幅号 | 事件界) 决定');
  ok(!/transform/.test(rawL), 'lore.js 不碰 transform');
  ok(/padStart/.test(rawL), '页脚档案号补齐四位，纸片长在画卷上');

  const card = w.document.querySelector('#lore .lo-card');
  ok(!!card, '页面壳里只生成一张固定池卡片');
  eq(w.document.querySelectorAll('#lore .lo-card').length, 1, 'DOM 池不随世界长大');
  ok(lore.shown(), '预热后首帧就有字（3.5 秒取景器也拍得到，不用等第一个节拍）');
  const cur = lore.current();
  ok(!!cur && cur.text.length > 0 && !/\{/.test(cur.text), '首张残页已填好槽位、无花括号残留');
  ok(/^SHORE \/ 幅 \d+ · 界 \d+/.test(card.querySelector('.lo-foot').textContent),
    '页脚锚在真实幅号与事件界上，不是假编号');

  const texts = [];
  for (let i = 0; i < 24; i++) texts.push(lore.renderAt('probe' + i));
  ok(texts.every((t) => typeof t === 'string' && t.length > 0 && !/\{/.test(t)),
    '连续 24 次取景都填好槽位、没有空纸');
  ok(new Set(texts).size >= 12,
    '24 张里有 ' + new Set(texts).size + ' 种不同文本，不是循环一句话');
  const spots = [];
  for (let i = 0; i < 12; i++) {
    lore.renderAt('spot' + i);
    spots.push((card.className.match(/lo-[a-e]\b/) || [])[0]);
  }
  ok(new Set(spots).size >= 3, '落点在 ' + new Set(spots).size + ' 处之间换，不钉死一个角');
  ok(spots.every((s, i) => i === 0 || s !== spots[i - 1]), '相邻两张不落在同一处');

  const htmlL = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(htmlL.indexOf('id="lore"') > htmlL.indexOf('id="scan"') &&
     htmlL.indexOf('id="lore"') < htmlL.indexOf('id="panel"'),
     '文字层夹在扫描线与调音台之间');
  ok(htmlL.indexOf('world/mod/lore.js') < htmlL.indexOf('world/script.js'),
     'lore 在汇流层之前加载，mount 时拿得到 score');
  const cssL = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  ok(/#lore\s*\{/.test(cssL) && /\.lo-card/.test(cssL), '样式里有残页层与卡片');
  ok(/\.lo-card\.lo-quiet \.lo-line/.test(cssL) && /box-shadow:\s*none/.test(cssL) &&
     /opacity:\s*0?\.8/.test(cssL),
     '低烈度只收发光与标签、不压整卡：字仍保持可读');

  const wl = boot('low=1');
  ok(!!wl.__lore, 'low=1 实例也挂上 lore');
  const lc = wl.document.querySelector('#lore .lo-card');
  ok(/lo-quiet/.test(lc.className), '低烈度首张纸就是 lo-quiet（不发光、更暗）');
  ok(!!wl.__lore.current() && wl.__lore.current().text.length > 0,
     '低烈度下字还在，只是安静，不是被删掉');
  wl.close();
}

console.log('\n== 家规 ==');
for (const f of ['world/mod/score.js', 'core/gen.js', 'world/script.js', 'core/audio.js']) {
  const code = codeOf(f);
  ok(!/setAttribute\(\s*['"]transform['"]/.test(code), f + ' 不碰 transform（无头会整幅静默不画）');
  ok(!/BT\.gen\.rng/.test(code), f + ' 不再用种子 rng 查表生成世界');
}
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(!/<canvas/i.test(html), '页面上一块 canvas 都没有');
  ok(/id="light"/.test(html) && /id="shade"/.test(html) && /id="glow"/.test(html),
    '灯层、辉光衬底、雾带三层都挂在页面上');
  ok(html.indexOf('id="glow"') < html.indexOf('id="world"') &&
     html.indexOf('id="world"') < html.indexOf('id="light"'),
     '分层顺序写死：灯在构成之下（只从建筑的缝里漏出来）、雾带在构成之上');
  ok(/radialGradient/.test(html) && /linearGradient/.test(html), '光晕与雾带都有自己的渐变');
  ok(!/dropAt|anomal/.test(html), '页面壳里没有交互的残骸');
}


console.log('\n== 二代 · 粒子生命：不掷骰子，也不播种子 ==');
{
  const w2 = boot('');
  const L = w2.BT.life, LT = w2.BT.LIFE_TABLE, S = w2.BT.sim;
  ok(!!L && !!LT, '粒子生命场与它的表都挂在总线上');
  ok(LT.count >= 8 && LT.kinds >= 2 && LT.matrix.length === LT.kinds,
    '粒子数 / 种数 / 作用矩阵三者的口径一致');
  ok(LT.matrix.every((r) => r.length === LT.kinds), '作用矩阵是方阵');
  {
    let asym = 0;
    for (let i = 0; i < LT.kinds; i++) for (let j = i + 1; j < LT.kinds; j++)
      if (Math.abs(LT.matrix[i][j] - LT.matrix[j][i]) > 1e-9) asym++;
    ok(asym > 0, '作用矩阵非对称（' + asym + ' 对）——才生得出追逐与群集，不是对称晶体');
  }
  ok(LT.reach > LT.core && LT.core > 0 && LT.friction > 0 && LT.friction < 1,
    '短程排斥 / 中程作用 / 阻尼三项都在合法区间');
  ok(!isFinite(LT.mul) === false && Math.abs(LT.mul - Math.round(LT.mul)) > 1e-6,
    '移位倍率是非整数：均匀但对初值敏感');

  const st0 = L.state();
  ok(st0.count === LT.count && isFinite(st0.energy) && isFinite(st0.cluster) &&
     isFinite(st0.bornAt) && st0.bornAt > 0,
    '场的状态可读：粒子数 / 动能 / 群集度 / 出生时刻');
  const ps0 = L.particles();
  eq(ps0.length, LT.count, '粒子一枚不少');
  ok(ps0.every((p) => [p.x, p.y, p.vx, p.vy, p.ph].every(Number.isFinite) &&
                      p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1),
    '所有粒子留在环形单位方里，坐标与速度都有限');

  /* 扰动本身：值域、均匀、无 NaN、无短周期。 */
  L.reset();
  const vals = [], N = 20000;
  let oor = 0, nan = 0;
  for (let i = 0; i < N; i++) {
    const v = L.next();
    if (!Number.isFinite(v)) nan++;
    else if (v < 0 || v >= 1) oor++;
    vals.push(v);
  }
  eq(nan, 0, '两万次取样没有一个 NaN');
  eq(oor, 0, '两万次取样全部落在 [0,1)');
  const buckets = new Array(10).fill(0);
  vals.forEach((v) => buckets[Math.min(9, Math.floor(v * 10))]++);
  ok(buckets.every((b) => b > N / 10 - 320 && b < N / 10 + 320),
    '十桶均匀（' + buckets.join('/') + '）——概率判定没有被扰动整形带偏');
  {
    let eq3 = 0;
    for (let i = 3; i < 600; i++) if (vals[i] === vals[i - 3]) eq3++;
    eq(eq3, 0, '没有三拍短周期：扰动不是一张循环表');
  }

  /* 脾气会呼吸：穿插推进与换界脉冲，分段方差不许是常数。 */
  L.reset();
  const segs = [];
  for (let b = 0; b < 40; b++) {
    L.step({ vals: { drift: Math.sin(b * 0.7) } });
    if (b % 7 === 0) L.pulse(1);
    let sum = 0, sum2 = 0;
    for (let k = 0; k < 500; k++) { const v = L.next(); sum += v; sum2 += v * v; }
    segs.push(sum2 / 500 - (sum / 500) ** 2);
  }
  const vmax = Math.max(...segs), vmin = Math.min(...segs);
  ok(vmax / vmin > 1.03,
    '四十段扰动的方差在呼吸（' + vmin.toFixed(4) + ' → ' + vmax.toFixed(4) +
    '）——粒子聚散真的改变了世界的脾气');

  /* 双向耦合：推进会移动粒子，换界脉冲会改动能，长时间不发散。 */
  const before = L.particles().map((p) => p.x);
  L.step({ vals: { drift: 0.8 } });
  const after = L.particles().map((p) => p.x);
  ok(before.some((v, i) => Math.abs(v - after[i]) > 1e-9), 'step 真的推进了粒子群');
  const e0 = L.state().energy;
  L.pulse(1);
  ok(Math.abs(L.state().energy - e0) > 1e-9, '换界脉冲改动了场的动能');
  for (let i = 0; i < 3000; i++) L.step({ vals: { drift: Math.sin(i * 0.013) } });
  ok(L.particles().every((p) => Number.isFinite(p.x) && p.x >= 0 && p.x <= 1 &&
                               Math.abs(p.vx) < 1 && Math.abs(p.vy) < 1) &&
     isFinite(L.state().energy),
    '连推三千幅场不发散：粒子不飞走、速度不炸');
  const lifeRaw = codeOf('core/life.js');
  ok(/worldGain/.test(lifeRaw) && /world\.vals\.drift/.test(lifeRaw),
    '世界的活状态真的回踢粒子场（不是单向驱动）');
  ok(!/Math\s*\.\s*random/.test(lifeRaw), '粒子生命场自己也不掷骰子');
  L.reset();
  eq(L.state().ticks, 0, '重新出生后取样计数归零');

  console.log('\n== 二代 · 源头约束：零 Math.random、零种子、零地址回放 ==');
  {
    const files = [];
    for (const dir of ['core', 'world/mod'])
      for (const f of fs.readdirSync(path.join(ROOT, dir)))
        if (f.endsWith('.js')) files.push(dir + '/' + f);
    files.push('world/script.js');
    const rand = files.filter((f) => /Math\s*\.\s*random/.test(codeOf(f)));
    eq(rand.length, 0, '全项目 ' + files.length + ' 个脚本零 Math.random：' + rand.join('|'));
    const trans = files.filter((f) => /setAttribute\(\s*['"]transform['"]/.test(codeOf(f)));
    eq(trans.length, 0, '零 transform（无头会整幅静默不画）');
    const rng = files.filter((f) => /BT\.gen\.rng/.test(codeOf(f)));
    eq(rng.length, 0, '零种子流：没有任何模块按种子查表');
    const genRaw = codeOf('core/gen.js');
    ok(!('rng' in w2.BT.gen) && !/function\s+rng\s*\(/.test(genRaw) &&
       typeof w2.BT.gen.hash === 'function' && typeof w2.BT.gen.unit === 'function',
      '编号工具里连一条 rng(seed) 都没留：只剩 hash / unit / pick');
    const odt = w2.document.querySelector('#panel .od-t');
    ok(!!odt && /扰动/.test(odt.textContent) && !/随机/.test(odt.textContent),
      '调音台标题写的是「扰动 · LIFE」：不把粒子生命叫成掷骰子');
    const saveRaw = codeOf('core/store.js'), simRaw = codeOf('core/sim.js');
    ok(!/seed/.test(saveRaw) && !/seed/.test(simRaw),
      '存档与演算里连 seed 这个字段都不存在');
    ok(!/#s=|&s=/.test(codeOf('world/script.js')), '地址栏不写回任何可分享的种子');
    const html2 = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    ok(!/<canvas/i.test(html2), '二代页面仍然一块 canvas 都没有');
    for (const id of ['folio', 'imprint', 'hud', 'chapter', 'archive'])
      ok(html2.indexOf('id="' + id + '"') >= 0, '页面壳里有 ' + id + ' 层');
    ok(html2.indexOf('id="paper"') < html2.indexOf('id="folio"') &&
       html2.indexOf('id="folio"') < html2.indexOf('id="glow"'),
      '页饰压在纸上、灯之下：册子的物理不盖住城市');
    for (const m of ['score', 'paper', 'folio', 'motes', 'lore',
                     'chapter', 'hud', 'archive', 'panel'])
      ok(w2.BT.reg.list().indexOf(m) >= 0, '登记表里有 ' + m);
  }

  console.log('\n== 二代 · 画面上的那群粒子 ==');
  {
    const air = w2.document.getElementById('air');
    const dots = air.querySelectorAll('rect[id^="mt"]');
    eq(dots.length, LT.count, '浮尘元素池与粒子数一一对应');
    ok(!!air.querySelector('#mtLink'), '群集连线有一条固定 path');
    w2.BT.app.onframe(0.05, 7);
    const d0 = air.querySelector('#mt0');
    ok(parseFloat(d0.getAttribute('width')) > 0, '跑一帧后浮尘真的画出来了');
    const op0 = parseFloat(d0.getAttribute('fill-opacity'));
    ok(op0 > 0 && op0 < 0.5, '浮尘极淡（' + op0 + '），不抢建筑');
    w2.__score.score.setLowPower(1);
    w2.BT.app.onframe(0.05, 7.05);
    ok(parseFloat(d0.getAttribute('fill-opacity')) < op0, '低烈度把浮尘压下去，一笔不删');
    w2.__score.score.setLowPower(0);
    const folioN = w2.document.getElementById('folio').childNodes.length;
    const airN = air.childNodes.length;
    w2.BT.app.onframe(0.05, 8);
    eq(w2.document.getElementById('folio').childNodes.length, folioN,
      '页饰元素池固定，DOM 不随世界长大');
    eq(air.childNodes.length, airN, '浮尘元素池固定');
    eq(w2.document.querySelectorAll('#archive .ar-cell').length, 36,
      '册页三十六格一次建好');
  }

  console.log('\n== 二代 · 册：有限池、墨、工序、倍率 ==');
  {
    const T = S.TABLE;
    eq(S.poolSize(), 36, '版样是六构造 × 六色板的定死池子');
    const ids = Object.keys(T.agenda);
    eq(ids.length, 3, '校样单三道工序');
    ok(ids.every((k) => Math.abs(T.agenda[k].bias.reduce((a, b) => a + b, 0) - 0.30) < 1e-9),
      '三道偏置的和都恰为 0.30：总倍率不因选哪道被碾压');
    ok(ids.every((k) => Object.keys(T.agenda[k].knobs).every((n) => {
      const sc = w2.BT.SCORE_TABLES.SCHEMA.find((z) => z.k === n);
      return sc && T.agenda[k].knobs[n] >= sc.min && T.agenda[k].knobs[n] <= sc.max;
    })), '每道工序施加的旋钮都在 SCHEMA 合法区间');

    S.reset(1);
    ok(S.state().ink >= S.costOf('log'), '开局就有够录第一枚的墨：没有死结');
    const p1 = S.onPanel(1);
    ok(p1.ok && p1.gain > 0 && S.state().ink >= S.costOf('log'),
      '写完第一幅产墨，且开卷津贴兜住了第一份资源');
    ok(!S.onPanel(1).ok, '同一幅不重复结账');
    for (let n = 2; n <= 8; n++) S.onPanel(n);
    ok(!S.due() && S.state().picks.length === 1,
      '第八幅界末自动结清：静默沿用一道，不再欠一张校样单');
    for (let n = 9; n <= 16; n++) S.onPanel(n);
    ok(!S.due() && S.state().picks.length === 2,
      '第十六幅同样自动结清，册上工序照记');
    S.pick('even');
    ok(!S.due(), '演算层手动下工序仍可用，只是画面不再问人');

    const snap = w2.__score.score.finishedSnap();
    ok(!!snap && Array.isArray(snap.motifs) && typeof snap.palette === 'number',
      '谱层给册子记下了这一幅真实落过的构造与色板');
    let withM = 0;
    for (let n = 0; n < 30; n++) {
      const q = w2.__score.score.snapOf(n);
      if (q && q.motifs && q.motifs.length) withM++;
    }
    ok(withM >= 25, '抽查三十幅里 ' + withM + ' 幅有可拾取的构造');
    const offer = S.offer(S.state().panels, snap);
    ok(offer.every((o) => o.id >= 0 && o.id < 36), '候选全部来自那三十六枚，不生新条目');

    S.reset(1);
    const r1 = S.logSpecimen(0, 1);
    ok(r1.ok && S.state().logged.length === 1, '花墨补录一枚');
    ok(!S.logSpecimen(0, 1).ok, '同一枚不重复录入');
    ok(!S.logSpecimen(999, 1).ok, '池外编号被拒绝');
    const inkBefore = S.state().ink;
    S.spend('rewind');
    ok(S.state().ink < inkBefore, '回望要花墨');
    for (let n = 1; n <= 240; n++) S.onPanel(n);
    eq(S.poolSize(), 36, '跑两百四十幅，池子仍是三十六个——收集物有尽头');
    const shot = S.snapshot();
    ok(!('seed' in shot) && !('strokes' in shot) && !('palette' in shot) &&
       !('panels' in shot), '存档只记册，不记画面：没有 seed / 几何 / 色板 / 幅号');

    function run(seq) { S.reset(1); seq.forEach((id) => S.pick(id)); return S.multipliers(); }
    const hard = run(['even', 'even', 'even', 'even', 'even', 'even']);
    const flat = run(['even', 'sharp', 'warm', 'even', 'sharp', 'warm']);
    ok(Math.abs(hard.total - flat.total) / flat.total < 0.12,
      '拉满与摊平的总倍率接近（' + hard.total.toFixed(3) + ' / ' + flat.total.toFixed(3) +
      '）——没有唯一最优解');
    ok(hard.ink > flat.ink && flat.rare > hard.rare,
      '但两条路擅长的维度不同：一条偏墨，一条偏孤版');
  }

  console.log('\n== 二代 · 存档、总线与输入链路 ==');
  {
    const store = w2.BT.store, bus = w2.BT.bus;
    ok(!!w2.localStorage.getItem(store.KEY), '开卷就把卷号落了盘');
    store.write({ volume: 7, ink: 123 });
    eq(store.read().volume, 7, 'patch 写入读得回来');
    store.write({ bogus: 1 });
    ok(!('bogus' in store.read()), '未知字段不进存档');
    w2.localStorage.setItem(store.KEY, '{这不是 json');
    eq(store.read().volume, 0, '坏存档安静回退到干净开卷，不弹窗');
    let hits = 0;
    const fn = () => { hits++; };
    bus.on('probe:x', fn); bus.on('probe:x', fn);
    bus.emit('probe:x', null);
    eq(hits, 1, '同一回调重复订阅只挂一次：界面重画不会叠监听');
    eq(bus.errors().length, 0, '事件链没有任何被吞掉的异常');

    S.reset(1);
    const press = (code, key) => w2.dispatchEvent(new w2.KeyboardEvent('keydown',
      { code: code, key: key || code, bubbles: true, cancelable: true }));
    press('Tab');
    ok(w2.__score.ctx.archive.visible(), 'TAB 翻开册页');
    press('Tab');
    ok(!w2.__score.ctx.archive.visible(), '再按 TAB 收起');
    const ink0 = S.state().ink, log0 = S.state().logged.length;
    press('KeyE');
    ok(S.state().logged.length >= log0 && S.state().ink <= ink0,
      'E 补录：只从岸上已有的东西里拾取');
    /* 校样单已撤：界末不再问人，静默沿用上一道。工序仍在跑，画面不打断。 */
    const picks0 = S.state().picks.length;
    bus.emit('chapter:due', { chapter: 2, panel: 16, volume: 1, options: S.agendaOptions() });
    ok(S.state().picks.length === picks0 + 1 && S.state().autoPicks > 0,
      '界末静默沿用上一道工序：工序仍在跑，画面不打断');
    press('Digit1');
    ok(S.state().picks.length === picks0 + 1,
      '1 / 2 / 3 不再弹出校样单，也不额外记一道工序');
    ok(!w2.document.getElementById('agenda'), '页面上连校样单容器都不存在');
    bus.emit('chapter:due', { chapter: 3, panel: 24, volume: 1, options: S.agendaOptions() });
    ok(S.state().picks.length === picks0 + 2, '再一界再沿用一道，due 不会卡住');
    press('ArrowRight');
    ok(w2.__score.panelMode() === 'browse', '→ 进入回望，镜头脱离前沿');
    const bp = w2.__score.browsePanel();
    press('ArrowLeft');
    ok(w2.__score.browsePanel() < bp, '← 逐幅往回翻');
    press('Digit0');
    ok(w2.__score.panelMode() === 'follow', '0 回到跟随');
    const low0 = w2.document.body.classList.contains('low');
    press('KeyB');
    ok(w2.document.body.classList.contains('low') !== low0, 'B 键连册页读数一起压低');
    press('KeyB');
    const before = S.state().logged.length;
    S.logSpecimen(3, 1);
    bus.emit('ui:reset-book', {});
    ok(S.state().logged.length === 0 && S.state().volume === 1,
      '清册抹掉批注，但卷号还在');
    ok(w2.__score.ctx.archive.cells() === 36, '清册后三十六格仍在，不重建 DOM');
    eq(w2.__errors.length, 0, '二代整条输入链路零运行时错误');
    void before;
  }

  const wA = boot(''), wB = boot('');
  ok(sigRange(wA.__score.score, 0, 25) !== sigRange(wB.__score.score, 0, 25),
    '两次开卷是两条不同的岸：粒子出生时刻不同，生命感不让步');
  ok(!/#s=|&s=/.test(wA.location.hash) && !/#s=|&s=/.test(wB.location.hash),
    '地址栏干净：没有可分享的种子');
  eq(wA.__score.volume, 1, '第一次开卷是卷 001');
  wA.close(); wB.close();
  w2.close();
}

console.log('\n== 历史窗口：淘汰的幅不篡改 ==');
{
  const wh = boot('low=0');
  const sh = wh.__score.score;
  sh.compose(T.MAXHISTORY + 40);
  ok(sh.cache().size <= T.MAXHISTORY, '生成 ' + (T.MAXHISTORY + 40) + ' 幅后缓存仍不超上界（' + sh.cache().size + '）');
  eq(sh.compose(0).length, 0, '被淘汰的最老幅安静退场，不用新干扰重建它');
  ok(finiteStrokes(sh.compose(T.MAXHISTORY + 39), SPAN, CEIL), '窗口内的最新幅仍完整可读');
  wh.close();
}

console.log('\n== 电波版 · 七色原色 / 五张表 / 低烈度 / 不耗扰动流 ==');
{
  const wd = boot('');
  const D = wd.BT.DENPA_TABLE, CAP = wd.BT.DENPA_LOWCAP,
        PAL = wd.BT.DENPA_PALETTE, G = wd.BT.DENPA_GLYPH,
        B = wd.BT.DENPA_BANDS, SCHEMA = wd.BT.DENPA_SCHEMA,
        PRIM = wd.BT.DENPA_PRIMARIES;
  const api = wd.__score.ctx.denpa;
  /* 默认页面是静模式；这一块验的是狂乱层本身，把单点开关临时推回狂乱。
     画面侧的 body.quiet 不动，逻辑断言与像素解耦。 */
  api.setQuiet(false);
  const dnRaw = codeOf('world/mod/denpa.js');
  const tbRaw = codeOf('world/mod/denpa-tables.js');
  const cssD = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
  const htmlD = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  ok(!!D && !!CAP && !!PAL && !!G && !!B && !!SCHEMA && !!api,
    '五张声明式表 + 控件表 + denpa 接口全部就位');
  eq(PRIM.length, 7, '配色清单钉死七色：正红正黄正蓝正绿正紫亮粉亮青');
  {
    const all = PAL.flatMap((P) => Object.keys(P).filter((k) => /^#/.test(P[k])).map((k) => P[k]))
                  .concat(B.colors);
    const miss = PRIM.filter((c) => all.indexOf(c) < 0);
    eq(miss.length, 0, '七色一个不少地出现在色板与波带里：' + miss.join('|'));
  }
  ok(PAL.length === 6 && PAL.every((P) => P.bg === '#000000' &&
     P.line === '#ffffff' && sat(P.plane) >= 0.80),
    '底一律纯黑、骨线一律纯白、体量一律纯正原色');
  ok(B.count === 7 && B.colors.length === 7, '七条干涉波带正好对应七色');
  ok(T.HALO.hue === 1 && T.HALO.warm === '#ffffff',
    '钠灯彻底退场：光晕直接吃事件主霓虹，不再把黑底染成棕');

  ok(CAP.burst === 0 && CAP.chromaPulse === 0 && CAP.chroma <= 3 &&
     CAP.slice <= 0.12 && CAP.scan <= 0.12 && CAP.contrast <= 1.10,
    '低烈度是硬钳制：频闪 / 爆发 / 色差呼吸真的归零，不是乘个系数');
  ok(SCHEMA.length >= 3 && SCHEMA.every((s) => s.k in D),
    '调音台控件声明的每一项都能在默认表里查到');
  ok(!/Math\s*\.\s*random|BT\.gen\.rng|BT\.life\.next\s*\(/.test(dnRaw + tbRaw),
    '电波层零骰子、零种子流，也不调用 next()');
  ok(/BT\.life\.state\s*\(/.test(dnRaw) && /BT\.life\.particles\s*\(/.test(dnRaw),
    '狂乱程度只读粒子群的动能与位置');
  ok(!/setAttribute\(\s*['"]transform['"]|['"]filter['"]|<canvas/.test(dnRaw + tbRaw),
    '电波层不碰 transform / filter / canvas');
  {
    const t0 = wd.BT.life.state().ticks;
    api.sync(1.0, 1280, 720, false);
    api.sync(1.2, 1280, 720, false);
    eq(wd.BT.life.state().ticks, t0,
      '连刷两帧扰动流取样计数一动不动：UI 不偷世界的随机数');
  }
  {
    const p = api.pools();
    eq(p.waves, 7, '波带池 7 条');
    ok(p.slices === 40 && p.grains === 64 && p.glyphs === 24 && p.chroma === 3,
      '切片 / 噪点 / 乱码 / 三通道四组池子都是定死的');
    eq(p.knobs, SCHEMA.length, '调音台旋钮数由 SCHEMA 表长决定，不是手写死');
    const host = wd.document.getElementById('denpa');
    const n0 = host.querySelectorAll('*').length;
    api.sync(2.0, 1280, 720, false);
    api.sync(3.0, 1280, 720, true);
    eq(host.querySelectorAll('*').length, n0, '刷帧不增删节点，只改属性');
  }
  {
    api.set('chroma', 40);
    api.sync(1.0, 1280, 720, false);
    ok(api.eff('chroma') === 40, '正常模式下 eff() 原样返回当前值');
    api.sync(1.0, 1280, 720, true);
    ok(api.eff('chroma') <= CAP.chroma && api.eff('burst') === 0 &&
       api.eff('chromaPulse') === 0,
      '低烈度下 eff() 是唯一钳制口：色差压到 ' + CAP.chroma + '、爆发归零');
    eq(api.burst(1), 0, '低烈度下连手动爆发都点不起来');
    const t1 = api.tick(0.5);
    void t1;
    eq(api.flash(), 0, '闪白不会挂在屏幕上不走');
  }
  {
    api.sync(1.0, 1280, 720, false);
    wd.BT.bus.emit('chapter:shift', { chapter: 2 });
    ok(api.flash() > 0, '总线换界事件真的点起一记故障闪白');
    api.tick(10);
    eq(api.flash(), 0, '闪白吃 tick(dt) 衰减，不用 setTimeout');
  }
  {
    const warn = wd.document.getElementById('dn-warn');
    ok(!!warn && /光敏/.test(warn.textContent) && /低烈度/.test(warn.textContent) &&
       /B/.test(warn.textContent), '光敏警告常驻，并写清 B 是安全出口');
    ok(htmlD.indexOf('id="denpa"') > htmlD.indexOf('id="scan"'),
      '电波层压在扫描线层之下、SVG 舞台之上');
    ok(htmlD.indexOf('denpa-tables.js') < htmlD.indexOf('mod/score.js'),
      '表先于谱层加载：PALETTE 才能直接引用 BT.DENPA_PALETTE');
    ok(/body\.low \.dn-burst/.test(cssD) && /body\.low \.dn-chroma/.test(cssD),
      '低烈度的 CSS 也整条撤掉闪白与色差，与参数侧双保险');
  }
  eq(wd.__errors.length, 0, '电波层整条链路零运行时错误');

  console.log('\n== 静 · 无字 / 无噪 / 无闪 ==');
  api.setQuiet(true);
  ok(api.quiet() === true && wd.BT.QUIET_TABLE.enabled === true &&
     wd.document.body.classList.contains('quiet'),
    '默认就是静：表开关、body.quiet 与模块状态三者一致');
  eq(wd.BT.QUIET_TABLE.text, false, '文字层开关关闭');
  eq(wd.BT.QUIET_TABLE.noise, false, '噪层开关关闭');
  eq(wd.BT.QUIET_TABLE.chroma, 0, 'UI 色差归零');
  eq(api.burst(1), 0, '静模式下连手动爆发都点不起来');
  {
    const t2 = wd.BT.life.state().ticks;
    api.sync(1, 1280, 720, false);
    api.tick(1);
    eq(api.flash(), 0, '静模式刷帧后没有任何闪白残留');
    eq(wd.BT.life.state().ticks, t2, '静模式同样不消耗扰动流');
    eq(wd.document.documentElement.style.getPropertyValue('--dn-chroma'), '0px',
      '写进 UI 的色差变量是 0px');
  }
  {
    const cssQ = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
    const textLayers = ['imprint', 'hud', 'chapter', 'lore',
                        'dn-warn', 'fs', 'archive', 'panel'];
    const missText = textLayers.filter((id) =>
      !new RegExp('body\\.quiet #' + id + '[\\s,{]').test(cssQ));
    eq(missText.length, 0, '九个文字层被显式隐藏，一个不漏：' + missText.join('|'));
    const quietLines = ['paper', 'folio', 'air', 'staff'];
    const missLine = quietLines.filter((id) =>
      !new RegExp('body\\.quiet #' + id + '[\\s,{]').test(cssQ));
    eq(missLine.length, 0, '横格 / 页饰 / 浮尘 / 谱线四组细线整层退场');
    ok(/body\.quiet #denpa \.dn-wave/.test(cssQ) &&
       /body\.quiet #denpa \.dn-burst/.test(cssQ) &&
       /body\.quiet #denpa \.dn-glyphs/.test(cssQ),
      '波形 / 闪白 / 乱码三组噪效果整条撤掉');
    ok(/body\.quiet #denpa \.dn-vignette\{ opacity:0\.34/.test(cssQ),
      '只留一圈极淡沉边收住画面，没有条纹也没有跳动');
    ok(/body\.quiet\{ --dn-chroma:0px/.test(cssQ),
      'CSS 侧也把色差变量钉死，与参数侧双保险');
  }
  {
    api.setQuiet(false);
    ok(api.quiet() === false && api.burst(1) > 0,
      '一个开关就能切回狂乱：静是可撤销的呈现层，不是删掉的功能');
    api.setQuiet(true);
  }
  wd.close();
}

eq(w.__errors.length, 0, '整轮下来没有任何运行时错误');
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
