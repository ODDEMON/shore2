/* 浮尘 —— 把驱动世界的那群粒子，极淡地印在纸上。
 *
 * 这不是第二套装饰：core/life.js 里相互追逐的十二枚粒子，就是每一笔扰动的来处。
 * 把它们画出来，只是让「系统自己活着」这件事看得见——聚拢时靠得近、会连出
 * 一两丝几乎看不见的线，散开时各走各的。位置直接读粒子场，不插值、不缓存、
 * 不另造运动，所以画面上的呼吸与谱层的呼吸严格是同一口气。
 *
 * 家规：元素一次建好（12 枚方点 + 1 条连线 path），之后只改属性；
 * 不碰 transform / filter / canvas / Math.random；低烈度压到三成，一笔不删。 */
window.BT = window.BT || {};

BT.MOTE_TABLE = {
  color: '#ffffff',
  linkColor: '#00ffff',
  size: [1.2, 2.8],
  op: [0.08, 0.26],
  linkOp: 0.075,
  linkNear: 0.20,
  linkMax: 8,
  top: 0.10,
  bottom: 0.94,
  low: 0.30
};

BT.reg.add({
  id: 'motes',

  mount: function (ctx) {
    var NS = BT.ui.NS, P = BT.MOTE_TABLE;
    var host = document.getElementById('air');
    if (!host || !BT.life) return null;

    var n = BT.life.state().count;
    var dots = [], i;
    for (i = 0; i < n; i++) {
      var e = document.createElementNS(NS, 'rect');
      e.setAttribute('id', 'mt' + i);
      e.setAttribute('fill', P.color);
      e.setAttribute('x', '0'); e.setAttribute('y', '0');
      e.setAttribute('width', '0'); e.setAttribute('height', '0');
      host.appendChild(e);
      dots.push(e);
    }
    var link = document.createElementNS(NS, 'path');
    link.setAttribute('id', 'mtLink');
    link.setAttribute('fill', P.linkColor);
    host.appendChild(link);

    var lastW = 0, lastH = 0;

    function sync(now, W, H, low) {
      if (!W || !H) return;
      lastW = W; lastH = H;
      var ps = BT.life.particles();
      var st = BT.life.state();
      var k = low ? P.low : 1;
      var band = (P.bottom - P.top) * H;
      var i, j, d, x, y, sz, op;
      for (i = 0; i < dots.length; i++) {
        var p = ps[i] || { x: 0, y: 0, vx: 0, vy: 0 };
        x = p.x * W;
        y = P.top * H + p.y * band;
        sz = P.size[0] + (P.size[1] - P.size[0]) * (0.35 + 0.65 * st.cluster);
        op = (P.op[0] + (P.op[1] - P.op[0]) *
              Math.min(1, Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 90)) * k;
        dots[i].setAttribute('x', (x - sz / 2).toFixed(1));
        dots[i].setAttribute('y', (y - sz / 2).toFixed(1));
        dots[i].setAttribute('width', sz.toFixed(1));
        dots[i].setAttribute('height', sz.toFixed(1));
        dots[i].setAttribute('fill-opacity', op.toFixed(4));
      }
      /* 群集时才连：距离够近的一对，一根亚像素细线。最多八根，绝不织成网。 */
      var dd = '', used = 0;
      for (i = 0; i < ps.length && used < P.linkMax; i++) {
        for (j = i + 1; j < ps.length && used < P.linkMax; j++) {
          var dx = ps[j].x - ps[i].x, dy = ps[j].y - ps[i].y;
          if (dx > 0.5) dx -= 1; else if (dx < -0.5) dx += 1;
          if (dy > 0.5) dy -= 1; else if (dy < -0.5) dy += 1;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d >= P.linkNear) continue;
          var x1 = ps[i].x * W, y1 = P.top * H + ps[i].y * band;
          var x2 = ps[i].x * W + dx * W, y2 = P.top * H + (ps[i].y + dy) * band;
          var w = Math.max(0.6, d * 3);
          dd += 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
                'h' + (x2 - x1).toFixed(1) + 'v' + w.toFixed(1) +
                'h' + (x1 - x2).toFixed(1) + 'z';
          used++;
        }
      }
      link.setAttribute('d', low ? '' : dd);
      link.setAttribute('fill-opacity', (P.linkOp * k).toFixed(4));
    }

    var api = { sync: sync, dots: function () { return dots.length; },
                view: function () { return { w: lastW, h: lastH }; }, TABLES: P };
    ctx.motes = api;
    return api;
  }
});
