/* 界标。换界时浮起的一张标题卡，是「册」翻过一叠的那一瞬。
 *
 * 它不打断世界：卡片是 DOM 覆盖层，不吃输入、不进 SVG 绘制链、不暂停长卷。
 * 只用 opacity 淡入淡出，不碰 transform（无头渲染链的死穴）。
 * 时钟由汇流层的 tick(dt) 送，不用 setTimeout——这样无头冒烟里也能走完整条链。
 *
 * 两段式：先出「第 N 界 · 待校」，玩家下了工序指令后换成「第 N 界 · 匀」。
 * 文案全是工序事实，不写判断句、不写情绪，与残页同一副腔调。 */
window.BT = window.BT || {};

BT.reg.add({
  id: 'chapter',

  mount: function (ctx) {
    var U = BT.ui, bus = BT.bus;
    var host = document.getElementById('chapter');
    if (!host) return null;

    var card = U.dom('div', 'ch-card');
    var no = U.dom('div', 'ch-no');
    var rule = U.rule(); rule.className = 'ui-rule ch-rule';
    var name = U.dom('div', 'ch-name');
    var note = U.dom('div', 'ch-note');
    var foot = U.dom('div', 'ch-foot');
    card.appendChild(no); card.appendChild(rule);
    card.appendChild(name); card.appendChild(note); card.appendChild(foot);
    host.appendChild(card);

    var clock = 0, shown = false, cur = null;
    var TABLE = { wait: 2.4, picked: 2.9 };

    function paint(kind, p) {
      var st = ctx.sim ? ctx.sim.state() : { volume: 1, chapter: 1, panels: 0 };
      p = p || {};
      no.textContent = '第 ' + U.pad(p.chapter || st.chapter, 2) + ' 界';
      if (kind === 'pick') {
        name.textContent = (p.name || '匀') + ' · ' + (p.en || 'EVEN');
        note.textContent = p.auto ? '无人落笔 · 沿用上一道工序' : '工序已下 · 下一界照此开印';
      } else {
        name.textContent = '换 界';
        note.textContent = '这一界写完了 · 下一界照此开印';
      }
      foot.textContent = '卷 ' + U.pad(st.volume, 3) + ' / 幅 ' + U.pad(st.panels, 4) +
                         ' · SHORE II';
      cur = { kind: kind, chapter: p.chapter || st.chapter, name: name.textContent };
    }
    function show(kind, p, hold) {
      paint(kind, p);
      card.classList.add('on');
      shown = true;
      clock = hold || TABLE[kind === 'pick' ? 'picked' : 'wait'];
      if (bus) bus.emit('chapter:card', { kind: kind, chapter: cur.chapter });
      return cur;
    }
    function hide() {
      card.classList.remove('on');
      shown = false; clock = 0;
    }
    function tick(dt) {
      if (!shown) return;
      clock -= dt;
      if (clock <= 0) hide();
    }

    if (bus) {
      bus.on('chapter:shift', function (p) { show('wait', p); });
      bus.on('agenda:pick', function (p) { if (p.auto) return; show('pick', p); });
      bus.on('ui:reset-book', function () { hide(); });
    }
    var api = {
      show: show, hide: hide, tick: tick,
      visible: function () { return shown; },
      current: function () { return cur; },
      clock: function () { return clock; },
      TABLE: TABLE
    };
    ctx.chapter = api;
    return api;
  }
});
