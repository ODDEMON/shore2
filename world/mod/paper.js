/* 纸 —— 背景层。这一层不画世界，只画世界被写在什么上面。
 *
 * 背景从「近黑的夜空」换成「夜里的一页横格纸 × 赛博朋克」：
 *   · 横格是纸的骨——每三格一根，铺满整个视口，从顶到底，不等世界长出来。
 *   · 页边红线是纸的规矩——每一幅开头一根，一页一根，跟着画卷往右走。
 *   · 页码是纸的记性——每页底角一个小数字，读得出来自己在第几页。
 *   · 地脚线上那道青/桃错位，是纸被霓虹照着时才会有的色散。
 * 建筑仍然是纸上的墨。纸不替它决定任何东西，只提供一个可以待着的平面。
 *
 * 为什么单独一层，不并进 #staff：
 * 谱线是世界的骨（9/18/27/36 格，跟着构图走，由 score 逐幅铺，会随色板变色），
 * 横格是纸的纹理（行距按屏幕像素挑，永远是 9 的约数，所以总有一根与谱线重合）。
 * 两者颜色、透明度、缩放行为都不同，混在一个分组 map 里迟早互相串色。
 * 这一层只碰自己的 <g id="paper">，不动 score 的任何缓冲。
 *
 * 三条家规照旧：
 *   不碰 transform —— Edge 无头对带 transform 的 SVG 元素整幅静默不画，不报错；
 *   不碰 Math.random —— 纸是稳的，同一帧同一张纸，页号由幅号直接给出；
 *   元素一次建好，之后只改属性，DOM 不随世界长大。
 *
 * 光敏出口：低烈度把横格/页边线/地脚线一起压到 55%，色散整条撤掉。
 */
window.BT = window.BT || {};

BT.PAPER = {
  /* 行距候选，全部是 9 的约数：谱线在 9/18/27/36 格上，横格因此永远有一根
     与它重合——两支尺子不会互相割。挑哪个由屏幕缩放定，挑的是「最接近
     pitchPx 的那一个」：窗口小则行距密，窗口大则行距疏，一页始终是十五六行。 */
  divs: [4.5, 3, 2.25, 1.5, 1.125],
  pitchPx: 34,

  /* 暖纸。夜里的一页纸不是白的：灯光下的纸是暖灰褐，
     所以这一层不是「把夜空刷白」，是把夜色调成纸的温度。
     三段而不是两段：顶上受光、腰间漫射、地脚留一点影——但地脚不许是黑洞，
     那条近黑的横带曾经是整幅画面最不宜人的地方。 */
  wash: { top: ['#ffd9b0', 0.16], mid: ['#e6b78d', 0.105], bot: ['#c48b62', 0.075] },
  lamp: { x: 0.50, y: 0.15, rx: 0.82, ry: 0.64, color: '#ffe4bc', op: 0.135 },
  glow: { y: 1.00, rx: 0.95, ry: 0.19, color: '#ffcf9e', op: 0.12 },

  /* 横格：淡青。作业本的横格本来就是浅蓝或浅绿，不是暖白——
     于是纸是暖的、格是冷的，一支暖一支冷打在同一个平面上，
     赛博朋克那点对撞就出来了，而且不用往画面上撒一盏霓虹灯。
     也顺手把「谱线（暖白）」与「横格（淡青）」分成两种身份：
     前者是世界的骨，后者是纸的纹理，看得见的差别就有出处。 */
  rule: { color: '#f0dfc4', op: 0.115, w: 0.075 },

  /* 页边红线。作业本的红线是整页唯一饱和的东西，也是赛博朋克唯一的霓虹入口：
     一根 1px 的桃红实线 + 一圈横向化开的荧光晕 + 一根错开的青发丝。
     发丝是色散不是装饰：红线在屏幕上被「霓虹」照着，边缘才会散出冷色。 */
  margin: {
    at: 5.2, w: 0.09, op: 0.27, tint: 0.30,
    glowW: 2.3, glowOp: 0.075, color: '#e45c78',
    hair: { dx: -0.13, w: 0.05, op: 0.30, color: '#7fe6ff' }
  },

  /* 页眉双线：压在世界顶端（45 格），像作业本顶端那道横格。
     极淡——上方四分之一是留白，不是没画完。 */
  head: { at: 45, gap: 0.9, w: 0.07, op: 0.11, color: '#ffff00' },

  /* 地脚线：建筑站上去的那根线 + 青/桃错位。错位幅度是像素，不是格——
     色散是屏幕的事，不该跟着焦距缩放。 */
  ground: {
    w: 0.085, op: 0.21, color: '#f3dcbb',
    cyan: '#00ffff', magenta: '#ff2d95', fringe: 0.115, dy: 1.9
  },

  /* 页码：贴在地脚线下面的地脚留白里，与残页页脚的档案号同一套腔调。 */
  num: { dx: 1.6, dy: 2.7, size: 0.44, op: 0.45, color: '#e7d3b4' },

  marginPool: 6,
  numPool: 10
};

