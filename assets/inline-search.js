/**
 * 左侧栏内联搜索
 * ---------------------------------------------------------------------------
 * 官方搜索只有「弹窗」形态（点按钮 → showModal），没有内联结果功能。
 * 这里把左栏的搜索按钮替换成真正的输入框，边输入边在下方罗列结果。
 *
 * 数据来自 /search.json（Stellar 本地搜索索引，字段：title/path/content/tags/anchors）
 * 索引在首次聚焦时才加载，不影响首屏。
 */

(function () {
  var INDEX_URL = '/search.json';
  var MAX_RESULTS = 8;
  var STORE_KEY = 'stellar.inlineSearch.index';

  var indexPromise = null;
  var index = null;
  var activeIdx = -1;
  var results = [];

  function loadIndex() {
    if (indexPromise) return indexPromise;
    var cached = null;
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch (e) { cached = null; }
    if (Array.isArray(cached) && cached.length) {
      index = cached;
      indexPromise = Promise.resolve(cached);
      return indexPromise;
    }
    indexPromise = fetch(INDEX_URL, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) {
        index = Array.isArray(list) ? list : [];
        try { sessionStorage.setItem(STORE_KEY, JSON.stringify(index)); } catch (e) { /* 超配额时忽略 */ }
        return index;
      })
      .catch(function () { return []; });
    return indexPromise;
  }

  // 给结果链接附加关键词，供文章页定位与高亮
  function withQuery(path, q) {
    var kw = String(q || '').trim();
    if (!kw) return path;
    return path + (path.indexOf('?') >= 0 ? '&' : '?') + 's=' + encodeURIComponent(kw);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function tokens(q) {
    return String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  }

  function search(q) {
    var ts = tokens(q);
    if (!ts.length || !index) return [];
    var out = [];
    for (var i = 0; i < index.length; i++) {
      var item = index[i];
      var title = String(item.title || '').toLowerCase();
      var tagsRaw = item.tags;
      var tags = Array.isArray(tagsRaw) ? tagsRaw.join(' ') : String(tagsRaw || '');
      tags = tags.toLowerCase();
      var content = String(item.content || '').toLowerCase();
      var hay = title + ' ' + tags + ' ' + content;
      var score = 0;
      var ok = true;
      for (var t = 0; t < ts.length; t++) {
        var tok = ts[t];
        var inTitle = title.indexOf(tok) !== -1;
        var inTags = tags.indexOf(tok) !== -1;
        var inBody = content.indexOf(tok) !== -1;
        if (!inTitle && !inTags && !inBody) { ok = false; break; }
        score += inTitle ? 10 : 0;
        score += inTags ? 5 : 0;
        score += inBody ? 1 : 0;
      }
      if (!ok) continue;
      out.push({ item: item, score: score, hit: ts[0] });
    }
    out.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.item.title || '').localeCompare(String(b.item.title || ''));
    });
    return out.slice(0, MAX_RESULTS);
  }

  function snippet(item, hit) {
    var text = String(item.content || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    var pos = hit ? text.toLowerCase().indexOf(hit) : -1;
    if (pos < 0) pos = 0;
    var start = Math.max(0, pos - 28);
    var str = text.slice(start, start + 90);
    if (start > 0) str = '…' + str;
    if (start + 90 < text.length) str += '…';
    return str;
  }

  function highlight(text, ts) {
    var safe = esc(text);
    ts.forEach(function (tok) {
      if (!tok) return;
      var re = new RegExp('(' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      safe = safe.replace(re, '<mark>$1</mark>');
    });
    return safe;
  }

  function mount() {
    var leftbar = document.getElementById('leftbar-region');
    if (!leftbar || leftbar.querySelector('.inline-search')) return;
    var host = leftbar.querySelector('.brand-search');
    if (!host) return;

    var box = document.createElement('div');
    box.className = 'inline-search';
    box.innerHTML =
      '<div class="inline-search__bar">' +
        '<svg class="inline-search__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
          '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13m4.8 11.3L20 20"/>' +
        '</svg>' +
        '<input class="inline-search__input" type="search" autocomplete="off" spellcheck="false" placeholder="搜索" aria-label="站内搜索">' +
        '<kbd class="inline-search__hint">⌘K / Ctrl+K</kbd>' +
      '</div>' +
      '<div class="inline-search__panel" hidden><div class="inline-search__list"></div></div>';

    host.appendChild(box);

    var input = box.querySelector('.inline-search__input');
    var panel = box.querySelector('.inline-search__panel');
    var list = box.querySelector('.inline-search__list');

    function closePanel() {
      panel.hidden = true;
      activeIdx = -1;
    }

    function paint() {
      if (!results.length) {
        list.innerHTML = '<div class="inline-search__empty">没有找到相关内容</div>';
        panel.hidden = false;
        return;
      }
      list.innerHTML = results.map(function (r, i) {
        var item = r.item;
        return '<a class="inline-search__item' + (i === activeIdx ? ' is-active' : '') + '" href="' + esc(withQuery(item.path, input.value)) + '">' +
          '<div class="inline-search__title">' + highlight(item.title || '(无标题)', tokens(input.value)) + '</div>' +
          '<div class="inline-search__snippet">' + highlight(snippet(item, r.hit), tokens(input.value)) + '</div>' +
          '</a>';
      }).join('');
      panel.hidden = false;
    }

    function refresh() {
      var q = input.value.trim();
      if (!q) { results = []; closePanel(); list.innerHTML = ''; return; }
      indexPromise.then(function () {
        results = search(q);
        activeIdx = -1;
        paint();
      });
    }

    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(refresh, 120);
    });
    input.addEventListener('focus', function () {
      loadIndex();
      if (input.value.trim()) refresh();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!results.length) return;
        e.preventDefault();
        activeIdx = e.key === 'ArrowDown'
          ? (activeIdx + 1) % results.length
          : (activeIdx - 1 + results.length) % results.length;
        paint();
      } else if (e.key === 'Enter') {
        var target = results[activeIdx >= 0 ? activeIdx : 0];
        if (target) { window.location.href = withQuery(target.item.path, input.value); }
      } else if (e.key === 'Escape') {
        if (panel.hidden) { input.blur(); }
        else { closePanel(); }
      }
    });
    input.addEventListener('blur', function () {
      setTimeout(closePanel, 150);
    });

    // 记录点击的关键词：PJAX 局部导航可能不保留查询参数
    list.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('.inline-search__item') : null;
      if (!a) return;
      try { sessionStorage.setItem('stellar.searchKeyword', input.value.trim()); } catch (err) { /* 忽略 */ }
    });

    document.addEventListener('click', function (e) {
      if (!box.contains(e.target)) closePanel();
    });

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });

    document.addEventListener('stellar:partial-navigation', function () {
      input.value = '';
      results = [];
      closePanel();
      list.innerHTML = '';
    });
  }

  var tries = 0;
  function retry() {
    mount();
    if (++tries < 8 && !document.querySelector('#leftbar-region .inline-search')) {
      setTimeout(retry, 250);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', retry);
  else retry();
})();