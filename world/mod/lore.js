/* 残页。随画卷随机浮现的剧情文本。
 *
 * 这不是字幕，也不是台词：是这座城自己留下来的纸片。长卷每往前走一段，
 * 夜色里就浮起一张，停一会儿，化掉，再换另一张。看的人不必按顺序读——
 * 六七个声部各说各的，其中十三条是「锚点」，多撞见几条，三条暗线会自己咬上：
 *   A 旧层有人没搬走 / B 没有住户的那一层，每月有人去换灯 /
 *   C 岸一直往东长，不是因为东边还有地方。
 * 没有一句写出「孤独」「想念」「悲伤」。情绪只许靠门牌、住户栏、手套、
 * 响的台阶、没填的理由栏自己露出来。作者知道的比写出来的多，纸片才像真的。
 *
 * 家规：扰动只有粒子生命场一处（core/life.js），这里一个都不加，也不另起
 * 一条随机流。选哪张纸、落在哪、停多久，全部由
 * BT.gen.hash(序号 | 幅号 | 事件界) 推出来——是画卷状态的函数，不是第二颗骰子。
 * 对看的人来说是随机，对世界来说是同一条谱。刷新一次，谱就换一条。
 *
 * DOM 池固定一张卡，只换文字与 class，不随世界长大。不碰 transform。
 */
window.BT = window.BT || {};

BT.LORE_TABLES = (function () {
  /* 声部权重 = 展平池里重复几次。无署名最稀：一晚上撞见一两句就够。
     句权重：普通 3 / 锚点 1。锚点太密就不成暗线，成了说明书。 */
  var VOICES = [
    {
      id: 'archive', w: 5, zh: '城市档案', en: 'CITY ARCHIVE', code: 'ARC',
      lines: [
        { t: '本市无竣工日。', anchor: 1 },
        { t: '第 {seq} 次延伸审批。默认通过。' },
        { t: '{floor} 层移交完毕。搬迁通知已发往 0 户。' },
        { t: '第 {old} 层的门牌保留原样。住户栏：留白。', anchor: 1 },
        { t: '图纸上有一处空白，批注写着：先别填。' },
        { t: '问过一次，我们在追什么。回执两个字：继续。', anchor: 1 },
        { t: '今日无新增层。整座城不知道该做什么。', anchor: 1 },
        { t: '照明标准：所有窗，整夜。理由栏未填写。' },
        { t: '旧层不拆除。也不列入维护范围。' },
        { t: '档案从 0 号起。0 号是一张空白单。' }
      ]
    },
    {
      id: 'transit', w: 4, zh: '交通广播', en: 'TRANSIT LOOP', code: 'TRN',
      lines: [
        { t: '请前往最新一层的乘客，不要在旧层下车。', anchor: 1 },
        { t: '重复：不要在旧层下车。' },
        { t: '本班次不返回。本班次不返回。' },
        { t: '广播说今天有风。这里没有风。', anchor: 1 },
        { t: '下一站，{floor} 层。下一站，{floor} 层。下一站——' },
        { t: '请勿倚靠窗。窗外是海，海不动。' },
        { t: '播报中断 3 秒。恢复后没有人提起。' },
        { t: '末班已过。灯按表走，不按人走。' }
      ]
    },
    {
      id: 'child', w: 4, zh: '童声记录', en: 'CHILD / FIELD NOTE', code: 'CHD',
      lines: [
        { t: '我数到 {count} 就乱了。明天从 80 重新数。' },
        { t: '妈妈说旧的那边不要去。可是那边有黄的灯。', anchor: 1 },
        { t: '我把鞋放在门口，回来的时候它还在。' },
        { t: '{floor} 层有一格台阶是响的。我没告诉别人。' },
        { t: '大人说岸会一直长。那它会不会累。' },
        { t: '我画了一张地图，画到一半纸不够了。' },
        { t: '最旧的那一层有一盏是黄的。我数过。', anchor: 1 },
        { t: '船是什么。他们说你不用知道。' }
      ]
    },
    {
      id: 'maint', w: 4, zh: '维修日志', en: 'MAINTENANCE LOG', code: 'MNT',
      lines: [
        { t: '{old} 层的灯又换了。单子照填，住户：零。', anchor: 1 },
        { t: '手套落在 {floor} 层。下个月顺路。' },
        { t: '螺钉不是我们发的那种。谁钉的，我没写进单子。' },
        { t: '今天走了 {count} 层。膝盖记得比表格清楚。' },
        { t: '冷。风从接缝里来，可这层没有窗。' },
        { t: '有人把纸条压在灯座下面，写着：慢一点。' },
        { t: '每月来一次。没人催，也没人问。' },
        { t: '换完灯我坐了一会儿。这句不写在日志里。', anchor: 1 }
      ]
    },
    {
      id: 'ad', w: 3, zh: '招贴', en: 'SHORE PROMOTION', code: 'ADV',
      lines: [
        { t: '新的岸，新的一天。旧的那边也在售。' },
        { t: '一层一户，一户一窗，一窗一整夜的光。' },
        { t: '搬得越新，睡得越好。（不含回望）' },
        { t: '灯为您留着。无论您在哪一层。' },
        { t: '限时：东向新增 {grid} 格，先到先选。' },
        { t: '本广告由 {old} 层赞助。该层暂无住户。', anchor: 1 }
      ]
    },
    {
      id: 'unsigned', w: 1, zh: '未署名', en: 'UNSIGNED', code: '—',
      lines: [
        { t: '它一直往东，不是因为那边有地方。', anchor: 1 },
        { t: '没有海了。岸还在长。', anchor: 1 },
        { t: '最旧的一扇窗，每天早上自己亮。' },
        { t: '灯不是给城里的人亮的。' }
      ]
    }
  ];

  /* 槽位分开给，别让「第 4102 层」这种事发生。旧层单独一档，
     因为 00 / 01 / 02 在这座城里是专有名词，不是随机数。 */
  var SLOTS = {
    floor: ['03', '07', '09', '12', '15', '23', '31', '44'],
    old:   ['00', '01', '02'],
    count: ['12', '28', '41', '66', '88', '103'],
    seq:   ['1204', '2871', '4102', '6009', '8340'],
    grid:  ['4', '6', '9', '12']
  };

  /* 五处落点都避开右上调音台，也避开建筑最密的中间带。
     上沿与雾带是留白区——纸片是印在夜色上的，不是贴在楼上的。 */
  var ANCHORS = ['lo-a', 'lo-b', 'lo-c', 'lo-d', 'lo-e'];

  var TIMING = {
    hold: [5.5, 9.0],      // 一张纸停多久
    gap: [2.5, 5.0],       // 化掉之后空多久
    blank: 0.18,           // 空窗概率：留白也是节奏
    lowGap: 2.2,           // 低烈度：字更少、更暗
    lowBlank: 0.42,
    recent: 10             // 同一事件界内不重复
  };

  return {
    VOICES: VOICES, SLOTS: SLOTS, ANCHORS: ANCHORS, TIMING: TIMING,
    /* 展平一次，之后每次只做一次取模。两级权重都折进这张池。 */
    pool: (function () {
      var out = [];
      VOICES.forEach(function (v) {
        for (var r = 0; r < v.w; r++) {
          v.lines.forEach(function (ln, i) {
            var rep = ln.anchor ? 1 : 3;
            for (var q = 0; q < rep; q++) out.push({ v: v, i: i, ln: ln });
          });
        }
      });
      return out;
    })()
  };
})();

