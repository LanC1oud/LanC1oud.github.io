/**
 * 随机背景图 + 左栏同色渐变
 * ---------------------------------------------------------------------------
 * 每次进入页面时，从 GitHub 图床的指定目录里随机挑一张图作为背景，
 * 并提取该图的主色，用主色生成左侧栏的渐变，让两者色调一致。
 *
 * 数据来源：jsDelivr 的公开文件列表接口（无需 token、CORS 全开）
 * 图片地址：gcore.jsdelivr.net 镜像（在你的网络里可直连）
 *
 * 想换图床 / 换目录，只改下面 CONFIG。
 */

(function () {
  var CONFIG = {
    owner: 'LanC1oud',
    repo: 'PicGo',
    branch: 'main',
    folder: '/img/background/',   // 图床里放壁纸的目录
    imageExt: /\.(jpe?g|png|webp|gif|avif)$/i,
    listApi: 'https://data.jsdelivr.com/v1/package/gh/{owner}/{repo}@{branch}/flat',
    rawBase: 'https://gcore.jsdelivr.net/gh/{owner}/{repo}@{branch}',
    lastKey: 'stellar.lastBg',
    cacheKey: 'stellar.bgList.v2',
    cacheTtl: 24 * 60 * 60 * 1000   // 列表缓存 24 小时
  };

  // 列表接口拉不到时的兜底图（同站资源，永远可用）
  var FALLBACK = [
    '/img/bg1-opt.jpg',
    '/img/bg2-opt.jpg',
    '/img/bg3-opt.jpg',
    '/img/bg4-opt.jpg',
    '/img/bg5-opt.jpg'
  ];

  // 手动列表：接口列表不可用时使用（jsDelivr 的文件元数据更新很慢）
  // 新增壁纸时，在这里补一行即可
  var MANUAL_LIST = [
    'https://gcore.jsdelivr.net/gh/LanC1oud/PicGo@main/img/background/bg1-opt.jpg',
    'https://gcore.jsdelivr.net/gh/LanC1oud/PicGo@main/img/background/bg2-opt.jpg',
    'https://gcore.jsdelivr.net/gh/LanC1oud/PicGo@main/img/background/bg3-opt.jpg',
    'https://gcore.jsdelivr.net/gh/LanC1oud/PicGo@main/img/background/bg4-opt.jpg',
    'https://gcore.jsdelivr.net/gh/LanC1oud/PicGo@main/img/background/bg5-opt.jpg'
  ];

  function buildListUrl() {
    return CONFIG.listApi
      .replace('{owner}', CONFIG.owner)
      .replace('{repo}', CONFIG.repo)
      .replace('{branch}', CONFIG.branch);
  }

  function buildImageUrl(path) {
    return CONFIG.rawBase
      .replace('{owner}', CONFIG.owner)
      .replace('{repo}', CONFIG.repo)
      .replace('{branch}', CONFIG.branch) + path;
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CONFIG.cacheKey);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.list) || !obj.list.length) return null;
      if (Date.now() - (obj.ts || 0) > CONFIG.cacheTtl) return null;
      return obj.list;
    } catch (e) { return null; }
  }

  function writeCache(list) {
    try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ ts: Date.now(), list: list })); } catch (e) { /* 忽略 */ }
  }

  function readStaleCache() {
    try {
      var raw = localStorage.getItem(CONFIG.cacheKey);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return obj && Array.isArray(obj.list) && obj.list.length ? obj.list : null;
    } catch (e) { return null; }
  }

  function pick(list) {
    if (!list.length) return null;
    var last = null;
    try { last = sessionStorage.getItem(CONFIG.lastKey); } catch (e) { last = null; }
    var pool = list.length > 1 ? list.filter(function (u) { return u !== last; }) : list;
    var chosen = pool[Math.floor(Math.random() * pool.length)];
    try { sessionStorage.setItem(CONFIG.lastKey, chosen); } catch (e) { /* 忽略 */ }
    return chosen;
  }

  // 把图片画到 24x24 画布上求平均色
  // 提取画面中最突出的两种颜色（按色相分桶、按饱和度加权），
  // 比"平均色"准得多：像橙色车厢+蓝色车窗这种双色画面不会被混成脏褐色。
  function extractPalette(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        try {
          var size = 40;
          var canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, size, size);
          var data = ctx.getImageData(0, 0, size, size).data;

          var buckets = {};
          var sum = { r: 0, g: 0, b: 0, n: 0 };

          for (var i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 200) continue;
            var r = data[i], g = data[i + 1], b = data[i + 2];
            sum.r += r; sum.g += g; sum.b += b; sum.n++;

            var hsl = rgbToHsl(r, g, b);
            // 忽略接近灰、过暗、过亮的像素
            if (hsl.s < 0.18 || hsl.l < 0.08 || hsl.l > 0.92) continue;

            var key = Math.floor(hsl.h / 30) % 12;
            var weight = hsl.s * (1 - Math.abs(hsl.l - 0.5));
            var bkt = buckets[key] || (buckets[key] = { w: 0, r: 0, g: 0, b: 0, n: 0 });
            bkt.w += weight; bkt.r += r; bkt.g += g; bkt.b += b; bkt.n++;
          }

          var ranked = Object.keys(buckets).map(function (k) {
            var x = buckets[k];
            return {
              w: x.w,
              hsl: rgbToHsl(x.r / x.n, x.g / x.n, x.b / x.n)
            };
          }).sort(function (a, b) { return b.w - a.w; });

          function hueGap(a, b) {
            var d = Math.abs(a - b) % 360;
            return d > 180 ? 360 - d : d;
          }

          var palette = [];
          for (var j = 0; j < ranked.length && palette.length < 2; j++) {
            var c = ranked[j].hsl;
            // 与已选颜色色相太近就跳过，保证两个颜色真的不同
            if (palette.some(function (p) { return hueGap(p.h, c.h) < 40; })) continue;
            palette.push(c);
          }

          if (!palette.length) {
            if (!sum.n) return reject(new Error('no pixels'));
            palette.push(rgbToHsl(sum.r / sum.n, sum.g / sum.n, sum.b / sum.n));
          }
          resolve(palette);
        } catch (err) { reject(err); }
      };
      img.onerror = function () { reject(new Error('image load failed')); };
      img.src = url;
    });
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }

  function hslCss(h, s, l) {
    return 'hsl(' + Math.round(h) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%)';
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  // palette: [主色, 次主色?]；渐变 = 主色 → 次主色 → 次主色加深
  function applyTints(palette) {
    if (!palette || !palette.length) return;
    var a = palette[0];
    var b = palette[1] || a;
    var root = document.documentElement;

    // 轻微提升饱和度即可，不再人为偏移色相，保证和背景图同源
    var sA = clamp(a.s * 1.08, 0.22, 0.70);
    var sB = clamp(b.s * 1.04, 0.20, 0.68);

    root.style.setProperty('--bg-tint-a', hslCss(a.h, sA, clamp(a.l * 0.95 + 0.06, 0.26, 0.54)));
    root.style.setProperty('--bg-tint-b', hslCss(b.h, sB, clamp(b.l * 0.92 + 0.02, 0.20, 0.46)));
    root.style.setProperty('--bg-tint-c', hslCss(b.h, clamp(sB * 1.05, 0.2, 0.7), clamp(b.l * 0.72, 0.14, 0.36)));
  }
  function applyBackground(url) {
    var root = document.documentElement;
    root.style.setProperty('--stellar-bg-url', 'url("' + url + '")');
    root.classList.add('has-random-bg');
  }

  function applyList(list) {
    var url = pick(list);
    if (!url) return;
    applyBackground(url);
    extractPalette(url).then(applyTints).catch(function () { /* 取色失败就保持默认色 */ });
  }

  function fetchList() {
    return fetch(buildListUrl(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var files = (data && data.files) || [];
        return files
          .map(function (f) { return f.name; })
          .filter(function (p) {
            return p.indexOf(CONFIG.folder) === 0 && CONFIG.imageExt.test(p);
          })
          .map(buildImageUrl);
      });
  }

  function useFallbacks() {
    if (MANUAL_LIST.length) { applyList(MANUAL_LIST.slice()); return; }
    applyList(readStaleCache() || FALLBACK.slice());
  }

  function alreadyApplied() {
    return document.documentElement.classList.contains('has-random-bg');
  }

  // 引导脚本已经选好图时：只需在后台刷新列表缓存，供下次访问使用
  function refreshOnly() {
    if (readCache()) return;
    fetchList().then(function (list) {
      if (list && list.length) writeCache(list);
    }).catch(function () {});
  }

  function start() {
    if (alreadyApplied()) {
      // 已上色：补一次取色（引导脚本阶段无法读像素），并后台刷新列表
      var current = null;
      try { current = sessionStorage.getItem('stellar.currentBg'); } catch (e) { current = null; }
      if (current) extractPalette(current).then(applyTints).catch(function () {});
      refreshOnly();
      return;
    }

    // 引导脚本未生效（例如被浏览器插件拦截）时的兜底路径
    var cached = readCache();
    if (cached) { applyList(cached); return; }
    fetchList()
      .then(function (list) {
        if (list && list.length) { writeCache(list); applyList(list); return; }
        useFallbacks();
      })
      .catch(useFallbacks);
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();