/* 谱 · 再版 —— 二代的谱层。
 *
 * 一代的递推、笔序、镜头、色板、五声部，一笔没改；扰动的来源换成了
 * core/life.js 那群互相追逐的粒子——不掷骰子，也不播种子。
 * 二代只向这一层借两个读数口，不往画面里添一个字节：
 *   1. 每幅 build() 完，把这一幅真实落过的构造名与色板号记在 snap 上（motifs / palette）。
 *      册子据此补录版样——是拾取岸上已有的东西，不是另抽一次奖。
 *   2. step() 写完一幅时敲一下 setPanelHook 挂的钩子，演算层据此记账、出校样单。
 *      预热期间钩子还没挂，所以「岸比人先到的那二十幅」不会变成玩家的欠账。
 *
 * 岸不留，册留：刷新即新的一卷，从这一刻重新长起，粒子生命带来的质感不让步。
 */
/* 谱 —— 第十五稿（塔型退场）。世界从零开始，一步一画地长。
 *
 * 第十五稿只做一件事：撤掉「塔型」这一维度。
 * 不再有 SILHOUETTE 表、不再抽签、不再有烧瓶/碑/双柱/门/方台这些
 * 被预先设计好的形状。天际线上不再「选一座塔来盖」，而是只剩两样东西：
 *   · 逻辑自生成——topo 是第 n-1 幅留下的活状态游走出来的天际线，
 *     跨幅连续、随年龄长开、偶发坍缩；它是高度唯一的来源。
 *   · 构建行为主动实现——笔沿 x 一步步走，每一步读一次脚下的活高度，
 *     把「上一笔留下的高度」朝它推一下，就地落一块；不落也是一次决定。
 * 于是高矮来自递推，宽窄来自这一步走了多远，空来自笔的停顿，
 * 块与块之间的墨线就是每一次建造留下的接缝。形状是行为的残迹，
 * 不是从目录里被选中的物件——这正是「自生成」的定义在形体上的落实。
 *
 * 第十稿的遗产（SILHOUETTE 剪影表）整体退役；CROWN 不再是塔型的属性，
 * 只由活状态触发。模块层、对称算子、正多面体、谱线、事件、镜头一件不拆。
 *
 * 第十一稿的遗产：正多边形与正多面体一气呵成、不带顶点节点、频率大幅降低。
 *
 * 手段全部在表上（改数据不改代码）：
 * 1. MOTIF 收敛到六件极简构造（monolith / aperture / slab / beacon / bar / void），
 *    每件 ≤2 笔；十三个繁复构件退役。
 * 2. RULE 拍宽放大到 12–16 格（一幅只有 3–4 个位置）、层数压到二、
 *    fill 从 0.76–0.92 砍到 0.14–0.34——留白成为主角。
 * 3. 塔身没有配方，只有笔：每一步一块，块数由笔走了几步决定；
 *    帽线是走完一段后在最高处划的一条记号。空就是构图。
 * 4. 速度放慢近一倍：tempo 下移、interval 上移、光晕呼吸减半。
 * 5. 罗塞塔、谱线、天际线递推、干扰、事件、旋钮、跟随镜头、残页文字一件不拆——
 *    残页是这一稿唯一明令保留的「杂」，因为它本来就是展签。
 *
 * 职责边界：这一层只做「递推」与「落笔」。core/ 只送时间，world/script.js 只管看，
 * 渲染一律在这里算成屏幕坐标。谁都不替别人决定该长什么样。
 *
 * 自生成的定义：第 n 幅不是从「种子|n」查出来的，是第 n-1 幅留下的活状态，
 * 被此刻从粒子生命场里读出的扰动推了一下之后自己写出来的。
 * 因果在自己身上，不在种子上。
 * 没有可分享的地址，没有「同一个种子原样重现」这回事。
 * 已经写下的幅立即冻结成历史——历史不能改，否则画面会闪；未来不许预知。
 *
 * 第四稿的三个新公理：
 * 1. 墙死了。横贯整幅的巨墙是一次盖完的，没有演进感。塔体改由天际线递推：
 *    每列高度从上一列游走而来（跨幅边界直接接续，画卷因此是连续的），
 *    生长偏置随年龄从零爬起（世界从零开始一步步扩大化），
 *    上限 crest 是一个慢漂移的干扰项（时代起落，天际线跟着起落），偶发坍缩。
 * 2. 谱线。几根贯穿全幅的暗横线，是乐谱的五线，也是塔体的地平层——
 *    形似乐谱、画卷与巨型建筑，靠的是结构而不是比喻。
 * 3. 扰动的脾气可手动调节。SCHEMA 声明控件，KNOBS 声明每个旋钮拧的是干扰的哪根筋，
 *    PRESETS 是三套命名的脾气。结构同 oddemon-typo：表驱动，eff() 单点收敛。
 *
 * 第五稿只换三件事：色彩（近黑夜底 + 纸白巨面 + 高饱和霓虹）、
 * 建筑几何（旋转对称环形站）、绘本墨线（统一粗描边、圆头转角）。
 *
 * 第六稿按评审撤回「四型参数化尖顶 + 每塔强制收尖」。建筑语汇改成
 * 扁平化远未来：CROWN 四型平顶冠（悬挑 / 圆盘 / 退台 / 悬浮环，可选不强制）、
 * 塔身水平带状窗与肩部光带、模块层的舱 / 环甲板 / 天桥 / 光带，
 * 罗塞塔与星塔的放射尖刃改四点宽扁舱段——靠水平延展、分层与悬浮缝成立，
 * 不靠向上收束的剪影锐度。递推、镜头、笔序、面板、缓存、窗口机制一律冻结不动。
 *
 * 为什么所有笔必须显示：V 是可见的暗实体；远景只往底色混一点；
 * 越界笔回卷后夹紧不丢；光带只提亮；签名位降级不删笔；细线有 1.15px 下限。
 * 五处静默失效的出处见 README 第 4 节。
 *
 * 为什么不碰 transform：Edge 无头对带 transform 的 SVG 元素整幅静默不画，不报错。
 * 屏幕坐标当场算进 path 的 d 里；正多边形顶点用 cos/sin 现算写成点列。
 */
window.BT = window.BT || {};

