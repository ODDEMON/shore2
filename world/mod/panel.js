/* 调音台。一代留下的那块操作台，二代原样收进一个模块，一件没加：
 * SCHEMA 声明旋钮、PRESETS 注入整套脾气、CAM.modes 给视野档位、音色导入/复位、
 * 全屏开关。六秒无人理会自己收起——展品终究是展品。
 *
 * 二代只改一件事：不再由汇流层直接造 DOM。这里自己建、自己挂（一次）、自己收。
 * 事件委托挂在容器上且只挂一次；重画只换 value 与文本，绝不重复监听。
 * 旋钮的值全部走 score.setKnob（SCHEMA 钳制 + eff 单点收敛），面板不存状态。 */
window.BT = window.BT || {};

BT.reg.add({
  id: 'panel',

  mount: function (ctx) {
    var score = ctx.score, T = BT.SCORE_TABLES;
    var panelEl = document.getElementById('panel');
    if (!score || !panelEl) return null;

    var hideTimer = null;
    function armHide() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { panelEl.hidden = true; hideTimer = null; }, 6000);
    }
    function open() { panelEl.hidden = false; armHide(); }
    function close() {
      panelEl.hidden = true;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }
    function toggle() { if (panelEl.hidden) open(); else close(); return !panelEl.hidden; }
    function syncCam(id) {
      var bs = panelEl.querySelectorAll('.od-c'), i;
      for (i = 0; i < bs.length; i++) {
        bs[i].className = 'od-c' + (bs[i].getAttribute('data-cam') === id ? ' on' : '');
      }
    }
    function syncFs() {
      var bs = panelEl.querySelectorAll('[data-fs]'), i;
      var on = ctx.isFullscreen ? ctx.isFullscreen() : false;
      for (i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function syncOne(s) {
      var inputs = panelEl.querySelectorAll('input[type=range]'), i;
      for (i = 0; i < inputs.length; i++) {
        if (inputs[i].getAttribute('data-k') === s.k) inputs[i].value = String(score.getKnob(s.k));
      }
      var vs = panelEl.querySelectorAll('.od-v');
      for (i = 0; i < vs.length; i++) {
        if (vs[i].getAttribute('data-v') === s.k) vs[i].textContent = score.getKnob(s.k).toFixed(2);
      }
    }
    function syncAll() { T.SCHEMA.forEach(syncOne); }

    function build() {
      var SC = T.SCHEMA, PS = T.PRESETS;
      var camNow = ctx.camMode ? ctx.camMode() : T.CAM.defaultMode;
      var html = '<div class="od-t">扰动 · LIFE</div><div class="od-presets">';
      PS.forEach(function (p) {
        html += '<button class="od-p" data-p="' + p.name + '" title="' + p.note + '">' +
                p.name + '</button>';
      });
      html += '</div><div class="od-cam"><span class="od-k">视野</span>';
      Object.keys(T.CAM.modes).forEach(function (id) {
        var C = T.CAM.modes[id];
        html += '<button class="od-c' + (id === camNow ? ' on' : '') +
                '" data-cam="' + id + '" title="' + C.note + '">' + C.label + '</button>';
      });
      html += '</div>';
      html += '<div class="od-io"><span class="od-k">全屏</span>' +
              '<button class="od-b" data-fs title="进入 / 退出全屏（F）">全屏 · F</button></div>';
      var tc = (ctx.audio && ctx.audio.timbreCount) ? ctx.audio.timbreCount() : 0;
      html += '<div class="od-io"><span class="od-k">音色</span>' +
              '<button class="od-b" id="od-ti" title="导入一个音色 JSON">导入</button>' +
              '<button class="od-b" id="od-tr" title="清掉导入的音色，回到内置五种">复位</button>' +
              '<span class="od-tv" id="od-tn">' + tc + '</span>' +
              '<input id="od-tf" type="file" accept=".json,application/json" hidden></div>';
      SC.forEach(function (s) {
        html += '<div class="od-row"><label>' + s.l + '</label>' +
          '<input type="range" min="' + s.min + '" max="' + s.max + '" step="' + s.step +
          '" data-k="' + s.k + '"><span class="od-v" data-v="' + s.k + '"></span></div>';
      });
      panelEl.innerHTML = html;

      /* 一次委托管住面板里所有控件；容器不重建，不会越重画越多监听。 */
      panelEl.addEventListener('input', function (e) {
        var t = e.target, k = t && t.getAttribute && t.getAttribute('data-k');
        if (!k) return;
        score.setKnob(k, parseFloat(t.value));
        SC.forEach(function (s) { if (s.k === k) syncOne(s); });
        armHide();
      });
      panelEl.addEventListener('click', function (e) {
        var t = e.target, k, p, c;
        while (t && t !== panelEl) {
          p = t.getAttribute && t.getAttribute('data-p');
          c = t.getAttribute && t.getAttribute('data-cam');
          k = t.getAttribute && t.getAttribute('data-k');
          if (p) { if (score.applyPreset(p)) syncAll(); armHide(); return; }
          if (c) { if (ctx.setCamMode) ctx.setCamMode(c); syncCam(c); armHide(); return; }
          if (t.hasAttribute && t.hasAttribute('data-fs')) {
            if (ctx.toggleFullscreen) ctx.toggleFullscreen(); armHide(); return;
          }
          if (k === 'ti' || t.id === 'od-ti') { fileClick(); armHide(); return; }
          if (t.id === 'od-tr') { resetTimbres(); armHide(); return; }
          t = t.parentNode;
        }
      });
      var tIn = panelEl.querySelector('#od-tf');
      var tBtn = panelEl.querySelector('#od-ti');
      var tRst = panelEl.querySelector('#od-tr');
      var tNum = panelEl.querySelector('#od-tn');
      function countTimbres() {
        if (tNum && ctx.audio && ctx.audio.timbreCount) tNum.textContent = ctx.audio.timbreCount();
      }
      function flash(btn, txt) {
        if (!btn) return;
        var old = btn.textContent;
        btn.textContent = txt;
        setTimeout(function () { btn.textContent = old; }, 2200);
      }
      function fileClick() { if (tIn) tIn.click(); }
      function resetTimbres() {
        if (ctx.audio && ctx.audio.clearTimbres) ctx.audio.clearTimbres();
        countTimbres(); flash(tRst, '已复位');
      }
      if (tIn) {
        tIn.addEventListener('change', function () {
          var f = tIn.files && tIn.files[0];
          if (!f) return;
          var rd = new FileReader();
          rd.onload = function () {
            var r = ctx.audio.importTimbres(String(rd.result || ''));
            countTimbres();
            flash(tBtn, r.ok ? '+' + r.added : '读不懂');
            tBtn.title = r.ok ? ('已导入 ' + r.added + ' 个，共 ' + r.total + ' 个')
                              : (r.error || '这个文件里没有能用的音色');
          };
          rd.readAsText(f);
          tIn.value = '';
          armHide();
        });
      }
      syncAll();
      syncFs();
      if (ctx.options && ctx.options.panel) open();
    }

    build();
    var api = { build: build, open: open, close: close, toggle: toggle,
                armHide: armHide, syncCam: syncCam, syncFs: syncFs,
                syncAll: syncAll, visible: function () { return !panelEl.hidden; } };
    ctx.panel = api;
    return api;
  }
});
