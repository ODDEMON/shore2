/* 读数。二代多了资源与册页，但画面上仍然不许长出一块游戏 UI。
 *
 * 左下角一行 10px 等宽字 + 一根 36 格刻度，压在页面原有的地脚留白里；
 * 除此之外什么都不画。它是印在纸边的编号，不是仪表盘。
 * 键位提示只在开卷、或玩家碰过界面之后浮六秒，之后退回无人值守的样子。
 *
 * 规矩：不碰 transform；只改 textContent / class / width；数字变了才写 DOM。 */
window.BT = window.BT || {};

BT.reg.add({
  id: 'hud',

  mount: function (ctx) {
    var U = BT.ui, sim = BT.sim, bus = BT.bus;
    var host = document.getElementById('hud');
    if (!host || !sim) return null;

    var line = U.dom('div', 'hu-line');
    var vol = U.dom('b', 'hu-vol');
    var chap = U.dom('span', 'hu-chap');
    var panel = U.dom('span', 'hu-panel');
    var ink = U.dom('span', 'hu-ink');
    var spec = U.dom('span', 'hu-spec');
    line.appendChild(vol); line.appendChild(chap); line.appendChild(panel);
    line.appendChild(ink); line.appendChild(spec);
    var ticks = U.ticks(0, 36, 36);
    ticks.className = 'ui-ticks hu-ticks';
    var mode = U.dom('div', 'hu-mode', '跟随');
    var hint = U.dom('div', 'hu-hint',
      'TAB 册页 · E 补录 · 1/2/3 工序 · ← → 回望 · C 调音台 · B 低烈度 · F 全屏');
    host.appendChild(line); host.appendChild(ticks);
    host.appendChild(mode); host.appendChild(hint);

    var last = '', hintClock = 0, lastMode = '';

    function sync() {
      var st = sim.state(), m = sim.multipliers();
      var key = [st.volume, st.chapter, st.panels, st.ink, st.inkCap, st.logged.length,
                 m.ink.toFixed(2), m.log.toFixed(2), m.rare.toFixed(2)].join('|');
      if (key === last) return;
      last = key;
      vol.textContent = '卷 ' + U.pad(st.volume, 3);
      chap.textContent = '界 ' + U.pad(st.chapter, 2);
      panel.textContent = '幅 ' + U.pad(st.panels, 4);
      ink.textContent = '墨 ' + U.num(st.ink) + '/' + U.num(st.inkCap) +
                        (st.ink >= st.inkCap ? ' 满' : '');
      spec.textContent = '版样 ' + U.pad(st.logged.length, 2) + '/' + st.pool;
      var cells = ticks.children, i;
      for (i = 0; i < cells.length; i++) cells[i].className = i < st.logged.length ? 'on' : '';
      host.setAttribute('data-ink', String(st.ink));
      host.setAttribute('data-volume', String(st.volume));
      host.title = '倍率 墨 ' + m.ink.toFixed(2) + ' / 录 ' + m.log.toFixed(2) +
                   ' / 孤 ' + m.rare.toFixed(2) + ' · 合计 ' + m.total.toFixed(2);
    }
    function setMode(text) {
      if (text === lastMode) return;
      lastMode = text;
      mode.textContent = text;
      mode.className = 'hu-mode' + (text.indexOf('回望') >= 0 ? ' hu-browse' : '');
    }
    function wake() { hintClock = 6.0; hint.classList.add('on'); }
    function tick(dt) {
      if (hintClock > 0) {
        hintClock -= dt;
        if (hintClock <= 0) hint.classList.remove('on');
      }
    }
    if (bus) {
      bus.on('specimen:logged', function () { sync(); wake(); });
      bus.on('agenda:pick', function () { sync(); wake(); });
      bus.on('ink:gain', function () { sync(); });
      bus.on('chapter:shift', function () { sync(); });
      bus.on('ui:reset-book', function () { sync(); wake(); });
    }
    sync();
    var api = { sync: sync, tick: tick, wake: wake, setMode: setMode,
                hint: function () { return hintClock; },
                line: function () { return line.textContent; } };
    ctx.hud = api;
    return api;
  }
});
