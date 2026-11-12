/* 平衡体检。让一个「不怎么聪明的玩家」自己跑几小时，把数打出来。
 *
 * 不加载像素、不校验画面，只跑演算层；但它吃的是真实谱层吐出来的幅快照
 * （前 200 幅的 motifs / palette 循环复用），所以「这一幅有哪些版样可拾」
 * 的分布是真的，不是拍脑袋造的均匀分布。
 *
 * 盯三件事（本家的硬规矩）：
 *   1. 死结：开局没墨 → 换不到第一份资源。有就加 firstRun()，绝不许出现。
 *   2. 尽头：收集物做成无限池，几小时就上万条，图鉴直接废掉。
 *      二代是 36 枚定死的池子，要验证它既能录满、又不会多出一枚。
 *   3. 唯一最优解：把「拉满」与「摊平」两条路的最终倍率算出来对比，调到接近。
 *
 * 注意：谱层的扰动来自粒子生命场，连这 200 幅快照每跑一次都不一样。
 * 所以断言只比「由工序决定」的结构量（倍率、专博、收支差），
 * 不比「由这一趟世界决定」的偶然量（满册第几幅、孤版几枚）。
 * 后者打出来给人看，不拿来当红线。
 *
 * 策略写成会东摸摸西摸摸的样子：界末工序轮着换、补录候选也轮着换；
 * 另一种取向则一路只挑最稳的那道。同一个 policy 跑两种相反取向，
 * 数不一样才说明取舍还在。 */
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
if (!jsdomDir) { console.error('找不到 jsdom'); process.exit(2); }
const { JSDOM } = require(jsdomDir);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  beforeParse(w) {
    w.requestAnimationFrame = () => 0;
    w.cancelAnimationFrame = () => {};
  }
});
const w = dom.window;
for (const s of srcs) w.eval(fs.readFileSync(path.join(ROOT, s), 'utf8'));

const sim = w.BT.sim, score = w.__score.score, T = sim.TABLE;
/* UI 不必跟着两万幅一起刷：留一份干净的演算环境，跑得快也不影响数。 */
w.BT.bus.reset();

/* 真实幅快照：前 200 幅的构造与色板由谱层自己写出来。 */
const SNAPS = [];
score.compose(199);
for (let n = 0; n < 200; n++) {
  const q = score.snapOf(n);
  SNAPS.push(q || { motifs: [], palette: 0 });
}
const SEG = 0.55;   // 一代 interval 的中位：一笔 ≈ 0.55 秒
const HOURS = 3;
const PANELS = Math.floor(HOURS * 3600 / SEG);

function run(policy) {
  sim.reset(1);
  let cursor = 0, picks = 0, logs = 0, rare = 0, blocked = 0;
  let firstOK = false, fullAt = 0;
  const agendaIds = Object.keys(T.agenda);
  for (let p = 1; p <= PANELS; p++) {
    const snap = SNAPS[p % SNAPS.length];
    sim.onPanel(p, snap);
    if (p === 1) firstOK = sim.canAfford('log');
    if (sim.due()) {
      const id = policy === 'focus'
        ? 'even'                                     // 一路拉满，只认最稳那道
        : agendaIds[Math.floor(p / T.panelsPerChapter) % agendaIds.length];
      sim.pick(id, false);
      picks++;
    }
    /* 不聪明的玩家：每三幅才想起补录一次，而且轮着换候选，
       不会盯着同一枚猛点，也不会精打细算挑最便宜的。 */
    if (p % 3 === 0) {
      const list = sim.offer(p, snap).filter((o) => !o.logged);
      if (list.length) {
        const pickOne = policy === 'focus' ? list[0] : list[cursor % list.length];
        cursor++;
        const r = sim.logSpecimen(pickOne.id, p);
        if (r.ok) {
          logs++; if (r.rare) rare++;
          /* 满册时刻：两条路走的是同一条 36 枚的尽头，但不必同时到。 */
          if (!fullAt && r.count === r.total) fullAt = p;
        }
        else if (r.reason === '墨不足') blocked++;
      }
    }
  }
  const st = sim.state(), m = sim.multipliers();
  return {
    policy, panels: st.panels, chapters: Math.floor(st.panels / T.panelsPerChapter),
    picks, logs, rare, blocked, logged: st.logged.length, pool: st.pool,
    ink: st.ink, inkCap: st.inkCap, wasted: st.wasted,
    gained: st.gained, spent: st.spent, fullAt,
    total: m.total, inkMul: m.ink, logMul: m.log, rareMul: m.rare,
    focus: m.focus, spread: m.spread, firstOK
  };
}

