(function () {
  'use strict';

  const green = '#23816b', amber = '#cd9a62', grid = '#e0e6dd', muted = '#74827b';
  const lerp = (a, b, p) => a + (b - a) * Math.max(0, Math.min(1, p));
  const mix = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
  const fmt = n => Math.abs(n) < 1e-8 ? '0' : Number(n.toFixed(2)).toString();
  const pair = p => `(${p.map(fmt).join(', ')})`;
  const text = (x, y, value, cls = 'graph-label', extra = '') => `<text x="${x}" y="${y}" class="${cls}" ${extra}>${value}</text>`;
  const table = (headers, rows, caption, highlights = []) => ({ headers, rows, caption, highlights });
  const dot = (x, y, color = green, r = 6) => `<circle cx="${x}" cy="${y}" r="${r + 7}" fill="${color}" opacity=".12"/><circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;

  function clipPolygon(poly, a, b, rhs) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      const fp = a * p[0] + b * p[1] - rhs, fq = a * q[0] + b * q[1] - rhs;
      if (fp <= 1e-9) out.push(p);
      if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) {
        const t = fp / (fp - fq);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    return out;
  }

  function plot({ b1 = 8, c1 = 30, point = [3.2, 1.6], width = 348, height = 208, maxX = 5, maxY = 3.5, left = 44, top = 39, objective = true, optimalEdge = null, showOrigin = true }) {
    const px = x => left + x / maxX * width;
    const py = y => top + height - y / maxY * height;
    let s = '';
    for (let i = 0; i <= Math.floor(maxX); i++) s += `<line x1="${px(i)}" y1="${top}" x2="${px(i)}" y2="${py(0)}" stroke="${grid}" stroke-opacity=".7"/>`;
    for (let i = 0; i <= Math.floor(maxY); i++) s += `<line x1="${left}" y1="${py(i)}" x2="${px(maxX)}" y2="${py(i)}" stroke="${grid}" stroke-opacity=".7"/>`;
    let poly = [[0, 0], [maxX, 0], [maxX, maxY], [0, maxY]];
    poly = clipPolygon(clipPolygon(poly, 2, 1, b1), 1, 3, 8);
    s += `<polygon points="${poly.map(p => `${px(p[0])},${py(p[1])}`).join(' ')}" fill="${green}" opacity=".13"/>`;
    const line = (a, b, rhs, color, dashed = false, strokeWidth = 2) => {
      const candidates = [];
      const add = (x, y) => { if (x >= -1e-8 && x <= maxX + 1e-8 && y >= -1e-8 && y <= maxY + 1e-8 && !candidates.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - y) < 1e-7)) candidates.push([x, y]); };
      if (b) { add(0, rhs / b); add(maxX, (rhs - a * maxX) / b); }
      if (a) { add(rhs / a, 0); add((rhs - b * maxY) / a, maxY); }
      return candidates.length < 2 ? '' : `<line x1="${px(candidates[0][0])}" y1="${py(candidates[0][1])}" x2="${px(candidates[1][0])}" y2="${py(candidates[1][1])}" stroke="${color}" stroke-width="${strokeWidth}" ${dashed ? 'stroke-dasharray="6 5"' : ''}/>`;
    };
    s += line(2, 1, b1, green) + line(1, 3, 8, amber);
    if (objective) s += line(c1, 20, c1 * point[0] + 20 * point[1], green, true, 1.5);
    if (optimalEdge) s += `<line x1="${px(optimalEdge[0][0])}" y1="${py(optimalEdge[0][1])}" x2="${px(optimalEdge[1][0])}" y2="${py(optimalEdge[1][1])}" stroke="${green}" stroke-width="6" stroke-linecap="round" opacity=".65"/>`;
    s += `<path d="M ${left},${top - 5} V ${py(0)} H ${px(maxX) + 9}" fill="none" stroke="${muted}" stroke-width="1.3"/>`;
    if (showOrigin) s += text(left - 13, py(0) + 18, '0', 'graph-muted');
    s += text(px(maxX) + 2, py(0) + 19, 'x₁', 'graph-muted') + text(left - 22, top - 6, 'x₂', 'graph-muted');
    s += text(px(maxX) - 10, py(0) + 18, fmt(maxX), 'graph-muted', 'text-anchor="end"');
    s += text(left - 8, py(Math.floor(maxY)) + 4, Math.floor(maxY), 'graph-muted', 'text-anchor="end"');
    s += dot(px(point[0]), py(point[1]));
    const labelX = Math.min(px(point[0]) + 12, left + width - 85);
    const labelY = py(point[1]) < top + 32 ? py(point[1]) + 25 : py(point[1]) - 14;
    s += text(labelX, labelY, pair(point), 'graph-title');
    return { markup: s, px, py };
  }

  // Every animated pair stays in its respective feasible polyhedron.
  function boundsSvg(fromX, toX, fromY, toY, p, complementary = false) {
    const x = mix(fromX, toX, p), y = mix(fromY, toY, p);
    const lower = 30 * x[0] + 20 * x[1], upper = 8 * (y[0] + y[1]);
    const g = plot({ point: x, width: 288, height: 207, maxX: 4.8, maxY: 3.3, objective: true });
    let s = text(44, 22, '原问题：在可行域内提高收益', 'graph-title') + g.markup;
    s += text(364, 24, '同一最优值的两侧', 'graph-title');
    const yy = z => 241 - z / 250 * 171;
    s += `<line x1="385" y1="64" x2="385" y2="244" stroke="${grid}" stroke-width="3"/>`;
    s += `<rect x="374" y="${yy(upper)}" width="22" height="${Math.max(0, yy(lower) - yy(upper))}" rx="6" fill="${amber}" opacity=".22"/>`;
    s += `<line x1="374" y1="${yy(upper)}" x2="404" y2="${yy(upper)}" stroke="${amber}" stroke-width="4"/>`;
    s += `<line x1="374" y1="${yy(lower)}" x2="404" y2="${yy(lower)}" stroke="${green}" stroke-width="4"/>`;
    s += text(412, yy(upper) - 9, `上界 ${fmt(upper)}`, 'graph-label') + text(412, yy(upper) + 9, `y=${pair(y)}`, 'graph-muted');
    s += text(412, yy(lower) + 26, `下界 ${fmt(lower)}`, 'graph-label');
    s += text(364, 307, `间隙 ${fmt(upper - lower)}`, 'graph-title');
    s += text(44, 289, complementary ? '两项资源用满；两种产品均生产。' : '绿色区域 = 原可行域　虚线 = 当前收益等值线', 'graph-muted');
    if (complementary) {
      const pulse = .35 + .4 * Math.sin(p * Math.PI);
      s += `<circle cx="${g.px(3.2)}" cy="${g.py(1.6)}" r="19" fill="none" stroke="${amber}" stroke-width="3" opacity="${pulse}"/>`;
    }
    return s;
  }

  const boundFrames = [
    { label: '原问题', title: '产量给收益下界，资源定价给上界', description: '机器 1、2 各有 8 小时；单位收益分别为 30、20。先写出原问题，绿色区域包含全部可行生产方案。', formula: 'max 30x₁+20x₂；2x₁+x₂≤8，x₁+3x₂≤8，x≥0', metrics: [{ label: '原可行解', value: '(0, 0)' }, { label: '原目标值', value: '0' }], svg: p => boundsSvg([0, 0], [0, 0], [20, 10], [20, 10], p), table: table(['资源', '产品 1', '产品 2', '可用量'], [['机器 1', '2', '1', '8'], ['机器 2', '1', '3', '8'], ['单位收益', '30', '20', 'max']], '每个原约束对应一个对偶变量，每个原变量对应一个对偶约束。') },
    { label: '写对偶', title: '给资源定价，覆盖每种产品的收益', description: '令 y₁、y₂ 为两种机器的单位价格。每种产品耗用资源的估价至少覆盖其收益；在这些条件下，最小化资源总估价。', formula: 'min 8y₁+8y₂；2y₁+y₂≥30，y₁+3y₂≥20，y≥0', metrics: [{ label: '对偶可行价格', value: '(20, 10)' }, { label: '收益上界', value: '240' }], svg: p => boundsSvg([0, 0], [0, 0], [20, 10], [20, 10], p), table: table(['对应对象', '原问题', '对偶问题'], [['目标', 'max cᵀx', 'min bᵀy'], ['机器 1、2', '约束 ≤，右端 8、8', '变量 y₁,y₂ ≥0'], ['产品 1', '收益 30；耗时 (2,1)', '2y₁+y₂≥30'], ['产品 2', '收益 20；耗时 (1,3)', 'y₁+3y₂≥20']], 'max/min 互换，A 转置，b、c 互换。') },
    { label: '弱对偶', title: '可行解始终夹住最优值', description: '提高可行生产收益，同时降低可行资源估价。两条路径均保持各自可行，因此任意时刻都有下界不超过上界。', formula: 'cᵀx ≤ xᵀAᵀy = yᵀAx ≤ bᵀy', metrics: [{ label: '当前下界', value: '80' }, { label: '当前上界', value: '160' }], svg: p => boundsSvg([0, 0], [2, 1], [20, 10], [16, 4], p), table: table(['核验', '左端', '条件'], [['原约束 1', '2×2+1=5', '≤8'], ['原约束 2', '2+3×1=5', '≤8'], ['对偶约束 1', '2×16+4=36', '≥30'], ['对偶约束 2', '16+3×4=28', '≥20']], '这里显示动画终点的可行性核验；运动中是可行点的凸组合。') },
    { label: '缩小间隙', title: '上下界靠近，但尚未证明最优', description: '原方案改为 (3,1)，对偶价格改为 (14.5,3)。110≤z*≤140；只要间隙仍为正，这一对界还不能证明当前方案最优。', formula: '110 ≤ z* ≤ 140；间隙 = 140−110 = 30', metrics: [{ label: '收益下界', value: '110' }, { label: '资源上界', value: '140' }], svg: p => boundsSvg([2, 1], [3, 1], [16, 4], [14.5, 3], p), table: table(['对象', '候选值', '可行性'], [['原解 x', '(3,1)', 'Ax=(7,6)≤(8,8)'], ['对偶解 y', '(14.5,3)', 'Aᵀy=(32,23.5)≥(30,20)'], ['目标间隙', '30', '仍有收紧空间']], '原问题可行值给下界；对偶问题可行值给上界。') },
    { label: '强对偶', title: '上下界相等，就得到最优性证明', description: '到达 x=(16/5,8/5)、y=(14,2)，两者均可行，目标值同为 128。弱对偶已足以证明这一对解分别最优。', formula: '30×16/5+20×8/5 = 8×14+8×2 = 128', metrics: [{ label: '最优生产方案', value: '(3.2, 1.6)' }, { label: '最优值', value: '128' }], svg: p => boundsSvg([3, 1], [3.2, 1.6], [14.5, 3], [14, 2], p), table: table(['核验', '原问题', '对偶问题'], [['可行性', 'Ax=(8,8)，x≥0', 'Aᵀy=(30,20)，y≥0'], ['目标值', 'cᵀx=128', 'bᵀy=128'], ['最优性', '下界=上界', '间隙=0']], '强对偶：一方存在有限最优解时，另一方也存在最优解，且最优值相同。') },
    { label: '互补松弛', title: '正价格的资源用满，正产量的估价恰好覆盖收益', description: '本例价格、产量都为正，所以四条对应约束均取等号。先确认双方可行，再核验互补乘积为零，也能证明最优。', formula: 'yᵢ(bᵢ−aᵢᵀx)=0；xⱼ((Aᵀy)ⱼ−cⱼ)=0', metrics: [{ label: '资源剩余', value: '(0, 0)' }, { label: '对偶剩余', value: '(0, 0)' }], svg: p => boundsSvg([3.2, 1.6], [3.2, 1.6], [14, 2], [14, 2], p, true), table: table(['对象', '约束余量', '对应乘子', '乘积'], [['机器 1', '0', 'y₁=14', '0'], ['机器 2', '0', 'y₂=2', '0'], ['产品 1', '0', 'x₁=3.2', '0'], ['产品 2', '0', 'x₂=1.6', '0']], '资源用满不保证价格为正；零价格也不保证资源有剩余。') }
  ];

  function mixedSvg(stage, p) {
    const cols = [138, 246, 354];
    let s = text(36, 29, '按列读取 A → 对偶约束', 'graph-title');
    ['x₁', 'x₂', 'x₃'].forEach((v, i) => { s += text(cols[i], 65, v, 'graph-title', 'text-anchor="middle"'); });
    s += text(47, 109, 'y₁', 'graph-title') + text(47, 155, 'y₂', 'graph-title');
    const a = [[1, 0, -2], [0, 2, -8]];
    a.forEach((row, r) => row.forEach((v, c) => { s += `<rect x="${cols[c] - 37}" y="${83 + r * 46}" width="74" height="40" rx="8" fill="${stage === 1 ? green : muted}" opacity="${stage === 1 ? .12 : .055}"/>` + text(cols[c], 109 + r * 46, v, 'graph-label', 'text-anchor="middle"'); }));
    s += text(430, 109, '≤ 8', 'graph-muted') + text(430, 155, '≥ 1', 'graph-muted');
    s += text(47, 206, 'c', 'graph-muted');
    [7, 9, 10].forEach((v, c) => { s += text(cols[c], 206, v, 'graph-title', 'text-anchor="middle"'); });
    if (stage >= 1) {
      cols.forEach((x, c) => {
        const yy = 220 + 28 * p;
        s += `<path d="M ${x},214 V ${yy}" stroke="${green}" stroke-width="2" stroke-dasharray="4 3"/>`;
        s += text(x, 268, ['y₁≤7', '2y₂≤9', '−2y₁−8y₂≤10'][c], 'graph-label', 'text-anchor="middle"');
      });
    }
    s += text(36, 309, stage >= 2 ? '符号限制：y₁≤0，y₂≥0；目标 max 8y₁+y₂。' : '原问题为 min，非负原变量对应“≤”对偶约束。', 'graph-muted');
    return s;
  }

  const mixedFrames = [
    { label: '判断方向', title: '混合约束先逐行定符号', description: '原问题是 min；“≤”行对应非正的 y₁，“≥”行对应非负的 y₂。原变量均非负，所以对偶约束均为“≤”。', formula: 'min 7x₁+9x₂+10x₃；x₁−2x₃≤8，2x₂−8x₃≥1，x≥0', metrics: [{ label: '对偶方向', value: 'max' }, { label: '对偶变量', value: 'y₁≤0，y₂≥0' }], svg: p => mixedSvg(0, p), table: table(['原问题（min）', '对应对偶变量'], [['约束 ≥', '≥0'], ['约束 ≤', '≤0'], ['约束 =', '自由']], '对 max 原问题，≤行对应 y≥0，≥行对应 y≤0；等式行仍对应自由变量。') },
    { label: '逐列转置', title: '原问题的一列，变成对偶的一条约束', description: '沿三个原变量的列读取系数，再与其目标系数比较。每一列都要写，不能漏掉零系数或负系数。', formula: 'y₁≤7；2y₂≤9；−2y₁−8y₂≤10', metrics: [{ label: '原变量数', value: '3' }, { label: '对偶约束数', value: '3' }], svg: p => mixedSvg(1, p), table: table(['原变量', 'A 的列', '对偶约束'], [['x₁', '(1,0)', 'y₁≤7'], ['x₂', '(0,2)', '2y₂≤9'], ['x₃', '(−2,−8)', '−2y₁−8y₂≤10']], '若原变量自由，对应对偶约束取等号。') },
    { label: '松弛列核验', title: '松弛、剩余变量会给回符号限制', description: '若先改成等式，给每行自由的 y；再写松弛、剩余变量对应的对偶约束，就恢复 y₁≤0、y₂≥0。人工变量属于辅助问题，不写入原模型的对偶。', formula: 'x₁−2x₃+s₁=8；2x₂−8x₃−s₂=1 ⇒ y₁≤0，−y₂≤0', metrics: [{ label: '松弛变量列', value: '(1,0)' }, { label: '剩余变量列', value: '(0,−1)' }], svg: p => mixedSvg(2, p), table: table(['非负变量', '目标系数', '对应约束'], [['s₁', '0', 'y₁≤0'], ['s₂', '0', '−y₂≤0']], '可直接按符号表写，也可先标准化后核验；结果一致。') },
    { label: '完整对偶', title: '最后检查目标、符号与维数', description: '完整对偶是 max 8y₁+y₂。取原可行解 (0,1/2,0) 和对偶可行解 (0,9/2)，目标同为 9/2，也验证了这次构造。', formula: 'max 8y₁+y₂；y₁≤7，2y₂≤9，−2y₁−8y₂≤10；y₁≤0，y₂≥0', metrics: [{ label: '原、对偶共同最优值', value: '9/2' }, { label: '可行候选', value: 'x=(0,1/2,0)，y=(0,9/2)' }], svg: p => mixedSvg(3, p), table: table(['核验', '原解', '对偶解'], [['符号', 'x≥0', 'y₁=0≤0，y₂=4.5≥0'], ['约束', '0≤8；1≥1', '0≤7；9≤9；−36≤10'], ['目标', '9×0.5=4.5', '8×0+4.5=4.5']], '对 min–max 形式，原可行值是上界，对偶可行值是下界。') }
  ];

  function rhsSolution(b) {
    if (b < 8 / 3) return { x: [0, b], y: [20, 0] };
    if (b > 16) return { x: [8, 0], y: [0, 30] };
    return { x: [(3 * b - 8) / 5, (16 - b) / 5], y: [14, 2] };
  }
  function rhsSvg(from, to, p) {
    const b = lerp(from, to, p), sol = rhsSolution(b), valid = b >= 8 / 3 - 1e-8 && b <= 16 + 1e-8;
    let s = text(44, 22, '平移机器 1 的约束边界', 'graph-title');
    s += plot({ b1: b, point: sol.x, maxX: 10, maxY: 4, width: 345, height: 195, top: 42 }).markup;
    s += text(405, 66, `b₁=${fmt(b)}`, 'graph-title') + text(405, 96, valid ? '原基有效' : '需换最优基', 'graph-label');
    s += text(405, 129, `y₁=${fmt(sol.y[0])}`, 'graph-label');
    s += text(405, 157, `z*=${fmt(30 * sol.x[0] + 20 * sol.x[1])}`, 'graph-title');
    s += text(405, 190, '另一资源', 'graph-muted') + text(405, 210, '仍为 8 小时', 'graph-muted');
    const axis = n => 61 + n / 21 * 399;
    s += `<line x1="61" y1="284" x2="460" y2="284" stroke="${grid}" stroke-width="5" stroke-linecap="round"/><line x1="${axis(8 / 3)}" y1="284" x2="${axis(16)}" y2="284" stroke="${green}" stroke-width="5" stroke-linecap="round"/>`;
    [8 / 3, 8, 13, 16, 20].forEach(v => { s += `<line x1="${axis(v)}" y1="279" x2="${axis(v)}" y2="289" stroke="${muted}"/>` + text(axis(v), 306, v === 8 / 3 ? '8/3' : v, 'graph-muted', 'text-anchor="middle"'); });
    s += dot(axis(b), 284, valid ? green : amber, 5);
    s += text(63, 262, '原基有效范围：8/3 ≤ b₁ ≤ 16', 'graph-muted');
    return s;
  }
  const rhsTargets = [8, 13, 16, 20, 8 / 3, 2];
  const rhsTitles = ['从原最优基出发', '增加 5 小时，收益增加 70', '到达上边界，x₂ 降为零', '超出有效范围，影子价格改变', '下边界处，x₁ 降为零', '越过下边界，也必须重新求最优基'];
  const rhsDescriptions = [
    '只改变右端项 b₁，检验数与原基对偶价格不变。重新计算基变量，全部非负时原基仍最优。',
    'b₁ 从 8 增至 13，原基仍有效。产量变为 (6.2,0.6)，最优收益由 128 增至 198。',
    'b₁=16 时原基仍可行、仍最优，但 x₂=0，出现退化。继续增加机器 1 的时间，已不能沿用其价格 14。',
    'b₁=20 时两条等式的交点含负产量，不是可行方案。重新优化得 (8,0)，收益 240；机器 1 有 4 小时闲置，其新影子价格为 0。',
    'b₁=8/3 时当前基恰好还有非负解 (0,8/3)。这是原基有效区间的另一个端点。',
    'b₁=2 时原基会算出负的 x₁，只说明该基失效。原问题仍可行，重新优化得 (0,2)，收益 40，机器 1 的边际价值变为 20。'
  ];
  const rhsFrames = rhsTargets.map((b, i) => {
    const sol = rhsSolution(b), old = [(3 * b - 8) / 5, (16 - b) / 5], valid = b >= 8 / 3 && b <= 16;
    const z = 30 * sol.x[0] + 20 * sol.x[1];
    const changes = [];
    if (old[0] < -1e-8) changes.push({ row: 0, col: 1, kind: 'leave' });
    if (old[1] < -1e-8) changes.push({ row: 1, col: 1, kind: 'leave' });
    return { label: `b₁=${i === 4 ? '8/3' : fmt(b)}`, title: rhsTitles[i], description: rhsDescriptions[i], formula: valid ? `x₁=(3b₁−8)/5，x₂=(16−b₁)/5；z*=14b₁+16=${fmt(z)}` : `原基计算 x=${pair(old)} 含负分量；重新优化 x*=${pair(sol.x)}，z*=${fmt(z)}`, metrics: [{ label: '新最优产量', value: pair(sol.x) }, { label: '最优收益', value: fmt(z) }, { label: '机器 1 的影子价格', value: fmt(sol.y[0]) }], svg: p => rhsSvg(rhsTargets[Math.max(0, i - 1)], b, p), table: table(['量', '按原基计算', '核验后的最优解'], [['x₁', fmt(old[0]), fmt(sol.x[0])], ['x₂', fmt(old[1]), fmt(sol.x[1])], ['目标值', `${fmt(14 * b + 16)}${valid ? '' : '（不可外推）'}`, fmt(z)], ['机器 1 余量', '0', fmt(b - 2 * sol.x[0] - sol.x[1])]], '只改 b：检查 B⁻¹b≥0；原基失效时，重新求解而不能直接宣布原问题不可行。', changes) };
  });

  function costSolution(c) {
    if (c < 20 / 3 - 1e-8) return [0, 8 / 3];
    if (c > 40 + 1e-8) return [4, 0];
    return [3.2, 1.6];
  }
  function costSvg(from, to, p) {
    const c = lerp(from, to, p), x = costSolution(c);
    let edge = null;
    if (Math.abs(c - 20 / 3) < 1e-7) edge = [[0, 8 / 3], [3.2, 1.6]];
    if (Math.abs(c - 40) < 1e-7) edge = [[3.2, 1.6], [4, 0]];
    let s = text(44, 22, '可行域不变，目标等值线转动', 'graph-title');
    s += plot({ c1: c, point: x, width: 345, height: 203, maxX: 4.8, maxY: 3.3, optimalEdge: edge }).markup;
    s += text(406, 64, `c₁=${fmt(c)}`, 'graph-title') + text(406, 96, 'c₂=20', 'graph-muted');
    s += text(406, 137, '原方案', 'graph-muted') + text(406, 159, c >= 20 / 3 - 1e-8 && c <= 40 + 1e-8 ? '仍最优' : '不再最优', 'graph-label');
    s += text(406, 197, `z*=${fmt(c * x[0] + 20 * x[1])}`, 'graph-title');
    s += text(44, 281, edge ? '加粗线段上的点全部最优；端点仍保留原方案。' : '虚线 = 新目标的最优等值线；绿色点 = 一个新最优解。', 'graph-muted');
    s += text(44, 306, '原方案有效范围：20/3 ≤ c₁ ≤ 40', 'graph-muted');
    return s;
  }
  const costTargets = [30, 20 / 3, 5, 30, 40, 50];
  const costTitles = ['收益变化先检查检验数', '下端点：一整条边同样最优', '低于下界，改为只生产产品 2', '回到区间内，产量保持不变', '上端点：另一条最优边出现', '高于上界，改为只生产产品 1'];
  const costDescriptions = [
    '只改目标系数 c₁，原基解 (3.2,1.6) 仍可行。重算价格与非基检验数，全部检验数非正时，该方案仍最优。',
    'c₁=20/3 时 y₁=0、松弛变量 s₁ 的检验数为零。原方案仍最优，连接 (0,8/3) 与 (3.2,1.6) 的边也全部最优。',
    'c₁=5 时原基的 σs₁=1>0，原方案虽然仍可行，却不再最优。新的最优解为 (0,8/3)。',
    'c₁ 恢复到 30，重新落入允许区间。只改 c 不改变当前基解的数值，但目标值通常随收益系数改变。',
    'c₁=40 时 y₂=0、σs₂=0。从 (3.2,1.6) 到 (4,0) 的整条边同样最优，目标值均为 160。',
    'c₁=50 时原基的 σs₂=2>0，最优方案变为 (4,0)，收益为 200。原方案的收益为 192，已落后于新最优值。'
  ];
  const costFrames = costTargets.map((c, i) => {
    const x = costSolution(c), y = [(3 * c - 20) / 5, (40 - c) / 5];
    const highlights = [];
    y.forEach((v, j) => { if (v < -1e-8) highlights.push({ row: j + 2, col: 1, kind: 'enter' }); });
    return { label: `c₁=${i === 1 ? '20/3' : fmt(c)}`, title: costTitles[i], description: costDescriptions[i], formula: 'y₁=(3c₁−20)/5，y₂=(40−c₁)/5；σs₁=−y₁≤0，σs₂=−y₂≤0', metrics: [{ label: '新最优产量', value: pair(x) }, { label: '新最优收益', value: fmt(c * x[0] + 20 * x[1]) }], svg: p => costSvg(costTargets[Math.max(0, i - 1)], c, p), table: table(['原基检验', '数值', '需要满足'], [['y₁', fmt(y[0]), '≥0'], ['y₂', fmt(y[1]), '≥0'], ['σs₁', fmt(-y[0]), '≤0'], ['σs₂', fmt(-y[1]), '≤0']], '表内均按原基计算；越界时的负价格不再是可行对偶解。原基解仍可行，最优性需要重新检验。', highlights) };
  });

  const toyBasis = d => [100 + .5 * d[0] - .25 * d[1], 230 + .5 * d[1], 20 - 2 * d[0] + d[1] + d[2]];
  function toySvg(from, to, p) {
    const d = mix(from, to, p), x = toyBasis(d), feasible = x.every(v => v >= -1e-8);
    let s = text(35, 27, '同时变化必须代入联合条件', 'graph-title');
    const zero = 236, scale = .62;
    s += `<line x1="54" y1="${zero}" x2="466" y2="${zero}" stroke="${muted}" stroke-width="1.4"/>`;
    [110, 260, 410].forEach((cx, i) => {
      const value = x[i], y = value >= 0 ? zero - value * scale : zero;
      s += `<rect x="${cx - 32}" y="${y}" width="64" height="${Math.max(1, Math.abs(value) * scale)}" rx="6" fill="${value >= 0 ? green : amber}" opacity=".8"/>`;
      s += text(cx, value >= 0 ? y - 12 : zero + Math.abs(value) * scale + 21, fmt(value), 'graph-title', 'text-anchor="middle"');
      s += text(cx, 296, ['x₂', 'x₃', 'x₆（剩余）'][i], 'graph-label', 'text-anchor="middle"');
    });
    s += text(35, 55, `Δb=${pair(d)}　${feasible ? '原基可行，仍最优' : '原基出现负分量，失效'}`, 'graph-muted');
    return s;
  }
  const toyFrames = [
    { label: '原最优基', title: '从最终表直接计算资源变化', description: '三条约束依次加松弛变量 x₄,x₅,x₆。最优基为 (x₂,x₃,x₆)，原基解 (100,230,20)，影子价格 (1,2,0)；基变量全部非负才可保留原基。', formula: 'max 3x₁+2x₂+5x₃；x₁+2x₂+x₃≤430，3x₁+2x₃≤460，x₁+4x₂≤420，x≥0', metrics: [{ label: '原最优值', value: '1350' }, { label: '影子价格', value: '(1, 2, 0)' }], svg: p => toySvg([0, 0, 0], [0, 0, 0], p), table: table(['基变量', 'B⁻¹ 的对应行', '原值'], [['x₂', '(1/2, −1/4, 0)', '100'], ['x₃', '(0, 1/2, 0)', '230'], ['x₆', '(−2, 1, 1)', '20']], '将 Δb 乘 B⁻¹ 后加到原值；全部非负时才有 z′*=1350+D₁+2D₂。') },
    { label: '单独改变', title: '只增加 D₁=30，原基先失效', description: '单独改变资源 1 时允许 D₁≤10。若直接增加 30，原基会算出 x₆=−40；这只说明该基不可行，需要重新优化。', formula: 'Δb=(30,0,0) ⇒ x′B=(115,230,−40)；不能沿用原基最优值公式', metrics: [{ label: '原基计算结果', value: '(115, 230, −40)' }, { label: '判断', value: '原基失效' }], svg: p => toySvg([0, 0, 0], [30, 0, 0], p), table: table(['资源', '单独改变时允许 Δb', '影子价格'], [['资源 1', '[−200,10]', '1'], ['资源 2', '[−20,400]', '2'], ['资源 3', '≥−20', '0']], '这些区间都假定其他改变量为零，不能把它们直接拼成联合允许区域。', [{ row: 0, col: 1, kind: 'leave' }]) },
    { label: '联合核验', title: '其他资源同时调整，可以恢复原基', description: '改为 (D₁,D₂,D₃)=(30,−12,100)，三项基变量变为 (118,224,48)，均非负。尽管 D₁ 超过单独上界，联合变化仍使原基保持最优。', formula: 'x′B=(118,224,48)≥0；z′*=1350+30+2×(−12)=1356', metrics: [{ label: '新基变量', value: '(118, 224, 48)' }, { label: '新最优值', value: '1356' }], svg: p => toySvg([30, 0, 0], [30, -12, 100], p), table: table(['核验', '计算', '结果'], [['x′₂', '100+30/2−(−12)/4', '118'], ['x′₃', '230+(−12)/2', '224'], ['x′₆', '20−2×30−12+100', '48'], ['Δz*', '1×30+2×(−12)+0×100', '6']], '资源 3 的价格为零，只在当前基的有效区域内表示边际收益为零。') }
  ];

  Object.assign(window.OPT_DEMOS ||= {}, {
    duality: { title: '对偶与最优性证明', formula: '原问题给下界，对偶给上界；双方可行且目标相等 ⇒ 最优', variants: [{ label: '上下界与互补松弛', formula: 'max 30x₁+20x₂；2x₁+x₂≤8，x₁+3x₂≤8，x₁,x₂≥0', frames: boundFrames }, { label: '混合约束写对偶', formula: 'min 7x₁+9x₂+10x₃；x₁−2x₃≤8，2x₂−8x₃≥1，x₁,x₂,x₃≥0', frames: mixedFrames }] },
    sensitivity: { title: '灵敏度分析', formula: '原基保持最优 ⇔ B⁻¹b ≥ 0 且 σN ≤ 0', variants: [{ label: '右端项 b：平移约束', formula: 'max 30x₁+20x₂；2x₁+x₂≤b₁，x₁+3x₂≤8，x₁,x₂≥0', frames: rhsFrames }, { label: '目标系数 c：转动等值线', formula: 'max c₁x₁+20x₂；2x₁+x₂≤8，x₁+3x₂≤8，x₁,x₂≥0', frames: costFrames }, { label: '联合变化：B⁻¹ 核验', formula: '原基保持最优 ⇔ xB+B⁻¹Δb ≥ 0；只改资源，检验数不变', frames: toyFrames }] }
  });
})();
