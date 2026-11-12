/* 电波版 · 五张声明式表。数据与逻辑分离：改脾气改这里，不改一行判断。
 *
 * 为什么先立表：狂乱不是「把很多效果堆上去」，是一组可以逐个关掉的量化上限。
 * 表里的数来自 oddemon-typo/outputs/denpa-variants 六组实测参数，
 * 映射到本家 SVG + CSS 能实现的量（那边是 Canvas 逐像素，这边不许用 canvas）。
 * 参数只在本文件定义一次；eff(k) 是唯一取值口，LOWCAP 是唯一钳制口。
 *
 * 注释只写为什么，不写是什么。 */
window.BT = window.BT || {};

/* 1. 默认脾气。frenzy 是主旋钮，其余各项都乘它。 */
BT.DENPA_TABLE = {
  frenzy: 1.00,
  chroma: 26,          // RGB 三通道最大横向错位（px），对应参照的 rgbShift 21~38
  chromaPulse: 0.86,   // 色差呼吸幅度
  slice: 0.62,         // 切片撕裂幅度 0..1
  sliceN: 30,          // 参与撕裂的横条数（元素池上限 40）
  scan: 0.30,          // 扫描线浓度
  scanFreq: 3,         // 扫描线密度（px 周期）
  noise: 0.26,         // 噪点
  glyphs: 0.72,        // 漂浮乱码密度
  glyphSpeed: 1.10,
  burst: 0.30,         // 事件触发的故障闪白峰值
  echo: 0.42,          // 波形重影
  bloom: 0.78,         // 辉光
  contrast: 1.45,      // 全局对比（由叠加层实现，不用 filter）
  warp: 18,            // 电波干涉振幅（px）
  warpFreq: 0.014,
  melt: 0.24,          // 文字融化：字距抖动量
  hue: 300,
  spread: 200,
  sat: 1.30,
  lumi: 0.62,
  jitter: 10,
  corrupt: 0.27,
  vignette: 0.56,
  flashDecay: 2.60,    // 闪白衰减速度（每秒）
  glyphHold: 0.42,     // 乱码换字间隔（秒）
  wave: 6,             // 干涉波带条数
  barOp: 0.34,
  boostOp: 0.30
};

/* 2. 低烈度硬上限。狂乱可以给，关掉的能力必须一起给：
    频闪、反相、爆发一律归零，色差与撕裂压到几乎不参与，对比度回到 1.08。
    这是安全出口，不是「柔和预设」。 */
BT.DENPA_LOWCAP = {
  frenzy: 0.34,
  chroma: 3,
  chromaPulse: 0,
  slice: 0.10,
  sliceN: 6,
  scan: 0.10,
  scanFreq: 2,
  noise: 0.05,
  glyphs: 0.10,
  glyphSpeed: 0.30,
  burst: 0,
  echo: 0.14,
  bloom: 0.14,
  contrast: 1.08,
  warp: 4,
  melt: 0.06,
  jitter: 1,
  corrupt: 0.04,
  vignette: 0.40,
  flashDecay: 8,
  barOp: 0.10,
  boostOp: 0.06
};

/* 3. 六套色板。用户把配色钉死了：正红 正黄 正蓝 正绿 正紫 亮粉 亮青。
     七色全部进表，不调高级灰、不做粉紫近白、不加柔光。底一律纯黑，
     体量一律纯正原色，骨线一律纯白——对比度只靠「纯色 / 黑 / 白」三档拉开。
     这是 score.js 唯一的色板来源；CSS 与 UI 只引用同一组色值，不抄第二份。 */
