/* 册页的编号工具，不是世界的随机源。
 *
 * 二代把「种子」整个撤掉了：世界不按一行字复现，每次开卷都是新的一条岸——
 * 活状态递推 + core/life.js 那群互相追逐的粒子，是它活着的证据，不许驯化。
 * 这一层只做两件事：把字符串散成一个数（hash），以及给册页固定编号用的
 * 无状态散列（unit / pick）。hash 不消耗流、不产生世界、不进存档。
 * 「岸不留，册留」：会变的都交给世界，要记的都留给册子。
 *
 * 特意不提供 rng(seed)：连一条「按种子吐数」的流都不留在工具箱里，
 * 免得后来的人顺手把世界又接回去。 */
window.BT = window.BT || {};

BT.gen = (function () {
  function hash(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  return {
    hash: hash,
    /* 无状态散列。只给「册页的固定编号」用：第几号版样、纸纹落在哪、
       残页停在哪个落点。它不养第二条随机流、不产生世界、也不进存档。
       世界唯一的扰动来自 core/life.js 的粒子生命场，不在这里。 */
    unit: function (key) { return (hash(String(key)) % 1000000) / 1000000; },
    pick: function (key, arr) { return arr[hash(String(key)) % arr.length]; }
  };
})();
