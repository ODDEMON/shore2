/* 登记处。世界模块往这里挂，总台按登记顺序启动。
   规矩：一个模块只有一个 id，重复挂同一个 id 是顶掉而不是叠加。 */
window.BT = window.BT || {};

BT.reg = (function () {
  var mods = [];
  return {
    add: function (m) {
      for (var i = 0; i < mods.length; i++) {
        if (mods[i].id === m.id) { mods[i] = m; return; }
      }
      mods.push(m);
    },
    list: function () {
      return mods.map(function (m) { return m.id; });
    },
    start: function (ctx) {
      for (var i = 0; i < mods.length; i++) {
        if (mods[i].mount) mods[i].mount(ctx);
      }
    }
  };
})();
