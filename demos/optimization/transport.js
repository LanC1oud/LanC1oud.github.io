/* Lecture 4: allocations, transportation pivots, and modelling examples. */
(() => {
  'use strict';
  const GREEN = '#23816b', AMBER = '#cd9a62', GRID = '#e0e6dd';
  const sub = n => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
  const f = n => String(Number(n.toFixed(2)));
  const cp = a => a.map(r => r.slice());
  const zeros = (m, n) => Array.from({ length: m }, () => Array(n).fill(0));
  const key = ([i, j]) => `${i},${j}`;
  const cost = (C, X) => C.reduce((z, r, i) => z + r.reduce((s, c, j) => s + c * X[i][j], 0), 0);
  const ease = p => { p = Math.max(0, Math.min(1, p)); return p * p * (3 - 2 * p); };
  const text = (x, y, value, cls = 'graph-label', extra = '') => `<text x="${x}" y="${y}" class="${cls}" ${extra}>${value}</text>`;
  const varName = (i, j) => `x${sub(i + 1)}${sub(j + 1)}`;
  const sum = a => a.reduce((s, x) => s + x, 0);
  function assert(ok, message) { if (!ok) throw new Error(`Transport demo: ${message}`); }
  function checkBalance(C, X, a, b) {
    assert(Math.abs(sum(a) - sum(b)) < 1e-8, 'unbalanced data');
    assert(X.every((row, i) => row.every(x => x >= -1e-8) && Math.abs(sum(row) - a[i]) < 1e-8), 'invalid supply');
    assert(b.every((v, j) => Math.abs(X.reduce((s, row) => s + row[j], 0) - v) < 1e-8), 'invalid demand');
    assert(C.length === a.length && C.every(r => r.length === b.length), 'invalid costs');
  }
  function checkBasis(m, n, basis) {
    assert(basis.length === m + n - 1, 'wrong basis size');
    const parents = Array.from({ length: m + n }, (_, i) => i);
    const root = x => { while (parents[x] !== x) x = parents[x]; return x; };
    basis.forEach(([i, j]) => {
      const a = root(i), b = root(m + j);
      assert(a !== b, 'basis contains a loop'); parents[a] = b;
    });
  }
  function potentials(C, basis) {
    const u = Array(C.length).fill(null), v = Array(C[0].length).fill(null); u[0] = 0;
    for (let t = 0; t < u.length + v.length; t++) basis.forEach(([i, j]) => {
      if (u[i] !== null) v[j] = C[i][j] - u[i];
      else if (v[j] !== null) u[i] = C[i][j] - v[j];
    });
    assert([...u, ...v].every(x => x !== null), 'disconnected basis');
    return { u, v, delta: C.map((r, i) => r.map((c, j) => c - u[i] - v[j])) };
  }
  function closedLoop(m, n, basis, enter) {
    const edges = Array.from({ length: m + n }, () => []);
    basis.forEach(cell => { const [i, j] = cell; edges[i].push([m + j, cell]); edges[m + j].push([i, cell]); });
    const start = m + enter[1], finish = enter[0], queue = [[start, []]], seen = new Set([start]);
    while (queue.length) {
      const [at, path] = queue.shift();
      if (at === finish) return [enter, ...path];
      edges[at].forEach(([next, cell]) => { if (!seen.has(next)) { seen.add(next); queue.push([next, [...path, cell]]); } });
    }
    throw new Error('Transport demo: missing loop');
  }
  function transportTable(C, X, a, b, options = {}) {
    const basis = new Set((options.basis || []).map(key));
    const headers = ['产地 / 销地', ...C[0].map((_, j) => `B${sub(j + 1)}`), '余供'];
    const rows = C.map((row, i) => [`A${sub(i + 1)}`, ...row.map((c, j) => {
      const quantity = X[i][j] || (basis.has(`${i},${j}`) ? '0*' : '—');
      return `${quantity} (${f(c)})`;
    }), f(a[i])]);
    rows.push(['余需', ...b.map(f), '']);
    if (options.penalty) {
      headers.push('本轮行罚');
      rows.forEach((row, i) => row.push(i < C.length ? (options.penalty.row[i] === null ? '—' : f(options.penalty.row[i])) : ''));
      rows.push(['本轮列罚', ...options.penalty.col.map(x => x === null ? '—' : f(x)), '', '']);
    }
    return { headers, rows, highlights: options.highlights || [], caption: options.caption || '格内：运量（单位费用）。余供、余需均为本步完成后的余额。' };
  }
  function network(C, fromX, toX, a, b, options = {}) {
    fromX = cp(fromX); toX = cp(toX); a = a.slice(); b = b.slice();
    return progress => {
      const p = ease(progress), m = C.length, n = C[0].length;
      const X = fromX.map((row, i) => row.map((x, j) => x + (toX[i][j] - x) * p));
      const posA = i => [64, 58 + i * (208 / Math.max(1, m - 1))];
      const posB = j => [456, 58 + j * (208 / Math.max(1, n - 1))];
      let out = text(22, 20, options.heading || '供给 → 分配 → 需求', 'graph-title');
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
        const [x1, y1] = posA(i), [x2, y2] = posB(j), active = options.active && key(options.active) === `${i},${j}`;
        const used = X[i][j] > 0.001, stroke = active ? AMBER : used ? GREEN : GRID;
        out += `<line x1="${x1 + 22}" y1="${y1}" x2="${x2 - 22}" y2="${y2}" stroke="${stroke}" stroke-width="${used || active ? 2.5 : 1}" opacity="${used || active ? 0.85 : 0.4}" ${options.dummy && (i === options.dummy.row || j === options.dummy.col) ? 'stroke-dasharray="5 4"' : ''}/>`;
        if (used || active) {
          const t = 0.32 + 0.14 * (i % 3), lx = x1 + (x2 - x1) * t, ly = y1 + (y2 - y1) * t;
          out += `<rect x="${lx - 25}" y="${ly - 11}" width="50" height="19" rx="6" fill="var(--panel, Canvas)"/>`;
          out += text(lx, ly + 3, f(X[i][j]), 'graph-label', 'text-anchor="middle"');
          if (active && progress > 0 && progress < 1) {
            const t2 = 0.1 + 0.8 * progress;
            out += `<circle cx="${x1 + (x2 - x1) * t2}" cy="${y1 + (y2 - y1) * t2}" r="5" fill="${AMBER}"/>`;
          }
        }
      }
      for (let i = 0; i < m; i++) {
        const [x, y] = posA(i), remaining = a[i] - sum(X[i]);
        out += `<circle cx="${x}" cy="${y}" r="22" fill="var(--panel, Canvas)" stroke="${options.dummy?.row === i ? AMBER : GREEN}" stroke-width="1.6"/>`;
        out += text(x, y + 5, options.labelsA?.[i] || `A${sub(i + 1)}`, 'graph-label', 'text-anchor="middle"');
        out += text(x, y + 37, `余 ${f(remaining)}`, 'graph-muted', 'text-anchor="middle"');
      }
      for (let j = 0; j < n; j++) {
        const [x, y] = posB(j), remaining = b[j] - X.reduce((s, row) => s + row[j], 0);
        out += `<circle cx="${x}" cy="${y}" r="22" fill="var(--panel, Canvas)" stroke="${options.dummy?.col === j ? AMBER : GREEN}" stroke-width="1.6"/>`;
        out += text(x, y + 5, options.labelsB?.[j] || `B${sub(j + 1)}`, 'graph-label', 'text-anchor="middle"');
        out += text(x, y + 37, `余 ${f(remaining)}`, 'graph-muted', 'text-anchor="middle"');
      }
      return out + text(260, 316, options.footer || '线上的数字为已分配运量，节点下方显示剩余供需。', 'graph-muted', 'text-anchor="middle"');
    };
  }
  function board(C, fromX, toX, basis, options = {}) {
    return progress => {
      const p = ease(progress), width = 360 / C[0].length, height = 200 / C.length;
      const cx = j => 102 + (j + 0.5) * width, cy = i => 72 + (i + 0.5) * height;
      let out = text(20, 22, options.heading || '运输表 · 沿回路交替增减', 'graph-title');
      const set = new Set(basis.map(key));
      C.forEach((row, i) => row.forEach((c, j) => {
        const k = options.loop?.findIndex(cell => key(cell) === `${i},${j}`) ?? -1;
        const fill = k < 0 ? 'none' : k % 2 === 0 ? GREEN : AMBER;
        out += `<rect x="${102 + j * width}" y="${72 + i * height}" width="${width}" height="${height}" fill="${fill}" fill-opacity="${k < 0 ? 0 : 0.09}" stroke="${GRID}"/>`;
        out += text(110 + j * width, 88 + i * height, f(c), 'graph-muted');
        const x = fromX[i][j] + (toX[i][j] - fromX[i][j]) * p;
        out += text(cx(j), cy(i) + 9, x > 0.001 ? f(x) : set.has(`${i},${j}`) ? '0*' : '—', 'graph-title', 'text-anchor="middle"');
        if (k >= 0) out += `<text x="${102 + (j + 1) * width - 15}" y="${91 + i * height}" fill="${fill}" font-size="20">${k % 2 === 0 ? '+' : '−'}</text>`;
      }));
      C.forEach((_, i) => {
        out += text(88, cy(i) + 5, `A${sub(i + 1)}`, 'graph-label', 'text-anchor="end"');
        if (options.u) out += text(32, cy(i) + 5, `u=${f(options.u[i])}`, 'graph-muted');
      });
      C[0].forEach((_, j) => {
        out += text(cx(j), 58, `B${sub(j + 1)}${options.v ? ` · v=${f(options.v[j])}` : ''}`, 'graph-label', 'text-anchor="middle"');
      });
      if (options.loop) {
        const pts = options.loop.map(([i, j]) => [cx(j), cy(i)]); pts.push(pts[0]);
        out += `<polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${GREEN}" stroke-width="2" stroke-dasharray="5 5" opacity=".6"/>`;
        const cursor = progress * (pts.length - 1), segment = Math.min(pts.length - 2, Math.floor(cursor)), t = cursor - segment;
        const [a, b] = [pts[segment], pts[segment + 1]];
        out += `<circle cx="${a[0] + (b[0] - a[0]) * t}" cy="${a[1] + (b[1] - a[1]) * t}" r="5" fill="${AMBER}"/>`;
      }
      return out + text(260, 307, options.footer || '左上角为单位费用，中央为运量；0* 仍属于基。', 'graph-muted', 'text-anchor="middle"');
    };
  }

  const bread = { C: [[3, 11, 3, 10], [1, 9, 2, 8], [7, 4, 10, 5]], a: [7, 4, 9], b: [3, 6, 5, 6] };
  function penalties(C, a, b) {
    const difference = xs => xs.length > 1 ? xs.sort((a, b) => a - b)[1] - xs[0] : null;
    return {
      row: C.map((r, i) => a[i] > 0 ? difference(r.filter((_, j) => b[j] > 0)) : null),
      col: C[0].map((_, j) => b[j] > 0 ? difference(C.filter((_, i) => a[i] > 0).map(r => r[j])) : null)
    };
  }
  function initialFrames(method) {
    const { C, a: originalA, b: originalB } = bread, m = C.length, n = C[0].length;
    const a = originalA.slice(), b = originalB.slice(), X = zeros(m, n), basis = [], frames = [];
    const titles = { northwest: '西北角法', cheapest: '最小费用法', vogel: 'Vogel 法' };
    frames.push({ label: '供需', title: '先核对：总供应 = 总需求 = 20 吨', description: `${titles[method]}只负责构造初始可行基。费用为百元/吨，运量为吨。`, formula: 'Σaᵢ = Σbⱼ = 20；xᵢⱼ = min(余供ᵢ, 余需ⱼ)', metrics: [{ label: '总运量', value: '20 吨' }, { label: '独立基格', value: 'm+n−1 = 6' }], svg: network(C, X, X, originalA, originalB), table: transportTable(C, X, a, b) });
    while (sum(a) > 0) {
      const previous = cp(X), activeRows = a.map((q, i) => q > 0 ? i : -1).filter(i => i >= 0), activeCols = b.map((q, j) => q > 0 ? j : -1).filter(j => j >= 0);
      let i, j, why, penalty;
      if (method === 'northwest') {
        i = activeRows[0]; j = activeCols[0]; why = '选择尚未满足区域的左上角，不比较费用。';
      } else if (method === 'cheapest') {
        [i, j] = activeRows.flatMap(r => activeCols.map(c => [r, c])).sort((a, b) => C[a[0]][a[1]] - C[b[0]][b[1]] || a[0] - b[0] || a[1] - b[1])[0];
        why = `当前剩余格子的最低单位费用是 ${C[i][j]}。`;
      } else {
        penalty = penalties(C, a, b);
        if (activeRows.length === 1 || activeCols.length === 1) {
          i = activeRows[0]; j = activeCols[0]; why = '只剩一行或一列，直接完成分配。';
        } else {
          // For a tie choose a column first, then the smaller index, as in the notes.
          const candidates = [...penalty.col.map((p, j) => ({ p, j, axis: 'col' })), ...penalty.row.map((p, i) => ({ p, i, axis: 'row' }))].filter(x => x.p !== null);
          candidates.sort((x, y) => y.p - x.p);
          const chosen = candidates[0];
          if (chosen.axis === 'col') { j = chosen.j; i = activeRows.slice().sort((r, s) => C[r][j] - C[s][j] || r - s)[0]; }
          else { i = chosen.i; j = activeCols.slice().sort((r, s) => C[i][r] - C[i][s] || r - s)[0]; }
          why = `${chosen.axis === 'col' ? `第 ${j + 1} 列` : `第 ${i + 1} 行`}惩罚最大为 ${chosen.p}，取其中费用最小格。`;
        }
      }
      const q = Math.min(a[i], b[j]), beforeA = a[i], beforeB = b[j];
      X[i][j] = q; a[i] -= q; b[j] -= q; basis.push([i, j]);
      const last = sum(a) === 0;
      frames.push({ label: `分配 ${basis.length}`, title: `${varName(i, j)} = min(${beforeA}, ${beforeB}) = ${q}`, description: `${why}分配后扣减该行余供、该列余需${method === 'vogel' && !last ? '，下一轮重算罚值' : ''}。`, formula: `${varName(i, j)} ← ${q}；Z = ${cost(C, X)} 百元`, metrics: [{ label: '已分配', value: `${20 - sum(a)} / 20 吨` }, { label: '累计费用', value: `${cost(C, X)} 百元` }], svg: network(C, previous, X, originalA, originalB, { active: [i, j] }), table: transportTable(C, cp(X), a.slice(), b.slice(), { basis: basis.slice(), penalty, highlights: [{ row: i, col: j + 1, kind: 'pivot' }], caption: penalty ? '格内：运量（费用）；罚值按本轮分配前的有效格计算，余额为分配后。' : undefined }) });
    }
    checkBalance(C, X, originalA, originalB); checkBasis(m, n, basis);
    const expected = { northwest: 135, cheapest: 86, vogel: 85 }[method];
    assert(cost(C, X) === expected, `${method} cost`);
    frames.push({ label: '起点', title: `初始方案：${cost(C, X)} 百元`, description: `共 ${basis.length} 个独立基格，行列供需均已满足。${method === 'vogel' ? '本例恰好最优，仍须用位势检验确认。' : '这只是起点，接下来用位势法检验、用闭回路改进。'}`, formula: '供需可行 ≠ 已证明最优；下一步检验 δᵢⱼ = cᵢⱼ − uᵢ − vⱼ', metrics: [{ label: '总费用', value: `${expected} 百元` }, { label: '独立基格', value: '6 / 6' }], svg: network(C, X, X, originalA, originalB), table: transportTable(C, X, a, b, { basis }), note: '若一行一列同时满足，应保留必要的零基格；基必须有 m+n−1 个位置且无闭回路。' });
    return frames;
  }

  function improvementVariant(data, label) {
    const { C, a, b, X, basis, enter, degenerate } = data, m = C.length, n = C[0].length;
    checkBalance(C, X, a, b); checkBasis(m, n, basis);
    const P = potentials(C, basis), loop = closedLoop(m, n, basis, enter), delta = P.delta[enter[0]][enter[1]];
    const minus = loop.filter((_, k) => k % 2 === 1), theta = Math.min(...minus.map(([i, j]) => X[i][j]));
    const Y = cp(X); loop.forEach(([i, j], k) => { Y[i][j] += k % 2 ? -theta : theta; });
    const leave = minus.find(([i, j]) => Y[i][j] === 0), newBasis = basis.filter(cell => key(cell) !== key(leave)).concat([enter]);
    checkBalance(C, Y, a, b); checkBasis(m, n, newBasis);
    const nextP = potentials(C, newBasis), nextSet = new Set(newBasis.map(key));
    assert(delta < 0 && Math.abs(cost(C, Y) - cost(C, X) - theta * delta) < 1e-8, 'pivot cost');
    assert(nextP.delta.every((r, i) => r.every((d, j) => nextSet.has(`${i},${j}`) || d >= -1e-8)), 'final plan not optimal');
    const units = degenerate ? '千元' : '百元', oldCost = cost(C, X), newCost = cost(C, Y);
    const zeroA = Array(m).fill(0), zeroB = Array(n).fill(0), highlights = loop.map(([i, j], k) => ({ row: i, col: j + 1, kind: k % 2 ? 'leave' : 'enter' }));
    const table = (values, bs, hs = []) => transportTable(C, values, zeroA, zeroB, { basis: bs, highlights: hs, caption: '格内：运量（单位费用）。0* 是零基变量，仍须参与位势与回路。' });
    const reducedTable = (p, bs) => ({ headers: ['δ = c−u−v', ...C[0].map((_, j) => `B${sub(j + 1)}`)], rows: C.map((r, i) => [`A${sub(i + 1)}`, ...r.map((_, j) => new Set(bs.map(key)).has(`${i},${j}`) ? '基' : f(p.delta[i][j]))]), highlights: [{ row: enter[0], col: enter[1] + 1, kind: 'enter' }], caption: '“基”表示用该格列位势方程；其余数字为最小化检验数。' });
    const frames = [
      { label: '可行基', title: degenerate ? '5 个正运量，仍有 6 个基变量' : '从最小费用法的 86 百元方案出发', description: degenerate ? '第一步 x₁₂=15 同时满足一行一列；保留 x₁₄=0，六个基格独立。零运量不等于非基变量。' : '先有一个满足全部供需的独立基，再寻找可降低费用的空格。', formula: degenerate ? '基含 x₁₄=0；m+n−1=6；Z=475 千元' : 'm+n−1=6；Z=86 百元', metrics: [{ label: '当前费用', value: `${oldCost} ${units}` }, { label: '基格 / 正运量', value: `${basis.length} / ${X.flat().filter(x => x > 0).length}` }], svg: board(C, X, X, basis), table: table(X, basis), note: '基格必须独立、不构成闭回路；位势方程包含零基格。' },
      { label: '位势', title: '在每一个基格上令 uᵢ + vⱼ = cᵢⱼ', description: '任选 u₁=0，沿基格连接逐个求出其余位势。基格构成一棵树，故可以求齐全部位势。', formula: `u=(${P.u.map(f).join(', ')})；v=(${P.v.map(f).join(', ')})`, metrics: [{ label: '方程', value: `${basis.length} 个` }, { label: '固定一个位势', value: 'u₁ = 0' }], svg: board(C, X, X, basis, { ...P, heading: '由基格费用确定全部位势' }), table: table(X, basis) },
      { label: '检验', title: `${varName(...enter)} 的检验数为 ${delta}，可以入基`, description: '最小化问题中 δ<0 表示该回路每调整一单位可节省费用。这里选择一个负检验数空格入基。', formula: `δ${sub(enter[0] + 1)}${sub(enter[1] + 1)} = ${C[enter[0]][enter[1]]} − (${P.u[enter[0]]}) − (${P.v[enter[1]]}) = ${delta}`, metrics: [{ label: '入基格', value: varName(...enter) }, { label: '单位费用变化', value: `${delta} ${units}` }], svg: board(C, X, X, basis, { ...P, loop, heading: '负检验数对应可改善的回路' }), table: reducedTable(P, basis) },
      { label: '闭回路', title: `从入基格出发，依次标 +、−、+、−`, description: '回路只作水平或竖直移动，除入基格外的拐点均为基格。加减同量能保持各行、各列总量不变。', formula: loop.map(([i, j], k) => `${varName(i, j)}${k % 2 ? '−' : '+'}`).join(' → '), metrics: [{ label: '负号格运量', value: minus.map(([i, j]) => f(X[i][j])).join('，') }, { label: '允许步长 θ', value: f(theta) }], svg: board(C, X, X, basis, { loop }), table: table(X, basis, highlights), note: 'θ 取负号格的最小运量；回路也可以是比矩形更长的折线闭环。' },
      { label: '调整', title: `θ = ${theta}：${varName(...enter)} 入基，${varName(...leave)} 出基`, description: '正号格增加 θ，负号格减少 θ；减到零的一个负号格出基。沿回路移动，供需约束始终保持。', formula: `Z新 = ${oldCost} + ${theta} × (${delta}) = ${newCost} ${units}`, metrics: [{ label: '节省费用', value: `${oldCost - newCost} ${units}` }, { label: '新费用', value: `${newCost} ${units}` }], svg: board(C, X, Y, basis, { loop }), table: table(Y, newBasis, highlights) },
      { label: '最优', title: `全部非基检验数 ≥ 0，费用 ${newCost} ${units}`, description: '新方案满足全部供需，且不存在负检验数，因此达到最优。若有零检验数，还须能作正量调整，才会产生不同的最优方案。', formula: `u=(${nextP.u.map(f).join(', ')})；v=(${nextP.v.map(f).join(', ')})；δ非基 ≥ 0`, metrics: [{ label: '最小费用', value: `${newCost} ${units}` }, { label: '独立基格', value: `${newBasis.length} / ${m + n - 1}` }], svg: board(C, Y, Y, newBasis, { ...nextP, heading: '最优方案 · 重新计算位势并检验' }), table: reducedTable(nextP, newBasis) }
    ];
    return { label, frames };
  }

  const cars = { C: [[80, 215], [100, 108], [102, 68]], a: [1000, 1500, 1200], b: [2300, 1400] };
  function dummyVariant(shortage) {
    const C = cp(cars.C), a = cars.a.slice(), b = cars.b.slice();
    let X, dummy, labelsA, labelsB, description, quantity;
    if (shortage) {
      a[1] = 1300; a.push(200); C.push([0, 0]); X = [[1000, 0], [1100, 200], [0, 1200], [200, 0]];
      dummy = { row: 3 }; labelsA = ['A₁', 'A₂', 'A₃', '虚设']; quantity = 200;
      description = '总供应 3500 小于需求 3700；增加供应 200 的虚设工厂。由虚设产地承担的需求，代表真实供应未满足的部分。';
    } else {
      b[0] = 1900; b.push(400); C.forEach(r => r.push(0)); X = [[1000, 0, 0], [900, 200, 400], [0, 1200, 0]];
      dummy = { col: 2 }; labelsB = ['B₁', 'B₂', '虚设']; quantity = 400;
      description = '总供应 3700 大于需求 3300；增加需求 400 的虚设销地。虚设销地收到的运量，代表未使用产能。';
    }
    checkBalance(C, X, a, b);
    const Z = zeros(C.length, C[0].length), zeroA = Array(a.length).fill(0), zeroB = Array(b.length).fill(0);
    const real = cp(X); if (shortage) real[3] = [0, 0]; else real.forEach(r => { r[2] = 0; });
    const missingA = a.map((q, i) => q - sum(real[i])), missingB = b.map((q, j) => q - real.reduce((s, r) => s + r[j], 0));
    const options = { dummy, labelsA, labelsB };
    return { label: shortage ? '供不应求' : '供过于求', frames: [
      { label: '差额', title: shortage ? '缺口 200：补一个虚设产地' : '剩余 400：补一个虚设销地', description, formula: shortage ? '虚设供应 = 3700 − 3500 = 200；c虚设,j=0' : '虚设需求 = 3700 − 3300 = 400；cᵢ,虚设=0', metrics: [{ label: '真实供 / 需', value: shortage ? '3500 / 3700' : '3700 / 3300' }, { label: '平衡后总量', value: '3700' }], svg: network(C, Z, Z, a, b, { ...options, heading: '增加虚设节点，补齐供需差额' }), table: transportTable(C, Z, a, b, { caption: '最后一行或最后一列为虚设节点，零费用仅表示本题未另计缺货或剩余费用。' }) },
      { label: '真实调运', title: '先看真实节点之间的分配', description: shortage ? '真实工厂供应全部送出后，B₁ 仍缺 200。此时虚设工厂尚未匹配，表中余需清楚显示缺口。' : '真实需求全部满足后，A₂ 仍有 400 产能未使用。由虚设销地接收这部分余额。', formula: shortage ? 'B₁ 真实满足 2100；尚缺 200' : 'A₂ 真实调运 1100；剩余产能 400', metrics: [{ label: shortage ? '真实满足' : '真实需求满足', value: shortage ? '3500' : '3300' }, { label: shortage ? '未满足需求' : '剩余产能', value: String(quantity) }], svg: network(C, Z, real, a, b, options), table: transportTable(C, real, missingA, missingB) },
      { label: '虚设匹配', title: '虚设流量有含义，费用按题意给定', description: shortage ? '虚设产地 → B₁ 的 200 表示缺货，不是真实交付。若题目给缺货罚费，应将该费用填入虚设行。' : 'A₂ → 虚设销地的 400 表示未使用产能。若有闲置或处置费用，应将该费用填入虚设列。', formula: shortage ? '3500 + 200 = 3700；虚设供给表示缺货' : '3300 + 400 = 3700；虚设需求表示剩余', metrics: [{ label: '虚设流量', value: String(quantity) }, { label: '本题虚设单位费用', value: '0' }], svg: network(C, real, X, a, b, { ...options, active: shortage ? [3, 0] : [1, 2] }), table: transportTable(C, X, zeroA, zeroB), note: '虚设化是模型转换；得到平衡表后，仍需用运输算法求解并检验最优性。' }
    ] };
  }
  function productionVariant() {
    const a = [50, 180, 280, 270], b = [100, 200, 180, 300], p = 40, h = 0.5, q = 2;
    const C = a.map((_, i) => b.map((_, j) => p + (i < j ? h * (j - i) : q * (i - j))));
    const X = [[50, 0, 0, 0], [50, 130, 0, 0], [0, 70, 180, 30], [0, 0, 0, 270]], Z = zeros(4, 4);
    checkBalance(C, X, a, b); assert(cost(C, X) === 31455, 'production cost');
    const labels = ['1月', '2月', '3月', '4月'], totalA = [50, 230, 510, 780], totalB = [100, 300, 480, 780];
    function timeline(mode) {
      return progress => {
        const pp = ease(progress); let out = text(20, 23, '生产月份 → 需求月份', 'graph-title');
        labels.forEach((month, i) => {
          const x = 70 + i * 125;
          out += `<line x1="${x}" y1="95" x2="${x}" y2="230" stroke="${GRID}" stroke-width="2"/>`;
          out += text(x, 65, month, 'graph-label', 'text-anchor="middle"');
          out += text(x, 92, `产能 ${a[i]}`, 'graph-muted', 'text-anchor="middle"');
          out += text(x, 252, `需求 ${b[i]}`, 'graph-muted', 'text-anchor="middle"');
        });
        const arcs = mode === 'inventory' ? [[1, 3, 41, GREEN]] : mode === 'backorder' ? [[3, 0, 46, AMBER]] : [[1, 0, 50, AMBER], [2, 1, 70, AMBER], [2, 3, 30, GREEN]];
        arcs.forEach(([i, j, value, color], k) => {
          const x1 = 70 + i * 125, x2 = 70 + j * 125, y1 = 120 + k * 24, y2 = 217 - k * 7;
          out += `<path d="M${x1},${y1} C${x1},${y1 + 45} ${x2},${y2 - 45} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="3"/>`;
          const rest = 1 - pp;
          const dotX = (rest ** 3 + 3 * rest ** 2 * pp) * x1 + (3 * rest * pp ** 2 + pp ** 3) * x2;
          const dotY = rest ** 3 * y1 + 3 * rest ** 2 * pp * (y1 + 45) + 3 * rest * pp ** 2 * (y2 - 45) + pp ** 3 * y2;
          out += `<circle cx="${dotX}" cy="${dotY}" r="5" fill="${color}"/>`;
          out += text((x1 + x2) / 2, (y1 + y2) / 2 - 8, `${value}${mode === 'plan' ? ' 件' : ' 元/件'}`, 'graph-label', 'text-anchor="middle"');
        });
        return out + text(260, 300, mode === 'inventory' ? '提前生产：生产期 i 小于需求期 j，加入库存费用。' : mode === 'backorder' ? '延期交货：生产期 i 大于需求期 j，加入延期罚费。' : '橙色为延期，绿色为库存；同月生产与需求就地匹配。', 'graph-muted', 'text-anchor="middle"');
      };
    }
    return { label: '生产 · 库存 · 延期', frames: [
      { label: '建表', title: '把生产月份作为产地、需求月份作为销地', description: '总产能与总需求均为 780。xᵢⱼ 表示第 i 月生产、用于第 j 月需求的数量；费用随提前或延期月数变化。', formula: 'cᵢⱼ = 40 + 0.5 max(j−i,0) + 2 max(i−j,0)', metrics: [{ label: '单位生产费', value: '40' }, { label: '库存 / 延期费', value: '0.5 / 2 · 每月' }], svg: network(C, Z, Z, a, b, { labelsA: labels, labelsB: labels, heading: '供给侧是生产月份，需求侧是需求月份' }), table: { headers: ['生产 / 需求', ...labels, '产能'], rows: C.map((r, i) => [labels[i], ...r.map(f), f(a[i])]).concat([['需求', ...b.map(f), '780']]), highlights: [], caption: '格内为单位总费用：生产费 + 库存费或延期罚费。' } },
      { label: '提前生产', title: '2 月生产 → 4 月需求：库存两个月', description: '提前生产的货物要保存到需求发生时。生产费 40 加两个月库存费，得到单位总费用 41。', formula: 'c₂₄ = 40 + (4−2)×0.5 = 41', metrics: [{ label: '库存月数', value: '2' }, { label: '单位总费用', value: '41' }], svg: timeline('inventory'), table: { headers: ['费用部分', '计算', '金额'], rows: [['生产', '1×40', '40'], ['库存', '2×0.5', '1'], ['合计', '40+1', '41']], highlights: [{ row: 1, col: 2, kind: 'pivot' }], caption: '此格说明成本如何构造；最终最优方案不一定使用这条路线。' } },
      { label: '延期补交', title: '4 月生产 → 1 月需求：延期三个月', description: '之后生产来补交过去需求，要按延迟月数计罚。单位费用是生产费 40 加三个月延期费 6。', formula: 'c₄₁ = 40 + (4−1)×2 = 46', metrics: [{ label: '延期月数', value: '3' }, { label: '单位总费用', value: '46' }], svg: timeline('backorder'), table: { headers: ['费用部分', '计算', '金额'], rows: [['生产', '1×40', '40'], ['延期', '3×2', '6'], ['合计', '40+6', '46']], highlights: [{ row: 1, col: 2, kind: 'pivot' }], caption: '只有题目允许延期交货时，才保留这些路线。' } },
      { label: '最优匹配', title: '延期 50、70 件，库存 30 件', description: '1 月缺口 50 由 2 月补交，2 月缺口 70 由 3 月补交；3 月另留 30 件给 4 月。其余产量满足当月需求。', formula: 'Z = 780×40 + (50+70)×2 + 30×0.5 = 31455', metrics: [{ label: '延期费用', value: '240' }, { label: '库存费用', value: '15' }], svg: timeline('plan'), table: { headers: ['生产 / 需求', ...labels], rows: X.map((r, i) => [labels[i], ...r.map(x => x ? f(x) : '—')]), highlights: [{ row: 1, col: 1, kind: 'leave' }, { row: 2, col: 2, kind: 'leave' }, { row: 2, col: 4, kind: 'enter' }], caption: '格内为运量。橙色为延期匹配，绿色为提前生产的库存匹配。' } },
      { label: '证明最优', title: '累计缺口给出下界，本方案恰好达到', description: '月末累计产能减累计需求依次为 −50、−70、30、0。前两月的延期和第三月的库存均无法避免，故本方案达到费用下界。', formula: 'Z ≥ 780×40 + 2×(50+70) + 0.5×30 = 31455', metrics: [{ label: '不可避免的附加费', value: '255' }, { label: '最小费用', value: '31455' }], svg: progress => {
        const pp = ease(progress), differences = totalA.map((x, i) => x - totalB[i]);
        let out = text(20, 24, '累计产能 − 累计需求', 'graph-title') + `<line x1="40" y1="146" x2="485" y2="146" stroke="${GRID}" stroke-width="2"/>`;
        differences.forEach((value, i) => {
          const x = 76 + i * 122, h = Math.abs(value) * 1.15 * pp;
          out += `<rect x="${x - 22}" y="${value > 0 ? 146 - h : 146}" width="44" height="${Math.max(1, h)}" rx="4" fill="${value < 0 ? AMBER : GREEN}" opacity=".78"/>`;
          out += text(x, value > 0 ? 146 - h - 12 : 165 + h, f(value), 'graph-label', 'text-anchor="middle"');
          out += text(x, 282, labels[i], 'graph-muted', 'text-anchor="middle"');
        });
        return out + text(260, 310, '负值必须延期，正值必须留存；附加成本下界被达到。', 'graph-muted', 'text-anchor="middle"');
      }, table: { headers: ['月末', '累计产能', '累计需求', '差额'], rows: labels.map((month, i) => [month, f(totalA[i]), f(totalB[i]), f(totalA[i] - totalB[i])]), highlights: [], caption: '本例总产能恰等于总需求，所以各月产能必须全部使用。' } }
    ] };
  }

  Object.assign(window.OPT_DEMOS ||= {}, {
    'transport-start': { title: '运输问题 · 三种起点', formula: 'xᵢⱼ = min(剩余供应, 剩余需求)', variants: [{ label: '西北角法', frames: initialFrames('northwest') }, { label: '最小费用法', frames: initialFrames('cheapest') }, { label: 'Vogel 法', frames: initialFrames('vogel') }] },
    'transport-optimize': { title: '位势与闭回路 · 沿回路降低费用', formula: 'δᵢⱼ=cᵢⱼ−uᵢ−vⱼ；θ=min{负号格运量}；Z′=Z+θδ', variants: [
      improvementVariant({ ...bread, X: [[0, 0, 4, 3], [3, 0, 1, 0], [0, 6, 0, 3]], basis: [[0, 2], [0, 3], [1, 0], [1, 2], [2, 1], [2, 3]], enter: [1, 3] }, '86 → 85'),
      improvementVariant({ C: [[10, 2, 20, 11], [12, 7, 9, 20], [4, 14, 16, 18]], a: [15, 25, 10], b: [5, 15, 15, 15], X: [[0, 15, 0, 0], [0, 0, 15, 10], [5, 0, 0, 5]], basis: [[0, 1], [0, 3], [1, 2], [1, 3], [2, 0], [2, 3]], enter: [1, 1], degenerate: true }, '退化：保留零基格')
    ] },
    'transport-model': { title: '运输建模 · 虚设节点与跨期匹配', formula: '先平衡供需，再构造每条路线的真实单位费用', variants: [dummyVariant(true), dummyVariant(false), productionVariant()] }
  });
})();