BT.reg.add({
  id: 'paper',

  mount: function (ctx) {
    var NS = 'http://www.w3.org/2000/svg';
    var T = BT.SCORE_TABLES;
    var P = BT.PAPER;
    var host = document.getElementById('paper');
    if (!host) return null;

    function el(tag, a, parent) {
      var e = document.createElementNS(NS, tag);
      if (a) for (var k in a) if (a.hasOwnProperty(k)) e.setAttribute(k, a[k]);
      (parent || host).appendChild(e);
      return e;
    }
    function stop(g, off, color, op) {
      return el('stop', { offset: off, 'stop-color': color, 'stop-opacity': String(op) }, g);
    }
    function box(d, x, y, w, h) {
      return d + 'M' + x + ' ' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'z';
    }
    function px(v) { return v.toFixed(2); }

    /* ---- 渐变。全部写死在表上，运行时只改位置与透明度。 ---- */
    var defs = el('defs');
    var gWash = el('linearGradient', { id: 'pgWash', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    stop(gWash, '0', P.wash.top[0], P.wash.top[1]);
    stop(gWash, '0.62', P.wash.mid[0], P.wash.mid[1]);
    stop(gWash, '1', P.wash.bot[0], P.wash.bot[1]);
    var gLamp = el('radialGradient', { id: 'pgLamp', cx: '50%', cy: '50%', r: '50%' }, defs);
    stop(gLamp, '0', P.lamp.color, P.lamp.op);
    stop(gLamp, '46%', P.lamp.color, P.lamp.op * 0.52);
    stop(gLamp, '100%', P.lamp.color, 0);
    var gGlow = el('radialGradient', { id: 'pgHalo', cx: '50%', cy: '50%', r: '50%' }, defs);
    stop(gGlow, '0', P.glow.color, P.glow.op);
    stop(gGlow, '52%', P.glow.color, P.glow.op * 0.34);
    stop(gGlow, '100%', P.glow.color, 0);
    /* 页边线的荧光晕：横向化开，两端收干净。用 userSpaceOnUse 会绑死坐标，
       所以改成每条页边线一枚 rect，各自吃自己的 objectBoundingBox。 */
    var gMarg = el('linearGradient', { id: 'pgMargFade', x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
    stop(gMarg, '0', P.margin.color, 0);
    var gmMid = stop(gMarg, '0.5', P.margin.color, P.margin.glowOp);
    stop(gMarg, '1', P.margin.color, 0);

    /* ---- 纸的家具。顺序即层次：洗色 → 灯 → 地脚光 → 横格 → 页边 → 页眉 → 线。 ---- */
    var washEl = el('rect', { id: 'pgWashRect', x: 0, y: 0, width: 10, height: 10,
                              fill: 'url(#pgWash)' });
    var lampEl = el('ellipse', { id: 'pgLampEl', cx: 0, cy: 0, rx: 0, ry: 0,
                                 fill: 'url(#pgLamp)' });
    var glowEl = el('ellipse', { id: 'pgGlowEl', cx: 0, cy: 0, rx: 0, ry: 0,
                                 fill: 'url(#pgHalo)' });

    var glowRect = [];
    for (var i = 0; i < P.marginPool; i++) {
      glowRect.push(el('rect', { id: 'pgMargGlow' + i, x: 0, y: 0, width: 0, height: 0,
                                 fill: 'url(#pgMargFade)' }));
    }

    var rulePath = el('path', { id: 'pgRule', fill: P.rule.color });
    var margPath = el('path', { id: 'pgMarg', fill: P.margin.color });
    var hairPath = el('path', { id: 'pgMargHair', fill: P.margin.hair.color });
    var headPath = el('path', { id: 'pgHead', fill: P.head.color });
    var seatPath = el('path', { id: 'pgSeat', fill: P.ground.color });
    var friC = el('path', { id: 'pgFringeC', fill: P.ground.cyan });
    var friM = el('path', { id: 'pgFringeM', fill: P.ground.magenta });

    var nums = [];
    for (i = 0; i < P.numPool; i++) {
      nums.push(el('text', {
        id: 'pgNum' + i,
        'font-family': 'ui-monospace, "Cascadia Mono", Consolas, monospace',
        'font-size': '10',
        'font-weight': '400',
        'letter-spacing': '0.14em',
        fill: P.num.color
      }));
    }

    /* ---- 一行一行地铺。行距挑「离 pitchPx 最近」的那个约数：
       窗口小则密、窗口大则疏，一页永远是十五六行，不会变成密栅或空纸。 ---- */
    function pickDiv(cell) {
      var best = P.divs[0], bd = Infinity, i, dd;
      for (i = 0; i < P.divs.length; i++) {
        dd = Math.abs(P.divs[i] * cell - P.pitchPx);
        if (dd < bd) { bd = dd; best = P.divs[i]; }
      }
      return best;
    }

    function pad3(n) {
      var s = String(n);
      while (s.length < 3) s = '0' + s;
      return s;
    }

    var view = { x: 0, cell: 13, w: 800, h: 600, groundY: 528, now: 0 };
    /* 页边红线的颜色会跟着事件的主霓虹偏一点：城里的灯换了色温，
       纸的边缘也跟着换，两者才是同一个晚上。变了才写 DOM，不是每帧都写。 */
    var lastTint;
    function marginColor() {
      var t = (ctx.score && ctx.score.neonTint) ? ctx.score.neonTint() : '';
      if (t === lastTint) return null;
      lastTint = t;
      return t ? T.mix(P.margin.color, t, P.margin.tint) : P.margin.color;
    }

    function sync(v) {
      if (v) {
        view.x = v.x;
        view.cell = v.cell || 13;
        view.w = v.w;
        view.h = v.h;
        view.groundY = v.groundY;
        if (v.now !== undefined) view.now = v.now;
      }
      var cell = view.cell, W = view.w, H = view.h, gy = view.groundY;
      var n = view.now;
      var low = ctx.score && ctx.score.lowPower ? ctx.score.lowPower() : 0;
      /* 低烈度：纸也安静下来。横格与页边线不成负担，只是收一档。 */
      var k = low ? 0.55 : 1;
      var mc = marginColor();
      if (mc) {
        margPath.setAttribute('fill', mc);
        gmMid.setAttribute('stop-color', mc);
      }

      /* 洗色：整页暖起来。不是把夜空刷白，是把它调成纸的温度。 */
      washEl.setAttribute('width', px(W));
      washEl.setAttribute('height', px(H));
      washEl.setAttribute('fill-opacity', px(k * (0.94 + 0.06 * Math.sin(n * 0.05))));

      /* 灯：压在纸上方，让顶上的留白有光而不是有洞。 */
      lampEl.setAttribute('cx', px(W * P.lamp.x));
      lampEl.setAttribute('cy', px(H * P.lamp.y));
      lampEl.setAttribute('rx', px(W * P.lamp.rx));
      lampEl.setAttribute('ry', px(H * P.lamp.ry));
      lampEl.setAttribute('fill-opacity', px(k * (0.78 + 0.22 * Math.sin(n * 0.07 + 1.1))));

      /* 地脚光：一团压在地脚线上，像灯落在纸上。低了不好看，高了会洗掉建筑。 */
      glowEl.setAttribute('cx', px(W * 0.5));
      glowEl.setAttribute('cy', px(gy));
      glowEl.setAttribute('rx', px(W * P.glow.rx));
      glowEl.setAttribute('ry', px(H * P.glow.ry * 0.5));
      glowEl.setAttribute('fill-opacity', px(k * (0.82 + 0.18 * Math.sin(n * 0.05 + 2.3))));

      /* 横格。相位锁在地脚线上：总有一根横格正好是建筑站的那根线。 */
      var pitch = Math.max(7, pickDiv(cell) * cell);
      var rh = Math.max(1, cell * P.rule.w);
      var d = '', y = gy - Math.ceil(gy / pitch) * pitch;
      while (y < H + pitch) {
        if (y > -pitch) d = box(d, 0, px(y), px(W), px(rh));
        y += pitch;
      }
      rulePath.setAttribute('d', d);
      rulePath.setAttribute('fill-opacity', px(P.rule.op * k));

      /* 页边线与页码：跟着画卷往右走，一页一组。 */
      var left = view.x - W / 2 / cell;
      var right = view.x + W / 2 / cell;
      var p0 = Math.max(0, Math.floor(left / T.SPAN));
      var p1 = Math.ceil(right / T.SPAN);
      var dm = '', dh2 = '', gi = 0, ni = 0, mw = Math.max(1, cell * P.margin.w);
      var hw = Math.max(1, cell * P.margin.hair.w);
      var gw = Math.max(4, cell * P.margin.glowW);
      var breathe = 0.86 + 0.14 * Math.sin(n * 0.09 + 0.6);
      var nsize = Math.max(8, cell * P.num.size);
      var ny = Math.min(H - 4, gy + P.num.dy * cell);
      for (var q = p0; q <= p1; q++) {
        var wx = q * T.SPAN;
        var sx = W / 2 + (wx + P.margin.at - view.x) * cell;
        if (sx > -gw - mw && sx < W + gw) {
          dm = box(dm, px(sx), 0, px(mw), px(H));
          dh2 = box(dh2, px(sx + P.margin.hair.dx * cell), 0, px(hw), px(H));
          if (gi < glowRect.length) {
            var gr = glowRect[gi++];
            gr.setAttribute('x', px(sx - (gw - mw) / 2));
            gr.setAttribute('y', '0');
            gr.setAttribute('width', px(gw));
            gr.setAttribute('height', px(H));
            gr.setAttribute('fill-opacity', px(k * breathe));
          }
        }
        var tx = W / 2 + (wx + P.num.dx - view.x) * cell;
        if (tx > -40 && tx < W + 10 && ni < nums.length) {
          var te = nums[ni++];
          te.textContent = pad3(q);
          te.setAttribute('x', px(tx));
          te.setAttribute('y', px(ny));
          te.setAttribute('font-size', px(nsize));
          te.setAttribute('fill-opacity', px(P.num.op * k));
        }
      }
      for (; gi < glowRect.length; gi++) glowRect[gi].setAttribute('width', '0');
      for (; ni < nums.length; ni++) nums[ni].textContent = '';
      margPath.setAttribute('d', dm);
      margPath.setAttribute('fill-opacity', px(P.margin.op * k * breathe));
      hairPath.setAttribute('d', low ? '' : dh2);
      hairPath.setAttribute('fill-opacity', px(P.margin.hair.op * k));

      /* 页眉双线：世界顶端那道横格。世界还没长到那么高时它照样在——
         纸先于建筑，这是这一层的定义。 */
      var hy = gy - P.head.at * cell;
      var dh = '';
      if (hy > -2 && hy < H) {
        dh = box(dh, 0, px(hy), px(W), px(Math.max(1, cell * P.head.w)));
        dh = box(dh, 0, px(hy - P.head.gap * cell), px(W), px(Math.max(1, cell * P.head.w * 0.7)));
      }
      headPath.setAttribute('d', dh);
      headPath.setAttribute('fill-opacity', px(P.head.op * k));

      /* 地脚线：建筑站上去的那根线。 */
      var seatH = Math.max(1, cell * P.ground.w);
      seatPath.setAttribute('d', box('', 0, px(gy - seatH / 2), px(W), px(seatH)));
      seatPath.setAttribute('fill-opacity', px(P.ground.op * k));

      /* 色散：一根青、一根桃，各错开一点六像素。硬边上才会看见，
         软边上只会看见「这根线比别的线贵一点」——正是要的分量。 */
      if (low) {
        friC.setAttribute('d', '');
        friM.setAttribute('d', '');
      } else {
        var fw = Math.max(1, seatH * 0.6);
        friC.setAttribute('d', box('', 0, px(gy - seatH / 2 - P.ground.dy), px(W), px(fw)));
        friM.setAttribute('d', box('', 0, px(gy + seatH / 2 + P.ground.dy), px(W), px(fw)));
        friC.setAttribute('fill-opacity', px(P.ground.fringe));
        friM.setAttribute('fill-opacity', px(P.ground.fringe));
      }
    }

    var api = { sync: sync, TABLES: P, host: host };
    ctx.paper = api;
    sync();
    return api;
  }
});