BT.reg.add({
  id: 'lore',

  mount: function (ctx) {
    var T = BT.LORE_TABLES;
    var score = ctx.score;
    var host = document.getElementById('lore');
    /* 自检在最后：世界没挂上、或页面壳没给容器，就什么都不做，
       让画面安静地空着，也不要假装有故事。 */
    if (!score || !host || !BT.gen || !BT.gen.hash) return;

    var card = document.createElement('div');
    card.className = 'lo-card';
    card.innerHTML = '<span class="lo-rule"></span>' +
      '<div class="lo-tag"><b></b><i></i></div>' +
      '<div class="lo-line"></div>' +
      '<div class="lo-foot"></div>';
    host.appendChild(card);
    var tagZh = card.querySelector('.lo-tag b');
    var tagEn = card.querySelector('.lo-tag i');
    var lineEl = card.querySelector('.lo-line');
    var footEl = card.querySelector('.lo-foot');

    var seq = 0;
    var shown = false;
    var clock = 0;
    var recent = [];
    var log = [];
    var lastAnchor = -1;
    var quietFlag = null;

    function h(k) { return BT.gen.hash(String(k)); }
    function unit(k) { return (h(k) % 100000) / 100000; }
    function between(k, rg) { return rg[0] + unit(k) * (rg[1] - rg[0]); }
    function pick(k, arr) { return arr[h(k) % arr.length]; }

    function worldKey(salt) {
      return seq + '|' + score.done() + '|' + score.eventLabel() + '|' +
             score.cur() + '|' + salt;
    }

    /* 当前色板从 halo 反查：halo.bg 就是这一界的夜底，
       拿它去 PALETTE 里认领 plane / ink / line，纸片才跟着城市一起换季。
       第八稿光核退回纸白雾，不再用 neon 反查（那样会永远落回第一套）。 */
    function syncColor(now) {
      var L = score.halo(now || 0);
      var P = score.TABLES.PALETTE[0];
      for (var i = 0; i < score.TABLES.PALETTE.length; i++) {
        if (score.TABLES.PALETTE[i].bg === L.bg) { P = score.TABLES.PALETTE[i]; break; }
      }
      host.style.setProperty('--lore-neon', P.line);
      host.style.setProperty('--lore-paper', P.plane);
      host.style.setProperty('--lore-ink', P.ink);
      host.style.setProperty('--lore-bg', P.bg);
      /* B 键随时能切低烈度，不必等下一张纸才生效。 */
      var q = !!score.lowPower();
      if (q !== quietFlag) {
        quietFlag = q;
        if (q) card.classList.add('lo-quiet');
        else card.classList.remove('lo-quiet');
      }
    }

    function fill(text, key) {
      return text.replace(/\{(\w+)\}/g, function (m, name) {
        var list = T.SLOTS[name];
        if (!list) return m;
        return pick(key + '|' + name + '|' + m + '|' + text.indexOf(m), list);
      });
    }

    function emit(salt) {
      var entry = null;
      var ev = score.eventLabel();
      var k, tries;
      for (tries = 0; tries < 16; tries++) {
        k = worldKey((salt || 'e') + '|' + tries);
        entry = T.pool[h(k) % T.pool.length];
        var key = ev + '|' + entry.v.id + '|' + entry.i;
        if (recent.indexOf(key) < 0) {
          recent.push(key);
          if (recent.length > T.TIMING.recent) recent.shift();
          break;
        }
        entry = null;
      }
      if (!entry) return false;

      /* 落点也走散列，并且不许同上一次：纸片要像在夜色里另找了个地方浮起来。 */
      var cand = [];
      for (var c = 0; c < T.ANCHORS.length; c++) if (c !== lastAnchor) cand.push(c);
      var anchorIdx = cand[h(k + '|pos') % cand.length];
      lastAnchor = anchorIdx;
      quietFlag = !!score.lowPower();
      card.className = 'lo-card ' + T.ANCHORS[anchorIdx] +
                       (entry.ln.anchor ? ' lo-anchor' : '') +
                       (quietFlag ? ' lo-quiet' : '');

      var text = fill(entry.ln.t, k);
      tagZh.textContent = entry.v.zh;
      tagEn.textContent = entry.v.en + ' · ' + entry.v.code;
      lineEl.textContent = text;
      footEl.textContent = 'SHORE / 幅 ' + String(score.done()).padStart(4, '0') +
                           ' · 界 ' + String(ev).padStart(2, '0') +
                           ' / ' + String(h(k + '|no') % 9000 + 1000);
      log.push({ voice: entry.v.id, text: text, panel: score.done(),
                 event: ev, anchor: !!entry.ln.anchor });
      if (log.length > 40) log.shift();
      seq++;
      return true;
    }

    function quiet() { return !!score.lowPower(); }
    function holdLen(k) { return between(k + '|hold', T.TIMING.hold); }
    function gapLen(k) {
      return between(k + '|gap', T.TIMING.gap) * (quiet() ? T.TIMING.lowGap : 1);
    }
    function blankHit(k) {
      return unit(k + '|blank') < (quiet() ? T.TIMING.lowBlank : T.TIMING.blank);
    }

    function show(salt) {
      if (!emit(salt)) return false;
      syncColor(0);
      card.classList.add('on');
      shown = true;
      return true;
    }
    function hide() {
      card.classList.remove('on');
      shown = false;
    }

    var api = {
      /* 预热跑完调一次：首帧就得有字。截图链只给 3.5 秒，等一个
         8 秒的节拍等于交付一张空图，那不是节奏，是失灵。 */
      wake: function () {
        if (!show('first')) return false;
        clock = holdLen(worldKey('first|clock'));
        return true;
      },
      step: function (dt, now) {
        syncColor(now);
        clock -= dt;
        if (clock > 0) return;
        if (shown) {
          hide();
          clock = gapLen(worldKey('off'));
        } else if (blankHit(worldKey('blank'))) {
          clock = gapLen(worldKey('blankwait')) * 0.6;
        } else if (show('tick')) {
          clock = holdLen(worldKey('tick|clock'));
        } else {
          clock = gapLen(worldKey('giveup'));
        }
      },
      current: function () {
        return shown ? { text: lineEl.textContent, voice: tagZh.textContent } : null;
      },
      history: function () { return log.slice(); },
      tables: T,
      shown: function () { return shown; },
      /* 给测试留的确定取景：不消耗时钟，只问「这条纸长什么样」。 */
      renderAt: function (salt) {
        var ok = emit(salt || 'probe');
        syncColor(0);
        card.classList.add('on');
        shown = true;
        return ok ? lineEl.textContent : null;
      }
    };

    ctx.lore = api;
    return api;
  }
});
