/* 粒子生命 —— 世界的扰动源。二代把「掷骰子」这件事整个撤掉了。
 *
 * 一代的干扰是 Math.random：每一笔独立、无记忆、彼此不相干。它不是活的，
 * 是一台每秒吐几千个白噪声的机器。种子也不对：把世界压成一段可回放的录像，
 * 生命感同样没了。二代两者都不要，改让扰动从系统自己身上长出来：
 *
 *   十几个粒子住在一个环形的单位方里，各有性（三种）、位置、速度、固有相位。
 *   两两之间按一张**非对称**作用矩阵相互作用：太近就排斥，中程按「谁看谁」
 *   决定吸引还是躲避。非对称是粒子生命的要害——它才生得出追逐、群集与涡旋，
 *   而不是一堆很快静止的对称晶体。粒子带阻尼、带自己的呼吸相位，所以群集
 *   会自己聚拢又散开，永不收敛到一个固定形状。
 *
 * 耦合是双向的：
 *   · 每写完一幅，世界把此刻的 drift 递给粒子场，改它受力的强度；
 *   · 事件换界给粒子群一记径向脉冲，于是换的不只是色板，连扰动的脾气都换了；
 *   · 谱层每一次取扰动，都是从这个正在演化的场里读的，不另起一条随机流。
 *
 * 输出不是白噪声：伯努利移位保证它近似均匀（概率判定才不会失真），
 * 而粒子群此刻的群集度会缓慢地把分布往中间或两端推——世界安静一阵、
 * 又动荡一阵，这个「脾气」是场自己长出来的，不是调参调出来的。
 *
 * 出生时刻：初值只取当刻的时间熵（Date + performance），**不存、不写回、不可复现**。
 * 没有种子，没有 Math.random，没有可分享的地址。刷新一次，就是另一群粒子，
 * 另一条岸。整个项目一处 Math.random 都没有。
 *
 * 家规：O(1) 取样、每幅一次 O(n²) 推进、表驱动、不碰 DOM、不碰 transform。 */
window.BT = window.BT || {};

BT.LIFE_TABLE = {
  count: 12,
  kinds: 3,
  reach: 0.46,          // 中程作用半径（归一化）
  core: 0.16,           // 硬核排斥半径
  force: 0.0075,        // 每步合力的尺度
  friction: 0.88,       // 阻尼：不是让它停，是不让它飞
  kick: 0.00065,        // 固有相位给的自扰动（不是随机，是振动）
  /* 非对称矩阵：行 = 自己，列 = 对方。追与躲都写在这张表里。 */
  matrix: [
    [ 0.62, -0.48,  0.30],
    [-0.36,  0.78, -0.22],
    [ 0.44, -0.58,  0.56]
  ],
  mul: 91.724113,       // 伯努利移位的非整数倍率：均匀，但对初值极敏感
  add: 0.318309886,     // 1/π
  couple: 0.021,        // 粒子速度对移位的调制
  breath: 0.006,        // 场的慢呼吸
  shape: 0.30,          // 群集度对扰动分布的最大整形量（保均匀，改方差）
  energyScale: 78,
  energyBias: 0.29,     // 对齐场的常态动能：整形量围绕 0 呼吸，不系统性压掉尾概率
  phaseStep: 0.021,     // 每次取样，粒子自己的相位也往前走一点
  worldGain: 0.34,      // 世界 drift 反馈到受力的强度
  pulseGain: 0.0042     // 换界脉冲的速度增量
};

