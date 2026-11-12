/* 事件总线。二代的模块之间不互相点名：谁都不 import 谁，只认一件事发生了。
 *
 * 规矩：
 *   - on 返回退订函数；同一个回调重复挂同一事件只挂一次（幂等，界面重画不会叠监听）。
 *   - emit 不让一个订阅者炸掉整条链，但把异常记进 errors，冒烟测试会盯着它。
 *   - log 只留最近 240 条，给测试回看「这一轮到底发生过什么」，不进存档。
 * 没有随机，没有定时器，没有 DOM。 */
window.BT = window.BT || {};

BT.bus = (function () {
  var subs = {};
  var log = [];
  var errors = [];

  function on(name, fn) {
    if (typeof name !== 'string' || typeof fn !== 'function') return function () {};
    if (!subs[name]) subs[name] = [];
    if (subs[name].indexOf(fn) < 0) subs[name].push(fn);
    return function () { off(name, fn); };
  }
  function off(name, fn) {
    var a = subs[name];
    if (!a) return;
    var i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  }
  function emit(name, payload) {
    log.push({ ev: name, at: log.length, data: payload });
    if (log.length > 240) log.shift();
    var a = subs[name] || [], i;
    for (i = 0; i < a.length; i++) {
      try { a[i](payload, name); }
      catch (e) { errors.push(name + ': ' + (e && e.message ? e.message : String(e))); }
    }
  }

  return {
    on: on,
    off: off,
    emit: emit,
    log: function () { return log.slice(); },
    errors: function () { return errors.slice(); },
    names: function () { return Object.keys(subs); },
    clear: function () { log = []; errors = []; },
    /* 只在测试里用：把订阅也一起清掉，免得第二个 jsdom 实例串台。 */
    reset: function () { subs = {}; log = []; errors = []; }
  };
})();
