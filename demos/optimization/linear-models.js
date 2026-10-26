/* Lecture 2 supplements. All tableaux below are computed by Gauss–Jordan pivots. */
(() => {
  'use strict';
  const GREEN = '#23816b', AMBER = '#cd9a62', GRID = '#e0e6dd', MUTED = '#74827b';
  const escape = value => String(value).replace(/[&<>\"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
  const progress = p => { const t = Math.min(1, Math.max(0, Number(p) || 0)); return t * t * (3 - 2 * t); };
  const mix = (a, b, p) => a + (b - a) * progress(p);
  const fmt = value => {
    if (Math.abs(value) < 1e-9) return '0';
    if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
    for (let d = 2; d <= 40; d++) if (Math.abs(value * d - Math.round(value * d)) < 1e-8) return `${Math.round(value * d)}/${d}`;
    return Number(value.toFixed(2)).toString();
  };
  const dec = value => Number(value.toFixed(2)).toString();
  const text = (x, y, value, cls = 'graph-label', extra = '') => `<text x="${x}" y="${y}" class="${cls}" ${extra}>${escape(value)}</text>`;
  const line = (x1, y1, x2, y2, color = GRID, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${extra}/>`;
  const points = (plot, values) => values.map(([x, y]) => `${plot.x(x)},${plot.y(y)}`).join(' ');
  const graph = ({ xmin = 0, xmax, ymin = 0, ymax, xtick = 1, ytick = 1, xlabel = 'x₁', ylabel = 'x₂' }) => {
    const plot = { x: x => 56 + (x - xmin) / (xmax - xmin) * 418, y: y => 269 - (y - ymin) / (ymax - ymin) * 222 };
    let svg = '';
    for (let x = Math.ceil(xmin / xtick) * xtick; x <= xmax + 1e-8; x += xtick) svg += line(plot.x(x), 47, plot.x(x), 269) + text(plot.x(x), 288, dec(x), 'graph-muted', 'text-anchor="middle"');
    for (let y = Math.ceil(ymin / ytick) * ytick; y <= ymax + 1e-8; y += ytick) svg += line(56, plot.y(y), 474, plot.y(y)) + text(45, plot.y(y) + 4, dec(y), 'graph-muted', 'text-anchor="end"');
    svg += line(56, 269, 482, 269, MUTED) + line(56, 269, 56, 40, MUTED) + text(490, 274, xlabel) + text(47, 31, ylabel);
    return { ...plot, svg };
  };
  const dot = (plot, x, y, color = GREEN, pulse = 0) => `<circle cx="${plot.x(x)}" cy="${plot.y(y)}" r="${13 + pulse}" fill="${color}" opacity=".12"/><circle cx="${plot.x(x)}" cy="${plot.y(y)}" r="5.5" fill="${color}" stroke="white" stroke-width="2"/>`;
  const path = (plot, values, color = GREEN, extra = '') => `<polyline points="${points(plot, values)}" fill="none" stroke="${color}" ${extra.includes('stroke-width=') ? '' : 'stroke-width="3"'} stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const shade = (plot, values, color = GREEN, opacity = .1) => `<polygon points="${points(plot, values)}" fill="${color}" opacity="${opacity}"/>`;
  const metric = (label, value) => ({ label, value });
  const table = (headers, rows, caption, highlights = []) => ({ headers, rows, caption, highlights });

  function initial(A, b, basis) { return { A: A.map(r => r.slice()), b: b.slice(), basis: basis.slice() }; }
  function pivot(state, entering, leaving) {
    const { A, b, basis } = initial(state.A, state.b, state.basis);
    const q = A[leaving][entering];
    if (Math.abs(q) < 1e-9) throw new Error('A zero pivot is not permitted.');
    A[leaving] = A[leaving].map(v => v / q); b[leaving] /= q;
    for (let i = 0; i < A.length; i++) if (i !== leaving) {
      const coefficient = A[i][entering];
      A[i] = A[i].map((v, j) => v - coefficient * A[leaving][j]); b[i] -= coefficient * b[leaving];
    }
    basis[leaving] = entering;
    if (b.some(v => v < -1e-8)) throw new Error('The selected pivot lost auxiliary feasibility.');
    return { A, b, basis };
  }
  function solution(state) {
    const x = Array(state.A[0].length).fill(0);
    state.basis.forEach((j, i) => { x[j] = state.b[i]; });
    return x;
  }
  function objective(state, c) {
    return { value: state.b.reduce((sum, v, i) => sum + c[state.basis[i]] * v, 0), sigma: c.map((v, j) => v - state.A.reduce((sum, row, i) => sum + c[state.basis[i]] * row[j], 0)) };
  }
  function tableau(state, c, names, name, caption, highlights = []) {
    const obj = objective(state, c);
    const rows = state.A.map((row, i) => [names[state.basis[i]], ...row.map(fmt), fmt(state.b[i])]);
    rows.push(['σ', ...obj.sigma.map(fmt), fmt(obj.value)]);
    return table(['基', ...names, `${name} / b`], rows, caption || '约束行写成等式；末行是最大化检验数 σ，最右格是当前目标值。', highlights);
  }
  function mark(row, col, kind) { return { row, col, kind }; }

  // Artificial-variable example: x3 is surplus, x4 slack; R1 and R2 are temporary.
  const artificialNames = ['x₁', 'x₂', 'x₃', 'x₄', 'R₁', 'R₂'];
  const a0 = initial([[3, 1, 0, 0, 1, 0], [4, 3, -1, 0, 0, 1], [1, 2, 0, 1, 0, 0]], [3, 6, 4], [4, 5, 3]);
  const a1 = pivot(a0, 0, 0), a2 = pivot(a1, 1, 1), a3 = pivot(a2, 2, 2);
  const bigC = [-4, -1, 0, 0, -100, -100], phaseC = [0, 0, 0, 0, -1, -1];
  const phase2 = initial(a2.A.map(row => row.slice(0, 4)), a2.b, a2.basis);
  const phase2final = pivot(phase2, 2, 2), originalC = [-4, -1, 0, 0];
  const artificialPlot = (from, to, p, stage) => {
    const plot = graph({ xmax: 1.6, ymax: 3.4, xtick: .4, ytick: 1 });
    const u = solution(from), v = solution(to), x = mix(u[0], v[0], p), y = mix(u[1], v[1], p);
    const r = mix((u[4] || 0) + (u[5] || 0), (v[4] || 0) + (v[5] || 0), p), color = r > 1e-7 ? AMBER : GREEN;
    return plot.svg + path(plot, [[0, 3], [1, 0]], MUTED, 'stroke-width="1.5" stroke-dasharray="5 4"') + path(plot, [[0, 2], [1.5, 0]], AMBER, 'stroke-width="1.5" stroke-dasharray="5 4"') + path(plot, [[0, 2], [1.6, 1.2]], MUTED, 'stroke-width="1.5" stroke-dasharray="5 4"') + path(plot, [[.4, 1.8], [.6, 1.2]], GREEN, 'stroke-width="7"') + text(275, 33, '绿色线段 = 原问题可行域', 'graph-muted') + path(plot, [[u[0], u[1]], [x, y]], color, 'stroke-dasharray="5 5"') + dot(plot, x, y, color) + text(plot.x(x) + 12, plot.y(y) - 13, `(${dec(x)}, ${dec(y)})`) + text(70, 311, r > 1e-7 ? `辅助解：R₁ + R₂ = ${dec(r)}，尚非原可行解` : `${stage}：人工变量为 0，已在原可行域`, 'graph-muted');
  };
  const artificialMetrics = (state, c, name) => {
    const x = solution(state);
    return [metric('原变量 (x₁, x₂)', `(${fmt(x[0])}, ${fmt(x[1])})`), metric(name, fmt(objective(state, c).value)), metric('人工变量之和', fmt((x[4] || 0) + (x[5] || 0)))];
  };
  const rawArtificialTable = table(['行', 'x₁', 'x₂', 'x₃', 'x₄', 'R₁', 'R₂', '右端'], [
    ['R₁', '3', '1', '0', '0', '1', '0', '3'], ['R₂', '4', '3', '−1', '0', '0', '1', '6'], ['x₄', '1', '2', '0', '1', '0', '0', '4'],
    ['w_M', '4', '1', '0', '0', '100', '100', '0']
  ], '最后一行是原始目标等式 w_M + 4x₁ + x₂ + 100R₁ + 100R₂ = 0；尚未化为当前基的检验数行。', [mark(3, 5, 'leave'), mark(3, 6, 'leave')]);
  const bigFrames = [
    { label: '加人工变量', title: '先获得辅助问题的起点', description: '等式加 R₁；“≥”约束减 x₃、加 R₂；“≤”约束加 x₄。初始基是 (R₁, R₂, x₄) = (3, 6, 4)。', formula: 'max w_M = −4x₁ − x₂ − 100(R₁ + R₂)', metrics: artificialMetrics(a0, bigC, 'w_M'), svg: p => artificialPlot(a0, a0, p, '辅助问题'), table: rawArtificialTable, note: '橙色辅助解可以违反原约束；只有人工变量全部为 0 才属于原问题。' },
    { label: '目标行消元', title: '消去目标行中的基人工变量', description: '将 R₁、R₂ 的约束代入目标，得到与当前基一致的检验数。x₁ 的检验数 696 最大，先令它入基。', formula: 'w_M = −900 + 696x₁ + 399x₂ − 100x₃', metrics: artificialMetrics(a0, bigC, 'w_M'), svg: p => artificialPlot(a0, a0, p, '辅助问题'), table: tableau(a0, bigC, artificialNames, 'w_M', '', [mark(3, 1, 'enter'), mark(0, 1, 'pivot')]) },
    { label: 'R₁ 退出', title: 'x₁ 入基，R₁ 出基', description: '正分母比值为 3/3、6/4、4/1，取 θ = 1。R₁ 归零，但 R₂ = 2，仍是辅助解。下表显示换基后的结果。', formula: 'θ = min{1, 3/2, 4} = 1；w_M: −900 → −204', metrics: artificialMetrics(a1, bigC, 'w_M'), svg: p => artificialPlot(a0, a1, p, '辅助问题'), table: tableau(a1, bigC, artificialNames, 'w_M', '', [mark(0, 1, 'pivot'), mark(3, 2, 'enter')]) },
    { label: 'R₂ 退出', title: 'x₂ 入基，R₂ 出基', description: '取 θ = 6/5，得到 (x₁, x₂, x₄) = (3/5, 6/5, 1)。两个人工变量均为 0，首次到达原问题可行域。', formula: 'R₁ = R₂ = 0；w_M = −18/5', metrics: artificialMetrics(a2, bigC, 'w_M'), svg: p => artificialPlot(a1, a2, p, '原问题可行解'), table: tableau(a2, bigC, artificialNames, 'w_M', '', [mark(1, 2, 'pivot'), mark(3, 3, 'enter')]) },
    { label: '原目标最优', title: '继续改善原目标', description: 'x₃ 的检验数为 1/5。正分母比值为 3 和 1，故 x₄ 出基、θ = 1。全部检验数非正，原最小值为 17/5。', formula: 'x* = (2/5, 9/5)；min f = 17/5 = 3.4', metrics: artificialMetrics(a3, bigC, 'w_M = −f'), svg: p => artificialPlot(a2, a3, p, '原问题最优解'), table: tableau(a3, bigC, artificialNames, 'w_M', '', [mark(2, 3, 'pivot')]), note: 'M = 100 只适用于此例。一般需充分大的 M；数值计算通常采用两阶段法。' }
  ];
  const phaseFrames = [
    { label: '阶段 I', title: '先把人工变量总和压到 0', description: '阶段 I 只负责寻找原问题可行解。先代入基人工变量，得到 r = 9 − 7x₁ − 4x₂ + x₃；表中最大化的是 −r。', formula: 'min r = R₁ + R₂；等价 max(−r)', metrics: artificialMetrics(a0, phaseC, '−r'), svg: p => artificialPlot(a0, a0, p, '阶段 I'), table: tableau(a0, phaseC, artificialNames, '−r', '', [mark(3, 1, 'enter'), mark(0, 1, 'pivot')]) },
    { label: 'r = 2', title: '第一个人工变量退出', description: 'x₁ 入、R₁ 出，θ = 1。人工变量总和由 9 降至 2；此时尚不能判定原问题不可行。', formula: 'r: 9 → 2；(x₁, R₂, x₄) = (1, 2, 3)', metrics: artificialMetrics(a1, phaseC, '−r'), svg: p => artificialPlot(a0, a1, p, '阶段 I'), table: tableau(a1, phaseC, artificialNames, '−r', '', [mark(3, 2, 'enter'), mark(1, 2, 'pivot')]) },
    { label: 'r = 0', title: '阶段 I 找到原问题可行解', description: 'x₂ 入、R₂ 出，θ = 6/5。最小值 r* = 0，人工变量已全部退出基，才能删除人工列。', formula: 'r* = 0；(x₁, x₂, x₄) = (3/5, 6/5, 1)', metrics: artificialMetrics(a2, phaseC, '−r'), svg: p => artificialPlot(a1, a2, p, '阶段 I 完成'), table: tableau(a2, phaseC, artificialNames, '−r'), note: '若阶段 I 最优 r* > 0，原问题不可行。若零人工变量仍在基中，先换出或删除相应冗余行，再删列。' },
    { label: '恢复目标', title: '阶段 II：重算原目标行', description: '删去人工列，保留当前可行基。将 w = −4x₁ − x₂ 中的基变量消去，得到 x₃ 的正检验数 1/5。', formula: 'w = −18/5 + (1/5)x₃', metrics: [metric('(x₁, x₂)', '(3/5, 6/5)'), metric('w = −f', '−18/5'), metric('σ₃', '1/5')], svg: p => artificialPlot(a2, a2, p, '阶段 II'), table: tableau(phase2, originalC, artificialNames.slice(0, 4), 'w', '', [mark(3, 3, 'enter'), mark(2, 3, 'pivot')]) },
    { label: '原目标最优', title: '一次换基到达最小值', description: 'x₃ 入基，x₄ 出基；θ = min{3, 1} = 1。最大化 −f 得 −17/5，换回原目标就是 min f = 17/5。', formula: 'x* = (2/5, 9/5)；f* = 17/5', metrics: [metric('(x₁, x₂)', '(2/5, 9/5)'), metric('f*', '17/5 = 3.4'), metric('人工变量', '已删除')], svg: p => artificialPlot(a2, a3, p, '原问题最优解'), table: tableau(phase2final, originalC, artificialNames.slice(0, 4), 'w') }
  ];

  // Absolute-value, minimax, and the three regression losses.
  function absolutePlot(start, end, p) {
    const plot = graph({ xmin: -5, xmax: 3, ymax: 7, xtick: 1, ytick: 2, xlabel: 'x', ylabel: 't' });
    const x = mix(start.x, end.x, p), t = mix(start.t, end.t, p);
    return plot.svg + shade(plot, [[-5, 0], [-2, 0], [-2, 7], [-5, 7]]) + path(plot, [[-5, 5], [0, 0], [3, 3]]) + line(plot.x(-2), plot.y(0), plot.x(-2), plot.y(7), AMBER, 'stroke-dasharray="5 4"') + text(75, 33, '绿色区域：x ≤ −2', 'graph-muted') + text(350, 33, 'V 形边界：t = |x|', 'graph-muted') + dot(plot, x, t) + text(plot.x(x) + 13, plot.y(t) - 12, `(${dec(x)}, ${dec(t)})`) + text(70, 311, `x⁺ + x⁻ = ${dec(t)}；|x| = ${dec(Math.abs(x))}`, 'graph-muted');
  }
  const absoluteFrames = [
    { label: '拆成非负量', title: '自由变量 = 正部 − 负部', description: '令 x = x⁺ − x⁻，两部分非负。任意分解未必满足 |x| = x⁺ + x⁻；例如 x⁺ = 1、x⁻ = 5 时，x = −4，但和为 6。', formula: 'min |x|, x ≤ −2 → min(x⁺ + x⁻), x⁺ − x⁻ ≤ −2', metrics: [metric('x', '−4'), metric('x⁺ + x⁻', '6'), metric('|x|', '4')], svg: p => absolutePlot({ x: -4, t: 6 }, { x: -4, t: 6 }, p), table: table(['形式', '等价模型'], [['正负拆分', 'min x⁺ + x⁻；x = x⁺ − x⁻'], ['上图形式', 'min t；x ≤ t，−x ≤ t'], ['原约束', 'x ≤ −2']], '正权重的最小化会消除正、负部分的共同多余量。') },
    { label: '消除多余量', title: '同时减去共同的正值', description: '把 x⁺ 和 x⁻ 同减 1，x = −4 保持不变，目标从 6 降到 4。最优分解中二者不会同时为正。', formula: '(x⁺, x⁻): (1, 5) → (0, 4)；x 不变', metrics: [metric('x⁺', '0'), metric('x⁻', '4'), metric('目标', '4')], svg: p => absolutePlot({ x: -4, t: 6 }, { x: -4, t: 4 }, p), table: table(['量', '开始', '消除后'], [['x⁺', '1', '0'], ['x⁻', '5', '4'], ['x', '−4', '−4'], ['目标', '6', '4']], '竖直下降表示保持 x 不变，只收紧绝对值的上界。', [mark(3, 2, 'pivot')]) },
    { label: '到达最优', title: '沿可行边界走向离 0 最近的点', description: '可行条件要求 x ≤ −2。沿 t = |x| 向右移动到 x = −2，不能再靠近 0；最小值为 2。', formula: 'x⁺ = 0，x⁻ = 2；x* = −2，min |x| = 2', metrics: [metric('最优 x', '−2'), metric('(x⁺, x⁻)', '(0, 2)'), metric('最小绝对值', '2')], svg: p => absolutePlot({ x: -4, t: 4 }, { x: -2, t: 2 }, p), table: table(['检查', '最优值'], [['分解', '0 − 2 = −2'], ['可行', '−2 ≤ −2'], ['目标', '0 + 2 = |−2| = 2']], '这套线性化适用于正权重绝对值和；其余约束也必须为线性。') }
  ];
  function minimaxPlot(from, to, p) {
    const plot = graph({ xmax: 4, ymax: 5, xtick: 1, ytick: 1, xlabel: 'x', ylabel: 't' });
    const x = mix(from, to, p), t = Math.max(x, 4 - x);
    return plot.svg + shade(plot, [[0, 4], [2, 2], [4, 4], [4, 5], [0, 5]]) + path(plot, [[0, 0], [4, 4]], MUTED) + path(plot, [[0, 4], [4, 0]], AMBER) + path(plot, [[0, 4], [2, 2], [4, 4]]) + line(plot.x(0), plot.y(t), plot.x(4), plot.y(t), GREEN, 'stroke-dasharray="6 5" stroke-width="2"') + dot(plot, x, t) + text(plot.x(x) + 12, plot.y(t) - 12, `t = ${dec(t)}`) + text(65, 33, '共同上界压低到两条成本的交点', 'graph-muted') + text(70, 311, `成本 x = ${dec(x)}；成本 4 − x = ${dec(4 - x)}`, 'graph-muted');
  }
  const minimaxFrames = [
    { label: '引入上界', title: '用一个 t 同时罩住所有成本', description: '把“最大的成本”改写成每个成本都不超过 t。最小化 t 会让它贴到两条直线的上包络。', formula: 'min max{x, 4−x} → min t；x ≤ t，4−x ≤ t，0 ≤ x ≤ 4', metrics: [metric('起点 x', '0'), metric('两项成本', '0、4'), metric('共同上界 t', '4')], svg: p => minimaxPlot(0, 0, p), table: table(['原成本', '新约束', 'x = 0'], [['x', 'x ≤ t', '0 ≤ 4'], ['4 − x', '4 − x ≤ t', '4 ≤ 4']], '绿色区域是两项成本上方的共同可行区域。') },
    { label: '压低最坏项', title: '降低较大的成本，直到两项平衡', description: '从 x = 0 向右移动，成本 4−x 下降、成本 x 上升；在它们相遇前，最坏成本持续下降。', formula: 'x: 0 → 2；t = max{x, 4−x}: 4 → 2', metrics: [metric('最优 x', '2'), metric('两项成本', '2、2'), metric('最小上界', '2')], svg: p => minimaxPlot(0, 2, p), table: table(['推导', '结论'], [['两约束相加', '4 ≤ 2t ⇒ t ≥ 2'], ['取 x = 2', '两项成本均为 2'], ['达到下界', 't* = 2']], '一般成本可能为负，不能擅自给 t 添加非负限制；本例由约束自然得到 t ≥ 2。') }
  ];
  function fittingPlot(from, to, p, name) {
    const plot = graph({ xmax: 4, ymax: 7, xtick: 1, ytick: 2, xlabel: '样本', ylabel: 'y' });
    const b = mix(from, to, p), values = [0, 0, 6];
    let svg = plot.svg + line(plot.x(.5), plot.y(b), plot.x(3.5), plot.y(b), GREEN, 'stroke-width="3"');
    values.forEach((y, i) => {
      svg += line(plot.x(i + 1), plot.y(y), plot.x(i + 1), plot.y(b), AMBER, 'stroke-width="2.5" stroke-dasharray="5 4"') + dot(plot, i + 1, y, MUTED) + text(plot.x(i + 1) + 11, plot.y(y) - 9, String(y));
    });
    return svg + text(68, 33, `${name}：同一组数据，不同误差目标`, 'graph-muted') + text(plot.x(3.55), plot.y(b) - 9, `b = ${dec(b)}`) + text(70, 311, `残差 e = (${dec(b)}, ${dec(b)}, ${dec(b - 6)})`, 'graph-muted');
  }
  const fitDefinitions = [
    { label: '拟合 · LS', short: 'LS', b: 2, formula: 'min [2b² + (b−6)²]；6b−12 = 0 ⇒ b* = 2', title: '平方误差把较大残差放大', description: '同拟合一个常数，最小二乘取均值 b = 2；最小平方误差和为 24。这是二次目标，不是直接的线性规划。', headers: ['样本 y', '残差 e', 'e²'], rows: [['0', '2', '4'], ['0', '2', '4'], ['6', '−4', '16']], total: '24', note: '一般线性拟合可解正规方程；LS 在这里用于与两种线性规划损失比较。' },
    { label: '拟合 · LAD', short: 'LAD', b: 0, formula: 'min Σuⱼ；−uⱼ ≤ b−yⱼ ≤ uⱼ，uⱼ ≥ 0', title: '绝对偏差和选择中位数', description: '三个数据为 0、0、6，最小绝对偏差取中位数 b = 0，总绝对误差为 6。正负残差由同一个非负上界 uⱼ 控制。', headers: ['样本 y', '残差 e', 'u = |e|'], rows: [['0', '0', '0'], ['0', '0', '0'], ['6', '−6', '6']], total: '6', note: '0 ≤ b ≤ 6 时，2|b| + |b−6| = b + 6，因此最优点为 b = 0。' },
    { label: '拟合 · L∞', short: 'L∞', b: 3, formula: 'min t；−t ≤ b−yⱼ ≤ t，t ≥ 0', title: '最坏误差在两端平衡', description: '最小最大绝对偏差取极值中点 b = 3，使两端误差同为 3。每个样本均有统一的误差上限 t = 3。', headers: ['样本 y', '残差 e', '|e| ≤ t'], rows: [['0', '3', '3 ≤ 3'], ['0', '3', '3 ≤ 3'], ['6', '−3', '3 ≤ 3']], total: '3', note: '此处误差是绝对值，故 t ≥ 0 合理；它与一般带符号成本的 minimax 上界不同。' }
  ];
  const fittingVariants = fitDefinitions.map(def => ({ label: def.label, formula: `${def.short}：将样本 0、0、6 拟合为同一常数 b；残差 e = (b, b, b−6)`, frames: [
    { label: '同一个起点', title: '把 0、0、6 拟合成常数 b', description: '固定斜率为 0，只调整水平拟合线。先取 b = 5；橙色线段是每个样本到拟合线的残差。', formula: def.formula, metrics: [metric('起点 b', '5'), metric('残差', '(5, 5, −1)'), metric('损失目标', def.short)], svg: p => fittingPlot(5, 5, p, def.short), table: table(['方法', '要控制的误差'], [['LS', '总平方误差'], ['LAD', '总绝对误差'], ['L∞', '最大绝对误差']], '三种方法得到不同解，因为它们控制的误差标准不同。') },
    { label: `b* = ${def.b}`, title: def.title, description: def.description, formula: def.formula, metrics: [metric('最优常数 b*', String(def.b)), metric('最小损失', def.total), metric('损失目标', def.short)], svg: p => fittingPlot(5, def.b, p, def.short), table: table(def.headers, def.rows, `${def.short} 最小损失 = ${def.total}。`), note: def.note }
  ] }));

  // Exceptional LP cases: every tableau uses the same sigma = c - c_B B^-1 A convention.
  const degNames = ['x₁', 'x₂', 's₁', 's₂'], degC = [3, 9, 0, 0];
  const d0 = initial([[1, 4, 1, 0], [1, 2, 0, 1]], [8, 4], [2, 3]);
  const d1 = pivot(d0, 1, 0), d2 = pivot(d1, 0, 1);
  function degeneratePlot(from, to, p, zero = false) {
    const plot = graph({ xmax: 8, ymax: 4, xtick: 2, ytick: 1 });
    const x = mix(from[0], to[0], p), y = mix(from[1], to[1], p);
    return plot.svg + shade(plot, [[0, 0], [4, 0], [0, 2]]) + path(plot, [[0, 2], [8, 0]], MUTED, 'stroke-width="1.5"') + path(plot, [[0, 2], [4, 0]], AMBER, 'stroke-width="1.5"') + path(plot, [from, [x, y]]) + dot(plot, x, y, GREEN, zero ? 5 * Math.sin(progress(p) * Math.PI) : 0) + text(75, 33, zero ? '换了基，但几何位置没有变化' : '两条边界在 (0, 2) 同时命中', 'graph-muted') + text(70, 311, `当前点 (${dec(x)}, ${dec(y)})；z = ${dec(3 * x + 9 * y)}`, 'graph-muted');
  }
  const degenerateFrames = [
    { label: '比值并列', title: '两条约束同时到达边界', description: 'x₂ 入基时，两行比值均为 2。任选第一行 s₁ 出基，沿纵轴到 (0, 2)；另一基变量 s₂ 同时变为 0。', formula: 'θ = min{8/4, 4/2} = 2', metrics: [metric('步长 θ', '2'), metric('新点', '(0, 2)'), metric('z', '18')], svg: p => degeneratePlot([0, 0], [0, 2], p), table: tableau(d1, degC, degNames, 'z', '换基后 s₂ = 0，因此这是退化基本可行解。', [mark(1, 5, 'leave'), mark(2, 1, 'enter')]) },
    { label: '零步长', title: '正检验数仍可能走不动', description: '此基中 σ₁ = 3/4 > 0，但 x₁ 入基时最小比值是 0。s₂ 出基后仍在 (0, 2)，目标仍为 18；新基满足全部检验数非正。', formula: 'θ = min{2/(1/4), 0/(1/2)} = 0；Δz = θσ₁ = 0', metrics: [metric('实际步长', '0'), metric('点与目标', '(0, 2)，18'), metric('基的变化', '(x₂, s₂) → (x₂, x₁)')], svg: p => degeneratePlot([0, 2], [0, 2], p, true), table: tableau(d2, degC, degNames, 'z', '零步长仍以非零主元 1/2 作消元；“零步长”不是“零主元”。', [mark(1, 1, 'pivot')]), note: '退化可能引起循环，但不一定循环；退化也不必然意味着存在冗余约束。' }
  ];
  const multiC = [2, 4, 0, 0];
  const m0 = initial([[1, 2, 1, 0], [1, 1, 0, 1]], [5, 4], [2, 3]);
  const m1 = pivot(m0, 1, 0), m2 = pivot(m1, 0, 1);
  function multiplePlot(p) {
    const plot = graph({ xmax: 5, ymax: 4, xtick: 1, ytick: 1 });
    const x = mix(0, 3, p), y = mix(2.5, 1, p);
    return plot.svg + shade(plot, [[0, 0], [4, 0], [3, 1], [0, 2.5]]) + path(plot, [[0, 2.5], [5, 0]], MUTED, 'stroke-width="1.5"') + path(plot, [[0, 4], [4, 0]], AMBER, 'stroke-width="1.5"') + path(plot, [[0, 2.5], [3, 1]], GREEN, 'stroke-width="7"') + dot(plot, x, y) + text(75, 33, '绿色整条边都是最优解', 'graph-muted') + text(70, 311, `(${dec(x)}, ${dec(y)})；2x₁ + 4x₂ = 10`, 'graph-muted');
  }
  const multipleFrames = [
    { label: '一个最优点', title: '最优表中出现零检验数', description: '先得到 B = (0, 5/2)，z = 10。全部检验数非正，而非基变量 x₁ 的检验数恰为 0；可沿它尝试换基。', formula: 'σ₁ = 0；z = 10 − 2s₁', metrics: [metric('最优点 B', '(0, 5/2)'), metric('z', '10'), metric('σ₁', '0')], svg: () => multiplePlot(0), table: tableau(m1, multiC, degNames, 'z', '', [mark(2, 1, 'enter')]) },
    { label: '一整条最优边', title: '零成本方向允许正步长', description: 'x₁ 入基，s₂ 出基，θ = 3，到达 C = (3, 1)。两点之间的每个凸组合均可行，目标始终为 10。', formula: 'x = λ(0, 5/2) + (1−λ)(3, 1)，0 ≤ λ ≤ 1', metrics: [metric('另一最优点 C', '(3, 1)'), metric('步长 θ', '3 > 0'), metric('z 始终为', '10')], svg: p => multiplePlot(p), table: tableau(m2, multiC, degNames, 'z', '确实产生了不同的可行点，才能据此断言多重最优。'), note: '只看到零检验数、却只能零步长换基时，还不能单凭它认定存在不同最优点。' }
  ];
  const unboundC = [2, 1, 0, 0];
  const u0 = initial([[1, -1, 1, 0], [2, 0, 0, 1]], [10, 40], [2, 3]);
  const u1 = pivot(u0, 0, 0), u2 = pivot(u1, 1, 1);
  function unboundedPlot(p) {
    const plot = graph({ xmax: 24, ymax: 24, xtick: 5, ytick: 5 });
    const t = 11 * progress(p), y = 10 + t;
    return plot.svg + shade(plot, [[0, 0], [10, 0], [20, 10], [20, 24], [0, 24]]) + path(plot, [[10, 0], [24, 14]], AMBER, 'stroke-width="1.5"') + path(plot, [[20, 0], [20, 24]], MUTED, 'stroke-width="1.5"') + path(plot, [[20, 10], [20, y]]) + path(plot, [[19.4, y - .8], [20, y], [20.6, y - .8]]) + dot(plot, 20, y) + text(70, 33, '沿可行射线一直改善目标', 'graph-muted') + text(70, 311, `x₁ = 20，x₂ = 10 + ${dec(t)}；z = ${dec(50 + t)}`, 'graph-muted');
  }
  const unboundedFrames = [
    { label: '没有正分母', title: '有改善方向，却没有离基行', description: '在基解 (20, 10)，非基松弛变量 s₁ 的检验数为 1 > 0；它所在列为 (0, −1)，没有严格正分母限制步长。', formula: 'σ_s₁ = 1 > 0；ā_s₁ = (0, −1)ᵀ', metrics: [metric('当前点', '(20, 10)'), metric('z', '50'), metric('比值检验', '无正分母')], svg: () => unboundedPlot(0), table: tableau(u2, unboundC, degNames, 'z', 'σ > 0 且入基列全部 ≤ 0 ⇒ 最大化目标无界。', [mark(0, 3, 'enter'), mark(1, 3, 'enter'), mark(2, 3, 'enter')]) },
    { label: '目标趋向无穷', title: '展示一条可以无限延长的可行射线', description: '令 x₁ = 20、x₂ = 10+t，t ≥ 0。两条原约束始终满足，而 z = 50+t，可以无限增加。', formula: 'x₁ − x₂ = 10−t ≤ 10；2x₁ = 40；z → +∞', metrics: [metric('参数范围', 't ≥ 0，无上界'), metric('可行性', '始终满足'), metric('目标', '50+t → +∞')], svg: p => unboundedPlot(p), table: table(['量', '沿射线的表达式'], [['x₁', '20'], ['x₂', '10+t'], ['s₁', 't'], ['z', '50+t']], '画面只截取射线的一段；其参数 t 没有上限。'), note: '可行域无界本身不保证目标无界；这里同时给出了使目标持续改善的可行方向。' }
  ];
  const infeasibleNames = ['x₁', 'x₂', 's₁', 's₂', 'R'], infeasibleC = [0, 0, 0, 0, -1];
  const i0 = initial([[2, 1, 1, 0, 0], [3, 4, 0, -1, 1]], [2, 12], [2, 4]);
  const i1 = pivot(i0, 1, 0);
  function infeasiblePlot(p) {
    const plot = graph({ xmax: 4, ymax: 4.5, xtick: 1, ytick: 1 });
    const y = mix(0, 2, p), r = 12 - 4 * y;
    return plot.svg + shade(plot, [[0, 0], [1, 0], [0, 2]]) + shade(plot, [[0, 3], [4, 0], [4, 4.5], [0, 4.5]], AMBER) + path(plot, [[0, 2], [1, 0]]) + path(plot, [[0, 3], [4, 0]], AMBER) + dot(plot, 0, y, AMBER) + text(72, 33, '绿色与橙色区域没有交集', 'graph-muted') + text(70, 311, `辅助解 (0, ${dec(y)})；尚需人工变量 R = ${dec(r)}`, 'graph-muted');
  }
  const infeasibleFrames = [
    { label: '寻找可行解', title: '阶段 I 尝试消去人工变量', description: '第一条约束限制 2x₁+x₂ ≤ 2，第二条要求 3x₁+4x₂ ≥ 12。加人工变量 R 后，辅助起点为 R = 12。', formula: 'min r = R；3x₁ + 4x₂ − s₂ + R = 12', metrics: [metric('初始 R', '12'), metric('辅助点', '(0, 0)'), metric('状态', '仅辅助可行')], svg: () => infeasiblePlot(0), table: tableau(i0, infeasibleC, infeasibleNames, '−r', '', [mark(2, 2, 'enter'), mark(0, 2, 'pivot')]) },
    { label: 'r* = 4 > 0', title: '人工变量的最小值仍为正', description: 'x₂ 入基，θ = 2，到达 (0, 2)，但仍需 R = 4 才能补足第二个等式。阶段 I 已最优，原约束不可行。', formula: '3x₁ + 4x₂ ≤ 4(2x₁+x₂) ≤ 8 < 12', metrics: [metric('阶段 I 最优 r*', '4 > 0'), metric('辅助点', '(0, 2)'), metric('原问题', '不可行')], svg: p => infeasiblePlot(p), table: tableau(i1, infeasibleC, infeasibleNames, '−r', '阶段 I 所有检验数均非正，−r* = −4；人工变量不能归零。'), note: '必须在阶段 I 达到最优后再用 r* > 0 判不可行；中间迭代人工变量为正并不足以判定。' }
  ];

  // Fail early if a data edit breaks the numerical endpoints used in the article.
  const close = (a, b) => Math.abs(a - b) < 1e-8;
  if (![-900, -204, -18 / 5, -17 / 5].every((v, j) => close(objective([a0, a1, a2, a3][j], bigC).value, v)) || ![9, 2, 0].every((v, j) => close(-objective([a0, a1, a2][j], phaseC).value, v)) || !close(objective(d2, degC).value, 18) || !close(objective(m2, multiC).value, 10) || !close(-objective(i1, infeasibleC).value, 4)) throw new Error('Lecture 2 demo numerical verification failed.');

  Object.assign(window.OPT_DEMOS ||= {}, {
    artificial: { title: '人工变量：大 M 法与两阶段法', formula: 'min f = 4x₁+x₂；3x₁+x₂=3，4x₁+3x₂≥6，x₁+2x₂≤4，x≥0', variants: [{ label: '大 M 法', frames: bigFrames }, { label: '两阶段法', frames: phaseFrames }] },
    'linear-models': { title: '把绝对值与最坏误差改写成线性约束', formula: '绝对值 → 正负拆分 / 双边上界；minimax → 共同上界', variants: [{ label: '绝对值', formula: 'min |x|；x ≤ −2，x 为自由变量', frames: absoluteFrames }, { label: 'minimax', formula: 'min max{x, 4−x}；0 ≤ x ≤ 4', frames: minimaxFrames }, ...fittingVariants] },
    'lp-cases': { title: '单纯形法的四种特殊情况', formula: '退化看零步长；多重最优看零成本的正步长；无界看入基列；不可行看阶段 I', variants: [
      { label: '退化', formula: 'max z = 3x₁+9x₂；x₁+4x₂≤8，x₁+2x₂≤4，x₁,x₂≥0', frames: degenerateFrames },
      { label: '多重最优', formula: 'max z = 2x₁+4x₂；x₁+2x₂≤5，x₁+x₂≤4，x₁,x₂≥0', frames: multipleFrames },
      { label: '无界', formula: 'max z = 2x₁+x₂；x₁−x₂≤10，2x₁≤40，x₁,x₂≥0', frames: unboundedFrames },
      { label: '不可行', formula: '检验约束可行性：2x₁+x₂≤2，3x₁+4x₂≥12，x₁,x₂≥0；阶段 I：min r = R', frames: infeasibleFrames }
    ] }
  });
})();
