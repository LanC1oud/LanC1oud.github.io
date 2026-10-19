/**
 * 搜索结果定位与高亮
 * ---------------------------------------------------------------------------
 * 从 /recent/ 或左栏搜索点击进入文章时，URL 会带上 ?s=关键词。
 * 本脚本在文章正文里找到第一处匹配，滚动到该位置并短暂高亮。
 *
 * 注意：会跳过 KaTeX 公式、代码块等特殊结构，避免破坏渲染。
 */

(function () {
  var HIGHLIGHT_MS = 2600;     // 高亮持续时长
  var MAX_SCAN = 4000;         // 最多检查的文本节点数，防止大页面卡顿

  function getKeyword() {
    var q = '';
    try {
      q = new URLSearchParams(window.location.search).get('s') || '';
    } catch (e) { q = ''; }
    if (!q) {
      try { q = sessionStorage.getItem('stellar.searchKeyword') || ''; } catch (e) { q = ''; }
    }
    return q.trim();
  }

  function clearKeyword() {
    try { sessionStorage.removeItem('stellar.searchKeyword'); } catch (e) { /* 忽略 */ }
  }

  function skipTag(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'textarea' || tag === 'code') return true;
    if (el.classList && (el.classList.contains('katex') || el.classList.contains('katex-display') || el.classList.contains('highlight'))) return true;
    return false;
  }

  function hasSkippedAncestor(node, stopAt) {
    var el = node.parentElement;
    while (el && el !== stopAt) {
      if (skipTag(el)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function findMatch(root, kw) {
    var lower = kw.toLowerCase();
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || node.nodeValue.length < kw.length) return NodeFilter.FILTER_REJECT;
        if (node.nodeValue.toLowerCase().indexOf(lower) === -1) return NodeFilter.FILTER_REJECT;
        if (hasSkippedAncestor(node, root)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var count = 0;
    var node;
    while ((node = walker.nextNode())) {
      if (++count > MAX_SCAN) break;
      return node;
    }
    return null;
  }

  function wrap(node, kw) {
    var text = node.nodeValue;
    var idx = text.toLowerCase().indexOf(kw.toLowerCase());
    if (idx < 0) return null;
    var mark = document.createElement('mark');
    mark.className = 'search-hit';
    mark.textContent = text.slice(idx, idx + kw.length);
    var after = node.splitText(idx);
    after.nodeValue = after.nodeValue.slice(kw.length);
    node.parentNode.insertBefore(mark, after);
    return mark;
  }

  function run() {
    var kw = getKeyword();
    if (!kw) return;
    clearKeyword();

    var root = document.querySelector('article.md-text.content') || document.querySelector('.md-text.content') || document.querySelector('main');
    if (!root) return;

    var node = findMatch(root, kw);
    if (!node) return;

    var mark = wrap(node, kw);
    if (!mark) return;

    // 清理 URL 中的参数，避免刷新后重复高亮
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    } catch (e) { /* 忽略 */ }

    // 等布局稳定后再滚动
    requestAnimationFrame(function () {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    setTimeout(function () {
      mark.classList.add('is-fading');
      setTimeout(function () {
        if (mark.parentNode) {
          mark.parentNode.replaceChild(document.createTextNode(mark.textContent), mark);
          mark.parentNode && mark.parentNode.normalize();
        }
      }, 600);
    }, HIGHLIGHT_MS);
  }

  function start() {
    // 图片等资源可能改变布局，稍等再定位
    setTimeout(run, 260);
  }

  // PJAX 局部导航后重新定位
  document.addEventListener('stellar:navigation-complete', function () {
    setTimeout(run, 300);
  });

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();