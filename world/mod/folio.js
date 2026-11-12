/* 页饰 —— 二代的「精致」落在这一层，不落在建筑上。
 *
 * 一代已经把「夜里的一页暖横格纸」画对了：洗色、横格、页边线、页码、地脚色散。
 * 二代不重画它，只补一册书该有的物理：
 *   · 装订孔三枚（册子被穿起来的地方，永远不跟着世界走）；
 *   · 四角裁切标与套印十字规（印厂留在纸边的记号，青/桃一丝色散）；
 *   · 纸纤维（固定屏幕坐标的极淡短线，不是噪点贴图，不随镜头漂）；
 *   · 下沿版次尺：一格一刻度、八格一中刻、一幅一长刻，跟着镜头滑。
 *     长卷第一次有了尺子，回望时看得见自己翻回了第几幅。
 * 另有 DOM 覆盖的栏外批注（卷号、校样科、张号），不进 SVG 绘制链。
 *
 * 家规：不碰 transform / filter / canvas / Math.random；元素一次建好只改属性；
 * 低烈度把页饰压到 45%，色散整条撤掉；色值只在 BT.FOLIO 与 :root 里写死一次。
 * 确定性来自 BT.gen.unit 的静态散列——它只给纸编号，不养第二条随机流。 */
window.BT = window.BT || {};

BT.FOLIO = {
  trim:  { inset: 22, len: 15, w: 1, op: 0.20, color: '#ffff00' },
  reg:   { inset: 34, arm: 5, w: 1, op: 0.16, cyan: '#00ffff', pink: '#ff2d95' },
  holes: { x: 0.017, ys: [0.26, 0.50, 0.74], r: 0.0052, op: 0.13, color: '#000000' },
  fiber: { count: 96, op: 0.032, len: [3, 17], color: '#f0dfc4' },
  scale: { y: 0.966, short: 3.2, mid: 6.5, long: 11, op: 0.20,
           color: '#e7d3b4', span: 48, midEvery: 8 },
  badge: { op: 0.52 }
};

