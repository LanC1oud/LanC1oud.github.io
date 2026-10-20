/**
 * 背景引导脚本（必须同步执行，放在 head 里）
 * ---------------------------------------------------------------------------
 * 目的：在浏览器绘制第一帧之前就决定好随机背景，避免先闪一下默认背景。
 * 这里不发起网络请求，只用：
 *   1) random-bg.js 上次缓存在 localStorage 的列表（可能是图床地址）
 *   2) 内置的本地图片列表
 * 选好之后立刻设置 CSS 变量 + 给 <html> 加类，CSS 随即生效。
 */

(function () {
  var LIST_KEY = 'stellar.bgList.v2';
  var PICK_KEY = 'stellar.currentBg';
  var LOCAL = [
    '/img/bg1-opt.jpg',
    '/img/bg2-opt.jpg',
    '/img/bg3-opt.jpg',
    '/img/bg4-opt.jpg',
    '/img/bg5-opt.jpg'
  ];

  function readList() {
    try {
      var raw = localStorage.getItem(LIST_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.list) || !obj.list.length) return null;
      // 24 小时内有效
      if (Date.now() - (obj.ts || 0) > 24 * 60 * 60 * 1000) return null;
      return obj.list;
    } catch (e) { return null; }
  }

  var list = readList() || LOCAL;
  var last = null;
  try { last = sessionStorage.getItem(PICK_KEY); } catch (e) { last = null; }

  var pool = list.length > 1 ? list.filter(function (u) { return u !== last; }) : list;
  var url = pool[Math.floor(Math.random() * pool.length)] || LOCAL[0];

  try { sessionStorage.setItem(PICK_KEY, url); } catch (e) { /* 忽略 */ }

  var root = document.documentElement;
  root.style.setProperty('--stellar-bg-url', 'url("' + url + '")');
  root.classList.add('has-random-bg');

  // 预加载，缩短图片出现的时间
  try {
    var link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  } catch (e) { /* 忽略 */ }
})();