/* ---- 表。改数据不改代码，全部参数只有 eff() 一个取值口。 ---- */
BT.SCORE_TABLES = (function () {
  var SPAN = 48;          // 一幅的宽度，格
  var CEIL = 45;          // 构成的上界，格
  var MINPX = 1.15;       // 细线的最小屏幕宽度：低于一像素的笔等于没画
  var GROWPX = 4;         // 每笔辉光衬底向外膨胀的像素
  var MAXHISTORY = 4096;  // 冻结的历史幅数上界；世界向右无限，内存不无限

  var DEFAULTS = {
    density: 1, beat: 1, layers: 3, contrast: 1, flash: 1, glow: 1,
    impulse: 1, viscosity: 0.5, eventRate: 1, gust: 0.5,
    lowPower: 0
  };
  var LOWCAP = {
    density: 0.55, layers: 2, contrast: 0.55, flash: 0, glow: 0.32,
    impulse: 0.6, gust: 0.3, eventRate: 0.7
  };

  /* 扰动旋钮。SCHEMA 是控件声明（k/l/min/max/step），面板由它生成；
     KNOBS 声明每个旋钮拧的是粒子群扰动的哪一根筋；PRESETS 是三套命名的脾气。
     拧的是场的脾气，不是「随机数大小」——二代一处骰子都没有。
     写法同 oddemon-typo：SCHEMA 生成控件、PRESETS 注入整套参数、eff() 单点收敛。 */
  var SCHEMA = [
    { k: 'impulse',   l: '干扰', min: 0,   max: 2,   step: 0.05 },
    { k: 'viscosity', l: '黏度', min: 0,   max: 1,   step: 0.05 },
    { k: 'eventRate', l: '事件', min: 0.2, max: 3,   step: 0.05 },
    { k: 'gust',      l: '阵风', min: 0,   max: 1,   step: 0.05 }
  ];
  var KNOBS = {
    impulse:   { jitter: 2.4 },    // 干扰：吸引子改写概率、每幅抖动、张力累积同乘——拧到 0 世界冻结
    viscosity: { keep: 0.24 },     // 黏度：keep 加上 (v-0.5)×此值；crest 等慢项豁免
    eventRate: { threshold: 0.75 },// 事件：阈值除以 (0.35 + v)，越大事件越勤
    gust:      { driftKick: 1.0 }  // 阵风：相位漂移的注入幅度乘 (0.2 + v×1.6)
  };
  var PRESETS = [
    { name: '平', note: '干扰低、黏度高：世界几乎不动声色',
      params: { impulse: 0.35, viscosity: 0.85, eventRate: 0.5, gust: 0.25 } },
    { name: '涌', note: '默认：有惯性的漂移与偶尔的事件',
      params: { impulse: 1, viscosity: 0.5, eventRate: 1, gust: 0.5 } },
    { name: '乱', note: '干扰拉满：参数翻飞，事件频繁',
      params: { impulse: 1.8, viscosity: 0.15, eventRate: 2.4, gust: 0.9 } }
  ];

  function rgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hex2(c) {
    return '#' + c.map(function (x) {
      var v = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return ('0' + v).slice(-2);
    }).join('');
  }
  /* 往底色混，而不是整体压暗：色相留住，明度层级也留住。 */
  function mix(a, b, t) {
    var A = rgb(a), B = rgb(b);
    return hex2([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }

  /* 电波版：色板的唯一来源在 world/mod/denpa-tables.js 的 BT.DENPA_PALETTE，
     这里不抄第二份。明度结构沿用一代——极深的底、一面近荧光白的体量、
     一根更亮的骨线——只是把色相换成纯色硬撞，把间距拉到最大。
     暖纸六套改名 PALETTE_PAPER 留档，一行即可切回，不删历史；
     PALETTE_NEON 是第七稿的另一份存档，同样保留。 */
  var PALETTE_PAPER = [
    { name: 'MONUMENT',  bg: '#0b0f11', deep: '#1a2226', plane: '#cfd3cb', line: '#e2e5de', accent: '#a98f5f', glow: '#e9e7dc', haze: '#232e30', ink: '#080b0d', neon: '#c7b48a', neon2: '#b7c6c9' },
    { name: 'NAUTILUS',  bg: '#0a0f0e', deep: '#1b2825', plane: '#c6c2ab', line: '#dcdad0', accent: '#8a7a52', glow: '#e6ddc4', haze: '#1f2c28', ink: '#070b0a', neon: '#b5a680', neon2: '#a9c2b8' },
    { name: 'MIST',      bg: '#0b0f12', deep: '#1a252c', plane: '#c8d2d6', line: '#dfe6ea', accent: '#7f97a3', glow: '#e2ebef', haze: '#202c32', ink: '#080b0e', neon: '#a9bfc9', neon2: '#c2b9d2' },
    { name: 'MOSS',      bg: '#0a0f0c', deep: '#1a261f', plane: '#c2cabb', line: '#dce2d5', accent: '#7e9271', glow: '#e4ead9', haze: '#1f2a22', ink: '#070b08', neon: '#a9bda0', neon2: '#c8bb9e' },
    { name: 'DUNE',      bg: '#0e0c09', deep: '#242019', plane: '#d2c8b2', line: '#e7dfcf', accent: '#a3854f', glow: '#f0e6d2', haze: '#2a261c', ink: '#0a0806', neon: '#c8ae7e', neon2: '#b9abbf' },
    { name: 'AURA',      bg: '#0c0b0f', deep: '#201d28', plane: '#cbc8d4', line: '#e3e1e9', accent: '#9286a0', glow: '#ebe8f2', haze: '#242030', ink: '#08070a', neon: '#b7aac4', neon2: '#a9b6c9' }
  ];
  var PALETTE = BT.DENPA_PALETTE;
  var PALETTE_NEON = [
    { name: 'TOY GRID',   bg: '#0b0719', deep: '#2a1250', plane: '#fff3d6', line: '#fffaf0', accent: '#00e5ff', glow: '#fff6c9', haze: '#1b0f3a', ink: '#120726', neon: '#00e5ff', neon2: '#ff3ea5' },
    { name: 'CANDY GRID', bg: '#120720', deep: '#3b1042', plane: '#ffe9f3', line: '#fff4fa', accent: '#ff3ea5', glow: '#fff0b8', haze: '#2a0c33', ink: '#160725', neon: '#ff3ea5', neon2: '#d9ff42' },
    { name: 'ACID CITY',  bg: '#08130f', deep: '#123a2c', plane: '#f2ffdc', line: '#f9fff0', accent: '#b6ff2e', glow: '#f6ffd0', haze: '#0d2a20', ink: '#06150f', neon: '#b6ff2e', neon2: '#00e5ff' },
    { name: 'VIOLET LOOP',bg: '#0d0718', deep: '#301554', plane: '#f3e8ff', line: '#fbf4ff', accent: '#a13aff', glow: '#ffe9c2', haze: '#1d0d38', ink: '#10051f', neon: '#a13aff', neon2: '#ff8a3d' },
    { name: 'SODA POP',   bg: '#140a10', deep: '#43182a', plane: '#fff0dc', line: '#fff8ee', accent: '#ff8a3d', glow: '#fff2c0', haze: '#2c101f', ink: '#1a0810', neon: '#ff8a3d', neon2: '#00e5ff' },
    { name: 'BUBBLEGUM',  bg: '#100818', deep: '#3a1246', plane: '#ffe6f7', line: '#fff2fb', accent: '#ff40cc', glow: '#fff0d4', haze: '#260d33', ink: '#160621', neon: '#ff40cc', neon2: '#8a5cff' }
  ];

  /* 墨线开关。第一版没有统一粗描边，块面靠明度硬切；enable=0 时
     inkWidth() 直接归零，flush() 把描边全部关掉，代码路径原样保留。 */
  var INK = { enable: 0, min: 2.0, max: 4.5, ratio: 0.30 };

  /* 短横线治理表。这是「太多」的可执行定义：
     高 < maxH 格、宽高比 > minRatio、宽 < SPAN*maxW 的矩形笔＝短横线
     （点列环形构件、谱线、全幅横带都不算）。
     budget 是每幅允许保留的条数，取第一版实测的 21.2 条/幅再放一格余量；
     超出的就地转成体量块：加厚到 blockH、收宽到 blockW、去掉自发光。
     不删笔、不改笔数——「保留当前复杂度」是硬约束，不是形容词。 */
  var V1BAR = {
    maxH: 0.55, minRatio: 8, maxW: 0.9,
    budget: 10, blockH: 1.05, blockW: 3.2, keepGlow: 0
  };

  /* 远未来冠部四型。第九稿极简化：冠就是「一块比塔宽的悬浮厚板」——
     无限宫院式的漂浮体量。saucer / halo 最多两层；不再有舷窗、收边、支座。
     ow = 冠宽相对塔宽的倍数，tiers = 层数，rise = 冠总高，gap = 层间悬浮缝。 */
  var CROWN = {
    cantilever: { ow: 1.55, tiers: 1, rise: 1.2, gap: 0,    flare: 0,     neon: 1 },
    saucer:     { ow: 1.35, tiers: 2, rise: 2.2, gap: 0.55, flare: 0.18,  neon: 2 },
    setback:    { ow: 1.12, tiers: 1, rise: 1.0, gap: 0,    flare: -0.18, neon: 1 },
    halo:       { ow: 1.70, tiers: 2, rise: 2.2, gap: 0.72, flare: 0.10,  neon: 2 }
  };

  /* 远景表在启动时一次算好，不进逐笔循环。 */
  var FAR = PALETTE.map(function (P) {
    return {
      S: mix(P.line, P.bg, 0.20), M: mix(P.plane, P.bg, 0.24),
      A: mix(P.accent, P.bg, 0.26), V: mix(P.deep, P.bg, 0.12)
    };
  });
  var FAR_LOW = PALETTE.map(function (P) {
    return {
      S: mix(P.line, P.bg, 0.36), M: mix(P.plane, P.bg, 0.40),
      A: mix(P.accent, P.bg, 0.42), V: mix(P.deep, P.bg, 0.20)
    };
  });

  /* 极简构造语汇。局部坐标 12×12，每项 [dx,dy,w,h,role]。
     第九稿：十三个繁复构件退役，只留六件——每件 ≤2 笔，全部是大块面或单根杠。
     「极简」不是没有设计：monolith 的门洞、aperture 的窗、slab 的孤点，
     是 Still Life 静物画里那一件被光照着的东西。
     结构参照：Superstudio《Continuous Monument》的整块碑、
     《无限宫院》的漂浮巨构、PPT 封面的「一块面 + 一根线 + 一个点」。
     grille / continuous / capsule / spine / terrace / horizon / pod /
     ringdeck / skybridge / ribbon 十件繁复语汇存档于 git 历史，不再入表。 */
  var MOTIF = {
    monolith:   [[0, 0, 12, 9, 'M'], [5.2, 0, 1.6, 4.6, 'V']],
    aperture:   [[0, 0, 12, 10, 'M'], [5.2, 0, 1.6, 5, 'V']],
    slab:       [[0, 0, 12, 6, 'M'], [8.6, 2.2, 0.9, 0.9, 'A']],
    beacon:     [[2.6, 3.4, 0.7, 0.7, 'A'], [8.2, 7.4, 0.5, 0.5, 'A']],
    bar:        [[0, 4.2, 12, 0.8, 'S']],
    void:       []
  };

  /* 构成法则。第九稿：拍宽 12–16（一幅只有 3–4 个位置）、两层、
     fill 0.14–0.34——留白是主角，一幅一个主角。sym 是右半幅的对称算子；
     塔体（天际线）是对称之外的独立声部，不参与镜像——它有自己的因果。 */
  var RULE = {
    monument: {
      beat: 14, sym: 'mirror', stagger: false,
      layers: [
        { band: [0, 20], motifs: ['monolith', 'aperture'], fill: 0.34 },
        { band: [20, 40], motifs: ['slab', 'beacon'], fill: 0.22 }
      ]
    },
    continuous: {
      beat: 16, sym: 'repeat', stagger: false,
      layers: [
        { band: [0, 20], motifs: ['bar', 'slab'], fill: 0.30 },
        { band: [20, 40], motifs: ['beacon', 'void'], fill: 0.18 }
      ]
    },
    plug: {
      beat: 15, sym: 'stagger', stagger: true,
      layers: [
        { band: [0, 20], motifs: ['aperture', 'beacon'], fill: 0.28 },
        { band: [20, 40], motifs: ['slab', 'void'], fill: 0.20 }
      ]
    },
    still: {
      beat: 16, sym: 'repeat', stagger: false,
      layers: [
        { band: [0, 20], motifs: ['void', 'slab'], fill: 0.14 },
        { band: [20, 40], motifs: ['void', 'beacon'], fill: 0.12 }
      ]
    },
    axis: {
      beat: 14, sym: 'cross', stagger: false,
      layers: [
        { band: [0, 20], motifs: ['monolith', 'bar'], fill: 0.28 },
        { band: [20, 40], motifs: ['slab', 'void'], fill: 0.18 }
      ]
    },
    /* 旋转对称环形站仍是主景：一幅只此一件，正好是极简构图的中心。 */
    radiant: {
      beat: 12, sym: 'radial', stagger: false,
      layers: [
        { band: [0, 20], motifs: ['slab', 'beacon'], fill: 0.30 },
        { band: [20, 40], motifs: ['bar', 'void'], fill: 0.16 }
      ]
    }
  };

  /* 生长表。塔体从零开始：ageFull 幅内从近空白长到全密度；
     crest 在 NOISE 里慢漂（时代上限）；每列游走 + 生长 + 偶发坍缩。
     staff 是谱线的高度——形似乐谱的那几根横线。它只喂给背景层，
     不进笔画流：谱线是预先铺好的纸，不是被光标写出来的笔。
     act 里放的是「构建行为的尺度」，不是形状：笔每一步走多远（相对拍宽）、
     把上一笔高度朝活高度推多少、走完一段划多厚的记号、要不要多点一个点。
     表里没有一个具名形状，所以塔型这一维度无处可藏。 */
  var GROWTH = {
    ageFull: 64,           // 前 64 幅从零长到全密度
    rise: [0.16, 0.82],    // 每列每幅的期望生长量，格
    walk: 2.8,             // 相邻列的游走幅度（画卷的起伏）
    collapse: 0.035,       // 每列坍缩概率
    collapseDepth: [2, 9], // 坍缩掉多少格
    staff: [9, 18, 27, 36],// 谱线
    act: {
      step:  [0.14, 0.42],  // 笔每一步走多远 = 拍宽 × 此区间
      pull:  [0.35, 0.95],  // 把「上一笔留下的高度」朝活高度推多少
      wander: 0.50,         // 笔自己的游走，× GROWTH.walk
      cap:   0.30,          // 段末那条水平记号的厚度
      dot:   0.14,          // 高处偶尔多点一个点的概率
      crown: 0.34           // 活状态触发悬浮板的概率（不再是塔型的属性）
    }
  };

  /* 声部表。每一层都不是一段写好的旋律，而是一条「怎么唱」的偏移：
     shift 是音阶上的度数偏移（不是半音——所以换调式时它自动跟着走），
     oct 是八度偏移，every 是每几笔唱一次，gain 是相对音量。
     主旋律每笔都唱，它是笔的呼吸本身；另外四层是它身后的房间。
     五层共用同一个 deg，只是从同一个音往上/往下取音阶里的音，
     所以永远协和：三度是音阶里的第三格，不是半音。 */
  var VOICE = {
    lead: { shift: 0, oct: 0,  every: 1,  gain: 1.00 },
    harm: { shift: 2, oct: 0,  every: 3,  gain: 0.50 },   // 三度叠置
    arp:  { shift: 4, oct: 1,  every: 5,  gain: 0.30 },   // 五度琶音，略晚起
    bass: { shift: 0, oct: -2, every: 7,  gain: 0.85 },   // 低音，落在主音上
    shim: { shift: 6, oct: 1,  every: 13, gain: 0.45 }    // 泛音闪光
  };

  /* 乐句。一幅一句：形状按幅号抽定，句内每 seg 笔推一格，
     推到末格时加一次 turn（转折）——于是同一句重复也不会一模一样，
     而且每句都有收束，不是永远往上爬。形状是「相对起点的度数走势」，
     套在任何调式上都成立，所以它不是旋律，是一支笔的姿态。 */
  var PHRASE = {
    seg: 4,
    shapes: [
      [0, 1, 2, 3, 2, 1],      // 拱
      [0, 0, 1, 1, 2, 3],      // 梯
      [0, 2, -1, 1, -2, 0],    // 摆
      [0, 1, 0, -1, 0, 1],     // 恋
      [0, 2, 4, 2, 5, 3],      // 螺旋
      [0, -1, 0, -2, 0, 0]     // 静
    ],
    turn: [0, 1, 0, -1, 1, 0]
  };

  /* 视口。preheatPanels 很小：世界必须真的从零开始，
     开卷那几幅近空白是构图的一部分，不是没画完。 */
  var VIEW = { preheat: 24, preheatPanels: 20, maxFF: 3600 };

  /* 视野。相机不再按「写完的幅」整幅整幅地跳，而是锁住生成前沿。
     anchor：笔尖固定在屏幕宽度的这个比例处（右侧留出的空，是还没长出来的未来）。
     modes 是三档跟随方式，offset 是相对前沿的额外偏移，单位格，负 = 回望历史。
     snap=1 就是「完美跟随」：每帧硬锁定，零滞后、零稳态误差、无台阶。
     相机属于「看」，档位状态放在汇流层；表在这里，改数据不改代码。 */
  var CAM = {
    anchor: 0.84,
    defaultMode: 'perfect',
    modes: {
      perfect: { label: '跟随', note: '镜头硬锁定笔尖，零滞后', snap: 1, ease: 0, offset: 0 },
      ease:    { label: '缓冲', note: '带一点惯性的跟随',       snap: 0, ease: 4.5, offset: 0 },
      rewind:  { label: '回望', note: '镜头退后两幅，只看历史', snap: 0, ease: 1.4, offset: -SPAN * 2 }
    }
  };

  /* 干扰表。crest 带 slow 标记：黏度旋钮不许拧它，否则时代的轴会被拧断。 */
  var NOISE = {
    density: { lo: 0.60, hi: 1.10, keep: 0.88, jitter: 0.10 },
    beat:    { lo: 0.62, hi: 1.24, keep: 0.90, jitter: 0.08 },
    layers:  { lo: 2,    hi: 3,    keep: 0.93, jitter: 0.06 },
    drift:   { lo: -1,   hi: 1,    keep: 0.90, jitter: 0.18 },
    light:   { lo: 0.30, hi: 1.00, keep: 0.84, jitter: 0.14 },
    haloR:   { lo: 0.42, hi: 1.30, keep: 0.86, jitter: 0.12 },
    haloS:   { lo: 0.34, hi: 1.00, keep: 0.85, jitter: 0.14 },
    glowX:   { lo: 0.14, hi: 0.86, keep: 0.80, jitter: 0.16 },
    glowY:   { lo: 0.20, hi: 0.80, keep: 0.80, jitter: 0.16 },
    tempo:   { lo: 0.45, hi: 0.85, keep: 0.91, jitter: 0.08 },
    solid:   { lo: 0.013, hi: 0.031, keep: 0.88, jitter: 0.06 },
    crest:   { lo: 16,   hi: 40,   keep: 0.996, jitter: 0.012, slow: 1 }
  };

  /* 事件换界时一次性重掷的离散参数与全局突变强度。 */
  var EVENT = {
    tensionGain: [0.30, 1.15],
    driftGain: 0.35,
    threshold: [12, 38],
    paletteKick: 0.30,
    lightBandChance: 0.70
  };

  /* 光表。第十七稿把「光晕」整个换掉了：
     背景的灯不再是一堆浮在纸面上的圆斑（圆斑落在纸上就是水渍），
     而是**建筑站的那条地平线上的一排远处的灯**——光只在有东西的地方。
     构成：一条压在 0.88H 的宽光带（垂直渐变）+ 三层极扁的灯带（软晕 + 亮芯）。
     rise 是光带峰值浓度，bars 是灯带层数上限，
     spread 是灯带横向半径（相对屏宽），breathe 是呼吸频率（越小越慢），
     bloom 是建筑辉光衬底的强度，veil 是上下雾带的浓度。 */
  var HALO = {
    /* 电波版撤掉钠灯：暖橙会把纯黑底染成棕，七色就全脏了。
       光穹与光带直接吃事件主霓虹，给画面一大片纯色，不只给建筑。 */
    rise: 0.42,
    bars: 3,
    spread: 0.72,
    spreadGrow: 0.10,
    dome: 0.48,        // 光穹：一枚极宽极扁的椭圆，圆心压在地平线上
    domeRx: 1.06,      // 相对屏宽
    domeRy: 0.38,      // 相对屏高
    warm: '#ffffff',
    hue: 1.0,          // 1 = 纯霓虹，0 = 纯白
    breathe: 0.14,
    bloom: 0.10,
    veil: 0.08
  };

  var MODES = [
    [0, 2, 4, 7, 9], [0, 2, 3, 7, 8], [0, 1, 5, 7, 8],
    [0, 2, 4, 6, 9], [0, 3, 5, 6, 7, 10], [0, 2, 4, 7, 11]
  ];
  var CONTOURS = [
    [0, 1, 2, 1], [0, 2, 1, 3], [2, 1, 0, 2],
    [0, 1, 0, 3], [3, 1, 2, 0], [1, 0, 3, 1]
  ];
  /* 五种柏拉图立体的单位顶点。棱由代码推导：两两距离的最小值即棱长，
     等于棱长的顶点对相连——表里只放顶点，不手写三十条棱。
     tetra/cube/octa 常见，dodeca/icosa 稀有（dreamlike 的深处才出现）。 */
  var PHI = (1 + Math.sqrt(5)) / 2;
  var SOLIDS = {
    tetra:  { rare: 0, v: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]] },
    cube:   { rare: 0, v: [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
                           [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]] },
    octa:   { rare: 0, v: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] },
    dodeca: { rare: 1, v: [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
                           [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1],
                           [0, -1 / PHI, -PHI], [0, 1 / PHI, -PHI], [0, -1 / PHI, PHI], [0, 1 / PHI, PHI],
                           [-1 / PHI, -PHI, 0], [1 / PHI, -PHI, 0], [-1 / PHI, PHI, 0], [1 / PHI, PHI, 0],
                           [-PHI, 0, -1 / PHI], [PHI, 0, -1 / PHI], [-PHI, 0, 1 / PHI], [PHI, 0, 1 / PHI]] },
    icosa:  { rare: 1, v: [[0, -1, -PHI], [0, -1, PHI], [0, 1, -PHI], [0, 1, PHI],
                           [-1, -PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [1, PHI, 0],
                           [-PHI, 0, -1], [-PHI, 0, 1], [PHI, 0, -1], [PHI, 0, 1]] }
  };
  /* 归一化到单位外接球，棱推导一次。min 距离按每个立体单独求——
     不同立体的棱长不同，混用全局最小值会让大棱长的立体一条棱都连不上。 */
  (function () {
    var id, S, vs, i, j, min, d;
    var EDGE_EPS = 1e-6;
    function len3(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); }
    for (id in SOLIDS) if (SOLIDS.hasOwnProperty(id)) {
      S = SOLIDS[id]; vs = S.v;
      for (i = 0; i < vs.length; i++) {
        d = len3(vs[i]);
        vs[i] = [vs[i][0] / d, vs[i][1] / d, vs[i][2] / d];
      }
      min = Infinity;
      for (i = 0; i < vs.length; i++) for (j = i + 1; j < vs.length; j++) {
        d = len3([vs[i][0] - vs[j][0], vs[i][1] - vs[j][1], vs[i][2] - vs[j][2]]);
        if (d < min) min = d;
      }
      S.edges = [];
      for (i = 0; i < vs.length; i++) for (j = i + 1; j < vs.length; j++) {
        d = len3([vs[i][0] - vs[j][0], vs[i][1] - vs[j][1], vs[i][2] - vs[j][2]]);
        if (d < min + EDGE_EPS) S.edges.push([i, j]);
      }
    }
  })();

  /* 第十五稿：这里原本是 SILHOUETTE 剪影表（烧瓶/碑/双柱/台阶/门/方台）。
     整张表连同抽签一起撤掉——「塔型」不再是一个维度。塔体没有形状可选，
     只有 GROWTH.act 里那几个「笔怎么走」的尺度：高度由 topo 递推给出，
     块数由笔走了几步给出，空由笔的停顿给出。形状是行为的残迹。 */

  return {
    SPAN: SPAN, CEIL: CEIL, MINPX: MINPX, GROWPX: GROWPX, MAXHISTORY: MAXHISTORY,
    DEFAULTS: DEFAULTS, LOWCAP: LOWCAP,
    SCHEMA: SCHEMA, KNOBS: KNOBS, PRESETS: PRESETS,
    PALETTE: PALETTE, PALETTE_PAPER: PALETTE_PAPER,
    PALETTE_NEON: PALETTE_NEON, INK: INK, V1BAR: V1BAR,
    FAR: FAR, FAR_LOW: FAR_LOW,
    MOTIF: MOTIF, CROWN: CROWN, RULE: RULE, GROWTH: GROWTH, VIEW: VIEW, CAM: CAM,
    VOICE: VOICE, PHRASE: PHRASE,
    NOISE: NOISE, EVENT: EVENT, HALO: HALO,
    MODES: MODES, CONTOURS: CONTOURS, SOLIDS: SOLIDS,
    mix: mix
  };
})();