BT.life = (function () {
  var T = BT.LIFE_TABLE;
  var ps = [], s = 0.5, t = 0, idx = 0, ticks = 0;
  var energy = 0, spread = 0, cluster = 0, bornAt = 0;

  function mix32(x) {
    x = x >>> 0;
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0;
    x ^= x >>> 16;
    return x >>> 0;
  }
  function frac(x) { return x - Math.floor(x); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function wrap01(v) { return frac(v); }

  /* 出生。只用「现在这一刻」，不用种子、不用 Math.random。
     时间熵经 mix32 摊开成每个粒子的初相；这个值不存盘，所以谁也复现不了这一群。 */
  function birth() {
    var now = Date.now() >>> 0;
    var perf = (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : 0;
    var fine = Math.floor(perf * 1000) >>> 0;
    var e = mix32(now ^ mix32(fine ^ 0x9e3779b9) ^ 0x85ebca6b);
    bornAt = now + perf;
    s = (e % 1000003 + 0.5) / 1000003;
    t = 0; idx = 0; ticks = 0;
    ps = [];
    for (var i = 0; i < T.count; i++) {
      e = mix32(e + Math.imul(i + 1, 0x9e3779b9));
      var x = (e >>> 0) / 4294967296;
      e = mix32(e ^ 0xc2b2ae35);
      var y = (e >>> 0) / 4294967296;
      e = mix32(e + 0x27d4eb2f);
      ps.push({
        x: x, y: y,
        vx: (((e >>> 8) & 65535) / 65535 - 0.5) * 0.006,
        vy: (((e >>> 0) & 65535) / 65535 - 0.5) * 0.006,
        k: i % T.kinds,
        ph: x * 6.2831853 + y * 2.3999632
      });
    }
    measure();
    return state();
  }

  function measure() {
    var i, p, sum = 0, cx = 0, cy = 0;
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      sum += Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      cx += p.x; cy += p.y;
    }
    energy = sum / ps.length;
    cx /= ps.length; cy /= ps.length;
    var d2 = 0;
    for (i = 0; i < ps.length; i++) {
      var dx = ps[i].x - cx, dy = ps[i].y - cy;
      d2 += dx * dx + dy * dy;
    }
    spread = Math.sqrt(d2 / ps.length);
    cluster = clamp(1 - spread / 0.42, 0, 1);
  }

  /* 一幅一次的完整推进：O(n²) 的两两作用。世界的 drift 在这里反过来踢场。 */
  function step(world) {
    t += 1;
    var gain = 1, i, j, p, q, dx, dy, d, u, f, fx, fy, M = T.matrix;
    if (world && world.vals && isFinite(world.vals.drift)) {
      gain = 1 + T.worldGain * Math.tanh(world.vals.drift * 0.9);
    }
    for (i = 0; i < ps.length; i++) {
      p = ps[i]; fx = 0; fy = 0;
      for (j = 0; j < ps.length; j++) {
        if (i === j) continue;
        q = ps[j];
        dx = q.x - p.x; dy = q.y - p.y;
        /* 环形边界：穿过右边界的邻居其实就在左边。 */
        if (dx > 0.5) dx -= 1; else if (dx < -0.5) dx += 1;
        if (dy > 0.5) dy -= 1; else if (dy < -0.5) dy += 1;
        d = Math.sqrt(dx * dx + dy * dy);
        if (d >= T.reach || d < 1e-6) continue;
        if (d < T.core) f = -(1 - d / T.core);
        else {
          u = (d - T.core) / (T.reach - T.core);
          f = M[p.k][q.k] * (1 - Math.abs(2 * u - 1));
        }
        fx += dx / d * f; fy += dy / d * f;
      }
      p.vx = (p.vx + fx * T.force * gain + Math.cos(p.ph + t * 0.037) * T.kick) * T.friction;
      p.vy = (p.vy + fy * T.force * gain + Math.sin(p.ph + t * 0.029) * T.kick) * T.friction;
      p.x = wrap01(p.x + p.vx);
      p.y = wrap01(p.y + p.vy);
    }
    measure();
    return state();
  }

  /* 换界脉冲：一记径向踢 + 相位跳转。之后扰动的脾气真的不一样了，
     不只是色板换了颜色。 */
  function pulse(k) {
    var i, p, a, g = T.pulseGain * (k === undefined ? 1 : Math.max(0, k));
    for (i = 0; i < ps.length; i++) {
      p = ps[i];
      a = p.ph + t * 0.11 + i * 0.37;
      p.vx += Math.cos(a) * g;
      p.vy += Math.sin(a) * g;
      p.ph += 0.37;
    }
    measure();
    return state();
  }

  /* 取样。近似均匀的混沌基底 + 由群集度缓慢整形的方差。
     相邻两次不是独立的：它们踩在同一个正在演化的场里。 */
  function next() {
    var p = ps[idx], q = ps[(idx + 5) % ps.length];
    p.ph += T.phaseStep * (1 + 0.5 * q.vx);
    var raw = (p.vx - q.vy) * 26 + Math.sin(p.ph + q.x * 6.2831853) * 0.7;
    var f = T.couple * Math.tanh(raw) + T.breath * Math.sin(t * 0.11 + p.ph);
    s = frac(s * T.mul + T.add + f);
    var shape = T.shape * Math.tanh(energy * T.energyScale - T.energyBias) * 0.5;
    var out = clamp(s + shape * (s - 0.5), 0, 0.999999999);
    idx = (idx + 1) % ps.length;
    ticks++;
    return out;
  }

  function state() {
    return {
      count: ps.length, kinds: T.kinds, t: t, ticks: ticks,
      energy: energy, spread: spread, cluster: cluster,
      bornAt: bornAt, phase: s
    };
  }
  function particles() {
    return ps.map(function (p) {
      return { x: p.x, y: p.y, vx: p.vx, vy: p.vy, k: p.k, ph: p.ph };
    });
  }

  birth();
  return {
    next: next, step: step, pulse: pulse, reset: birth,
    state: state, particles: particles, TABLE: T
  };
})();