const focus = run('focus');
const round = run('round');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label); }
}
function row(r) {
  return [
    r.policy.padEnd(6),
    ('幅 ' + r.panels).padStart(9),
    ('界 ' + r.chapters).padStart(8),
    ('录 ' + r.logged + '/' + r.pool).padStart(10),
    ('孤 ' + r.rare).padStart(7),
    ('墨 ' + r.ink).padStart(9),
    ('倍率 ' + r.total.toFixed(3)).padStart(12),
    ('专 ' + r.focus + '/博 ' + r.spread).padStart(12),
    ('满册 ' + (r.fullAt || '—')).padStart(12)
  ].join(' ');
}

console.log('\n== 平衡：不怎么聪明的玩家跑 ' + HOURS + ' 小时（约 ' + PANELS + ' 幅）==');
console.log(row(focus));
console.log(row(round));
console.log('  产墨 ' + focus.gained + ' / ' + round.gained +
            '，花墨 ' + focus.spent + ' / ' + round.spent +
            '，墨不足被挡 ' + focus.blocked + ' / ' + round.blocked + ' 次' +
            '，溢出 ' + focus.wasted + ' / ' + round.wasted +
            '，满册于第 ' + focus.fullAt + ' / ' + round.fullAt + ' 幅');

console.log('\n== 一、有没有死结 ==');
ok(focus.firstOK && round.firstOK, '开局第一幅写完就付得起第一枚版样（两条路都是）');
ok(focus.logs > 0 && round.logs > 0, '两条路都真的录到了东西，不是空转');
ok(focus.gained > focus.spent && round.gained > round.spent, '墨的收支为正：不会越玩越锁死');
ok(focus.ink <= focus.inkCap && round.ink <= round.inkCap && focus.ink < 3000,
  '砚台有容量：跑三小时墨停在 ' + focus.ink + '/' + focus.inkCap +
  '，没有胀成六位数');
ok(focus.wasted > 0 && round.wasted > 0, '满砚溢出的墨被记下来：玩家需要看见「该花墨了」');

console.log('\n== 二、收集物有没有尽头 ==');
ok(sim.poolSize() === 36, '池子定死 36 枚，不随时间膨胀');
ok(focus.logged <= 36 && round.logged <= 36, '几小时之后录入数仍不越过池子上界');
ok(focus.logged >= 30 && round.logged >= 30,
  '两条路都能把册子录到接近满（' + focus.logged + ' / ' + round.logged + '）——有尽头且够得着');
ok(focus.logged === focus.logs && round.logged === round.logs,
  '录入数 = 成功补录次数：没有重复计数，也没有凭空多出来的条目');

console.log('\n== 三、旋钮有没有唯一最优解 ==');
const gap = Math.abs(focus.total - round.total) / round.total;
ok(gap < 0.12, '拉满与摊平的最终总倍率差 ' + (gap * 100).toFixed(1) + '%（< 12%）');
ok(focus.focus > round.focus && round.spread > focus.spread,
  '两条路确实走出了不同的版次脾气（专 ' + focus.focus + ' vs ' + round.focus +
  ' / 博 ' + round.spread + ' vs ' + focus.spread + '）');
ok(focus.inkMul > round.inkMul && round.rareMul > focus.inkMul * 0 + focus.rareMul,
  '擅长的维度不同：拉满偏墨，摊平偏孤版');
/* 砚台有容量、池子定死 36 枚之后，两条路最后都会停在「满册 / 满砚」——
   这是刻意设计，不是取舍消失：ink 与 rare 被上限夹住了，本来就该一样。
   取舍留在真正由工序决定的数上：倍率怎么分、专博几档、墨怎么花、溢掉多少。
   满册时刻会随这一趟世界的脾气浮动，两条路偶尔撞在同一幅，只作观察。 */
function fingerprint(r) {
  return [r.total.toFixed(3), r.inkMul.toFixed(3), r.logMul.toFixed(3),
          r.rareMul.toFixed(3), r.focus, r.spread].join('|');
}
ok(fingerprint(focus) !== fingerprint(round) &&
   Math.abs(focus.total - round.total) > 0.01,
  '同一个玩法两种取向，最后打出来的数不一样——取舍还在（倍率 ' +
  focus.total.toFixed(3) + '/' + round.total.toFixed(3) + '，专 ' +
  focus.focus + '/博 ' + focus.spread + ' vs 专 ' + round.focus + '/博 ' + round.spread + '）');
ok(focus.spent !== round.spent && focus.wasted !== round.wasted &&
   focus.fullAt > 0 && round.fullAt > 0,
  '两条路都走到了 36 枚的尽头，花墨 ' + focus.spent + '/' + round.spent +
  '、溢出 ' + focus.wasted + '/' + round.wasted + ' 各不相同');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
w.close();
process.exit(fail ? 1 : 0);