BT.reg.add({
  id: 'score',

  mount: function (ctx) {
    var T = BT.SCORE_TABLES;
    var NS = 'http://www.w3.org/2000/svg';
    var state = {};
    var onPanelHook = null;
    var d;
    for (d in T.DEFAULTS) if (T.DEFAULTS.hasOwnProperty(d)) state[d] = T.DEFAULTS[d];
    if (ctx.options && ctx.options.lowPower) state.lowPower = 1;

    /* 单点收敛。要加限制，改 LOWCAP 这张表，不去改十几处判断。 */
    function eff(k) {
      var v = state[k];
      if (state.lowPower && T.LOWCAP[k] !== undefined && typeof v === 'number') {
        return Math.min(v, T.LOWCAP[k]);
      }
      return v;
    }

    var SPAN = T.SPAN, CEIL = T.CEIL, PAL = T.PALETTE;
    function wrap(v, len) { return ((v % len) + len) % len; }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function lerp(rg, t) { return rg[0] + (rg[1] - rg[0]) * t; }
    /* 扰动入口：全世界只有这一处。它不掷骰子，也不查种子，
       只从那群正在相互追逐的粒子里读一个此刻的数。 */
    function noise() { return BT.life.next(); }

    /* ---- 色板颜色的轻微浮动。每个事件落地给自己抽一组亮度/饱和度/对比度偏移，
       亮度 ±0.03（克制），饱和与对比度放宽到 ±0.11：梦的色温不是死的，
       同色板每次出现都更有差别，但绝不脏。 ---- */
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }
    function hex2rgbv(hex) {
      var n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    /* 抖动只在终点作用：hex 拆 HSL，加亮度、乘饱和度、绕中灰推对比，再合回 hex。 */
    function rgb2hsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
      if (d !== 0) {
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (mx === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
      }
      return [h, s, l];
    }
    function hsl2rgb(h, s, l) {
      var r, g, b;
      if (s === 0) { r = g = b = l; }
      else {
        function hue(p, q, t) {
          if (t < 0) t += 1; if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        r = hue(p, q, h + 1 / 3); g = hue(p, q, h); b = hue(p, q, h - 1 / 3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    function jitColor(hex, jit) {
      if (!jit) return hex;
      var v = hex2rgbv(hex), hsl = rgb2hsl(v[0], v[1], v[2]);
      hsl[2] = clamp01(hsl[2] + jit.l);
      hsl[1] = clamp01(hsl[1] * (1 + jit.s));
      hsl[2] = clamp01(0.5 + (hsl[2] - 0.5) * (1 + jit.c));
      return '#' + hsl2rgb(hsl[0], hsl[1], hsl[2]).map(function (x) {
        var vv = Math.max(0, Math.min(255, x)).toString(16);
        return ('0' + vv).slice(-2);
      }).join('');
    }
    /* 每个事件落地时，给色板抽一组细微的亮度/饱和度/对比度偏移。
       亮度只 ±0.03（克制），饱和与对比度放到 ±0.11——色温差更明显。 */
    function palJit() {
      return {
        l: (noise() - 0.5) * 0.06,
        s: (noise() - 0.5) * 0.22,
        c: (noise() - 0.5) * 0.22
      };
    }

    /* ---- 活状态。vals / targets / tension；crest 是天际线的时代上限。 ---- */
    var live = {
      vals: {}, targets: {},
      tension: 0, threshold: 0,
      evId: 0, evStart: 0, ev: null,
      perturbCount: 0
    };
    var N = T.NOISE;
    for (d in N) if (N.hasOwnProperty(d)) {
      live.vals[d] = N[d].lo + noise() * (N[d].hi - N[d].lo);
      live.targets[d] = live.vals[d];
    }

    function makeEv() {
      var names = Object.keys(T.RULE);
      /* 音色池跟着音频层走：导入了新音色，世界下一件事就会用上它。 */
      var TC = (ctx.audio && ctx.audio.timbreCount) ? Math.max(1, ctx.audio.timbreCount()) : 5;
      var i1 = Math.floor(noise() * names.length);
      var i2 = (i1 + 1 + Math.floor(noise() * (names.length - 1))) % names.length;
      var a, band = null;
      if (noise() < T.EVENT.lightBandChance) {
        a = 9 + Math.floor(noise() * 22);
        band = [a, a + 4 + Math.floor(noise() * 8)];
      }
      return {
        palette: Math.floor(noise() * PAL.length),
        rules: [names[i1], names[i2]],
        mode: T.MODES[Math.floor(noise() * T.MODES.length)],
        root: 174 + Math.floor(noise() * 8) * 22,
        timbres: [Math.floor(noise() * TC), Math.floor(noise() * TC), Math.floor(noise() * TC)],
        contour: T.CONTOURS[Math.floor(noise() * T.CONTOURS.length)],
        lightBand: band,
        haloHue: Math.floor(noise() * 3),
        palJit: palJit()
      };
    }

    live.ev = makeEv();
    live.threshold = lerp(T.EVENT.threshold, noise()) / (0.35 + eff('eventRate'));

    /* 事件换界：全部参数一起改写，包括 crest——时代也会被换掉。 */
    function shiftEvent(nowPanel) {
      /* 换界给粒子群一记脉冲：换的不只是色板，连扰动的脾气也换了。 */
      BT.life.pulse(1);
      live.evId++;
      live.evStart = nowPanel;
      live.ev = makeEv();
      live.tension = 0;
      live.threshold = lerp(T.EVENT.threshold, noise()) / (0.35 + eff('eventRate'));
      for (var k in N) if (N.hasOwnProperty(k)) {
        var q = N[k];
        live.targets[k] = q.lo + noise() * (q.hi - q.lo);
        live.vals[k] = clamp(live.vals[k] +
          (live.targets[k] - live.vals[k]) * T.EVENT.paletteKick +
          (noise() - 0.5) * (q.hi - q.lo) * 0.16, q.lo, q.hi);
      }
    }

    /* 每生成一幅，先推一次活状态。旋钮在这里拧进干扰：
       impulse 乘抖动、viscosity 改惯性（slow 项豁免）、eventRate 已在阈值里、
       gust 给相位漂移额外一脚。 */
    function perturb(nowPanel) {
      /* 每幅一次完整推进。把此刻的活状态递回去，世界与粒子群互相踢。 */
      BT.life.step(live);
      var k, q, v = live.vals, t = live.targets;
      var impulse = eff('impulse'), visc = eff('viscosity');
      for (k in N) if (N.hasOwnProperty(k)) {
        q = N[k];
        if (noise() < q.jitter * impulse) t[k] = q.lo + noise() * (q.hi - q.lo);
        var keep = q.slow ? q.keep
          : clamp(q.keep + (visc - 0.5) * T.KNOBS.viscosity.keep, 0.04, 0.99);
        v[k] += (t[k] - v[k]) * (1 - keep) +
                (noise() - 0.5) * (q.hi - q.lo) * q.jitter * impulse * 0.5;
        v[k] = clamp(v[k], q.lo, q.hi);
      }
      v.drift += (noise() - 0.5) * 1.1 * (eff('gust') * 1.8);
      v.drift = clamp(v.drift, N.drift.lo, N.drift.hi);
      /* 张力整体吃 impulse：干扰拧到 0，连事件都涨不出来，世界彻底冻结。 */
      live.tension += (lerp(T.EVENT.tensionGain, noise()) *
        (0.35 + 0.65 * eff('eventRate')) + Math.abs(v.drift) * T.EVENT.driftGain) * impulse;
      if (live.tension >= live.threshold) shiftEvent(nowPanel);
      live.perturbCount++;
      var snapVals = {};
      for (k in v) if (v.hasOwnProperty(k)) snapVals[k] = v[k];
      return {
        evId: live.evId, evStart: live.evStart, ev: live.ev,
        vals: snapVals, topo: null,
        ruleId: live.ev.rules[Math.floor(noise() * live.ev.rules.length)]
      };
    }

    /* ---- 天际线。每列从上一列游走而来，跨幅边界直接接续——画卷是连续的。
       生长偏置随年龄从零爬起；上限是 crest；偶发坍缩。 ---- */
    var topoMap = new Map();
    function growTopo(n, vals) {
      var G = T.GROWTH;
      /* 时代上限随年龄打开：前七成 ageFull 里从贴地爬到 crest——
         「从零开始一步步扩大化」最直接的一处，天际线的天花板自己长开。 */
      var crest = vals.crest * Math.min(1, (n + 1) / (G.ageFull * 0.45));
      var age = Math.min(1, (n + 1) / G.ageFull);
      var arr = new Array(SPAN);
      for (var c = 0; c < SPAN; c++) {
        var prev = topoMap.get(n * SPAN + c - 1);
        var h = (prev || 0) +
          lerp(G.rise, noise()) * (0.25 + 0.75 * age) * (0.5 + 0.5 * vals.density) +
          (noise() - 0.5) * G.walk;
        if (noise() < G.collapse) h -= lerp(G.collapseDepth, noise());
        /* 抬一条随年龄长开的地基线：天际线不会整片贴地，
           但世界生日那几幅 base=0，仍是从零开始。 */
        h = clamp(h, Math.min(crest, 6 * Math.min(1, (n + 1) / G.ageFull)), crest);
        topoMap.set(n * SPAN + c, h);
        arr[c] = h;
      }
      /* 窗口修剪：只有 c-1 会被再读，留两幅宽绰绰有余。 */
      if (topoMap.size > SPAN * 8) {
        var kill = topoMap.keys();
        for (var i = 0; i < SPAN * 4; i++) topoMap.delete(kill.next().value);
      }
      return arr;
    }

    /* ---- 冻结的历史。generated 是已经长出来的最大幅号。 ---- */
    var cache = new Map();
    var EMPTY = { strokes: [], snap: null };
    var generated = -1;
    var cur = 0, k = 0, born = 0, done = 0, beatT = 0.16, nowT = 0;
    var lastEvId = null;
    var curBg = PAL[0].bg;
    var skyBase = null;

    function ensure(n) {
      var guard = 0;
      while (generated < n && guard++ < 200000) {
        generated++;
        var snap = perturb(generated);
        snap.topo = growTopo(generated, snap.vals);
        cache.set(generated, { strokes: build(generated, snap), snap: snap });
        if (cache.size > T.MAXHISTORY) cache.delete(cache.keys().next().value);
      }
    }
    function panelOf(n) {
      if (n < 0) return EMPTY;
      ensure(n);
      return cache.get(n) || EMPTY;
    }
    function compose(n) { return panelOf(n).strokes; }
    function snapOf(n) { return panelOf(n).snap; }

    function mk(x, y, w, h, role, n, pal, f) {
      var o = { x: x, y: y, w: w, h: h, role: role, ink: pal, p: n };
      if (f) for (var kk in f) if (f.hasOwnProperty(kk)) o[kk] = f[kk];
      return o;
    }

    /* ---- 正多边形与正多面体投影：罗塞塔的继任者。简单直接——
       一半是一笔闭合的单纯正多边形，一半是柏拉图立体的正交投影线框
       （每条棱一根细四边形，不带任何顶点节点）。不旋转对称、不重叠环带：
       完美来自几何本身，不来自排布。
       kind 可传（radial 法则用）可不传（签名事件抽签，稀有立体只在深处）。 ---- */
    function solid(n, snap, cx, cy, R, kind, flag) {
      var out = [], f, kk;
      /* 单纯正多边形：一笔闭合的正 n 边形——一气呵成，一次落笔就是整件几何。 */
      if (!kind && noise() < 0.45) {
        var SIDES = [3, 4, 5, 6, 8];
        var k = SIDES[Math.floor(noise() * SIDES.length)];
        var rot = noise() * Math.PI * 2;
        var pts = [], i, a;
        for (i = 0; i < k; i++) {
          a = rot + i * Math.PI * 2 / k;
          pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
        }
        f = { sb: 'poly' + k, neon: 1, rb: 1 };
        if (flag) for (kk in flag) if (flag.hasOwnProperty(kk)) f[kk] = flag[kk];
        out.push(ext(pts, 'S', n, snap.ev.palette, f));
        return { arr: out, box: bboxOf(out, 1.2) };
      }
      var names = ['tetra', 'cube', 'octa', 'dodeca', 'icosa'];
      var id = kind;
      if (!id) {
        for (var tries = 0; tries < 8; tries++) {
          id = names[Math.floor(noise() * names.length)];
          if (!T.SOLIDS[id].rare || noise() < 0.35) break;
        }
      }
      var S = T.SOLIDS[id];
      var ax = noise() * Math.PI * 2, ay = noise() * Math.PI * 2;
      var cxr = Math.cos(ax), sxr = Math.sin(ax);
      var cyr = Math.cos(ay), syr = Math.sin(ay);
      /* 常见立体走主霓虹，稀有立体（十二/二十面体）走副霓虹——
         梦的深处出现的几何自带另一种色温。
         rb=1 是签名事件的记号；radial 调用传入 { rb: 0, rad: 1 } 覆写。 */
      f = { sb: id, neon: S.rare ? 2 : 1, rb: 1 };
      if (flag) for (kk in flag) if (flag.hasOwnProperty(kk)) f[kk] = flag[kk];
      var vx, vy, vz, x, y;
      var pv = [];
      for (i = 0; i < S.v.length; i++) {
        vx = S.v[i][0]; vy = S.v[i][1]; vz = S.v[i][2];
        x = vx * cyr + vz * syr;  vz = -vx * syr + vz * cyr;  vx = x;   /* 绕 Y */
        y = vy * cxr - vz * sxr;  vz = vy * sxr + vz * cxr;   vy = y;   /* 绕 X */
        pv.push([cx + vx * R, cy + vy * R]);
      }
      var lw = Math.max(0.14, R * 0.045);
      for (i = 0; i < S.edges.length; i++) {
        var a2 = pv[S.edges[i][0]], b2 = pv[S.edges[i][1]];
        var dx = b2[0] - a2[0], dy = b2[1] - a2[1];
        var dl = Math.max(0.02, Math.sqrt(dx * dx + dy * dy));
        var px = -dy / dl * lw / 2, py = dx / dl * lw / 2;
        out.push(ext([
          [a2[0] - px, a2[1] - py], [b2[0] - px, b2[1] - py],
          [b2[0] + px, b2[1] + py], [a2[0] + px, a2[1] + py]
        ], 'S', n, snap.ev.palette, f));
      }
      return { arr: out, box: bboxOf(out, 1.2) };
    }

    /* 签名位的盒用笔画的真实包围盒，不用理论半径。 */
    function bboxOf(out, pad) {
      var bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity, q;
      for (var m = 0; m < out.length; m++) {
        q = out[m];
        if (q.x < bx0) bx0 = q.x;
        if (q.x + q.w > bx1) bx1 = q.x + q.w;
        if (q.y < by0) by0 = q.y;
        if (q.y + q.h > by1) by1 = q.y + q.h;
      }
      return { x0: bx0 - pad, x1: bx1 + pad, y0: by0 - pad, y1: by1 + pad };
    }

    function ext(pts, role, n, pal, f) {
      var i, x0 = pts[0][0], x1 = x0, y0 = pts[0][1], y1 = y0;
      for (i = 1; i < pts.length; i++) {
        if (pts[i][0] < x0) x0 = pts[i][0];
        if (pts[i][0] > x1) x1 = pts[i][0];
        if (pts[i][1] < y0) y0 = pts[i][1];
        if (pts[i][1] > y1) y1 = pts[i][1];
      }
      var o = { pts: pts, x: x0, y: y0, w: Math.max(0.02, x1 - x0),
                h: Math.max(0.02, y1 - y0), role: role, ink: pal, p: n, rb: 1 };
      /* rb=1 只属于罗塞塔；塔冠与星塔要显式置 0，才不会被当彩蛋抽验。 */
      if (f) for (var kk in f) if (f.hasOwnProperty(kk)) o[kk] = f[kk];
      return o;
    }

    /* ---- 塔顶平顶冠。第九稿极简化：冠就是一块（至多两块）比塔宽的悬浮厚板，
       《无限宫院》式的漂浮体量。没有舷窗、没有收边、没有支座——
       体量自己会说话，细节是杂乱的前奏。
       budget 由 CEIL - 塔高算出，冠永远平切收口，不会被 settle 夹出怪形。 ---- */
    function crown(n, pal, cx, topY, budget, kind, age, beat) {
      var C = T.CROWN[kind];
      if (!C) return [];
      var w = beat * C.ow * (0.78 + 0.22 * age);
      var h = Math.min(budget, C.rise * (0.62 + 0.38 * age));
      if (h < 0.55) return [];
      var tiers = Math.max(1, C.tiers);
      var gap = Math.min(C.gap, h * 0.22);
      var plate = (h - gap * (tiers - 1)) / tiers;
      if (plate < 0.16) { gap = 0; plate = h / tiers; }
      var f = { tw: 1, rb: 0, cw: 1 };
      var out = [], i, y, k, tw, x0, arm;

      for (i = 0; i < tiers; i++) {
        y = topY + i * (plate + gap);
        /* saucer 中间最宽（飞碟），setback 逐层内收（退台）。 */
        k = (C.flare > 0)
          ? 1 - Math.abs((i + 0.5) / tiers - 0.5) * 2 * C.flare
          : 1 + i * C.flare;
        tw = w * k;
        x0 = cx - tw / 2;
        if (kind === 'halo' && i === tiers - 1) {
          /* 悬浮环冠：顶层断开中段，左右两片甲板——留白就是反重力。 */
          arm = tw * 0.30;
          out.push(mk(x0, y, arm, plate, 'M', n, pal, f));
          out.push(mk(x0 + tw - arm, y, arm, plate, 'M', n, pal, f));
        } else {
          out.push(mk(x0, y, tw, plate, 'M', n, pal, f));
        }
      }
      return out;
    }

    /* ---- radial 对称算子：半幅中心的正多边形或正多面体，一幅的主角。
       频率同样大幅降低：只有三成的 radial 幅真的画出几何，
       其余让位给留白——完美是稀客，来一次就够。 ---- */
    function radialTower(n, snap, pal) {
      if (noise() >= 0.30) return [];
      var cx = SPAN / 2, cy = 21 + noise() * 4;
      var R = Math.min(9, cy - 1.5, CEIL - cy - 1.5, SPAN / 2 - 2);
      return solid(n, snap, cx, cy, R, null, { rb: 0, rad: 1 }).arr;
    }

    function symmetry(kind, arr, n, pal, snap) {
      var add = [], half = SPAN / 2, i, p, nx;
      if (kind === 'mirror' || kind === 'repeat') {
        for (i = 0; i < arr.length; i++) {
          p = arr[i];
          /* 塔体有自己的因果，对称算子不碰它；
             点列（环形站 / 星塔）自带对称，也不参与镜像。
             谱线根本不进笔画流，这里不再为它留判断。 */
          if (p.pts || p.tw || p.x + p.w > half + 0.01) continue;
          nx = (kind === 'mirror') ? (SPAN - p.x - p.w) : (p.x + half);
          add.push(mk(nx, p.y, p.w, p.h, p.role, n, pal));
        }
      } else if (kind === 'cross') {
        /* 第八稿回归第一版的中轴十字（CROSSROADS）：一根全幅竖轴 +
           一根厚横带 + 中心方块。构成靠十字与留白，不靠三根平行横线。 */
        add.push(mk(half - 0.35, 0, 0.7, CEIL, 'S', n, pal));
        add.push(mk(0, 20.5, SPAN, 0.7, 'S', n, pal));
        add.push(mk(half - 2.2, 18.3, 4.4, 4.4, 'M', n, pal));
      } else if (kind === 'radial') {
        add = radialTower(n, snap, pal);
      }
      return add;
    }

    /* ---- 短横线治理。「太多」在这里是一个可执行的判据，不是观感形容：
       V1BAR 表定义什么是短横线、每幅留几条、超出的转成什么形状。
       第一版的节奏条带是印上去的厚杠，不是发光的灯管：所有短横线
       一律撤掉 neon 自发光；超出预算的就地转成体量块（加厚、收宽），
       一笔都不删。用坐标排序决定谁留下，不碰 Math.random——
       全世界仍只有粒子生命场这一处扰动入口，历史幅也不会因为治理而闪。 ---- */
    function v1Bars(out) {
      var B = T.V1BAR, i, q, h, idx = [], lim;
      for (i = 0; i < out.length; i++) {
        q = out[i];
        if (q.pts || q.w >= SPAN * B.maxW) continue;
        if (q.h >= B.maxH || q.w / Math.max(0.02, q.h) <= B.minRatio) continue;
        idx.push(i);
      }
      for (i = 0; i < idx.length; i++) {
        if (!B.keepGlow) out[idx[i]].neon = 0;
      }
      /* 确定性次序：左沿优先、其次高度，最后用原始下标破平。 */
      idx.sort(function (a, b) {
        var A = out[a], C = out[b];
        return (A.x - C.x) || (A.y - C.y) || (a - b);
      });
      lim = Math.min(idx.length, B.budget);
      for (i = lim; i < idx.length; i++) {
        q = out[idx[i]];
        h = q.h;
        q.h = B.blockH;
        q.w = Math.min(q.w, B.blockW);
        /* 以原线中心为锚上下各半，块留在原来的层里，不飘到别的带。
           左沿 x 不动：按 x 排序的笔序与生成前沿完全不受影响。 */
        q.y = Math.max(0, q.y - (B.blockH - h) * 0.5);
      }
      return out;
    }

    /* 全部笔画都必须留下：越界回卷后夹紧，光带只提亮，签名位只降级。 */
    function settle(out, box, band) {
      var i, q, x0, x1, y0, y1, j;
      for (i = 0; i < out.length; i++) {
        q = out[i];
        if (q.pts) {
          for (j = 0; j < q.pts.length; j++) {
            q.pts[j][0] = clamp(q.pts[j][0], 0, SPAN);
            q.pts[j][1] = clamp(q.pts[j][1], 0, CEIL);
          }
          x0 = q.pts[0][0]; x1 = x0; y0 = q.pts[0][1]; y1 = y0;
          for (j = 1; j < q.pts.length; j++) {
            if (q.pts[j][0] < x0) x0 = q.pts[j][0];
            if (q.pts[j][0] > x1) x1 = q.pts[j][0];
            if (q.pts[j][1] < y0) y0 = q.pts[j][1];
            if (q.pts[j][1] > y1) y1 = q.pts[j][1];
          }
          q.x = x0; q.y = y0; q.w = Math.max(0.02, x1 - x0); q.h = Math.max(0.02, y1 - y0);
        } else {
          x0 = clamp(q.x, 0, SPAN); y0 = clamp(q.y, 0, CEIL);
          x1 = clamp(q.x + q.w, 0, SPAN); y1 = clamp(q.y + q.h, 0, CEIL);
          if (x1 < x0) { x0 = clamp(q.x, 0, SPAN - 0.02); x1 = x0 + 0.02; }
          if (y1 < y0) { y0 = clamp(q.y, 0, CEIL - 0.02); y1 = y0 + 0.02; }
          q.x = x0; q.y = y0; q.w = Math.max(0.02, x1 - x0); q.h = Math.max(0.02, y1 - y0);
        }
        /* 签名位只压模块层实体；塔冠(cw)与另一座环形站(rad)是主景，
           压成暗面会把「炫目」直接抹掉——v2.3 截图里那朵黑芒就是这么来的。 */
        if (box && !q.rb && !q.cw && !q.rad && (q.role === 'M' || q.role === 'A') &&
            q.x < box.x1 && q.x + q.w > box.x0 && q.y < box.y1 && q.y + q.h > box.y0) {
          q.role = 'V'; q.neon = 0;
        }
        if (band && q.y < band[1] && q.y + q.h > band[0]) q.lit = 1;
      }
      return out;
    }

    /* 一幅的写法：塔体（笔沿天际线一步步走）→ 模块层 → 对称
       → 签名立体 → 收笔。年龄同时压两处：塔的生长偏置与模块的密度
       ——世界从零开始一步步扩大化。
       谱线不在这里：它是预先铺好的纸（<g id="staff"> 背景层），不进笔画流；
       光标的逐笔序列里没有「画谱线」这一拍，第 0 笔就是塔体的第一块。 */
    function build(n, snap) {
      var ev = snap.ev, v = snap.vals, topo = snap.topo;
      var rule = T.RULE[snap.ruleId];
      var G = T.GROWTH;
      var age = Math.min(1, (n + 1) / G.ageFull);
      var pal = ev.palette;
      var beat = clamp(Math.round(rule.beat * v.beat * eff('beat')), 5, 16);
      var slots = Math.max(2, Math.floor(SPAN / beat));
      var out = [], L, s, j, p, layer, sy, sx, off, pool, parts, maxL; var motifs = [];
      var x, end, carried, peak, laid, stepW, liveH, kind, budget;
      var A = G.act;

      /* 塔体：撤掉「塔型」这一维度之后，这里只剩两样东西。
         · 逻辑自生成——topo 是第 n-1 幅活状态游走出来的天际线，跨幅连续、
           随年龄长开、偶发坍缩；它是高度唯一的来源。
         · 构建行为主动实现——笔沿 x 一步步走，每一步读一次脚下的活高度，
           把「上一笔留下的高度」朝它推一下，就地落一块；不落也是一次决定。
         于是高矮来自递推，宽窄来自这一步走了多远，空来自笔的停顿，
         块与块之间的墨线就是每一次建造留下的接缝。没有抽签、没有配方、
         没有居中、没有对称——形状是行为的残迹，不是被选中的物件。 */
      for (s = 0; s < slots; s++) {
        off = wrap(s * beat, Math.max(1, SPAN - beat));
        x = off; end = Math.min(SPAN, off + beat);
        carried = 0; peak = 0; laid = 0;
        while (x < end - 0.4) {
          /* 脚下这一列的活高度：天际线自己长出来的，不是查表来的。 */
          liveH = topo[clamp(Math.floor(x), 0, SPAN - 1)];
          /* 笔带着上一笔留下的高度，朝活高度推一步，再叠上自己的游走。
             因果在笔身上——上一笔写下的东西真的改变了下一笔。 */
          carried = clamp(carried + (liveH - carried) * lerp(A.pull, noise()) +
                          (noise() - 0.5) * G.walk * A.wander, 0, CEIL);
          stepW = Math.min(end - x, beat * lerp(A.step, noise()));
          if (stepW < 0.8) break;
          /* 落笔与否也由活状态与年龄决定：矮处不立、稀处留白。
             空不是「没画」，是笔在这一步主动选择不落。 */
          if (carried > 1.2 &&
              noise() < eff('density') * v.density * (0.30 + 0.70 * age)) {
            out.push(mk(x, 0, stepW, carried, 'M', n, pal, { tw: 1 }));
            if (carried > peak) peak = carried;
            laid++;
          }
          x += stepW;
        }
        if (!laid) continue; else motifs.push('monolith');
        /* 帽线：不是塔型给的规格，是笔走完这一段后在它到过的最高处
           自己划下的一条水平记号。一段一条，就是这一段的谱。 */
        out.push(mk(off, peak, beat * 0.92, A.cap, 'S', n, pal, { tw: 1 })); motifs.push('bar');
        if (peak > 1.4 && noise() < A.dot) { motifs.push('beacon');
          out.push(mk(off + beat * 0.34, peak + 0.45, 0.5, 0.5, 'A', n, pal, { tw: 1 }));
        }
        /* 悬浮厚板也不再由塔型派发，只由活状态触发：够高、够老、此刻的干扰。
           冠是笔停下来之后多写的一块板，不是一种被选中的类型。 */
        if (peak > 1.4 && noise() < A.crown * (0.40 + 0.60 * age)) { motifs.push('slab');
          kind = ['cantilever', 'saucer', 'setback', 'halo'][Math.floor(noise() * 4)];
          budget = Math.min(2.8, CEIL - peak - 0.8);
          if (budget > 0.7) {
            out = out.concat(crown(n, pal, off + beat * 0.5, peak + 0.3,
                                   budget, kind, age, beat));
          }
        }
      }

      /* 模块层：原先的结构构成。密度随年龄从三成爬到满。 */
      maxL = Math.min(rule.layers.length, Math.round(Math.min(eff('layers'), v.layers)));
      for (L = 0; L < maxL; L++) {
        layer = rule.layers[L];
        sy = (layer.band[1] - layer.band[0]) / 12;
        sx = beat / 12;
        pool = layer.motifs;
        for (s = 0; s < slots; s++) {
          if (noise() > eff('density') * v.density * layer.fill * (0.30 + 0.70 * age)) continue;
          var chosen = pool[Math.floor(noise() * pool.length)]; motifs.push(chosen); parts = T.MOTIF[chosen];
          off = wrap(s * beat + ((rule.stagger && L % 2) ? beat / 2 : 0),
                     Math.max(1, SPAN - beat));
          for (j = 0; j < parts.length; j++) {
            p = parts[j];
            out.push(mk(off + p[0] * sx, layer.band[0] + p[1] * sy,
                        p[2] * sx, p[3] * sy, p[4], n, pal));
          }
        }
      }

      out = out.concat(symmetry(rule.sym, out, n, pal, snap));

      var ros = null;
      if (noise() < v.solid * eff('flash') * (0.3 + 0.7 * age)) {
        motifs.push('aperture'); ros = solid(n, snap, SPAN / 2, [13, 19, 25, 31][Math.floor(noise() * 4)],
                    4.5 + noise() * 2);
        out = out.concat(ros.arr);
      }

      v1Bars(out);
      settle(out, ros ? ros.box : null, ev.lightBand);
      /* 笔序按 x 优先：一支笔从左往右写完整幅，生成前沿才在横向单调。
         点列笔画的 x 是包围盒左沿，同样服从这个序。 */
      out.sort(function (a, b) { return (a.x - b.x) || (a.y - b.y); });
      /* 册子要的是「这一幅真实出现过什么」，去重后按出现顺序记下。
         不额外掷骰子，也不改一笔几何——这是拾取，不是抽奖。 */
      var seenM = {}, uniq = [], mi;
      for (mi = 0; mi < motifs.length; mi++) {
        if (!seenM[motifs[mi]] && T.MOTIF[motifs[mi]]) { seenM[motifs[mi]] = 1; uniq.push(motifs[mi]); }
      }
      snap.motifs = uniq;
      snap.palette = pal;
      return out;
    }

    /* ---- 生成前沿。它是「刚落下的笔 → 下一支待写的笔」之间的时间插值，
       不是 cur*SPAN 那种整幅整幅的阶梯。写笔有多快，镜头就滚多快。
       最后一笔的终点取 (cur+1)*SPAN（按 x 排序后下一幅首笔必在 x=0），
       与下一幅严丝合缝，跨幅不跳一格。
       x 用笔的左沿而非中心：谱线宽 48 格、中心 24，会把前沿往回拽。 ---- */
    var front = { a: 0, b: 0, ay: 0, by: 0, dur: 0.18, ready: 0, last: -Infinity };
    function leftOf(p, panel) {
      return (p.p === undefined ? panel : p.p) * SPAN + p.x;
    }
    function midY(p) { return p.y + p.h / 2; }
    function frontier() {
      var x, y, f;
      if (!front.ready) {
        var rec0 = panelOf(cur);
        var p0 = rec0.strokes[Math.min(k, rec0.strokes.length - 1)];
        f = 0;
        x = p0 ? leftOf(p0, cur) : cur * SPAN;
        y = p0 ? midY(p0) : 0;
      } else {
        f = 1 - clamp(beatT / front.dur, 0, 1);
        x = front.a + (front.b - front.a) * f;
        y = front.ay + (front.by - front.ay) * f;
      }
      /* 镜头不许倒退。跨幅那一帧 beatT 会额外累加一个 interval，
         插值会短暂弹回上一幅的末笔；钳住它，滚动才是严格单向的。 */
      if (x < front.last) x = front.last; else front.last = x;
      return { x: x, y: y, frac: f, panel: cur, written: k };
    }
    function frontierX() { return frontier().x; }

    /* ---- 五声部。谱层决定音，音频层决定质感。
       五个声部共用同一个 deg，只是从同一个音往上/往下取音阶里的音，
       所以叠置永远协和（三度、五度都是音阶里的下一格，不是半音）。
       bass 落在主音 deg=0 上：低音不需要旋律，它需要一根柱子。 */
    function semiOf(M, deg, off, oct) {
      return M[wrap(deg + off, M.length)] + 12 * oct;
    }
    function sing(A, ev, deg, oct, seq, ti) {
      var M = ev.mode, V = T.VOICE;
      A.land(semiOf(M, deg, V.lead.shift, oct + V.lead.oct), ti, V.lead.gain);
      if (seq % V.harm.every === 0) A.harm(semiOf(M, deg, V.harm.shift, oct + V.harm.oct), ti + 1, V.harm.gain);
      if (seq % V.arp.every === 0) A.arp(semiOf(M, deg, V.arp.shift, oct + V.arp.oct), ti + 2, V.arp.gain);
      /* 低音不看笔画高度：柱子不跟着笔走，它只钉在调式的主音上（八度固定）。 */
      if (seq % V.bass.every === 0) A.bass(semiOf(M, 0, 0, 1 + V.bass.oct), V.bass.gain);
      if (seq % V.shim.every === 0) A.shim(semiOf(M, deg, V.shim.shift, oct + V.shim.oct), V.shim.gain);
    }

    /* ---- 时间。第九稿放慢近一倍：笔要一枝一枝地看，生长值得被看见。
       tempo 已下移到 0.45–0.85，这里再把基准从 0.18 提到 0.34——
       静物是凝视的对象，不是飞过弹幕的素材。 ---- */
    function interval() {
      return Math.min(0.85, Math.max(0.10, 0.34 / live.vals.tempo));
    }

    function step(dt, now) {
      nowT = now;
      beatT -= dt;
      var guard = 0;
      while (beatT <= 0 && guard++ < 64) {
        var rec = panelOf(cur);
        if (k >= rec.strokes.length) {
          var finishedSnap = rec.snap; cur++; k = 0; done++;
          var nx = panelOf(cur);
          var id = nx.snap ? nx.snap.evId : live.evId;
          var evx = nx.snap ? nx.snap.ev : live.ev;
          if (lastEvId !== null && id !== lastEvId) {
            lastEvId = id;
            if (ctx.audio) {
              if (ctx.audio.setMode) ctx.audio.setMode(evx.mode);
              if (ctx.audio.setRoot) ctx.audio.setRoot(evx.root);
              if (ctx.audio.setTimbre) ctx.audio.setTimbre(evx.timbres[0]);
              if (ctx.audio.pad) ctx.audio.pad(evx.mode[0]);
              if (ctx.audio.mark) ctx.audio.mark(evx.mode[0] + 12);
            }
          } else if (lastEvId === null) {
            lastEvId = id;
          } else if (ctx.audio) {
            if (ctx.audio.mark) ctx.audio.mark(evx.mode[2] + 7);
            if (done % 5 === 3 && ctx.audio.bell) ctx.audio.bell(evx.mode[4 % evx.mode.length] + 12);
          }
          /* 跨幅这一帧没有落笔，但节拍照样加了一次。前沿必须同步落到新幅起点，
             否则插值会按旧的 a→b 弹回上一幅的末笔——镜头会倒退一格。 */
          var ivx = interval();
          front.a = cur * SPAN;
          front.b = cur * SPAN;
          front.dur = ivx;
          front.ready = 1;
          front.last = Math.max(front.last, front.a);
          beatT += ivx;
          if (onPanelHook) onPanelHook(done, finishedSnap);
          continue;
        }
        var p = rec.strokes[k];
        k++; born++;
        /* 一拍一动：每一笔落笔就是一拍，音符与建筑动作严格一一对应——
           落笔间隔 interval()（0.40–0.76s ≈ 79–150 BPM）就是节拍周期。
           音高不再只是「高度 + 轮廓」：高度给起点，乐句给走势，轮廓给这一格的
           细节，三层叠起来才是一个音。音色按笔序在事件的音色池里轮换。 */
        if (ctx.audio && ctx.audio.land && rec.snap) {
          var ev2 = rec.snap.ev, M2 = ev2.mode, c2 = ev2.contour;
          var shp = T.PHRASE.shapes[wrap(cur, T.PHRASE.shapes.length)];
          var slot = Math.floor(born / T.PHRASE.seg) % shp.length;
          var ph = shp[slot];
          /* 句末那一格加一次转折：同样的句子重复时不会一模一样。 */
          if (slot === shp.length - 1) ph += T.PHRASE.turn[wrap(born, T.PHRASE.turn.length)];
          var deg = wrap(Math.floor(p.y / 5) + ph + c2[k % c2.length], M2.length);
          var oct = p.y > 30 ? 2 : 1;
          var tix = ev2.timbres[k % 3];
          if (ctx.audio.setTimbre) ctx.audio.setTimbre(tix);
          sing(ctx.audio, ev2, deg, oct, born, tix);
        }
        /* 前沿跟着笔走，而且在这一笔的整个 interval 里连续插值：
           帧与帧之间不会再出现「镜头一动不动，突然跳 48 格」。 */
        var nxq = rec.strokes[k];
        front.a = leftOf(p, cur);
        front.b = nxq ? Math.max(front.a, leftOf(nxq, cur)) : (cur + 1) * SPAN;
        front.ay = midY(p);
        front.by = nxq ? midY(nxq) : front.ay;
        var iv = interval();
        front.dur = iv;
        front.ready = 1;
        front.last = Math.max(front.last, front.a);
        beatT += iv;
      }
    }

    /* ---- 画。远近 × 色板 × 角色 × 标志（塔/谱线/光带）分组，元素数有上界。 ---- */
    var worldG = document.getElementById('world');
    var bloomG = document.getElementById('shade');
    var staffG = document.getElementById('staff');
    var airG = document.getElementById('air');
    var markG = document.getElementById('marks');
    var skyEl = document.getElementById('sky');
    var view = { x: 0, cell: 13, groundY: 500, w: 1000 };
    var pathMap = new Map();
    var bloomMap = new Map();
    var staffMap = new Map();

    var ROLEKEY = { S: 'line', M: 'plane', A: 'accent', V: 'deep' };

    /* 墨线宽度随焦距缩放，但有硬地板与天花板：细刻度绝不被 2px 线吞掉，
       超宽视口也不会变成一坨黑。结构细线 S 与谱线直接豁免。 */
    function inkWidth() {
      /* 第一版没有统一粗描边：INK.enable=0 时整条描边链归零，
         代码路径保留，改一个数就能切回第七稿的绘本墨线。 */
      if (!T.INK.enable) return 0;
      return Math.max(T.INK.min, Math.min(T.INK.max, view.cell * T.INK.ratio));
    }

    function colorOf(p, near, pal, jit) {
      var w = wrap(pal, PAL.length);
      var P = PAL[w];
      var col;
      /* 光敏出口先于一切：低烈度下光带不提亮、霓虹压到三成八——
         安全出口必须压过任何视觉效果，包括事件光带。 */
      if (p.lit && !state.lowPower) col = T.mix(P.glow, P.neon, 0.28);
      else if (p.staff) col = T.FAR[w].S;
      else if (state.lowPower) {
        /* 霓虹压到三成八，冠沿与星环都安静下来，只剩可读的实线；
           正常态才是满饱和的自发光。 */
        if (p.neon === 2) col = T.mix(P.neon2, P.bg, 0.62);
        else if (p.neon) col = T.mix(P.neon, P.bg, 0.62);
        else if (near) col = P[ROLEKEY[p.role]];
        else col = (eff('contrast') < 1 ? T.FAR_LOW : T.FAR)[w][p.role];
      } else {
        /* 霓虹只给骨线、带状窗与冠沿；远景压成混了夜底的同色，不许抢近景。
           neon=2 是副霓虹：同屏一主一副对撞，赛博朋克才不至于单色发闷。 */
        if (p.neon === 2) col = near ? P.neon2 : T.mix(P.neon2, P.bg, 0.26);
        else if (p.neon) col = near ? P.neon : T.FAR[w].A;
        else if (near) col = P[ROLEKEY[p.role]];
        else col = (eff('contrast') < 1 ? T.FAR_LOW : T.FAR)[w][p.role];
      }
      /* 终点统一过一遍色板抖动：亮度 / 饱和度 / 对比度轻微浮动。 */
      return jitColor(col, jit);
    }

    /* 分层透明度：柔和感的来源。近景的体量留一点呼吸，远景退半步，
       谱线最淡——层次靠透明度的阶梯，不靠硬切的颜色。 */
    function opOf(p, near) {
      if (p.staff) return 0.42;
      if (!near) return 0.82;
      return p.role === 'S' ? 1 : (p.role === 'M' ? 0.94 : (p.role === 'A' ? 0.96 : 0.9));
    }

    /* 分组键只保留真正影响渲染属性的维度：远近 / 色板 / 角色 / 标记。
       标记与 colorOf 的优先级严格一致（lit > staff > neon > 普通），
       同键必然同 fill、同 ink、同描边宽度，合并不会串色。
       tw 不再进键：它只标记塔体，不影响任何渲染属性。 */
    function push(buf, p, near, ox, oy, cell, baseX, pal, jit) {
      /* 低烈度下 lit 不再劫持分组键：光带笔按本来的霓虹/角色分组，
         这样安全出口的压暗才能作用到它们身上。 */
      var flag = (!state.lowPower && p.lit) ? 'l'
        : (p.staff ? 't' : (p.neon === 2 ? '2' : (p.neon ? 'n' : '-')));
      var key = (near ? 'N' : 'F') + '|' + wrap(pal, PAL.length) + '|' + p.role + '|' + flag;
      var b = buf[key];
      if (!b) {
        var P = PAL[wrap(pal, PAL.length)];
        /* 点列（环形站环带 / 舱段）一律豁免墨线：这些是霓虹自发光构件，
           压上 3px 深墨会读作黑洞；绘本墨线交给塔身与冠部的矩形板。 */
        var sw = (p.staff || p.role === 'S' || p.pts) ? 0 : inkWidth();
        b = buf[key] = {
          color: colorOf(p, near, pal, jit),
          op: opOf(p, near),
          sw: sw,
          sc: near ? P.ink : T.mix(P.ink, P.bg, 0.45),
          d: ''
        };
      }
      var sx, sy, i, dd;
      if (p.pts) {
        dd = 'M';
        for (i = 0; i < p.pts.length; i++) {
          sx = (ox + (baseX + p.pts[i][0]) * cell).toFixed(2);
          sy = (oy - p.pts[i][1] * cell).toFixed(2);
          dd += (i ? 'L' : '') + sx + ' ' + sy;
        }
        b.d += dd + 'z';
        return;
      }
      var wpx = Math.max(T.MINPX, p.w * cell).toFixed(2);
      var hpx = Math.max(T.MINPX, p.h * cell).toFixed(2);
      sx = (ox + (baseX + p.x) * cell).toFixed(2);
      sy = (oy - (p.y + p.h) * cell).toFixed(2);
      b.d += 'M' + sx + ' ' + sy + 'h' + wpx + 'v' + hpx + 'h-' + wpx + 'z';
    }

    /* 辉光衬底。不用 filter / feGaussianBlur：层叠几何面可靠。 */
    function pushBloom(p, ox, oy, cell, baseX) {
      var b = bufBL(), g = T.GROWPX / cell;
      var sx, sy, w, h, i, dd;
      if (p.pts) {
        dd = 'M';
        for (i = 0; i < p.pts.length; i++) {
          sx = (ox + (baseX + p.pts[i][0]) * cell).toFixed(2);
          sy = (oy - p.pts[i][1] * cell).toFixed(2);
          dd += (i ? 'L' : '') + sx + ' ' + sy;
        }
        b.d += dd + 'z';
        return;
      }
      sx = (ox + (baseX + p.x - g) * cell).toFixed(2);
      sy = (oy - (p.y + p.h + g) * cell).toFixed(2);
      w = ((p.w + 2 * g) * cell).toFixed(2);
      h = ((p.h + 2 * g) * cell).toFixed(2);
      b.d += 'M' + sx + ' ' + sy + 'h' + w + 'v' + h + 'h-' + w + 'z';
    }

    /* 辉光衬底：第七稿的主霓虹退回第一版的纸白雾。 */
    var blBuf = null;
    function bufBL() {
      if (!blBuf) {
        blBuf = { color: PAL[wrap(live.ev.palette, PAL.length)].glow, op: 0, d: '' };
      }
      return blBuf;
    }

    /* 逐笔流里只有「被写出来的笔」。谱线早已在纸上，这里没有任何跳过或特判，
       第 0 笔就是塔体的第一块——光标不再空跑「画谱线」这一拍。 */
    function addStrokes(buf, s, lim, n, ox, oy, cell, pal, jit) {
      var near = n >= cur - 1;
      var baseX = n * SPAN;
      var i;
      for (i = 0; i < lim; i++) {
        push(buf, s[i], near, ox, oy, cell, baseX, pal, jit);
        pushBloom(s[i], ox, oy, cell, baseX);
      }
    }
    /* 纸：谱线由高度表 G.staff 直接生成整条横线，铺在背景层。
       它不进笔画流、不受闸门 k 限制、也不等「这一幅开始写了」才出现。
       staff 标记只是给 colorOf / opOf / push 一个身份，好让它保持极淡、
       半透明、无描边——这个身份只存在于纸，不存在于笔。 */
    function addStaff(buf, n, ox, oy, cell, pal, jit) {
      var near = n >= cur - 1;
      var baseX = n * SPAN;
      var G = T.GROWTH;
      for (var j = 0; j < G.staff.length; j++) {
        push(buf, mk(0, G.staff[j], SPAN, 0.14, 'S', n, pal, { staff: 1 }),
             near, ox, oy, cell, baseX, pal, jit);
      }
    }

    function flush(buf, map, group) {
      var key;
      for (key in buf) {
        var el = map.get(key);
        if (!el) {
          el = document.createElementNS(NS, 'path');
          group.appendChild(el);
          map.set(key, el);
        }
        var B = buf[key];
        el.setAttribute('fill', B.color);
        el.setAttribute('fill-opacity', B.op !== undefined ? B.op : 1);
        /* 绘本墨线：统一深色外轮廓、圆头圆角。stroke='none' 的组也把宽度归零，
           否则复用的 path 会带着上一帧的粗边。 */
        if (B.sw > 0) {
          el.setAttribute('stroke', B.sc);
          el.setAttribute('stroke-width', B.sw.toFixed(2));
          el.setAttribute('stroke-linejoin', 'round');
          el.setAttribute('stroke-linecap', 'round');
        } else {
          el.setAttribute('stroke', 'none');
          el.setAttribute('stroke-width', '0');
        }
        el.setAttribute('d', B.d);
      }
      map.forEach(function (el, key) { if (!buf[key]) el.setAttribute('d', ''); });
    }

    function syncView(x0, x1) {
      var cell = view.cell;
      var ox = view.w / 2 - view.x * cell;
      var oy = view.groundY;
      var buf = Object.create(null);
      var sbuf = Object.create(null);
      blBuf = null;
      var p0 = Math.max(0, Math.floor(x0 / SPAN));
      var p1 = Math.min(Math.ceil(x1 / SPAN), cur);
      for (var n = p0; n <= p1; n++) {
        var rec = panelOf(n);
        var pal = rec.snap ? rec.snap.ev.palette : live.ev.palette;
        var jit = rec.snap ? rec.snap.ev.palJit : live.ev.palJit;
        var lim = n === cur ? Math.min(k, rec.strokes.length) : rec.strokes.length;
        addStrokes(buf, rec.strokes, lim, n, ox, oy, cell, pal, jit);
      }
      /* 谱线是纸，先于笔：铺满整个可见视口，不限 cur、不等幅开始写。
         笔尖走到哪，那里的谱线早就在了；它不会在笔尖处截断，
         也不会随新幅开始写而一段段冒出来。 */
      var s1 = Math.ceil(x1 / SPAN);
      for (var m = p0; m <= s1; m++) {
        var recS = m <= cur ? panelOf(m) : null;
        addStaff(sbuf, m, ox, oy, cell,
                 recS && recS.snap ? recS.snap.ev.palette : live.ev.palette,
                 recS && recS.snap ? recS.snap.ev.palJit : live.ev.palJit);
      }
      if (blBuf) {
        blBuf.op = (T.HALO.bloom * eff('glow') * (0.4 + 0.6 * live.vals.light)).toFixed(3);
      }
      flush(buf, pathMap, worldG);
      flush(blBuf ? { BL: blBuf } : {}, bloomMap, bloomG);
      flush(sbuf, staffMap, staffG);
    }

    var airPath = document.createElementNS(NS, 'path');
    airG.appendChild(airPath);

    function syncAir() {
      /* 笔尖光点也用前沿：镜头锁的是它，光点就得是它，不能各画各的。 */
      var F = frontier();
      var ap = PAL[wrap(live.ev.palette, PAL.length)];
      /* 笔尖是全场最亮的一点：纸白高光，低烈度下收成一根暗线。 */
      airPath.setAttribute('fill', state.lowPower
        ? T.mix(ap.glow, ap.bg, 0.62)
        : ap.glow);
      var sx = (view.w / 2 - view.x * view.cell + F.x * view.cell).toFixed(2);
      var sy = (view.groundY - F.y * view.cell).toFixed(2);
      var m = (view.cell * 0.4).toFixed(2);
      airPath.setAttribute('d', 'M' + sx + ' ' + sy + 'h' + m + 'v' + m + 'h-' + m + 'z');
    }

    /* 事件界：只有起点，没有终点。上半段一根暗细线。 */
    var markPath = document.createElementNS(NS, 'path');
    markG.appendChild(markPath);

    function eventLoc(n) {
      if (n < 0) return { lo: -1, label: 0, def: live.ev, vals: live.vals };
      var rec = panelOf(n);
      return {
        lo: rec.snap ? rec.snap.evStart : live.evStart,
        label: rec.snap ? rec.snap.evId : live.evId,
        def: rec.snap ? rec.snap.ev : live.ev,
        vals: rec.snap ? rec.snap.vals : live.vals
      };
    }
    function eventOf(n) { return eventLoc(n).def; }
    function ruleOf(n) { var s = snapOf(n); return s ? s.ruleId : Object.keys(T.RULE)[0]; }

    function syncMarks(x0, x1) {
      var mp = PAL[wrap(live.ev.palette, PAL.length)];
      /* 事件界标是第一版的暗细线，不是霓虹扫描标记。 */
      markPath.setAttribute('fill',
        eff('contrast') < 1 ? T.mix(mp.line, mp.bg, 0.62) : T.mix(mp.line, mp.bg, 0.42));
      var cell = view.cell;
      var ox = view.w / 2 - view.x * cell;
      var oy = view.groundY;
      var p0 = Math.max(0, Math.floor(x0 / SPAN));
      var p1 = Math.min(Math.ceil(x1 / SPAN), cur);
      var d = '';
      for (var n = p0; n <= p1; n++) {
        if (eventLoc(n).lo !== n) continue;
        var sx = (ox + n * SPAN * cell).toFixed(2);
        var w = (cell * 0.10).toFixed(2);
        var h = (CEIL * cell * 0.45).toFixed(2);
        d += 'M' + sx + ' ' + (oy - CEIL * cell).toFixed(2) + 'h' + w + 'v' + h + 'h-' + w + 'z';
      }
      markPath.setAttribute('d', d);
    }

    /* 光晕。位置、半径、强度吃活状态（连续漂移），脉动只做慢呼吸。 */
    /* 光的取景：位置仍然来自活状态（glowX / glowY / haloR / drift 都是慢漂移项），
       但「形状」换成了地平线上的一排灯——见 HALO 表的注释。
       核仍是纸白雾，光穹偏钠灯的暖，霓虹只留给灯带：大面积不彩，边上有彩。
       函数名仍是 halo：它是「这一口气里的光」的读数口，形状是看的那一层决定的。 */
    function halo(now) {
      var v = live.vals, P = PAL[wrap(live.ev.palette, PAL.length)];
      var pulse = 0.55 + 0.45 * Math.sin(now * T.HALO.breathe + live.evId * 1.3);
      return {
        x: v.glowX, y: v.glowY,
        radius: v.haloR,
        intensity: v.haloS * (0.4 + 0.6 * eff('glow')) * (0.4 + 0.6 * eff('flash')),
        pulse: pulse,
        drift: v.drift,
        core: P.glow, outer: T.mix(P.haze, P.neon, 0.45), accent: P.accent,
        neon: P.neon, neon2: P.neon2,
        bg: P.bg, hue: live.ev.haloHue,
        count: 1 + Math.floor(v.light * T.HALO.bars)
      };
    }

    function skyColor() {
      if (!eff('flash')) return skyBase || PAL[0].bg;
      return PAL[wrap(live.ev.palette, PAL.length)].bg;
    }
    function setSky(color) {
      if (skyBase === null) skyBase = color;
      curBg = color;
      skyEl.setAttribute('fill', color);
    }

    /* 旋钮。setKnob 按 SCHEMA 钳制；applyPreset 一次注入一套脾气。 */
    function schemaOf(k) {
      for (var i = 0; i < T.SCHEMA.length; i++) if (T.SCHEMA[i].k === k) return T.SCHEMA[i];
      return null;
    }
    function setKnob(k, v) {
      var sc = schemaOf(k);
      if (!sc || typeof v !== 'number' || !Number.isFinite(v)) return false;
      state[k] = clamp(v, sc.min, sc.max);
      return true;
    }
    function getKnob(k) { return eff(k); }
    function applyPreset(name) {
      var list = T.PRESETS, i, P;
      for (i = 0; i < list.length; i++) if (list[i].name === name) { P = list[i]; break; }
      if (!P) return false;
      for (var kk in P.params) if (P.params.hasOwnProperty(kk)) setKnob(kk, P.params[kk]);
      return true;
    }

    var api = {
      step: step,
      syncView: syncView,
      syncAir: syncAir,
      syncMarks: syncMarks,
      halo: halo,      /* 旧名保留：光状态的老读数口，别处还在用 */
      light: halo,
      setView: function (v) { view = v; },
      setSky: setSky,
      skyColor: skyColor,
      compose: compose,
      panelOf: panelOf,
      snapOf: snapOf,
      ruleOf: ruleOf,
      eventLoc: eventLoc,
      eventOf: eventOf,
      eff: eff,
      state: state,
      TABLES: T,
      live: function () { return live; },
      generated: function () { return generated; },
      perturbCount: function () { return live.perturbCount; },
      born: function () { return born; },
      done: function () { return done; },
      cur: function () { return cur; },
      written: function () { return k; },
      eventLabel: function () { return live.evId; },
      spawnX: function () { return cur * SPAN + SPAN / 2; },
      frontier: frontier,
      frontierX: frontierX,
      /* 兼容别名：回望档的旧口径，现在也挂在连续前沿上，不再是第二套阶梯。 */
      cameraX: function () { return frontierX() - SPAN * 2; },
      topoAt: function (c) { var v = topoMap.get(c); return v === undefined ? 0 : v; },
      setKnob: setKnob,
      getKnob: getKnob,
      applyPreset: applyPreset,
      cache: function () { return cache; },
      lowPower: function () { return state.lowPower; },
      setLowPower: function (v) { state.lowPower = v ? 1 : 0; },
      paths: function () { return pathMap; },
      shadePaths: function () { return bloomMap; },
      bg: function () { return curBg; },
      /* 当前事件的主霓虹。纸层拿它给页边红线染一点色——
         城里的灯换了色温，纸的边缘跟着换，两者才是同一个晚上。 */
      neonTint: function () { return PAL[wrap(live.ev.palette, PAL.length)].neon; }
    };

    /* 二代读数口。钩子只在玩家真的开始这一卷之后才挂，预热不敲。 */
    api.setPanelHook = function (fn) { onPanelHook = typeof fn === 'function' ? fn : null; };
    api.finishedSnap = function () { return panelOf(Math.max(0, done - 1)).snap; };
    api.panelHook = function () { return onPanelHook; };
    ctx.score = api;
    return api;
  }
});
