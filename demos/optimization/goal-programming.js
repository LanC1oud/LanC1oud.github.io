(() => {
  'use strict';

  const green = '#23816b', amber = '#cd9a62', muted = '#74827b';
  const grid = 'var(--line,#e0e6dd)';
  const eps = 1e-8;
  const escape = value => String(value).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const text = (x, y, value, cls = 'graph-label', extra = '') => `<text x="${x}" y="${y}" class="${cls}" ${extra}>${escape(value)}</text>`;
  const line = (x1, y1, x2, y2, color, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${extra}/>`;
  const fmt = n => Math.abs(n) < eps ? '0' : String(Number(n.toFixed(2))).replace('-', '−');
  const pair = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
  const mix = (a, b, progress) => {
    const p = Math.max(0, Math.min(1, progress));
    return a.map((v, i) => v + (b[i] - v) * p);
  };
  const table = (headers, rows, caption, highlights = []) => ({ headers, rows, caption, highlights });
  const metric = (label, value) => ({ label, value: String(value) });

  // First three components are tax receipts in million yuan; xg is cents per liter.
  const onTarget = [11.05, 1.6, 3.2, 2], missed = [9.3, 2.1, 3.3, 4], met = [11.7, 1.4, 2.75, 2];
  const taxLabels = ['税款总额', '食品税', '一般工商税', '每升汽油税'];
  const taxSigns = ['−', '−', '−', '+'];
  const taxGoals = ['T ≥ 16', '0.1T−食品税 ≥ 0', '0.2T−工商税 ≥ 0', 'x_g ≤ 2'];
  function taxData([industry, food, trade, gas]) {
    const total = industry + food + trade + .075 * gas;
    const delta = [total - 16, .1 * total - food, .2 * total - trade, gas - 2];
    return { total, delta, losses: delta.map((v, i) => Math.max(0, i === 3 ? v : -v)) };
  }
  function taxSvg(from, to, p) {
    const { total, delta, losses } = taxData(mix(from, to, p));
    let out = text(26, 27, `税款总额 T=${fmt(total)} 百万元`, 'graph-title');
    out += text(172, 61, '低于目标值', 'graph-muted') + text(280, 61, '高于目标值', 'graph-muted') + text(414, 61, '受罚偏差', 'graph-muted');
    out += line(260, 70, 260, 257, muted, 'stroke-width="1.5"');
    const maxes = [1.25, .75, .65, 2.5];
    delta.forEach((v, i) => {
      const y = 93 + i * 49;
      const width = Math.min(106, Math.abs(v) / maxes[i] * 106);
      const color = losses[i] > eps ? amber : green;
      out += text(26, y + 4, taxLabels[i]);
      out += line(151, y, 369, y, grid, 'stroke-width="4" stroke-linecap="round"');
      if (width > eps) out += `<rect x="${v < 0 ? 260 - width : 260}" y="${y - 8}" width="${width}" height="16" rx="4" fill="${color}"/>`;
      out += `<circle cx="260" cy="${y}" r="2.5" fill="${muted}"/>`;
      out += text(414, y + 4, `${taxSigns[i]}侧：${fmt(losses[i])}`, losses[i] > eps ? 'graph-label' : 'graph-muted');
    });
    out += text(26, 285, '橙色受罚，绿色不受罚；各行独立缩放。', 'graph-muted');
    out += text(26, 308, '前三项偏差单位：百万元；汽油税：分/升。', 'graph-muted');
    return out;
  }
  function taxTable(plan, caption, mark = false) {
    const { delta, losses } = taxData(plan);
    return table(['软目标', '不足 s⁻', '超出 s⁺', '受罚偏差'], taxLabels.map((name, i) => [name, fmt(Math.max(0, -delta[i])), fmt(Math.max(0, delta[i])), fmt(losses[i])]), caption,
      mark ? losses.flatMap((loss, row) => loss > eps ? [{ row, col: 3, kind: 'leave' }] : []) : []);
  }
  const taxFrames = [
    { label: '设目标值', title: '先区分必须满足的约束与希望达到的目标', description: '税收例有四个软目标，税率用比例、汽油税用分/升、税额用百万元。此参考方案刚好满足四个目标，任何硬性约束仍需严格保留。', formula: 'T=550xₚ+35x_f+55xₛ+0.075x_g；目标 T≥16，食品税≤0.1T，工商税≤0.2T，x_g≤2', metrics: [metric('总税款目标', '16 百万元'), metric('汽油税上限目标', '2 分/升')], svg: p => taxSvg(onTarget, onTarget, p), table: table(['目标', '整理后的条件'], taxLabels.map((label, i) => [label, taxGoals[i]]), '把两项税收占比移到左边，统一写成非负的目标；汽油税仍是上限目标。') },
    { label: '引入偏差', title: '软目标写成等式，用两种偏差记录超出与不足', description: '把目标写为 f+s⁻−s⁺=b。试算的实际税款从 16 降到 15，税款不足 1 百万元；汽油税从 2 升到 4，超额 2 分/升。', formula: 's⁻=max(0,b−f)，s⁺=max(0,f−b)；f+s⁻−s⁺=b', metrics: [metric('税款不足', '1 百万元'), metric('汽油税超额', '2 分/升')], svg: p => taxSvg(onTarget, missed, p), table: taxTable(missed, '食品税为 2.1，超过 0.1T=1.5；按移项后的 ≥ 目标，这表现为左端不足 0.6。') },
    { label: '选受罚侧', title: '下限只罚不足，上限只罚超额', description: '食品税和工商税移项后，变成“剩余比例空间至少为零”，所以也罚不足；汽油税仍只罚超额。如果目标要求恰好相等，两侧都应罚。', formula: 'G₁=s₁⁻，G₂=s₂⁻，G₃=s₃⁻，G₄=s₄⁺；硬约束不引入允许违反的偏差', metrics: [metric('≥ 型目标', '罚 s⁻'), metric('≤ 型目标', '罚 s⁺'), metric('＝ 型目标', '两侧都罚')], svg: p => taxSvg(missed, missed, p), table: taxTable(missed, '橙色格为应最小化的偏差。两种真实偏差按正部定义，同一目标至多一侧为正。', true) },
    { label: '检查达标', title: '有偏差不一定违反目标', description: '改用另一个税率方案，税款达到 16 百万元、汽油税回到 2 分/升。食品税和工商税低于各自上限，虽产生正偏差，两项目标仍满足。', formula: '0.1T−1.4=0.2；0.2T−2.75=0.45；四项受罚偏差均为 0', metrics: [metric('总税款', '16 百万元'), metric('受罚目标数', '0')], svg: p => taxSvg(missed, met, p), table: taxTable(met, '税款组成：工业 11.7、食品 1.4、一般工商 2.75、汽油 0.15（百万元）。') }
  ];

  const origin = [0, 0], exampleTrial = [4, 3], courseOptimum = [5, 2.5];
  const highCoverage = [6, 2], withinBudget = [6, 4 / 3], middle = [6, 5 / 3], tvOnly = [0, 5];
  const originalEdge = [courseOptimum, highCoverage];
  const coverageEdge = [tvOnly, highCoverage];
  const efficientEdge = [withinBudget, highCoverage];

  function adData([x1, x2], budget, weight) {
    const staff = x1 + 2 * x2, coverage = 4 * staff, cost = 8 * x1 + 24 * x2;
    const g1 = Math.max(0, 45 - coverage), g2 = Math.max(0, cost - budget);
    return { staff, coverage, cost, g1, g2, score: weight === null ? null : weight * g1 + g2 };
  }

  function adSvg(from, to, p, { budget = 100, weight = 2, edge = null, locked = null, heading = '硬约束内分配广播、电视时长' } = {}) {
    const point = mix(from, to, p);
    const { coverage, cost, g1, g2, score } = adData(point, budget, weight);
    const left = 44, right = 346, top = 42, bottom = 256, maxX = 6.6, maxY = 5.9;
    const xx = x => left + (right - left) * x / maxX;
    const yy = y => bottom - (bottom - top) * y / maxY;
    const edgeLine = ([x1, y1], [x2, y2], color, extra = '') => line(xx(x1), yy(y1), xx(x2), yy(y2), color, extra);
    const polygon = (points, color, opacity) => `<polygon points="${points.map(([x, y]) => `${xx(x)},${yy(y)}`).join(' ')}" fill="${color}" opacity="${opacity}"/>`;
    let out = text(44, 24, heading, 'graph-title');
    for (let i = 0; i <= 6; i++) out += line(xx(i), top, xx(i), bottom, grid);
    for (let i = 0; i <= 5; i++) out += line(left, yy(i), right, yy(i), grid);
    out += polygon([origin, [6, 0], highCoverage, tvOnly], green, '.13');
    if (locked === 'budget') out += polygon([origin, [6, 0], withinBudget, [0, budget / 24]], green, '.27');
    out += edgeLine(tvOnly, [maxX, (10 - maxX) / 2], green, 'stroke-width="2"');
    out += edgeLine([6, 0], [6, maxY], green, 'stroke-width="2"');
    out += edgeLine([0, 45 / 8], [maxX, (45 - 4 * maxX) / 8], amber, 'stroke-width="2" stroke-dasharray="6 4"');
    out += edgeLine([0, budget / 24], [maxX, (budget - 8 * maxX) / 24], muted, 'stroke-width="2" stroke-dasharray="2 4"');
    if (edge) out += edgeLine(...edge, green, 'stroke-width="6" stroke-linecap="round" opacity=".7"');
    out += `<path d="M ${left},${top - 3} V ${bottom} H ${right + 5}" fill="none" stroke="${muted}" stroke-width="1.3"/>`;
    out += text(left - 12, bottom + 17, '0', 'graph-muted');
    out += text(35, yy(5) + 4, '5', 'graph-muted', 'text-anchor="end"');
    out += text(xx(6), bottom + 17, '6', 'graph-muted', 'text-anchor="middle"');
    out += text(46, 39, '电视 x₂', 'graph-muted');
    out += text(264, bottom + 19, '广播 x₁', 'graph-muted');
    if (Math.abs(point[0] - from[0]) + Math.abs(point[1] - from[1]) > eps) out += edgeLine(from, point, green, 'stroke-width="2" stroke-dasharray="4 4"');
    const cx = xx(point[0]), cy = yy(point[1]);
    out += `<circle cx="${cx}" cy="${cy}" r="13" fill="${green}" opacity=".17"/><circle cx="${cx}" cy="${cy}" r="5.7" fill="${green}" stroke="var(--panel,#fff)" stroke-width="1.2"/>`;
    out += text(point[0] > 5.35 ? cx - 10 : cx + 11, cy - 12, pair(...point), 'graph-title', `text-anchor="${point[0] > 5.35 ? 'end' : 'start'}" style="paint-order:stroke;stroke:var(--panel,#fff);stroke-width:3px;stroke-linejoin:round"`);

    out += text(371, 55, '覆盖人数', 'graph-muted') + text(371, 76, `${fmt(coverage)} 万人`, 'graph-title');
    out += text(371, 104, '实际花费', 'graph-muted') + text(371, 125, `${fmt(cost)} 千元`, 'graph-title');
    out += text(371, 155, `覆盖缺口 ${fmt(g1)}`, 'graph-label') + text(371, 177, `预算超额 ${fmt(g2)}`, 'graph-label');
    if (score !== null) out += text(371, 214, `权和 z=${fmt(score)}`, 'graph-title');
    else if (locked) out += text(371, 214, locked === 'budget' ? '已锁定 G₂=0' : g1 <= 5 + eps ? '已锁定 G₁=5' : '正在压低 G₁', 'graph-title');
    out += line(44, 301, 64, 301, green, 'stroke-width="2"') + text(71, 305, '硬约束', 'graph-muted');
    out += line(141, 301, 161, 301, amber, 'stroke-width="2" stroke-dasharray="6 4"') + text(168, 305, '覆盖目标 45', 'graph-muted');
    out += line(274, 301, 294, 301, muted, 'stroke-width="2" stroke-dasharray="2 4"') + text(301, 305, `预算目标 ${budget}`, 'graph-muted');
    return out;
  }

  function adMetrics(point, budget, weight = null) {
    const { g1, g2, score } = adData(point, budget, weight);
    return [metric('广播、电视（分钟）', pair(...point)), metric('受罚偏差 (G₁,G₂)', pair(g1, g2)), ...(score === null ? [] : [metric('权和 z', fmt(score))])];
  }
  function adTable(point, budget, caption) {
    const [x1] = point;
    const { staff, coverage, cost, g1, g2 } = adData(point, budget, null);
    return table(['项目', '实际', '目标或限制', '受罚偏差'], [
      ['覆盖人数', fmt(coverage), '≥45', fmt(g1)], ['预算', fmt(cost), `≤${budget}`, fmt(g2)],
      ['雇员上限', fmt(staff), '≤10', '硬约束'], ['广播上限', fmt(x1), '≤6', '硬约束']
    ], caption);
  }
  function weightTable(w) {
    return table(['候选方案', '覆盖缺口', '预算超额', `z（${w}:1）`], [withinBudget, highCoverage].map((x, i) => {
      const d = adData(x, 80, w);
      return [i === 0 ? '(6, 4/3)' : '(6, 2)', i === 0 ? '31/3' : fmt(d.g1), fmt(d.g2), i === 0 && w !== 3 ? `${31 * w}/3` : fmt(d.score)];
    }), '覆盖单位为万人、预算单位为千元；权重按当前单位解释。', w === 3 ? [{ row: 0, col: 3, kind: 'enter' }, { row: 1, col: 3, kind: 'enter' }] : [{ row: w < 3 ? 0 : 1, col: 3, kind: 'enter' }]);
  }
  const adModel = budget => `覆盖≥45，花费≤${budget}（软）；x₁+2x₂≤10，x₁≤6，x₁,x₂≥0（硬）`;

  const courseFrames = [
    { label: '硬软区分', title: '广告例：雇员与广播时长是硬约束', description: 'x₁、x₂ 分别为广播和电视分钟数。每分钟分别覆盖 4、8 万人，花费 8、24 千元，占用 1、2 名雇员。覆盖目标 45 万人和预算目标 100 千元允许偏离。', formula: 'C=4x₁+8x₂，K=8x₁+24x₂；x₁+2x₂≤10，x₁≤6，x≥0', metrics: [metric('覆盖目标', '45 万人'), metric('预算目标', '100 千元')], svg: p => adSvg(origin, origin, p), table: table(['每分钟', '广播 x₁', '电视 x₂'], [['覆盖（万人）', '4', '8'], ['花费（千元）', '8', '24'], ['雇员（人）', '1', '2']], '浅绿色区域为硬约束可行域；橙色虚线是覆盖目标，灰色点线是预算目标。') },
    { label: '计入权和', title: '只为覆盖不足和预算超额扣分', description: '给覆盖缺口权重 2、预算超额权重 1。可行试算 (4,3) 覆盖 40 万人、花费 104 千元，两项受罚偏差分别为 5、4。', formula: 'C+s₁⁻−s₁⁺=45；K+s₂⁻−s₂⁺=100；min z=2s₁⁻+s₂⁺=2×5+4=14', metrics: adMetrics(exampleTrial, 100, 2), svg: p => adSvg(origin, exampleTrial, p), table: adTable(exampleTrial, 100, '广播与电视时长都符合硬约束；超过预算的 4 千元只记作偏差，不删掉方案。') },
    { label: '找到最优', title: '覆盖量最多为 40，权和不可能低于 10', description: '雇员约束给出 C=4(x₁+2x₂)≤40，覆盖至少缺 5 万人。在 (5,2.5) 花费恰好等于 100 千元，权和达到下界 10。', formula: 'z=2G₁+G₂≥2×(45−40)=10；(5,2.5) 取到 z*=10', metrics: adMetrics(courseOptimum, 100, 2), svg: p => adSvg(exampleTrial, courseOptimum, p), table: adTable(courseOptimum, 100, '课件给出的最优方案。z*>0 说明在当前硬约束下，两项受罚偏差无法同时为零。') },
    { label: '比较同分', title: '同为偏差最优，实际花费仍可能不同', description: '沿绿色粗线从 (5,2.5) 移到 (6,2)，覆盖始终为 40 万人、预算均未超额，所以 z 恒为 10。后者实际少花 4 千元，可作为同分时的选择。', formula: 'x₁+2x₂=10，5≤x₁≤6 ⇒ G₁=5，G₂=0，z=10', metrics: adMetrics(highCoverage, 100, 2), svg: p => adSvg(courseOptimum, highCoverage, p, { edge: originalEdge, heading: '粗线上的方案在偏差目标下同分' }), table: table(['方案', '覆盖（万人）', '花费（千元）', '偏差权和'], [['(5,2.5)', '40', '100', '10'], ['(6,2)', '40', '96', '10']], '若按原始“覆盖多、实际花费低”比较，(6,2) 支配 (5,2.5)；达标偏差与原始目标不是一回事。', [{ row: 1, col: 2, kind: 'enter' }]) }
  ];

  const weightFrames = [
    { label: '预算 80', title: '扩展：预算降低后，目标之间出现真实取舍', description: '保持课件的广告数据和硬约束，只把预算目标从 100 改为 80 千元。最高覆盖方案 (6,2) 需花 96 千元，现在有 16 千元超额。', formula: '预算目标 K≤80；G₁=(45−C)₊，G₂=(K−80)₊，min w₁G₁+G₂', metrics: adMetrics(highCoverage, 80, 2), svg: p => adSvg(highCoverage, highCoverage, p, { budget: 80, heading: '预算线下移，最高覆盖方案开始超额' }), table: adTable(highCoverage, 80, '这是对原例的延伸。预算仍是软目标，绿色可行域没有改变。') },
    { label: '2∶1', title: '权比小于 3，避免超额的收益更大', description: '在广播用满后，每少覆盖 1 万人可少花 3 千元。权比为 2 时，降低超额比覆盖损失更划算，直到预算恰好用完。', formula: 'x*=(6,4/3)，(G₁,G₂)=(31/3,0)，z*=62/3', metrics: adMetrics(withinBudget, 80, 2), svg: p => adSvg(highCoverage, withinBudget, p, { budget: 80, weight: 2, heading: '沿广播上限减少电视时长，降到预算线' }), table: weightTable(2) },
    { label: '3∶1', title: '权比等于 3，整段方案同样最优', description: '在线段 x₁=6、4/3≤x₂≤2 上，覆盖每增加 1 万人，超额增加 3 千元。权比为 3 时，收益和代价刚好抵消。', formula: '在该段 G₂=3C−104；3G₁+G₂=3(45−C)+3C−104=31', metrics: adMetrics(middle, 80, 3), svg: p => adSvg(withinBudget, middle, p, { budget: 80, weight: 3, edge: efficientEdge, heading: '权比正好平衡：粗线上的权和恒为 31' }), table: weightTable(3) },
    { label: '4∶1', title: '权比大于 3，愿意超支以换取覆盖', description: '权比为 4 时，少缺 1 万人的收益超过增加 3 千元的预算惩罚。最佳方案回到 (6,2)，把覆盖提高到硬约束允许的 40 万人。', formula: 'x*=(6,2)，(G₁,G₂)=(5,16)，z*=4×5+16=36', metrics: adMetrics(highCoverage, 80, 4), svg: p => adSvg(middle, highCoverage, p, { budget: 80, weight: 4, heading: '沿广播上限增加电视时长，提高覆盖' }), table: weightTable(4), note: '阈值 3 与量纲有关：把千元换成元后，预算偏差的数值和对应权重都要重新解释。' }
  ];

  const priorityFrames = [
    { label: '排优先级', title: '优先权法：一个目标优化完，再处理下一个', description: '沿用预算为 80 千元的扩展示例。按顺序逐级求解，并把已经取得的最优偏差固定；低优先级不能用补偿换取高优先级的退步。', formula: '先求 G₁*，再在 G₁=G₁* 的条件下最小化 G₂（也可交换顺序）', metrics: [metric('软目标 1', '覆盖不足 G₁'), metric('软目标 2', '预算超额 G₂')], svg: p => adSvg(origin, origin, p, { budget: 80, weight: null, heading: '同一可行域，可选择不同优先顺序' }), table: table(['顺序', '先最小化', '再最小化'], [['覆盖优先', 'G₁', 'G₂，固定 G₁*'], ['预算优先', 'G₂', 'G₁，固定 G₂*']], '优先级是严格顺序，权和法则允许目标之间相互补偿。') },
    { label: '锁覆盖', title: '第一阶段把覆盖缺口降到 5', description: '雇员限制使覆盖最多 40 万人，因此 G₁*=5。硬约束上边界整段都达到这个值，图中用 (0,5) 作为第一阶段的一个可行最优方案。', formula: 'min G₁=5 ⇒ 固定 C=40，即 x₁+2x₂=10', metrics: adMetrics(tvOnly, 80), svg: p => adSvg(origin, tvOnly, p, { budget: 80, weight: null, edge: coverageEdge, locked: 'coverage', heading: '第一阶段保留所有覆盖最大的方案' }), table: adTable(tvOnly, 80, '阶段一没有优化预算，因此这里的 40 千元超额只是示例值，还可减少。') },
    { label: '减超额', title: '沿固定覆盖线，减少预算超额', description: '覆盖已锁定为 40 万人。沿粗线增加广播、减少电视，预算超额由示例的 40 降到 16 千元，覆盖缺口仍保持 5 万人。', formula: '固定 x₁+2x₂=10；K=120−4x₁，故取 x₁=6，x₂=2', metrics: adMetrics(highCoverage, 80), svg: p => adSvg(tvOnly, highCoverage, p, { budget: 80, weight: null, edge: coverageEdge, locked: 'coverage', heading: '锁定覆盖后，沿粗线寻找最低花费' }), table: adTable(highCoverage, 80, '覆盖优先的最终方案 (6,2)，偏差向量为 (5,16)。') },
    { label: '锁预算', title: '交换顺序，先把预算超额降为零', description: '若预算优先，G₂*=0 易于达到。固定 G₂=0 后，必须在预算线以下选方案；深绿色区域是下一阶段保留的可行域。', formula: 'min G₂=0 ⇒ 固定 K≤80；在该区域再最小化 G₁', metrics: [metric('预算超额最优值', '0'), metric('保留条件', 'K≤80')], svg: p => adSvg(origin, origin, p, { budget: 80, weight: null, locked: 'budget', heading: '预算优先：只保留不超额的区域' }), table: table(['阶段', '固定条件'], [['预算第一', 'K≤80，G₂=0'], ['随后改善覆盖', '在保留区域内最大化 C']], '从原点开始只是为了展示区域；任何不超预算的方案都可作为第一阶段最优解。') },
    { label: '提覆盖', title: '预算锁定后，提高覆盖至约 34.67 万人', description: '在不超预算的范围内，广播的单位覆盖成本更低，先用满 6 分钟；余下 32 千元买 4/3 分钟电视，覆盖缺口为 31/3 万人。', formula: 'K≤80，K=3C−4x₁≥3C−24 ⇒ C≤104/3；(6,4/3) 取等号', metrics: adMetrics(withinBudget, 80), svg: p => adSvg(origin, withinBudget, p, { budget: 80, weight: null, locked: 'budget', heading: '不突破预算的前提下提高覆盖' }), table: table(['优先顺序', '时长方案', '覆盖不足', '预算超额'], [['覆盖 → 预算', '(6,2)', '5', '16'], ['预算 → 覆盖', '(6,4/3)', '31/3', '0']], '顺序改变会改变满意解。两种方案都满足相同的硬约束。', [{ row: 1, col: 3, kind: 'enter' }]) }
  ];

  (window.OPT_DEMOS ||= {})['goal-programming'] = {
    title: '目标规划：把偏差变成可比较的目标',
    formula: 'f(x)+s⁻−s⁺=b，s⁻,s⁺≥0',
    variants: [
      { label: '建立模型', formula: '市税收：税额用百万元，汽油税用分/升', frames: taxFrames },
      { label: '权和法：广告例', formula: adModel(100), frames: courseFrames },
      { label: '权重对比', formula: adModel(80), frames: weightFrames },
      { label: '优先权法', formula: adModel(80), frames: priorityFrames }
    ]
  };
})();