BT.reg.add({
  id: 'folio',

  mount: function (ctx) {
    var NS = BT.ui.NS, U = BT.ui, P = BT.FOLIO;
    var host = document.getElementById('folio');
    var dom = document.getElementById('imprint');
    if (!host) return null;

    function el(tag, a) {
      var e = document.createElementNS(NS, tag), k;
      if (a) for (k in a) if (a.hasOwnProperty(k)) e.setAttribute(k, a[k]);
      host.appendChild(e);
      return e;
    }
    function box(d, x, y, w, h) {
      return d + 'M' + x.toFixed(1) + ' ' + y.toFixed(1) +
             'h' + w.toFixed(1) + 'v' + h.toFixed(1) + 'h' + (-w).toFixed(1) + 'z';
    }
    function px(v) { return v.toFixed(1); }

    /* 元素的建立顺序即层次：纤维 → 装订孔 → 版次尺 → 裁切标 → 套印规。 */
    var fiberEl = el('path', { id: 'foFiber', fill: P.fiber.color });
    var holes = [];
    for (var hi = 0; hi < P.holes.ys.length; hi++) {
      holes.push(el('ellipse', { id: 'foHole' + hi, fill: P.holes.color }));
    }
    var scaleEl = el('path', { id: 'foScale', fill: P.scale.color });
    var trimEl = el('path', { id: 'foTrim', fill: P.trim.color });
    var regWarm = el('path', { id: 'foRegW', fill: P.trim.color });
    var regCyan = el('path', { id: 'foRegC', fill: P.reg.cyan });
    var regPink = el('path', { id: 'foRegM', fill: P.reg.pink });

    /* 栏外批注：DOM 覆盖层，不进 SVG 绘制链。文字只在数字变了才写。 */
    var badge = null, volEl = null, noEl = null;
    if (dom) {
      badge = U.dom('div', 'im-badge');
      badge.appendChild(U.head('校样科', 'PROOF DESK'));
      var volLine = U.dom('div', 'im-vol');
      volEl = U.dom('b', '', '卷 001');
      volLine.appendChild(volEl);
      volLine.appendChild(U.dom('span', '', 'SHORE II'));
      badge.appendChild(volLine);
      badge.appendChild(U.rule());
      var foot = U.dom('div', 'im-foot');
      noEl = U.dom('span', '', 'NO. 0000');
      foot.appendChild(noEl);
      foot.appendChild(U.dom('span', '', '岸不留 · 册留'));
      badge.appendChild(foot);
      dom.appendChild(badge);
      var side = U.dom('div', 'im-side', '校 样 科 · 再 版');
      dom.appendChild(side);
    }

    var view = { w: 0, h: 0, cell: 13, x: 0, groundY: 0, now: 0 };
    var lastGeom = '';
    var lastVol = -1, lastNo = -1;

    /* 纸纤维：96 根极淡短线，坐标由静态散列给出，锁死在纸面上。
       只在窗口尺寸变化时重算；镜头怎么走，纸还是这一张纸。 */
    function paintFiber(W, H, low) {
      var d = '', i, u = BT.gen.unit, L = P.fiber.len;
      for (i = 0; i < P.fiber.count; i++) {
        var k = 'fiber|' + i;
        var x = u(k + '|x') * W;
        var y = u(k + '|y') * H * 0.94;
        var w = L[0] + u(k + '|w') * (L[1] - L[0]);
        var h = 0.6 + u(k + '|h') * 0.7;
        d = box(d, x, y, w, h);
      }
      fiberEl.setAttribute('d', d);
      fiberEl.setAttribute('fill-opacity', (P.fiber.op * (low ? 0.45 : 1)).toFixed(4));
    }
    function paintFixed(W, H, low) {
      var k = low ? 0.45 : 1, i, d, a, b, x, y, arm = P.reg.arm;
      /* 装订孔：左缘三枚小暗圆，册子被穿起来的地方。 */
      for (i = 0; i < holes.length; i++) {
        holes[i].setAttribute('cx', px(W * P.holes.x));
        holes[i].setAttribute('cy', px(H * P.holes.ys[i]));
        holes[i].setAttribute('rx', px(Math.max(2, W * P.holes.r)));
        holes[i].setAttribute('ry', px(Math.max(2, H * P.holes.r)));
        holes[i].setAttribute('fill-opacity', (P.holes.op * k).toFixed(4));
      }

      /* 四角裁切标：两笔 L 形，端点留白，不围成一个框。 */
      var ins = P.trim.inset, len = P.trim.len, tw = P.trim.w;
      d = '';
      for (i = 0; i < 4; i++) {
        x = (i % 2 === 0) ? ins : W - ins;
        y = (i < 2) ? ins : H - ins;
        a = (i % 2 === 0) ? 1 : -1;
        b = (i < 2) ? 1 : -1;
        d = box(d, x - (a < 0 ? len : 0), y - (b < 0 ? tw : 0), len, tw);
        d = box(d, x - (a < 0 ? tw : 0), y - (b < 0 ? len : 0), tw, len);
      }
      trimEl.setAttribute('d', d);
      trimEl.setAttribute('fill-opacity', (P.trim.op * k).toFixed(4));

      /* 套印十字规：四角一枚暖十字，青/桃各错开一像素——
         和地脚线是同一套印刷色差，不新发明颜色。 */
      var r = P.reg.inset, dw = '', dc = '', dm = '';
      function cross(dd, ox, oy) {
        return box(box(dd, ox - arm, oy - P.reg.w / 2, arm * 2, P.reg.w),
                   ox - P.reg.w / 2, oy - arm, P.reg.w, arm * 2);
      }
      for (i = 0; i < 4; i++) {
        x = (i % 2 === 0) ? r : W - r;
        y = (i < 2) ? r : H - r;
        dw = cross(dw, x, y);
        if (!low) {
          dc = cross(dc, x - 1.4, y);
          dm = cross(dm, x + 1.4, y + 1.0);
        }
      }
      regWarm.setAttribute('d', dw);
      regWarm.setAttribute('fill-opacity', (P.reg.op * k).toFixed(4));
      regCyan.setAttribute('d', low ? '' : dc);
      regPink.setAttribute('d', low ? '' : dm);
      regCyan.setAttribute('fill-opacity', (P.reg.op * 0.8).toFixed(4));
      regPink.setAttribute('fill-opacity', (P.reg.op * 0.7).toFixed(4));
    }

    /* 版次尺：跟着镜头滑。一格一短刻、八格一中刻、一幅（48 格）一长刻。
       它是尺子不是进度条——不告诉玩家该往哪走，只告诉他在第几幅。 */
    function paintScale(W, H, cell, x, low) {
      var S = P.scale, y = H * S.y, d = '';
      var left = x - W / 2 / cell, right = x + W / 2 / cell;
      var g0 = Math.floor(left), g1 = Math.ceil(right), g;
      var guard = 0;
      for (g = g0; g <= g1 && guard++ < 800; g++) {
        var sx = W / 2 + (g - x) * cell;
        if (sx < -2 || sx > W + 2) continue;
        var long = g % S.span === 0;
        var mid = !long && g % S.midEvery === 0;
        var h = long ? S.long : (mid ? S.mid : S.short);
        var w = long ? 1.6 : (mid ? 1.2 : 0.8);
        d = box(d, sx, y - h, w, h);
      }
      scaleEl.setAttribute('d', d);
      scaleEl.setAttribute('fill-opacity', (S.op * (low ? 0.45 : 1)).toFixed(4));
    }

    function sync(v) {
      if (v) {
        view.w = v.w || view.w; view.h = v.h || view.h;
        view.cell = v.cell || view.cell; view.x = v.x || 0;
        view.groundY = v.groundY || view.groundY;
        view.now = v.now || 0;
      }
      var W = view.w, H = view.h, low = ctx.score && ctx.score.lowPower ? ctx.score.lowPower() : 0;
      if (!W || !H) return;
      var geom = W + 'x' + H + '|' + low;
      if (geom !== lastGeom) {
        lastGeom = geom;
        paintFiber(W, H, low);
        paintFixed(W, H, low);
      }
      paintScale(W, H, view.cell, view.x, low);

      if (badge && ctx.sim) {
        var st = ctx.sim.state();
        if (st.volume !== lastVol) {
          lastVol = st.volume;
          volEl.textContent = '卷 ' + U.pad(st.volume, 3);
        }
        if (st.panels !== lastNo) {
          lastNo = st.panels;
          noEl.textContent = 'NO. ' + U.pad(st.panels, 4);
        }
        badge.setAttribute('data-volume', String(st.volume));
      }
    }

    var api = { sync: sync, TABLES: P, host: host,
                paths: function () { return { fiber: fiberEl, trim: trimEl,
                                              scale: scaleEl, reg: regWarm }; } };
    ctx.folio = api;
    return api;
  }
});
