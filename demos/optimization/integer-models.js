/* Lecture 6: binary models and logical constraints. */
(() => {
  'use strict';
  const GREEN = 'var(--green)', AMBER = 'var(--amber)', GRID = 'var(--line)', PANEL = 'var(--panel)';
  const fmt = n => String(Number(n.toFixed(2)));
  const sub = n => '₀₁₂₃₄₅₆₇₈₉'[n];
  const sum = a => a.reduce((s, x) => s + x, 0);
  const dot = (a, b) => sum(a.map((v, i) => v * b[i]));
  const masks = n => Array.from({ length: 2 ** n }, (_, m) => Array.from({ length: n }, (_, i) => (m >> i) & 1));
  const chosen = (x, labels) => x.flatMap((q, i) => q ? [labels ? labels[i] : String(i + 1)] : []).join('、') || '—';
  const tx = (x, y, value, cls = 'graph-label', anchor = 'start') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${value}</text>`;
  const line = (x1, y1, x2, y2, color = GRID, width = 1, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
  const rect = (x, y, w, h, fill, stroke = 'none', more = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}" ${more}/>`;
  const circle = (x, y, r, fill, stroke = 'none', more = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" ${more}/>`;
  const heading = s => tx(24, 29, s, 'graph-title');
  const foot = s => tx(260, 300, s, 'graph-muted', 'middle');
  const metric = (label, value) => ({ label, value: String(value) });
  const table = (headers, rows, caption = '', highlights = []) => ({ headers, rows, caption, highlights });
  const hi = (row, col, kind = 'pivot') => ({ row, col, kind });
  const vector = (n, ids) => Array.from({ length: n }, (_, i) => Number(ids.includes(i + 1)));
  const titleSet = (label, frames) => ({ label, frames });
  const mix = (a, b, p) => a + (b - a) * p;

  function cards(names, prev, next, p, y = 60, details = []) {
    const gap = 7, w = Math.min(88, (468 - (names.length - 1) * gap) / names.length);
    return names.map((name, i) => {
      const left = (520 - (w * names.length + gap * (names.length - 1))) / 2 + i * (w + gap);
      const q = mix(prev[i], next[i], p), cx = left + w / 2;
      return rect(left, y, w, 70, PANEL, GRID) + rect(left, y, w, 70, GREEN, next[i] ? GREEN : 'none', `fill-opacity="${q * .16}" stroke-opacity="${q * .8}"`) +
        tx(cx, y + 20, name, 'graph-label', 'middle') + tx(cx, y + 43, fmt(p < .5 ? prev[i] : next[i]), 'graph-title', 'middle') +
        (details[i] ? tx(cx, y + 60, details[i], 'graph-muted', 'middle') : '');
    }).join('');
  }
  function meter(label, value, cap, max, y) {
    const x = 115, w = 300, bad = value > cap + 1e-8;
    const capX = x + cap / max * w;
    return tx(28, y + 5, label) + rect(x, y - 8, w, 16, GRID) +
      rect(x, y - 8, Math.max(0, value / max * w), 16, bad ? AMBER : GREEN, 'none', 'fill-opacity=".64"') +
      line(capX, y - 14, capX, y + 14, 'var(--ink)', 1.5) + tx(433, y + 5, `${fmt(value)} / ${cap}`, bad ? 'graph-label' : 'graph-title');
  }
  function searchGrid(results, best, headingText, captionText, columns = 8) {
    return p => {
      let out = heading(headingText);
      const rows = Math.ceil(results.length / columns), width = 448 / columns, height = Math.min(52, 194 / rows);
      results.forEach((r, i) => {
        const x = 36 + (i % columns) * width, y = 61 + Math.floor(i / columns) * height;
        const shown = Math.max(.08, Math.min(1, p * results.length - i + 1));
        const winner = r === best, color = r.ok ? GREEN : AMBER;
        out += `<g opacity="${shown}">${rect(x, y, width - 4, height - 4, color, winner ? GREEN : 'none', `fill-opacity="${winner ? .26 : .10}" stroke-width="2"`)}${tx(x + (width - 4) / 2, y + height * .38, r.id, 'graph-muted', 'middle')}${tx(x + (width - 4) / 2, y + height * .73, r.ok ? r.value : '超限', winner ? 'graph-title' : 'graph-label', 'middle')}</g>`;
      });
      return out + foot(captionText);
    };
  }

  function capital() {
    const A = [[5, 4, 3, 7, 8], [1, 7, 9, 4, 6], [8, 10, 2, 1, 10]], c = [20, 40, 20, 15, 30], B = 25;
    const off = vector(5, []), all = vector(5, [1, 2, 3, 4, 5]), bestX = vector(5, [1, 2, 3, 4]), lp = [11 / 19, 1, 1, 1, 14 / 19];
    const results = masks(5).map(x => ({ x, id: x.join(''), value: dot(c, x), ok: A.every(a => dot(a, x) <= B) }));
    const best = results.filter(q => q.ok).reduce((x, y) => x.value >= y.value ? x : y);
    if (best.value !== 95 || best.x.join('') !== bestX.join('')) throw new Error('Invalid capital-budget example');
    const bars = (from, to, title) => p => {
      const x = from.map((q, i) => mix(q, to[i], p));
      return heading(title) + cards(c.map((_, i) => `项目 ${i + 1}`), from, to, p, 55, c.map(q => `收益 ${q}`)) +
        A.map((r, i) => meter(`第 ${i + 1} 年`, dot(r, x), B, 32, 163 + 47 * i)).join('') + foot('竖线为每年预算 25；条形为对应年份支出。');
    };
    function costs(x, active = [], caption = '') {
      const rows = c.map((q, i) => [`项目 ${i + 1}`, ...A.map(r => r[i]), q, fmt(x[i])]);
      rows.push(['实际合计', ...A.map(r => fmt(dot(r, x))), fmt(dot(c, x)), ''], ['每年预算', B, B, B, '—', '']);
      return table(['项目', '第 1 年', '第 2 年', '第 3 年', '收益', 'xⱼ'], rows, caption || '金额单位：百万元。每个项目的开关同时影响三年支出。', active);
    }
    return titleSet('资本预算', [
      { label: '开关', title: '项目要么选，要么不选', description: '课件例 1 有 5 个项目、3 年预算。每选一个项目，就同时计入三年的相应支出及项目总收益。', formula: 'max Σ cⱼxⱼ；每年 Σ aₜⱼxⱼ ≤ 25；xⱼ∈{0,1}', metrics: [metric('项目数', 5), metric('每年预算', 25)], svg: bars(off, off, '五个项目 · 三道年度预算线'), table: costs(off) },
      { label: '超限', title: '全部选择：收益高，但三年都超预算', description: '全选可带来 125 的收益，但支出为 27、27、31，三道年度限制均被违反。', formula: '(27, 27, 31) ≰ (25, 25, 25)', metrics: [metric('试算收益', 125), metric('超限年度', '3 / 3')], svg: bars(off, all, '全选后，支出跨过每一道预算线'), table: costs(all, [1, 2, 3].map(j => hi(5, j, 'leave'))) },
      { label: '可行', title: '关掉项目 5：方案可行，收益 95', description: '留下项目 1、2、3、4，三年的支出分别为 19、21、21。找到可行方案后，还要证明没有更好的组合。', formula: 'z = 20 + 40 + 20 + 15 = 95', metrics: [metric('总收益', 95), metric('预算余量', '6 / 4 / 4')], svg: bars(all, bestX, '关掉一个项目，三年同时减少支出'), table: costs(bestX, [1, 2, 3, 4].map(j => hi(5, j, 'enter'))) },
      { label: '穷举', title: '小规模可直接查完 32 种组合', description: `枚举 2⁵ 种开关组合，${results.filter(q => q.ok).length} 种满足全部预算，其中最高收益为 95。`, formula: 'x* = (1,1,1,1,0)；z* = 95', metrics: [metric('组合总数', 32), metric('最优整数收益', 95)], svg: searchGrid(results, best, '每一个五位开关，对应一种组合', '绿色为可行，橙色为预算超限；描边是最优组合。'), table: table(['开关 x', '三年支出', '收益'], results.filter(r => r.ok).sort((x, y) => y.value - x.value).slice(0, 5).map(r => [r.id, A.map(row => dot(row, r.x)).join(' / '), r.value]), '列出收益最高的五个可行组合；图中展示全部 32 种。', [hi(0, 2, 'enter')]) },
      { label: '松弛', title: '108.68 是上界，不是可执行的投资方案', description: '将开关放宽为 0≤xⱼ≤1 后，可以选取项目的分数部分。松弛允许更多方案，所以最大化目标值只能更高或相同。', formula: 'x₁=11/19，x₅=14/19，x₂=x₃=x₄=1；zLP=2065/19', metrics: [metric('整数最优', 95), metric('松弛上界', '108.68')], svg: bars(bestX, lp, '松弛解中的两项为分数，不能直接执行'), table: costs(lp, [hi(0, 5, 'pivot'), hi(4, 5, 'pivot')], '图表中的分数用两位小数显示；原模型只允许 0 或 1。') }
    ]);
  }

  function cover() {
    const points = [[70, 70], [260, 70], [450, 70], [260, 162], [450, 162], [70, 254], [260, 254], [450, 254]];
    const edges = [[1, 2], [2, 3], [4, 5], [7, 8], [6, 7], [2, 6], [1, 6], [4, 7], [2, 4], [5, 8], [3, 5]];
    const offsets = [[0, -10], [0, -10], [0, -10], [0, 18], [0, 18], [-16, -7], [-20, 4], [17, 5], [17, 5], [18, 5], [18, 5]];
    const names = 'ABCDEFGHIJK', optimum = [1, 2, 5, 7], proof = [1, 2, 3, 6];
    const covered = (e, x) => e.some(i => x.includes(i));
    const count = x => edges.filter(e => covered(e, x)).length;
    if (count(optimum) !== 11 || new Set(proof.flatMap(i => edges[i])).size !== 8) throw new Error('Invalid cover example');
    function streetGraph(from, to, match = false) {
      return p => {
        let out = heading(match ? '四条没有共同端点的街道' : '电话设在路口，可覆盖相邻街道');
        edges.forEach((e, k) => {
          const [[x, y], [u, v]] = e.map(i => points[i - 1]), isProof = match && proof.includes(k);
          const active = match ? isProof : covered(e, to);
          const before = match || covered(e, from);
          out += line(x, y, u, v, GRID, 3);
          if (active) {
            const reverse = !before && !to.includes(e[0]);
            const [ax, ay, bx, by] = reverse ? [u, v, x, y] : [x, y, u, v];
            out += line(ax, ay, mix(ax, bx, before ? 1 : p), mix(ay, by, before ? 1 : p), match ? AMBER : GREEN, 4);
          }
          out += tx((x + u) / 2 + offsets[k][0], (y + v) / 2 + offsets[k][1], names[k], active ? 'graph-title' : 'graph-muted', 'middle');
        });
        points.forEach(([x, y], k) => {
          const has = to.includes(k + 1), prev = from.includes(k + 1);
          out += circle(x, y, 15, PANEL, has ? GREEN : GRID, 'stroke-width="2"');
          if (has) out += circle(x, y, mix(0, 14, prev ? 1 : p), GREEN, 'none', 'fill-opacity=".18"');
          out += tx(x, y + 4, k + 1, has ? 'graph-title' : 'graph-label', 'middle');
        });
        return out + foot(match ? '每条标出的街道需要各自的一个端点。' : '绿色路口已装电话，绿色街道已被覆盖。');
      };
    }
    function streetTable(x, match = false) {
      const cols = ['街道', '端点', '状态', '街道', '端点', '状态'];
      const cells = edges.map((e, i) => [names[i], e.join('、'), match && proof.includes(i) ? '下界' : covered(e, x) ? '已覆盖' : '未覆盖']);
      const marked = match ? proof : cells.flatMap((r, i) => r[2] === '已覆盖' ? [i] : []);
      return table(cols, Array.from({ length: 6 }, (_, i) => [...cells[i], ...(cells[i + 6] || ['', '', ''])]), '每条街道至少有一个端点安装电话。', marked.map(i => hi(i % 6, i < 6 ? 2 : 5, match ? 'pivot' : 'enter')));
    }
    return titleSet('集合覆盖', [
      { label: '建模', title: '覆盖 11 条街道，电话数量最少', description: '课件校园例的 8 个路口分别是开关。每条街道需要在两个端点中至少选一个。', formula: 'min Σxⱼ；例如街道 A：x₁+x₂≥1', metrics: [metric('路口', 8), metric('街道', 11)], svg: streetGraph([], []), table: streetTable([]) },
      { label: '共享', title: '一个电话可以覆盖多条街道', description: '先在路口 2 装一部，街道 A、B、F、I 同时满足。只覆盖部分街道的方案仍不可行。', formula: 'x₂=1 ⇒ A、B、F、I 均已覆盖', metrics: [metric('电话', 1), metric('覆盖', '4 / 11')], svg: streetGraph([], [2]), table: streetTable([2]) },
      { label: '覆盖', title: '在 1、2、5、7 安装，覆盖全部街道', description: '再选 1、5、7 后，每条街道都至少连着一个已安装的端点。现在有一个 4 部电话的可行方案。', formula: 'x₁=x₂=x₅=x₇=1；Σxⱼ=4', metrics: [metric('电话', 4), metric('覆盖', '11 / 11')], svg: streetGraph([2], optimum), table: streetTable(optimum) },
      { label: '下界', title: '至少需要 4 部，所以 4 部就最优', description: 'B、C、D、G 互不共享端点，每条都要用一部不同的电话。4 部的可行方案已经达到这个下界。', formula: 'x₂+x₃≥1，x₄+x₅≥1，x₇+x₈≥1，x₁+x₆≥1 ⇒ Σxⱼ≥4', metrics: [metric('必要下界', 4), metric('最少电话', 4)], svg: streetGraph(optimum, optimum, true), table: streetTable(optimum, true), note: '也可以在 2、5、6、7 安装，同样只需 4 部。' }
    ]);
  }

  function knapsack() {
    const w = [2, 3, 4], value = [6, 8, 10], cap = 7, names = ['A', 'B', 'C'];
    const off = [0, 0, 0], greedy = [1, 1, 0], goal = [0, 1, 1];
    const all = masks(3).map(x => ({ id: x.join(''), x, weight: dot(w, x), value: dot(value, x), ok: dot(w, x) <= cap }));
    const best = all.filter(q => q.ok).reduce((a, b) => a.value >= b.value ? a : b);
    if (best.value !== 18 || best.x.join('') !== goal.join('')) throw new Error('Invalid knapsack example');
    const bag = (from, to) => p => {
      const x = from.map((q, i) => mix(q, to[i], p));
      return heading('每件物品只能整件选取') + cards(names, from, to, p, 72, w.map((q, i) => `${q} kg · 价值 ${value[i]}`)) +
        meter('总重量', dot(w, x), cap, 9, 192) + tx(260, 245, `总价值 ${fmt(dot(value, x))}`, 'graph-title', 'middle') + foot('竖线是容量 7 kg；表格给出单件重量和价值。');
    };
    const bagTable = x => table(['物品', '重量', '价值', '选取'], names.map((name, i) => [name, w[i], value[i], x[i]]).concat([['合计', dot(w, x), dot(value, x), '']]), '自拟小例；每件物品都不可分割。', x.flatMap((v, i) => v ? [hi(i, 3, 'enter')] : []));
    return titleSet('0–1 背包', [
      { label: '建模', title: '有限的容量，整件选取物品', description: '自拟小例：背包最多装 7 kg。有 A、B、C 三件物品，选取价值总和最高的组合。', formula: 'max 6xA+8xB+10xC；2xA+3xB+4xC≤7', metrics: [metric('容量', '7 kg'), metric('可选物品', 3)], svg: bag(off, off), table: bagTable(off) },
      { label: '试装', title: '优先拿单位重量最值钱的 A，不保证最优', description: '按价值/重量顺序拿 A、B 后还剩 2 kg，放不下 C；这套整件方案的价值只有 14。', formula: 'A+B：重量 5，价值 14', metrics: [metric('总重量', '5 kg'), metric('总价值', 14)], svg: bag(off, greedy), table: bagTable(greedy) },
      { label: '比较', title: '改为 B、C，刚好用满容量', description: '放下 A、换入 C，重量变为 7 kg，价值增至 18。整数背包不能靠单件价值密度直接保证最优。', formula: 'B+C：重量 3+4=7，价值 8+10=18', metrics: [metric('总重量', '7 kg'), metric('总价值', 18)], svg: bag(greedy, goal), table: bagTable(goal) },
      { label: '最优', title: '比较 8 种组合，B、C 的价值最高', description: '舍去超过 7 kg 的组合，在剩余组合里取价值最大者。大规模不能照搬穷举。', formula: 'x*=(0,1,1)；z*=18', metrics: [metric('候选组合', 8), metric('最优价值', 18)], svg: searchGrid(all, best, '比较所有整件组合', '格内第二行是总价值；超容量组合不可行。', 4), table: table(['组合', '重量', '价值', '可行'], all.map(r => [chosen(r.x, names), r.weight, r.value, r.ok ? '是' : '否']), 'B、C 在所有可行组合中价值最高。', [hi(all.indexOf(best), 2, 'enter')]) }
    ]);
  }

  function assignment() {
    const C = [[4, 1, 3], [2, 0, 5], [3, 2, 2]], persons = ['甲', '乙', '丙'], tasks = ['A', 'B', 'C'];
    const perms = [0, 1, 2].flatMap(a => [0, 1, 2].filter(b => b !== a).map(b => [a, b, 3 - a - b]));
    const score = p => sum(p.map((j, i) => C[i][j]));
    const best = perms.reduce((p, q) => score(p) <= score(q) ? p : q);
    if (score(best) !== 5) throw new Error('Invalid assignment example');
    const none = [], clash = [1, 1, 2];
    const pairs = (prev, next) => p => {
      const ys = [78, 160, 242]; let out = heading('人员与任务，一对一匹配');
      C.forEach((r, i) => r.forEach((_, j) => { out += line(103, ys[i], 417, ys[j], GRID, 1); }));
      next.forEach((j, i) => {
        const bad = next.filter(v => v === j).length > 1, progress = prev[i] === j ? 1 : p;
        out += line(103, ys[i], mix(103, 417, progress), mix(ys[i], ys[j], progress), bad ? AMBER : GREEN, 4);
        const px = 185 + i * 64, py = mix(ys[i], ys[j], (px - 103) / 314);
        out += rect(px - 14, py - 11, 28, 20, PANEL) + tx(px, py + 4, C[i][j], 'graph-title', 'middle');
      });
      ys.forEach((y, i) => {
        out += circle(80, y, 20, PANEL, GREEN) + circle(440, y, 20, PANEL, next.filter(v => v === i).length > 1 ? AMBER : GREEN);
        out += tx(80, y + 4, persons[i], 'graph-label', 'middle') + tx(440, y + 4, tasks[i], 'graph-label', 'middle');
      });
      return out + foot('线上的数字表示该人员完成该任务的费用。');
    };
    const matrix = (p, conflict = false) => table(['人 / 任务', ...tasks], C.map((r, i) => [persons[i], ...r]), '自拟费用矩阵；高亮表示所选的配对。', p.map((j, i) => hi(i, j + 1, conflict && j === 1 ? 'leave' : 'enter')));
    return titleSet('指派', [
      { label: '建模', title: '三人做三项任务，求总费用最小', description: '自拟小例：甲、乙、丙完成 A、B、C 的费用不同。xᵢⱼ=1 表示人员 i 做任务 j。', formula: 'min Σcᵢⱼxᵢⱼ；每行和=1，每列和=1', metrics: [metric('人员 / 任务', '3 / 3'), metric('匹配数', 3)], svg: pairs(none, none), table: matrix(none) },
      { label: '冲突', title: '每人独选最便宜任务，会出现冲突', description: '甲和乙都选 B，丙选 C。虽然每个人都选了一项，但任务 B 被选两次、任务 A 无人做。', formula: '行和=(1,1,1)；列和=(0,2,1)，不可行', metrics: [metric('任务 B 被选', 2), metric('任务 A 被选', 0)], svg: pairs(none, clash), table: matrix(clash, true) },
      { label: '匹配', title: '让乙去做 A，三项任务各有一人', description: '保留甲→B、丙→C，再将乙指派给 A。现在每行每列恰有一个 1，总费用为 5。', formula: 'x甲,B=x乙,A=x丙,C=1；z=1+2+2=5', metrics: [metric('重复任务', 0), metric('总费用', 5)], svg: pairs(clash, best), table: matrix(best) },
      { label: '最优', title: '比较 6 种一对一指派，最低费用为 5', description: '只比较满足双向唯一约束的指派，才能判定最优。这里用 3! 种排列核验这个小例。', formula: '甲→B，乙→A，丙→C；z*=5', metrics: [metric('有效排列', 6), metric('最小费用', 5)], svg: pairs(best, best), table: table([...persons, '总费用'], perms.map(p => [...p.map(j => tasks[j]), score(p)]), '每行是一个完整指派；最低总费用为 5。', [hi(perms.indexOf(best), 3, 'enter')]) }
    ]);
  }

  function projectLogic() {
    const projects = Array.from({ length: 7 }, (_, i) => `x${sub(i + 1)}`);
    const compare = (bad, good, label, ok) => p => heading(label) + cards(projects, bad, good, p, 97) +
      tx(260, 222, p < .999 ? '改变项目开关' : ok, 'graph-title', 'middle') + foot('1 表示投资该项目，0 表示不投资。');
    const examples = [
      { label: '若…则', title: '选项目 1，就必须选项目 2', description: '课件例 2：不能出现 x₁=1、x₂=0。反过来，选了项目 2 不代表一定要选项目 1。', formula: 'x₁≤x₂', ids: [[1], [1, 2]], end: '项目 1 和 2 同时选择，满足依赖', scope: '项目 1、2', vals: ['(1,0)', '(1,1)'] },
      { label: '至少', title: '项目 3、4 至少选一个', description: '两者都不选会违反要求；只选一个或两个都选都允许。', formula: 'x₃+x₄≥1', ids: [[1, 2], [1, 2, 4]], end: '项目 4 被选，已满足“至少一项”', scope: '项目 3、4', vals: ['(0,0)', '(0,1)'] },
      { label: '恰好', title: '在项目 5、6、7 中恰好选两项', description: '这里必须用等号。少选或多选都不满足；例中选择 5、6。', formula: 'x₅+x₆+x₇=2', ids: [[1, 2, 4, 5], [1, 2, 4, 5, 6]], end: '项目 5 和 6 被选，恰好两项', scope: '项目 5、6、7', vals: ['(1,0,0)', '(1,1,0)'] },
      { label: '加条件', title: '作业追加：选 1 必选 5，2 与 3 互斥', description: '互斥表示最多选一个，允许两个都不选。图中组合满足全部逻辑条件，但还需另外检查预算。', formula: 'x₁≤x₅；x₂+x₃≤1', ids: [[1, 2, 3, 4, 5, 6], [1, 2, 4, 5, 6]], end: '去掉项目 3，所有逻辑条件满足', scope: '项目 2、3', vals: ['(1,1)', '(1,0)'] }
    ];
    return titleSet('项目逻辑', examples.map(ex => ({ label: ex.label, title: ex.title, description: ex.description, formula: ex.formula,
      metrics: [metric('检查范围', ex.scope), metric('修改后', ex.vals[1])], svg: compare(...ex.ids.map(ids => vector(7, ids)), ex.title, ex.end),
      table: table(['被检查开关', '修改前', '修改后'], [[ex.scope, ex.vals[0], ex.vals[1]], ['本条件', '不满足', '满足']], '逻辑限制与目标函数、预算约束共同使用。', [hi(1, 1, 'leave'), hi(1, 2, 'enter')]) })));
  }

  function onOff() {
    const axis = (zero, interval, title) => p => {
      const sx = n => 60 + n * 50;
      let out = heading(title) + line(60, 159, 460, 159, GRID, 2);
      for (let i = 0; i <= 8; i++) out += line(sx(i), 153, sx(i), 165) + tx(sx(i), 191, i, 'graph-muted', 'middle');
      if (interval) out += line(sx(3), 159, mix(sx(3), sx(8), p), 159, GREEN, 7, 'stroke-linecap="round"');
      if (zero) out += circle(sx(0), 159, 7, GREEN);
      return out + tx(sx(1.5), 130, '不允许', 'graph-muted', 'middle') + foot('绿色点和线段为允许的 x。');
    };
    const ranges = (which) => table(['开关', '代入约束', '允许范围'], [['y=0', '0≤x≤0', '{0}'], ['y=1', '3≤x≤8', '[3,8]']], '自拟数值：一旦启用，就至少达到最小规模。', which === undefined ? [] : [hi(which, 2, 'enter')]);
    return titleSet('不连续取值', [
      { label: '目标域', title: '要么不开机，要么运行在 3 到 8', description: '课件的不连续域可用一个二元开关表达。自拟数值用 0 或 [3,8]，中间不能取 1、2 等。', formula: 'x∈{0}∪[3,8] ⇔ 3y≤x≤8y，y∈{0,1}', metrics: [metric('最小运行量', 3), metric('最大运行量', 8)], svg: axis(true, true, '孤立的零点，与一段允许运行的区间'), table: ranges() },
      { label: '关闭', title: '关掉开关 y=0，只留下 x=0', description: '下限和上限同时变成 0。关闭时没有任何正的运行量。', formula: '3×0≤x≤8×0 ⇒ x=0', metrics: [metric('开关 y', 0), metric('允许取值', '{0}')], svg: axis(true, false, '关机时只有零点'), table: ranges(0) },
      { label: '启用', title: '打开开关 y=1，只留下 3≤x≤8', description: '开关为 1 时，原来的上下限同时启用。两个分支取并集，就得到要求的不连续域。', formula: '3×1≤x≤8×1 ⇒ x∈[3,8]', metrics: [metric('开关 y', 1), metric('允许取值', '[3,8]')], svg: axis(false, true, '启用时必须达到最小运行量'), table: ranges(1) }
    ]);
  }

  function logicPlot(config) {
    return p => {
      const { maxZ, integer, regions, title, caption, marks = [] } = config;
      const sx = x => 73 + x * 49, sy = z => 258 - z * (197 / maxZ);
      let out = heading(title);
      const box = (x0, x1, z0, z1, fill, opacity) => `<rect x="${sx(x0)}" y="${sy(z1)}" width="${sx(x1) - sx(x0)}" height="${sy(z0) - sy(z1)}" fill="${fill}" opacity="${opacity}"/>`;
      if (integer) {
        regions.forEach(({ x0, x1, z0, z1, color }) => {
          for (let x = x0; x <= x1; x++) out += line(sx(x), sy(z0), sx(x), sy(mix(z0, z1, p)), color, 11, 'opacity=".6"');
        });
      } else regions.forEach(({ x0, x1, z0, z1, color }) => { out += box(x0, x1, z0, mix(z0, z1, p), color, .27); });
      for (let x = 0; x <= 8; x++) out += line(sx(x), 258, sx(x), 263, GRID) + tx(sx(x), 280, x, 'graph-muted', 'middle');
      for (let z = 0; z <= maxZ; z++) out += line(66, sy(z), 73, sy(z), GRID) + tx(59, sy(z) + 4, z, 'graph-muted', 'end');
      out += `<rect x="73" y="61" width="392" height="197" fill="none" stroke="${GRID}"/>` + tx(479, 262, 'x', 'graph-title') + tx(69, 51, 'z', 'graph-title');
      marks.forEach(({ x, z, bad, label }) => { out += circle(sx(x), sy(z), 6, bad ? AMBER : GREEN, PANEL, 'stroke-width="1.4"') + tx(sx(x) + 10, sy(z) - 9, label); });
      return out + foot(caption);
    };
  }

  function eitherOr() {
    const a = { x0: 0, x1: 3, z0: 0, z1: 6, color: GREEN }, b = { x0: 0, x1: 8, z0: 0, z1: 2, color: AMBER };
    const plot = (regions, title, caption, marks) => logicPlot({ maxZ: 6, regions, title, caption, marks });
    const bounds = i => table(['分支', '第一条', '第二条'], [['y=0', 'x≤3（启用）', 'z≤6（原上界）'], ['y=1', 'x≤8（原上界）', 'z≤2（启用）']], '在 0≤x≤8、0≤z≤6 内，M₁=8−3=5，M₂=6−2=4。', i === undefined ? [] : [hi(i, i + 1, 'enter')]);
    return titleSet('二选一约束', [
      { label: '并集', title: '两条约束至少满足一条', description: '自拟小例：在 0≤x≤8、0≤z≤6 内，要求 x≤3 或 z≤2。两条都满足也合法。', formula: 'x≤3 或 z≤2', metrics: [metric('约束关系', '至少一条'), metric('共同区域', '允许')], svg: plot([a, b], '两块区域取并集，重叠处同样可行', '绿色满足 x≤3，橙色满足 z≤2。'), table: bounds() },
      { label: 'y=0', title: '选 y=0：必须满足第一条', description: '第一条保持 x≤3；第二条放宽到变量原本的上界 6，在这个盒子内不额外限制 z。', formula: 'x≤3+5y；z≤2+4(1−y)；y=0', metrics: [metric('启用', 'x≤3'), metric('第二条上界', 'z≤6')], svg: plot([a], 'y=0 时保留左侧条带', '在已知的盒子范围内，第二条不再额外限制。'), table: bounds(0) },
      { label: 'y=1', title: '选 y=1：必须满足第二条', description: '第一条放宽到 x≤8；第二条恢复 z≤2。开关的两个取值覆盖两种允许分支。', formula: 'x≤3+5y；z≤2+4(1−y)；y=1', metrics: [metric('第一条上界', 'x≤8'), metric('启用', 'z≤2')], svg: plot([b], 'y=1 时保留下侧条带', '两条线性不等式始终同时满足；开关决定哪条放宽。'), table: bounds(1) },
      { label: '验点', title: '两条都真可以，两条都假不行', description: '(2,1) 落在重叠区域，两种 y 都能通过；(5,4) 不在并集中，两种 y 都不可行。', formula: '大 M 取自可用变量界；本例 M₁=5、M₂=4', metrics: [metric('(2,1)', '可行'), metric('(5,4)', '不可行')], svg: plot([a, b], '核对两个点是否在并集中', '开关表示允许的分支，并非互斥条件。', [{ x: 2, z: 1, label: '(2,1)' }, { x: 5, z: 4, bad: true, label: '(5,4)' }]), table: table(['点', 'x≤3', 'z≤2', '原式'], [['(2,1)', '真', '真', '可行'], ['(5,4)', '假', '假', '不可行']], '至少有一项为真即可。', [hi(0, 3, 'enter'), hi(1, 3, 'leave')]) }
    ]);
  }

  function implication() {
    const a = { x0: 3, x1: 8, z0: 0, z1: 7, color: AMBER }, b = { x0: 0, x1: 8, z0: 0, z1: 3, color: GREEN };
    const plot = (regions, title, caption, marks) => logicPlot({ maxZ: 7, integer: true, regions, title, caption, marks });
    const active = k => table(['分支', '对 x 的限制', '对 z 的限制'], [['y=0', 'x≥3', 'z≤7（原上界）'], ['y=1', 'x≥0（原下界）', 'z≤3']], '本例 0≤x≤8 且 x 为整数，0≤z≤7。', k === undefined ? [] : [hi(k, k + 1, 'enter')]);
    return titleSet('条件约束', [
      { label: '等价', title: '若 x≤2，就必须满足 z≤3', description: '自拟小例：只有“前件为真、后件为假”的情况被禁止。x 取整数，所以前件不成立等价于 x≥3。', formula: '(x≤2 ⇒ z≤3) ⇔ (x≥3 或 z≤3)', metrics: [metric('前件', 'x≤2'), metric('后件', 'z≤3')], svg: plot([a, b], '每一条竖线代表一个整数 x 的允许取值', '绿色表示后件为真，橙色表示前件不成立。'), table: active() },
      { label: 'y=0', title: '选 y=0：前件不成立', description: '要求 x≥3，意味着原前件 x≤2 为假；z 只受原来的上界 7 限制。', formula: 'x≥3−3y；z≤3+4(1−y)；y=0', metrics: [metric('x 的下界', 3), metric('z 的上界', 7)], svg: plot([a], '前件不成立的分支', '整数 x 的最小可取值为 3。'), table: active(0) },
      { label: 'y=1', title: '选 y=1：强制后件成立', description: 'x 回到已知的下界 0；无论前件是否成立，z≤3 都确保蕴含式成立。', formula: 'x≥3−3y；z≤3+4(1−y)；y=1', metrics: [metric('x 的下界', 0), metric('z 的上界', 3)], svg: plot([b], '后件成立的分支', '这个分支也允许前件不成立。'), table: active(1) },
      { label: '验点', title: '(2,4) 被禁止，(3,6) 可以', description: '当 x=2，z=4 违反必需的后件；当 x=3，前件为假，z=6 不违反原式。', formula: '本例前件的离散间隔是 1，故 x>2 可精确写成 x≥3', metrics: [metric('(2,4)', '不可行'), metric('(3,6)', '可行')], svg: plot([a, b], '只排除前件为真且后件为假的点', '不能给任意连续严格不等式随意加一个 ε。', [{ x: 2, z: 4, bad: true, label: '(2,4)' }, { x: 3, z: 6, label: '(3,6)' }]), table: table(['点', 'x≤2', 'z≤3', '蕴含式'], [['(2,4)', '真', '假', '不满足'], ['(3,6)', '假', '假', '满足']], '蕴含不要求前件和后件同时为真。', [hi(0, 3, 'leave'), hi(1, 3, 'enter')]) }
    ]);
  }

  Object.assign(window.OPT_DEMOS ||= {}, {
    'integer-models': { title: '0–1 规划 · 把选择写成开关', formula: 'x=1 选择，x=0 不选', variants: [capital(), cover(), knapsack(), assignment()] },
    'integer-logic': { title: '整数建模 · 用开关表达逻辑', formula: '选择、切换与放宽约束', variants: [projectLogic(), onOff(), eitherOr(), implication()] }
  });
})();