BT.DENPA_PALETTE = [
  { name: 'PRIMARY RED',
    bg: '#000000', deep: '#3a0000', plane: '#ff0000', line: '#ffffff',
    accent: '#ffff00', glow: '#ffffff', haze: '#200000', ink: '#000000',
    neon: '#00ffff', neon2: '#ffff00' },
  { name: 'PRIMARY YELLOW',
    bg: '#000000', deep: '#3a3a00', plane: '#ffff00', line: '#ffffff',
    accent: '#ff0000', glow: '#ffffff', haze: '#202000', ink: '#000000',
    neon: '#ff2d95', neon2: '#0000ff' },
  { name: 'PRIMARY BLUE',
    bg: '#000000', deep: '#000080', plane: '#0000ff', line: '#ffffff',
    accent: '#00ffff', glow: '#ffffff', haze: '#000020', ink: '#000000',
    neon: '#ffff00', neon2: '#ff2d95' },
  { name: 'PRIMARY GREEN',
    bg: '#000000', deep: '#003a00', plane: '#00ff00', line: '#ffffff',
    accent: '#ffff00', glow: '#ffffff', haze: '#002000', ink: '#000000',
    neon: '#8000ff', neon2: '#ff0000' },
  { name: 'PRIMARY VIOLET',
    bg: '#000000', deep: '#20003a', plane: '#8000ff', line: '#ffffff',
    accent: '#ff2d95', glow: '#ffffff', haze: '#120020', ink: '#000000',
    neon: '#00ff00', neon2: '#00ffff' },
  { name: 'HOT PINK',
    bg: '#000000', deep: '#3a0020', plane: '#ff2d95', line: '#ffffff',
    accent: '#00ffff', glow: '#ffffff', haze: '#200010', ink: '#000000',
    neon: '#0000ff', neon2: '#ffff00' }
];

/* 七色清单单独立一张常量，供断言核对「一个都没少」。 */
BT.DENPA_PRIMARIES = ['#ff0000', '#ffff00', '#0000ff', '#00ff00',
                      '#8000ff', '#ff2d95', '#00ffff'];

/* 4. 乱码词料。数字串什么都不指涉，这本身就是答案。
    池子定死，绝不随时间长大；换字用无状态散列，不另起随机流。 */
BT.DENPA_GLYPH = {
  numbers: ['-190754078740', '4671060894715079375', '00 / 01 / 02',
            '-000000000001', '404', '1÷0', '0.000', '999999'],
  words: ['是 等 于 否', 'RIDICULIOUS', 'SOCIALLISM', 'DENPA', 'GLOWITH',
          '醒 醒', '湮 灭', 'Q.E.D.', 'NO SIGNAL', 'NOW///'],
  marks: ['、、、、、', '————**————', '///////', '++++++', '≡≡≡', '▓▓░░'],
  tail: ['快停下来！', '现在明明无事发生啊', '证明初步完毕', '这一点到为止'],
  count: 24
};

/* 5. 电波干涉波带。六条相位错开的正弦，坐标当场算进 d，不用 transform。 */
BT.DENPA_BANDS = {
  count: 7,
  amp: 0.055,
  freq: 0.014,
  phase: 0.021,
  thickness: [0.8, 2.8],
  colors: ['#ff0000', '#ffff00', '#0000ff', '#00ff00',
           '#8000ff', '#ff2d95', '#00ffff'],
  op: 0.34,
  steps: 28
};

/* 7. 静。对「狂乱」的整个否定，写成一个可撤销的开关，不删任何一层：
     文字层、噪层、纸的细线全部退场，只留纯黑底、纯色体量与地平光。
     去掉 body 的 quiet 类即回到狂乱版；参数侧 denpa.js 也读这张表。 */
BT.QUIET_TABLE = {
  enabled: true,
  text: false,        // 所有文字 DOM 层
  noise: false,       // 扫描线 / 噪点 / 切片 / 色差 / 乱码 / 波形 / 闪白
  paper: false,       // 横格 / 页边线 / 页码 / 地脚线
  folio: false,       // 装订孔 / 裁切标 / 套印规 / 版次尺
  air: false,         // 极淡浮尘
  burst: false,       // 事件闪白
  chroma: 0,          // UI 色差
  melt: 0,            // 字距融化
  vignette: 0.34      // 只留一圈极淡的沉边，让画面收住
};

/* 6. 调音台控件声明。面板由这张表生成，加旋钮不改渲染代码。 */
BT.DENPA_SCHEMA = [
  { k: 'frenzy', l: '狂乱', min: 0, max: 1, step: 0.01 },
  { k: 'chroma', l: '色差', min: 0, max: 48, step: 1 },
  { k: 'slice', l: '撕裂', min: 0, max: 1, step: 0.01 },
  { k: 'burst', l: '爆发', min: 0, max: 1, step: 0.01 }
];
