/* 共用零件。册页、校样单、界标、调音台长得像一家人，靠的不是复制粘贴，
 * 是这里几件小东西；新界面不必自己发明边框、编号与字距。
 *
 * 规矩：不碰 transform（无头会整幅静默不画）、不用 canvas、不建定时器。
 * 所有「动」只许改 opacity 与文字，位置写在 CSS 里。 */
window.BT = window.BT || {};

BT.ui = (function () {
  var NS = 'http://www.w3.org/2000/svg';

  function dom(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag), k;
    if (attrs) for (k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pad(n, w) {
    var s = String(Math.abs(Math.floor(n)));
    while (s.length < (w || 3)) s = '0' + s;
    return (n < 0 ? '-' : '') + s;
  }
  function num(n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  /* 细刻度条：册页与 HUD 共用的一把尺子，返回值是 DOM 元素，不是字符串。 */
  function ticks(filled, total, max) {
    var wrap = dom('div', 'ui-ticks');
    var n = Math.min(max || 36, total), i;
    for (i = 0; i < n; i++) {
      var d = dom('i', i < filled ? 'on' : '');
      wrap.appendChild(d);
    }
    return wrap;
  }
  /* 一枚按键样式的按钮。data-k 留给统一事件委托，避免每重画一次多挂一个监听。 */
  function button(label, key, note) {
    var b = dom('button', 'ui-btn', label);
    b.type = 'button';
    b.setAttribute('data-k', key);
    if (note) b.title = note;
    return b;
  }
  function head(zh, en, right) {
    var h = dom('div', 'ui-head');
    h.appendChild(dom('span', 'ui-head-zh', zh));
    h.appendChild(dom('span', 'ui-head-en', en));
    if (right) h.appendChild(dom('span', 'ui-head-right', right));
    return h;
  }
  function rule() { return dom('div', 'ui-rule'); }

  return {
    NS: NS, dom: dom, svg: svg, pad: pad, num: num,
    ticks: ticks, button: button, head: head, rule: rule
  };
})();
