/* 电波 —— 把粒子群此刻的动能，翻译成信号层面的干扰。
 *
 * 为什么只读不取：core/life.js 的 next() 是世界的扰动流，UI 每帧狂读会把它
 * 消耗掉，世界就变成「帧率的函数」。所以这里只读 state() / particles()，
 * 换字只走 BT.gen.unit 的无状态散列——不掷骰子、不另起流、不改世界一个字节。
 * 狂乱的程度因此不是调出来的，是那群粒子自己聚散出来的。
 *
 * 为什么用 DOM + 内联 SVG 而不是 canvas：本家无头渲染链靠的是纯矢量属性，
 * 逐像素画布会整条断掉。色差用 mix-blend-mode，波形坐标当场算进 d，
 * 不碰 transform / filter / canvas。元素一次建好只改属性，池子定死不增长。
 *
 * 为什么 burst 用 tick(dt) 衰减：setTimeout 在无头链路里不会被推进，
 * 一记闪白会永远挂在屏幕上。 */
window.BT = window.BT || {};

BT.reg.add({
  id: 'denpa',

  mount: function (ctx) {
    var T = BT.DENPA_TABLE, CAP = BT.DENPA_LOWCAP,
        G = BT.DENPA_GLYPH, B = BT.DENPA_BANDS,
        SCHEMA = BT.DENPA_SCHEMA, PAL = BT.DENPA_PALETTE;
    var host = document.getElementById('denpa');
    if (!host || !BT.life || !BT.bus || !BT.ui || !BT.gen) return null;

    var S = {}, k;
    for (k in T) if (Object.prototype.hasOwnProperty.call(T, k)) S[k] = T[k];
    var low = false, flash = 0, glyphT = 0, bucket = 0;
    var lastW = 0, lastH = 0;
    /* 静不是把参数调小，是让呈现整层退场。eff() 仍返回真实参数，
       否则「改一个布尔就能切回狂乱」这件事就不成立了。 */
    var Q = BT.QUIET_TABLE || { enabled: false };
    var quiet = !!(Q.enabled && document.body &&
                   document.body.classList.contains('quiet'));

    /* 唯一取值口。低烈度是硬上限钳制，不是「把整体乘个系数」——
       频闪、爆发、色差呼吸必须能真正归零，其余项只是压低。 */
    function eff(key) {
      var v = S[key];
      if (low && CAP[key] !== undefined && typeof v === 'number') {
        return Math.min(v, CAP[key]);
      }
      return v;
    }

    function dom(tag, cls, parent) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      (parent || host).appendChild(e);
      return e;
    }
    var NS = BT.ui.NS, i;

    /* 干涉波带：六条相位错开的正弦。坐标直接写进 d，不用矩阵。 */
    var waveSvg = document.createElementNS(NS, 'svg');
    waveSvg.setAttribute('id', 'dnWave');
    waveSvg.setAttribute('class', 'dn-wave');
    host.appendChild(waveSvg);
    var waves = [];
    for (i = 0; i < B.count; i++) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('id', 'dnWave' + i);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', B.colors[i % B.colors.length]);
      p.setAttribute('stroke-width', B.thickness[0].toFixed(1));
      p.setAttribute('stroke-opacity', '0');
      waveSvg.appendChild(p);
      waves.push(p);
    }

    var sliceBox = dom('div', 'dn-slices');
    var slices = [];
    for (i = 0; i < 40; i++) slices.push(dom('i', 'dn-slice', sliceBox));

    var chromaBox = dom('div', 'dn-chroma');
    var chromas = [], chColors = ['#00ffff', '#ff0000', '#ffff00'];
    for (i = 0; i < 3; i++) {
      var c = dom('i', 'dn-ch dn-ch' + i, chromaBox);
      /* 通道条码的间距必须远大于线宽：1px 周期会把整屏压成灰紫网格，
         那不是色差，是脏。宽间距 + 低浓度才读得出「三通道错位」。 */
      c.style.background = 'repeating-linear-gradient(90deg,' +
        chColors[i] + ' 0 2px, transparent 2px 64px)';
      chromas.push(c);
    }

    var grainBox = dom('div', 'dn-grain');
    var grains = [];
    for (i = 0; i < 64; i++) grains.push(dom('i', 'dn-gr', grainBox));

    var glyphBox = dom('div', 'dn-glyphs');
    var glyphs = [];
    for (i = 0; i < G.count; i++) glyphs.push(dom('span', 'dn-gl', glyphBox));

    var scan = dom('div', 'dn-scan');
    var boost = dom('div', 'dn-boost');
    var vignette = dom('div', 'dn-vignette');
    var burstEl = dom('div', 'dn-burst');

    /* 乱码池展平一次，之后只按散列挑下标。 */
    var WORDS = G.numbers.concat(G.words, G.marks, G.tail);
    function pickWord(seed) {
      return WORDS[Math.floor(BT.gen.unit(seed) * WORDS.length) % WORDS.length];
    }

    /* 调音台控件由 SCHEMA 生成。事件只委托一次，值写回同一张 S 表，
       下次 eff() 自动生效——加旋钮不用改下面任何一行渲染代码。 */
    var knobs = [];
    var panel = document.getElementById('panel');
    if (panel) {
      var box = dom('div', 'dn-knobs', panel);
      var title = dom('div', 'dn-knobs-t', box);
      title.textContent = '电波 · DENPA';
      SCHEMA.forEach(function (s) {
        var row = dom('div', 'dn-knob', box);
        var lab = dom('label', 'dn-knob-l', row);
        lab.textContent = s.l;
        var inp = document.createElement('input');
        inp.type = 'range';
        inp.min = s.min; inp.max = s.max; inp.step = s.step;
        inp.value = S[s.k];
        inp.className = 'dn-knob-i';
        inp.setAttribute('data-dn', s.k);
        row.appendChild(inp);
        var val = dom('span', 'dn-knob-v', row);
        val.textContent = Number(S[s.k]).toFixed(2);
        knobs.push({ k: s.k, inp: inp, val: val });
      });
      box.addEventListener('input', function (e) {
        var t = e.target, key = t && t.getAttribute ? t.getAttribute('data-dn') : null;
        if (!key || !(key in S)) return;
        var v = parseFloat(t.value);
        if (!isFinite(v)) return;
        S[key] = v;
        for (var j = 0; j < knobs.length; j++) {
          if (knobs[j].k === key) knobs[j].val.textContent = v.toFixed(2);
        }
      });
    }

    function burstNow(mult) {
      if (quiet) return 0;
      flash = Math.min(1, Math.max(flash, eff('burst') * (mult || 1)));
      return flash;
    }
    BT.bus.on('chapter:shift', function () { burstNow(1.0); });
    BT.bus.on('agenda:pick', function () { burstNow(0.6); });
    BT.bus.on('specimen:logged', function () { burstNow(0.8); });
    BT.bus.on('ui:reset-book', function () { burstNow(0.5); });

    /* 每帧只改属性。粒子动能决定狂乱度，粒子位置决定撕裂落在哪，
       静态散列决定乱码与噪点的落点——三者互不串味。 */
    function sync(now, W, H, isLow) {
      if (!W || !H) return;
      low = !!isLow;
      lastW = W; lastH = H;
      if (quiet) {
        var rs = document.documentElement.style;
        rs.setProperty('--dn-chroma', '0px');
        rs.setProperty('--dn-melt', '0em');
        rs.setProperty('--dn-bloom', '0');
        burstEl.style.opacity = '0';
        return;
      }
      var st = BT.life.state(), ps = BT.life.particles();
      var drive = Math.max(0, Math.min(1.5,
        0.25 + st.energy * 55 + st.cluster * 0.25)) * eff('frenzy');
      var root = document.documentElement.style;
      var i2, j2, d, x, y, u, pal, el;

      /* 干涉波带。相位吃粒子群的固有相位，所以群集改变时波形会自己换节拍。 */
      var amp = eff('warp') * drive * H * B.amp / 18;
      for (i2 = 0; i2 < waves.length; i2++) {
        var q = ps[i2 % ps.length] || { ph: 0, vx: 0 };
        var y0 = H * (0.16 + 0.68 * i2 / Math.max(1, waves.length - 1));
        d = '';
        for (j2 = 0; j2 <= B.steps; j2++) {
          x = W * j2 / B.steps;
          y = y0 + Math.sin(x * eff('warpFreq') * 0.06 + now * 0.9 +
                            i2 * B.phase * 10 + q.ph) * amp *
              (1 + 0.4 * Math.sin(x * 0.004 + now * 0.35 + i2));
          d += (j2 ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
        }
        waves[i2].setAttribute('d', d);
        waves[i2].setAttribute('stroke-width',
          (B.thickness[0] + Math.abs(q.vx) * 260).toFixed(2));
        waves[i2].setAttribute('stroke-opacity',
          (eff('echo') * drive * B.op).toFixed(4));
      }

      /* 切片撕裂。启用条数由 sliceN 定，其余只是把透明度归零，不删节点。 */
      var n = Math.min(slices.length, Math.max(0, Math.round(eff('sliceN'))));
      for (i2 = 0; i2 < slices.length; i2++) {
        el = slices[i2];
        if (i2 >= n || eff('slice') <= 0.01) { el.style.opacity = '0'; continue; }
        var sp = ps[i2 % ps.length] || { x: 0.5, y: 0.5, vx: 0, k: 0 };
        u = BT.gen.unit('dn|slice|' + bucket + '|' + i2);
        pal = PAL[(sp.k + i2) % PAL.length];
        var shift = (sp.x - 0.5) * eff('slice') * W * 0.32 * drive;
        el.style.left = (shift + (u - 0.5) * W * 0.12).toFixed(1) + 'px';
        el.style.top = ((0.04 + 0.92 * u) * H).toFixed(1) + 'px';
        el.style.width = ((0.06 + 0.34 * Math.min(1, Math.abs(sp.vx) * 120)) * W).toFixed(1) + 'px';
        el.style.height = (0.8 + 2.4 * u).toFixed(1) + 'px';
        el.style.background = pal.neon;
        el.style.opacity = (eff('slice') * drive * (0.14 + 0.38 * u)).toFixed(4);
      }

      /* 三通道色差。呼吸项由 chromaPulse 控制，低烈度下直接归零。 */
      var ch = eff('chroma') * drive *
               (0.55 + 0.45 * Math.sin(now * 3.1) * eff('chromaPulse'));
      chromas[0].style.left = (-60 - ch).toFixed(1) + 'px';
      chromas[1].style.left = (-60 + ch).toFixed(1) + 'px';
      chromas[2].style.left = (-60 + ch * 0.4).toFixed(1) + 'px';
      for (i2 = 0; i2 < chromas.length; i2++) {
        chromas[i2].style.opacity = (eff('chroma') / 48 * 0.09 * drive).toFixed(4);
      }

      /* 噪点：落点按 bucket 分档换，不每帧抖，免得变成电视雪花。 */
      for (i2 = 0; i2 < grains.length; i2++) {
        el = grains[i2];
        var ux = BT.gen.unit('dn|grx|' + (bucket >> 2) + '|' + i2);
        var uy = BT.gen.unit('dn|gry|' + (bucket >> 2) + '|' + i2);
        pal = PAL[i2 % PAL.length];
        el.style.left = (ux * W).toFixed(1) + 'px';
        el.style.top = (uy * H).toFixed(1) + 'px';
        el.style.background = i2 % 3 === 0 ? pal.neon2 : pal.line;
        el.style.opacity = (eff('noise') * (0.10 + 0.55 * ux) * drive).toFixed(4);
      }

      /* 漂浮乱码。字由无状态散列从定死的池子里挑，位置吃粒子 y。 */
      for (i2 = 0; i2 < glyphs.length; i2++) {
        el = glyphs[i2];
        var gp = ps[i2 % ps.length] || { y: 0.5, k: 0 };
        u = BT.gen.unit('dn|gl|' + bucket + '|' + i2);
        pal = PAL[(gp.k + i2) % PAL.length];
        if (u > eff('glyphs') * 0.92) { el.style.opacity = '0'; continue; }
        el.textContent = pickWord('dn|word|' + bucket + '|' + i2);
        el.style.left = (BT.gen.unit('dn|glx|' + i2) * W * 0.88).toFixed(1) + 'px';
        el.style.top = ((0.06 + 0.86 * ((gp.y + u) % 1)) * H).toFixed(1) + 'px';
        el.style.color = u > 0.72 ? pal.neon : (u > 0.4 ? pal.neon2 : pal.line);
        el.style.opacity = (eff('glyphs') * (0.16 + 0.52 * u) * drive).toFixed(4);
      }

      scan.style.backgroundSize = '100% ' + Math.max(2, Math.round(eff('scanFreq') * 1.4)) + 'px';
      scan.style.opacity = (eff('scan') * 0.30).toFixed(4);
      boost.style.opacity = (eff('boostOp') * (eff('contrast') - 1) * drive * 1.7).toFixed(4);
      vignette.style.opacity = (eff('vignette') * 0.44).toFixed(4);
      burstEl.style.opacity = flash.toFixed(4);

      /* UI 文字的色差与融化走同一组变量。文字本身始终在效果层之上，
         这是可读性底线，不是审美让步。 */
      /* UI 只吃一小截色差：世界可以糊，字不能糊。上限 9px 是实测值，
         再往上「最旧的一扇窗」会糊成一团红青重影。 */
      root.setProperty('--dn-chroma',
        (low ? 0 : Math.min(ch, 9)).toFixed(1) + 'px');
      root.setProperty('--dn-melt', (eff('melt') * drive * 0.06).toFixed(3) + 'em');
      root.setProperty('--dn-bloom', (eff('bloom') * drive).toFixed(3));
    }

    function tick(dt) {
      if (quiet) { flash = 0; burstEl.style.opacity = '0'; return; }
      flash = Math.max(0, flash - dt * eff('flashDecay'));
      glyphT += dt * Math.max(0.1, eff('glyphSpeed'));
      if (glyphT >= Math.max(0.05, eff('glyphHold'))) { glyphT = 0; bucket++; }
      burstEl.style.opacity = flash.toFixed(4);
    }

    var api = {
      sync: sync, tick: tick, eff: eff, burst: burstNow,
      quiet: function () { return quiet; },
      setQuiet: function (v) { quiet = !!v; return quiet; },
      flash: function () { return flash; },
      low: function () { return low; },
      set: function (key, v) {
        if ((key in S) && isFinite(v)) { S[key] = v; return eff(key); }
        return null;
      },
      values: function () {
        var out = {}, q;
        for (q in S) if (Object.prototype.hasOwnProperty.call(S, q)) out[q] = eff(q);
        return out;
      },
      pools: function () {
        return { waves: waves.length, slices: slices.length, grains: grains.length,
                 glyphs: glyphs.length, chroma: chromas.length, knobs: knobs.length };
      },
      view: function () { return { w: lastW, h: lastH }; },
      TABLES: T
    };
    ctx.denpa = api;
    return api;
  }
});
