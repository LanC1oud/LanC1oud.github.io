/* Lecture 6, Example 4 (slides 31–35). All LP bounds come from exact vertex enumeration. */
(() => {
  'use strict';

  const GREEN = 'var(--green)', AMBER = 'var(--amber)', MUTED = 'var(--muted)', GRID = 'var(--line)';
  const base = [[9, 7, 56], [7, 20, 70], [-1, 0, 0], [0, -1, 0]];
  const objective = [40, 90];
  const clamp = p => Math.max(0, Math.min(1, p));
  const tween = (a, b, p) => a + (b - a) * p;
  const round = n => Number(n.toFixed(2)).toString();
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  function frac(n, d) {
    const g = gcd(Math.abs(n), d);
    return d === g ? String(n / g) : `${n / g}/${d / g}`;
  }
  function value({ z, d }) { return frac(z, d); }
  function display(point) {
    return point.z % point.d === 0 ? value(point) : `≈ ${round(point.z / point.d)}`;
  }
  function coords({ u, v, d }) { return [u / d, v / d]; }
  function exactPoint({ u, v, d }) { return `(${frac(u, d)}, ${frac(v, d)})`; }
  function isInteger({ u, v, d }) { return u % d === 0 && v % d === 0; }
  function compare(a, b) { return a.z * b.d - b.z * a.d; }
  function satisfies({ u, v, d }, constraints) {
    return constraints.every(([a, b, c]) => a * u + b * v <= c * d);
  }
  function vertices(constraints, weights) {
    const result = new Map();
    for (let i = 0; i < constraints.length; i++) for (let j = i + 1; j < constraints.length; j++) {
      const [a, b, c] = constraints[i], [e, f, g] = constraints[j];
      let d = a * f - b * e;
      if (!d) continue;
      let u = c * f - b * g, v = a * g - c * e;
      if (d < 0) { u = -u; v = -v; d = -d; }
      const point = { u, v, d, z: weights[0] * u + weights[1] * v };
      if (satisfies(point, constraints)) result.set(exactPoint(point), point);
    }
    return [...result.values()];
  }
  const node = (name, branches = [], model = base, weights = objective) => {
    const constraints = model.concat(branches), corner = vertices(constraints, weights);
    const optimum = corner.reduce((best, point) => best === null || compare(point, best) > 0 ? point : best, null);
    const polygon = corner.map(coords);
    if (polygon.length) {
      const center = polygon.reduce(([x, y], [u, v]) => [x + u / polygon.length, y + v / polygon.length], [0, 0]);
      polygon.sort(([x, y], [u, v]) => Math.atan2(y - center[1], x - center[0]) - Math.atan2(v - center[1], u - center[0]));
    }
    return { name, optimum, polygon };
  };
  function lattice(constraints, weights) {
    const xmax = Math.floor(Math.min(...constraints.filter(([a, b]) => a > 0 && b >= 0).map(([a, , c]) => c / a)));
    const ymax = Math.floor(Math.min(...constraints.filter(([a, b]) => a >= 0 && b > 0).map(([, b, c]) => c / b)));
    const points = [];
    for (let u = 0; u <= xmax; u++) for (let v = 0; v <= ymax; v++) {
      const point = { u, v, d: 1, z: weights[0] * u + weights[1] * v };
      if (satisfies(point, constraints)) points.push(point);
    }
    return points;
  }
  const left = [1, 0, 4], right = [-1, 0, -5];
  const B = node('B'), B1 = node('B₁', [left]), B2 = node('B₂', [right]);
  const B3 = node('B₃', [left, [0, 1, 2]]), B4 = node('B₄', [left, [0, -1, -3]]);
  const B5 = node('B₅', [right, [0, 1, 1]]), B6 = node('B₆', [right, [0, -1, -2]]);
  const stripRoot = node('', [[-1, 0, -4], [1, 0, 5]]), stripLeft = node('', [left, [0, -1, -2], [0, 1, 3]]);
  const stripRight = node('', [right, [0, -1, -1], [0, 1, 2]]);
  const integerPoints = lattice(base, objective);
  const roundModel = [[5, 4, 24], [2, 5, 13], [-1, 0, 0], [0, -1, 0]], roundWeights = [20, 10];
  const R = node('LP', [], roundModel, roundWeights), roundPoints = lattice(roundModel, roundWeights);
  const bestPerX = [...new Set(roundPoints.map(p => p.u))].map(u => roundPoints.filter(p => p.u === u).at(-1));
  const roundOpt = bestPerX.reduce((best, p) => compare(p, best) > 0 ? p : best);

  const sx = x => 54 + 61 * x, sy = y => 268 - 54 * y;
  const escape = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const line = (x1, y1, x2, y2, stroke, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" ${extra}/>`;
  const edge = (x1, y1, x2, y2, stroke, extra = '') => line(sx(x1), sy(y1), sx(x2), sy(y2), stroke, extra);
  const txt = (x, y, s, cls = 'graph-label', extra = '') => `<text x="${x}" y="${y}" class="${cls}" ${extra}>${escape(s)}</text>`;
  const polygon = (n, color, opacity) => n.polygon.length ? `<polygon points="${n.polygon.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')}" fill="${color}" opacity="${opacity}"/>` : '';
  const pointMark = (x, y, color, r, extra = '') => `<circle cx="${sx(x)}" cy="${sy(y)}" r="${r}" fill="${color}" ${extra}/>`;
  const anchor = 'text-anchor="middle"';
  const dash = 'stroke-dasharray="5 4"';

  function axes() {
    let svg = '';
    for (let x = 0; x <= 7; x++) {
      svg += edge(x, 0, x, 4, GRID) + txt(sx(x), 286, x, 'graph-muted', anchor);
    }
    for (let y = 1; y <= 4; y++) {
      svg += edge(0, y, 7, y, GRID) + txt(43, sy(y) + 4, y, 'graph-muted', 'text-anchor="end"');
    }
    return svg + line(54, 268, 487, 268, MUTED) + line(54, 268, 54, 45, MUTED) + txt(491, 274, 'x₁') + txt(42, 37, 'x₂');
  }

  function constraints() {
    return edge(28 / 9, 4, 56 / 9, 0, MUTED, 'stroke-width="1.6"') +
      edge(0, 3.5, 7, 21 / 20, MUTED, 'stroke-width="1.6"') +
      integerPoints.map(({ u, v }) => pointMark(u, v, MUTED, 2.7, 'opacity=".67"')).join('');
  }

  function highlight([x, y], label, color = GREEN, dx = 10, dy = -9, opacity = 1) {
    return `<g opacity="${opacity}">` + pointMark(x, y, color, 10, 'opacity=".2"') +
      pointMark(x, y, color, 5, 'stroke="var(--panel)" stroke-width="1.4"') +
      txt(sx(x) + dx, sy(y) + dy, label, 'graph-title') + '</g>';
  }
  function moving(from, to, p, label, color, dx, dy) {
    const [x, y] = coords(from.optimum), [u, v] = coords(to.optimum);
    return highlight([tween(x, u, p), tween(y, v, p)], label, color, dx, dy, .18 + .82 * p);
  }
  const caption = s => txt(54, 310, s, 'graph-muted');
  const graphicHeading = s => txt(260, 28, s, 'graph-title', anchor);

  function rootPlot(p) {
    const bound = B.optimum.z / B.optimum.d, z = tween(180, bound, p);
    return axes() + polygon(B, GREEN, .13) + constraints() + graphicHeading('先保留整个连续可行域') +
      edge(0, z / 90, 7, (z - 280) / 90, AMBER, `stroke-width="1.8" ${dash} clip-path="url(#bnb-plot)"`) +
      '<defs><clipPath id="bnb-plot"><rect x="54" y="48" width="427" height="220"/></clipPath></defs>' +
      highlight([0, 0], '(0, 0)', GREEN, 12, -13) + highlight(coords(B.optimum), 'B', AMBER, 11, -12, p) +
      caption('灰点：原整数可行解　　虚线：向外推高目标等值线');
  }

  function firstBranchPlot(p) {
    return axes() + polygon(B, MUTED, .06) + polygon(B1, GREEN, .08 + p * .12) + polygon(B2, GREEN, .08 + p * .12) +
      polygon(stripRoot, AMBER, .15 * p) + constraints() + graphicHeading('沿 x₁ 分支，排除中间的非整数带') +
      edge(4, 0, 4, 4, GREEN, dash) + edge(5, 0, 5, 4, GREEN, dash) +
      txt(sx(4) - 8, 62, 'x₁ ≤ 4', 'graph-muted', 'text-anchor="end"') + txt(sx(5) + 8, 62, 'x₁ ≥ 5', 'graph-muted') +
      moving(B, B1, p, 'B₁', GREEN, -25, -11) + moving(B, B2, p, 'B₂', GREEN, 11, -11) +
      caption('橙带：4 < x₁ < 5，不含任何整数 x₁');
  }

  function leftBranchPlot(p, prune = false) {
    const fade = prune ? 1 - p : 1;
    return axes() + polygon(B, MUTED, .06) + polygon(B2, GREEN, .14) + polygon(B3, GREEN, .20) +
      polygon(B4, GREEN, .18 * fade) + polygon(stripLeft, AMBER, prune ? 0 : .13 * p) + constraints() +
      graphicHeading(prune ? '剪掉 B₄；B₂ 的上界仍高于 340' : '在 B₁ 内按 x₂ 分支') +
      edge(0, 2, 4, 2, GREEN, dash) + edge(0, 3, 4, 3, GREEN, `${dash} opacity="${.25 + .75 * fade}"`) +
      txt(66, sy(2) + 17, 'x₂ ≤ 2', 'graph-muted') + txt(66, sy(3) - 7, 'x₂ ≥ 3', 'graph-muted') +
      highlight(coords(B2.optimum), 'B₂', GREEN, 10, -10) +
      moving(B1, B3, prune ? 1 : p, 'B₃', GREEN, -29, -9) +
      (prune ? highlight(coords(B4.optimum), fade > .4 ? 'B₄' : 'B₄ ×', AMBER, 10, -11, .36 + .64 * fade) : moving(B1, B4, p, 'B₄', AMBER, 10, -11)) +
      caption(prune ? '整数解 B₃ 给出下界 340；仍需检查 B₂。' : 'B₃=(4, 2) 为整数可行解，把下界提高到 340。');
  }

  function rightBranchPlot(p) {
    return axes() + polygon(B, MUTED, .06) + polygon(B5, AMBER, .12 + .06 * p) + polygon(stripRight, AMBER, .10 * p) +
      constraints() + graphicHeading('检查 B₂ 的两条分支') +
      edge(5, 1, 7, 1, GREEN, dash) + edge(5, 2, 7, 2, AMBER, dash) +
      txt(sx(5) + 11, sy(1) + 18, 'x₂ ≤ 1', 'graph-muted') + txt(sx(5) + 11, sy(2) - 12, 'x₂ ≥ 2', 'graph-muted') +
      highlight(coords(B3.optimum), 'B₃', GREEN, -28, -11) + moving(B2, B5, p, 'B₅', AMBER, 10, -12) +
      txt(sx(6) + 8, sy(2) - 38, 'B₆ ∅', 'graph-muted', `opacity="${p}"`) +
      caption('B₅ 上界小于 340；B₆ 的新增约束与原约束冲突。');
  }

  function treePlot(p) {
    const nodes = [
      [B, 260, 54, '根松弛'], [B1, 133, 140, '已分支'], [B2, 387, 140, '已分支'],
      [B3, 66, 247, '整数最优'], [B4, 196, 247, '按界剪枝'], [B5, 326, 247, '按界剪枝'], [B6, 456, 247, '不可行']
    ];
    const links = [[0, 1, 'x₁ ≤ 4'], [0, 2, 'x₁ ≥ 5'], [1, 3, 'x₂ ≤ 2'], [1, 4, 'x₂ ≥ 3'], [2, 5, 'x₂ ≤ 1'], [2, 6, 'x₂ ≥ 2']];
    const fade = index => clamp(p * 2.65 - Math.floor((index + 1) / 2) * .42);
    let svg = graphicHeading('完整分支树：所有叶节点已处理');
    for (const [i, j, label] of links) {
      const [, x, y] = nodes[i], [, u, v] = nodes[j];
      svg += `<g opacity="${fade(j)}">` + line(x, y + 23, u, v - 23, MUTED, 'stroke-width="1.15"') +
        txt((x + u) / 2 + (u < x ? -12 : 12), (y + v) / 2 - 2, label, 'graph-muted', anchor) + '</g>';
    }
    for (const [i, [n, x, y, status]] of nodes.entries()) {
      const color = n === B3 ? GREEN : i >= 4 ? AMBER : GRID;
      const upper = n.optimum ? ` · ${display(n.optimum)}` : '';
      svg += `<g opacity="${fade(i)}"><rect x="${x - 55}" y="${y - 23}" width="110" height="46" rx="7" fill="var(--panel)" stroke="${color}" stroke-width="${n === B3 ? 2 : 1.3}"/>` +
        txt(x, y - 3, `${n.name}${upper}`, n === B3 ? 'graph-title' : 'graph-label', anchor) +
        txt(x, y + 14, status, 'graph-muted', anchor) + '</g>';
    }
    return svg + txt(260, 305, '没有待查节点；最优整数解 (4, 2)，目标值 340。', 'graph-title', anchor);
  }

  const metric = (label, value) => ({ label, value: String(value) });
  const range = (lb, ub, open) => [metric('整数下界 LB', lb), metric('全局上界 UB', ub), metric('待查节点', open)];
  const row = (n, status) => [n.name, n.optimum ? exactPoint(n.optimum) : '—', n.optimum ? display(n.optimum) : '—', status];
  const table = (rows, caption, highlights = []) => ({ headers: ['节点', '松弛最优点', '节点上界', '处理'], rows, caption, highlights });
  const mark = (row, col, kind) => ({ row, col, kind });
  const frames = [
    { label: '求松弛', title: '松弛给上界，整数可行解给下界', description: '暂时允许 x₁、x₂ 取小数。根节点 B 的最优点不满足整数要求，但所有整数可行点都在连续可行域内；先取 (0, 0) 作当前整数解。',
      formula: `根节点上界 = ${value(B.optimum)}；0 ≤ z* ≤ ${value(B.optimum)}`, metrics: range(0, display(B.optimum), 'B'), svg: rootPlot,
      table: table([row(B, '待分支'), ['整数解', '(0, 0)', '—', '下界 0']], '最大化：节点松弛最优值是上界，已找到的最好整数值是下界。', [mark(0, 2, 'enter')]), note: '松弛最优点只是界。直接四舍五入可能违反原约束，也可能错过最优整数解。' },
    { label: '分支 x₁', title: '将分数点两侧拆成两个子问题', description: '根节点 x₁ ≈ 4.81，任意整数解一定满足 x₁ ≤ 4 或 x₁ ≥ 5。分别求两个松弛，先处理上界较大的 B₁，B₂ 留待检查。',
      formula: `x₁ ≤ 4 或 x₁ ≥ 5；UB = max{${value(B1.optimum)}, ${value(B2.optimum)}} = 349`, metrics: range(0, display(B1.optimum), 'B₁、B₂'), svg: firstBranchPlot,
      table: table([row(B1, '先检查'), row(B2, '保留')], '删掉分支间隙不会删去任何整数点；全局上界取待查节点上界的最大值。', [mark(0, 2, 'enter')]) },
    { label: '更新下界', title: 'B₁ 的分支找到整数解 (4, 2)', description: 'B₁ 的 x₂ = 2.1，分成 x₂ ≤ 2 和 x₂ ≥ 3。B₃ 的松弛最优点已是整数，直接关闭该节点，把当前最好整数值更新为 340。',
      formula: 'x₂ ≤ 2 或 x₂ ≥ 3；40×4 + 90×2 = 340', metrics: range(340, display(B2.optimum), 'B₂、B₄'), svg: p => leftBranchPlot(p),
      table: table([row(B3, '整数解，关闭'), row(B4, '待判界'), row(B2, '仍待检查')], 'B₃ 的节点上界 340 由整数点达到，其子区域无需再分支。', [mark(0, 2, 'pivot')]) },
    { label: '按界剪枝', title: 'B₄ 不可能超过已知的 340', description: 'B₄ 即使允许分数也只到约 327.14，故直接剪掉。B₂ 上界约 341.43，高于 340，还不能剪。',
      formula: `${value(B4.optimum)} < 340 < ${value(B2.optimum)}`, metrics: range(340, display(B2.optimum), 'B₂'), svg: p => leftBranchPlot(p, true),
      table: table([row(B4, '按界剪枝'), row(B2, '继续分支')], '若只求一个最优解，节点上界 ≤ 当前整数下界即可剪枝。', [mark(0, 3, 'leave'), mark(1, 2, 'enter')]), note: '课件图中的小数为近似值；判界应使用准确值或可靠的界。' },
    { label: '查 B₂', title: 'B₅ 按界剪，B₆ 不可行', description: 'B₂ 的 x₂ = 11/7，分成 x₂ ≤ 1 和 x₂ ≥ 2。B₅ 上界小于 340；B₆ 同时要求 x₁ ≥ 5、x₂ ≥ 2，已经违反第一条原约束。',
      formula: `B₅: ${value(B5.optimum)} < 340；B₆: 9×5 + 7×2 = 59 > 56`, metrics: range(340, 340, '无'), svg: rightBranchPlot,
      table: table([row(B5, '按界剪枝'), row(B6, '不可行，关闭')], '不可行的松弛节点中也不存在原整数可行解。', [mark(0, 3, 'leave'), mark(1, 3, 'leave')]) },
    { label: '证明最优', title: '待查节点清空，340 是最优值', description: '每个叶节点都已处理：B₃ 提供当前最好整数解；B₄、B₅ 的上界不足以改进；B₆ 无解。上下界相遇，搜索结束。',
      formula: 'x* = (4, 2)；z* = 340', metrics: range(340, 340, '无'), svg: treePlot,
      table: table([row(B3, '最优整数解'), row(B4, '上界 < 340'), row(B5, '上界 < 340'), row(B6, '不可行')], '从叶节点核验最优性：没有任何未检查的分支能优于 340。', [mark(0, 2, 'pivot')]) }
  ];

  const roundingNearest = { u: Math.round(R.optimum.u / R.optimum.d), v: Math.round(R.optimum.v / R.optimum.d), d: 1 };
  const roundingFloor = { u: Math.floor(R.optimum.u / R.optimum.d), v: Math.floor(R.optimum.v / R.optimum.d), d: 1 };
  roundingFloor.z = 20 * roundingFloor.u + 10 * roundingFloor.v;
  function roundingPlot(p, stage) {
    let svg = axes() + polygon(R, GREEN, .14) + edge(1.6, 4, 4.8, 0, MUTED, 'stroke-width="1.7"') +
      edge(0, 2.6, 6.5, 0, MUTED, 'stroke-width="1.7"') + roundPoints.map(({ u, v }) => pointMark(u, v, MUTED, 2.7, 'opacity=".67"')).join('');
    if (stage === 0) {
      const z = tween(62, R.optimum.z / R.optimum.d, p);
      svg += graphicHeading('绿色区域是 LP 松弛，灰点是整数可行解') +
        edge((z - 40) / 20, 4, z / 20, 0, AMBER, `stroke-width="1.8" ${dash}`) +
        highlight(coords(R.optimum), 'LP (4.8, 0)', AMBER, 8, -12, p) + caption('允许分数后，连续最优解能达到 96。');
    } else if (stage === 1) {
      const [x] = coords(R.optimum), [u] = coords(roundingNearest), animated = tween(x, u, p);
      svg += graphicHeading('四舍五入把点推出可行域') + pointMark(x, 0, MUTED, 3.4) +
        edge(x, 0, animated, 0, AMBER, 'stroke-width="2"') + highlight([animated, 0], p > .7 ? '(5, 0) ×' : '', AMBER, 10, -12) +
        caption('5 箱甲货需要体积 25，超过上限 24。');
    } else {
      const [u, v] = coords(roundingFloor), [x, y] = coords(roundOpt);
      svg += graphicHeading('向下取整可行，但还有更好的整数点') +
        edge(u, v, tween(u, x, p), tween(v, y, p), GREEN, `stroke-width="2.5" ${dash}`) +
        highlight([u, v], '(4, 0) · 80', AMBER, 12, -6) +
        highlight([tween(u, x, p), tween(v, y, p)], p > .7 ? '(4, 1) · 90' : '', GREEN, 12, -10, p) +
        caption('固定整数 x₁ 后，枚举各列中能取到的最大整数 x₂。');
    }
    return svg;
  }
  const roundingFrames = [
    { label: '连续最优', title: '托运箱数本应是整数', description: '甲、乙货物每箱利润分别为 20、10。若暂时允许分数箱，LP 给出 (4.8, 0)，利润 96。这是整数最优值的上界。',
      formula: 'xᴸᴾ = (24/5, 0)；zᴸᴾ = 96', metrics: [metric('松弛最优点', '(4.8, 0)'), metric('松弛上界', 96)], svg: p => roundingPlot(p, 0),
      table: { headers: ['限制', '每箱用量 (甲, 乙)', '上限'], rows: [['体积', '(5, 4)', '24'], ['重量', '(2, 5)', '13']], caption: '课件例 0：目标是让托运利润最大。' } },
    { label: '取最近整数', title: '四舍五入可能连可行性都不保', description: '把 4.8 箱四舍五入为 5 箱。重量不超限，但体积需要 25，超过允许的 24，不能作为整数解。',
      formula: '5×5 + 4×0 = 25 > 24', metrics: [metric('取最近整数', '(5, 0)'), metric('体积检查', '25 > 24')], svg: p => roundingPlot(p, 1),
      table: { headers: ['限制', '(5, 0) 用量', '判定'], rows: [['体积', '25', '25 > 24'], ['重量', '10', '10 ≤ 13']], caption: '整数变量满足取值要求后，还要重新检查全部原约束。', highlights: [mark(0, 2, 'leave')] } },
    { label: '比较整数解', title: '向下取整虽可行，却少赚 10', description: '向下取整得 (4, 0)，利润 80。按 x₁=0,…,4 枚举；因乙货利润为正，各列只需比较最大可行整数 x₂。最优是 (4, 1)，利润 90。',
      formula: 'z(4, 0) = 80 < z(4, 1) = 90 < zᴸᴾ = 96', metrics: [metric('向下取整', '80'), metric('整数最优', '90')], svg: p => roundingPlot(p, 2),
      table: { headers: ['整数 x₁', '最大可行整数 x₂', '该列利润'], rows: bestPerX.map(({ u, v, z }) => [String(u), String(v), String(z)]), caption: '小规模可以枚举核验；变量增多时，分支定界利用上界跳过无须搜索的区域。', highlights: [mark(bestPerX.length - 1, 2, 'pivot')] } }
  ];

  // Independently check the expected exact bounds, pruning claims, and the integer optimum.
  const expected = [[B, '46620/131'], [B1, '349'], [B2, '2390/7'], [B3, '340'], [B4, '2290/7'], [B5, '2770/9']];
  if (expected.some(([n, z]) => value(n.optimum) !== z) || B6.optimum || !isInteger(B3.optimum) ||
      compare(B4.optimum, B3.optimum) >= 0 || compare(B5.optimum, B3.optimum) >= 0 || compare(B2.optimum, B3.optimum) <= 0 ||
      integerPoints.filter(point => compare(point, B3.optimum) >= 0).length !== 1 || exactPoint(B3.optimum) !== '(4, 2)' ||
      value(R.optimum) !== '96' || exactPoint(R.optimum) !== '(24/5, 0)' || satisfies(roundingNearest, roundModel) ||
      !satisfies(roundingFloor, roundModel) || roundingFloor.z !== 80 || exactPoint(roundOpt) !== '(4, 1)' || roundOpt.z !== 90) {
    throw new Error('Lecture 6 branch-and-bound values do not match the integer model.');
  }

  Object.assign(window.OPT_DEMOS ||= {}, {
    'integer-bnb': { title: '整数规划：松弛、取整与分支定界', formula: 'max z = 40x₁+90x₂；9x₁+7x₂≤56，7x₁+20x₂≤70，x₁、x₂ 为非负整数', variants: [
      { label: '分支定界', frames },
      { label: '取整反例', formula: 'max z = 20x₁+10x₂；5x₁+4x₂≤24，2x₁+5x₂≤13，x₁、x₂ 为非负整数', frames: roundingFrames }
    ] }
  });
})();
