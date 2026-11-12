/* 册页。TAB 展开的那一册：录过的版样、这一幅能补录什么、下过的工序。
 *
 * 这是二代「岸不留，册留」的实体。世界每次开卷都换一条，册子却一页一页攒着：
 * 36 枚版样是定死的池子（六构造 × 六色板），录满就是录满，绝不生新条目；
 * 每一枚都记下它是在第几卷第几幅被拾到的——记的是你的行程，不是世界的形状。
 *
 * 结构一次建好：36 格、6 行候选、6 枚工序筹码、4 枚动作按钮，之后只换文字与 class。
 * 事件委托只挂一次（家规：同一容器挂第二次会顶掉第一次，重画绝不多挂监听）。
 * 这里不直接改世界：所有动作经总线喊出去，由汇流层决定怎么落。 */
window.BT = window.BT || {};

BT.reg.add({
  id: 'archive',

  mount: function (ctx) {
    var U = BT.ui, sim = BT.sim, bus = BT.bus;
    var host = document.getElementById('archive');
    if (!host || !sim) return null;
    var POOL = sim.poolSize();

    var sheet = U.dom('div', 'ar-sheet');
    sheet.appendChild(U.head('校样册', 'THE PROOF BOOK', 'TAB 收起'));
    var stats = U.dom('div', 'ar-stats');
    var sVol = U.dom('span'), sPan = U.dom('span'), sInk = U.dom('span');
    var sLog = U.dom('span'), sMul = U.dom('span');
    stats.appendChild(sVol); stats.appendChild(sPan); stats.appendChild(sInk);
    stats.appendChild(sLog); stats.appendChild(sMul);
    sheet.appendChild(stats);
    sheet.appendChild(U.rule());

    var secA = U.dom('div', 'ar-sec', '版样 · 定死的三十六枚');
    var grid = U.dom('div', 'ar-grid');
    var cells = [], i;
    for (i = 0; i < POOL; i++) {
      var c = U.dom('div', 'ar-cell');
      var no = U.dom('span', 'ar-no', U.pad(i + 1, 2));
      var nm = U.dom('span', 'ar-nm', sim.label(i));
      var st = U.dom('span', 'ar-st', '○');
      c.appendChild(no); c.appendChild(nm); c.appendChild(st);
      c.setAttribute('data-id', String(i));
      grid.appendChild(c);
      cells.push({ el: c, no: no, nm: nm, st: st });
    }
    sheet.appendChild(secA); sheet.appendChild(grid);

    var secB = U.dom('div', 'ar-sec', '此幅可补录 · 岸上真的出现过才算');
    var offer = U.dom('div', 'ar-offer');
    var rows = [];
    for (i = 0; i < 6; i++) {
      var r = U.dom('div', 'ar-row');
      var rn = U.dom('span', 'ar-rn', '—');
      var rt = U.dom('span', 'ar-rt');
      var rc = U.dom('span', 'ar-rc');
      var rb = U.button('录', 'log', '花墨补录这一枚');
      rb.className = 'ui-btn ar-log';
      r.appendChild(rn); r.appendChild(rt); r.appendChild(rc); r.appendChild(rb);
      offer.appendChild(r);
      rows.push({ el: r, no: rn, txt: rt, cost: rc, btn: rb });
    }
    var offerEmpty = U.dom('div', 'ar-empty', '这一幅没有新东西了。让岸再往前走一页。');
    offer.appendChild(offerEmpty);
    sheet.appendChild(secB); sheet.appendChild(offer);

    var secC = U.dom('div', 'ar-sec', '工序 · 最近六道');
    var picks = U.dom('div', 'ar-picks');
    var chips = [];
    for (i = 0; i < 6; i++) {
      var ch = U.dom('span', 'ar-chip', '—');
      picks.appendChild(ch); chips.push(ch);
    }
    sheet.appendChild(secC); sheet.appendChild(picks);

    var acts = U.dom('div', 'ar-acts');
    var bLog = U.button('补录首枚 · E', 'log-first', '把此幅第一枚未录入的版样记进册');
    var bRew = U.button('回望 · ←', 'rewind', '退回历史一页，镜头不再跟着笔尖');
    var bRep = U.button('重校', 'reprint', '花墨再要一张校样单');
    var bRst = U.button('清册', 'reset-book', '抹掉全部批注，重新开一册');
    acts.appendChild(bLog); acts.appendChild(bRew); acts.appendChild(bRep); acts.appendChild(bRst);
    sheet.appendChild(acts);
    var foot = U.dom('div', 'ar-foot',
      '岸不留，册留：刷新换一卷新的岸，批注与版样留在这一册里。' +
      '砚台有容量，墨满了会溢出，该花就花。');
    sheet.appendChild(foot);
    host.appendChild(sheet);

    var open = false;

    function refresh() {
      var st = sim.state(), m = sim.multipliers(), all = sim.specimens();
      sVol.textContent = '卷 ' + U.pad(st.volume, 3);
      sPan.textContent = '幅 ' + U.pad(st.panels, 4);
      sInk.textContent = '墨 ' + U.num(st.ink) + ' / ' + U.num(st.inkCap);
      sLog.textContent = '版样 ' + U.pad(st.logged.length, 2) + ' / ' + POOL;
      sMul.textContent = '倍率 ' + m.ink.toFixed(2) + ' / ' + m.log.toFixed(2) +
                         ' / ' + m.rare.toFixed(2) + ' · 合计 ' + m.total.toFixed(2);
      var headRight = sheet.querySelector('.ui-head-right');
      if (headRight) headRight.textContent = '第 ' + U.pad(st.chapter, 2) + ' 界 · TAB 收起';

      for (var j = 0; j < cells.length; j++) {
        var a = all[j], C = cells[j];
        C.el.className = 'ar-cell' + (a.logged ? ' got' : '') + (a.rare ? ' rare' : '');
        C.st.textContent = a.logged ? '●' : (a.rare ? '◇' : '○');
        C.el.title = a.logged && a.entry
          ? ('录于 卷 ' + U.pad(a.entry.volume, 3) + ' / 幅 ' + U.pad(a.entry.panel, 4))
          : (a.rare ? '孤版 · 尚未录入' : '尚未录入');
      }

      /* 候选取自这一幅真实落过的构造；没有新东西就把这一行收起来，
         不塞一枚假的进去凑数。 */
      var snap = ctx.score && ctx.score.finishedSnap ? ctx.score.finishedSnap() : null;
      var list = sim.offer(st.panels, snap).filter(function (o) { return !o.logged; });
      for (j = 0; j < rows.length; j++) {
        var R = rows[j], o = list[j];
        R.el.style.display = o ? '' : 'none';
        if (!o) continue;
        R.no.textContent = U.pad(o.id + 1, 2);
        R.txt.textContent = o.label + (o.rare ? ' · 孤版' : '') +
                           (o.found ? ' · 旧版翻印' : '');
        R.cost.textContent = '墨 ' + o.cost;
        R.btn.setAttribute('data-log', String(o.id));
        R.btn.disabled = st.ink < o.cost;
      }
      offerEmpty.style.display = list.length ? 'none' : '';
      bLog.disabled = !list.length || st.ink < (list[0] ? list[0].cost : 1);

      var last = st.picks.slice(-6), k;
      for (k = 0; k < chips.length; k++) {
        var id = last[k], A = id ? sim.TABLE.agenda[id] : null;
        chips[k].textContent = A ? A.name + ' · ' + A.en : '—';
        chips[k].className = 'ar-chip' + (A ? ' on' : '');
      }
      bRep.disabled = st.ink < sim.costOf('reprint');
      bRew.disabled = st.ink < sim.costOf('rewind');
      host.setAttribute('data-count', String(st.logged.length));
    }

    function show() { open = true; host.hidden = false; refresh(); }
    function hide() { open = false; host.hidden = true; }
    function toggle() { if (open) hide(); else show(); return open; }

    /* 一次委托管住所有按钮：容器不重建，重画只改属性。 */
    host.addEventListener('click', function (e) {
      var t = e.target, k, id;
      while (t && t !== host) {
        id = t.getAttribute && t.getAttribute('data-log');
        if (id !== null && id !== undefined) {
          bus.emit('ui:log-first', { id: parseInt(id, 10) });
          return;
        }
        k = t.getAttribute && t.getAttribute('data-k');
        if (k) {
          if (k === 'log-first') bus.emit('ui:log-first', {});
          else if (k === 'rewind') bus.emit('ui:rewind', {});
          else if (k === 'reprint') bus.emit('ui:reprint', {});
          else if (k === 'reset-book') bus.emit('ui:reset-book', {});
          return;
        }
        t = t.parentNode;
      }
    });
    if (bus) {
      bus.on('specimen:logged', function () { if (open) refresh(); });
      bus.on('agenda:pick', function () { if (open) refresh(); });
      bus.on('ink:gain', function () { if (open) refresh(); });
      bus.on('chapter:shift', function () { if (open) refresh(); });
    }

    var api = { show: show, hide: hide, toggle: toggle, refresh: refresh,
                visible: function () { return open; },
                cells: function () { return cells.length; },
                rows: function () { return rows.length; } };
    ctx.archive = api;
    return api;
  }
});
