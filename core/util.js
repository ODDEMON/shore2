/* 小工具。只放真正被两个以上地方用到的东西，否则就地写。 */
window.BT = window.BT || {};

BT.u = (function () {
  return {
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp: function (a, b, t) { return a + (b - a) * t; }
  };
})();
