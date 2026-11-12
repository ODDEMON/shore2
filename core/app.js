/* 总台。只负责把每一帧连同时间送到世界上，不管世界上发生了什么。
   时间流速可以按下去（降到五分之一），但按不停——世界不等人。 */
window.BT = window.BT || {};

BT.app = (function () {
  var running = false;
  var scale = 1;
  var last = 0;

  function loop(t) {
    if (!running) return;
    var now = t / 1000;
    var dt = last ? Math.min(0.06, now - last) : 0.016;
    last = now;
    if (BT.app.onframe) BT.app.onframe(dt * scale, now);
    requestAnimationFrame(loop);
  }

  return {
    onframe: null,
    timeScale: function (s) { scale = s; },
    start: function () {
      if (running) return;
      running = true;
      last = 0;
      requestAnimationFrame(loop);
    },
    stop: function () { running = false; }
  };
})();
