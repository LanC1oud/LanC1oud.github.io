/* The example in the article. Each tableau is derived by row operations. */
'use strict';
const names = ['x', 'y', 's₁', 's₂', 's₃'];
const initial = [[0, 5, 1, 0, 0, 15], [6, 2, 0, 1, 0, 24], [1, 1, 0, 0, 1, 5], [-2, -1, 0, 0, 0, 0]];
const copy = a => a.map(r => r.slice());
const clean = n => Math.abs(n) < 1e-9 ? 0 : n;
function format(n) {
  n = clean(n);
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-8) return String(Math.round(n));
  for (let d = 2; d <= 60; d++) if (Math.abs(n * d - Math.round(n * d)) < 1e-8) return `${Math.round(n * d)}/${d}`;
  return String(Number(n.toFixed(3)));
}
function makeFrames() {
  let table = copy(initial), basis = [2, 3, 4], point = [0, 0], iteration = 0;
  const frames = [];
  function add(data) { frames.push({ table: copy(table), basis: basis.slice(), point: point.slice(), iteration, ...data }); }
  add({ short: '起点', title: '从原点出发', label: 'START / 初始基本可行解', description: '令非基变量 x = y = 0，松弛变量构成初始基。原点是一个可行顶点，目标函数值为 0。', operation: '基变量 (s₁, s₂, s₃) = (15, 24, 5)', status: '初始表' });
  while (true) {
    const objective = table[3];
    let col = -1;
    for (let j = 0; j < 5; j++) if (objective[j] < -1e-9 && (col === -1 || objective[j] < objective[col])) col = j;
    if (col === -1) break;
    iteration++;
    const enter = names[col];
    const ratios = table.slice(0, 3).map(row => row[col] > 1e-9 ? row[5] / row[col] : null);
    const row = ratios.reduce((best, r, i) => r !== null && (best === -1 || r < ratios[best] - 1e-9) ? i : best, -1);
    if (row === -1) throw new Error('Unbounded example');
    const leave = names[basis[row]], pivot = table[row][col];
    add({ short: '进基', col, title: `选择 ${enter} 进基`, label: `ITERATION ${iteration} / 最优性检查`, description: `${iteration === 1 ? '目标行中 x 的系数 −2 最负，增加 x 能最快改善目标值。' : '第一次换基后，y 的目标行系数为 −1/3，仍能使目标值增加。'}选定进基列后，再判断哪个基变量最先降到 0。`, operation: `进基变量：${enter}　·　目标行系数：${format(objective[col])}`, status: '选择进基列' });
    add({ short: '离基', col, row, ratios, title: `${leave} 离基，${enter} 接替它`, label: `ITERATION ${iteration} / 最小比值检验`, description: `只对进基列中严格为正的系数计算「右端项 ÷ 系数」。最小非负比值为 ${format(ratios[row])}，对应 ${leave} 最先降为 0，所以选择这一行作为枢轴行。${iteration === 1 ? 's₁ 行的进基系数为 0，不参与比值检验。' : ''}`, operation: `枢轴元素：第 ${row + 1} 行、${enter} 列 = ${format(pivot)}`, status: '选择离基行' });
    table[row] = table[row].map(v => clean(v / pivot));
    add({ short: '归一', col, row, pending: true, updated: [row], title: '先把枢轴元素变成 1', label: `ITERATION ${iteration} / 枢轴行归一化`, description: `将枢轴行所有元素同时除以 ${format(pivot)}，包括右端项。此时其他行尚未消元，仍处于换基的中间步骤，图中保留上一基本可行解。`, operation: `R${row + 1} ← R${row + 1} ÷ (${format(pivot)})`, status: '中间表 · 归一化' });
    const operations = [];
    const updated = [];
    for (let i = 0; i < 4; i++) {
      if (i === row || Math.abs(table[i][col]) < 1e-9) continue;
      const factor = table[i][col];
      operations.push(`${i === 3 ? 'Rz' : `R${i + 1}`} ← ${i === 3 ? 'Rz' : `R${i + 1}`} − (${format(factor)}) × R${row + 1}`);
      table[i] = table[i].map((v, j) => clean(v - factor * table[row][j]));
      updated.push(i);
    }
    basis[row] = col;
    const values = [0, 0, 0, 0, 0];
    basis.forEach((b, i) => { values[b] = table[i][5]; });
    point = values.slice(0, 2);
    add({ short: '换基', col, updated, title: `完成换基，到达 (${point.map(v => Number(v.toFixed(2))).join(', ')})`, label: `ITERATION ${iteration} / 消元与顶点移动`, description: `用归一化后的枢轴行，消去其他行（含目标行）的 ${enter} 系数。${enter} 列成为单位列，${enter} 进基、${leave} 离基；图中的点沿可行域边界移动到新顶点，目标值提高到 ${Number(table[3][5].toFixed(2))}。`, operation: operations.join('； '), status: `第 ${iteration} 次换基完成` });
  }
  add({ short: '最优', title: '所有改进方向，检查完毕。', label: 'OPTIMUM / 最优性成立', description: '目标行所有非基变量的系数均非负，无法继续提高目标值。最优点是两条约束 6x + 2y = 24 与 x + y = 5 的交点，且 5y ≤ 15 仍有余量。', operation: 'x* = 7/2 = 3.5　　y* = 3/2 = 1.5　　z* = 17/2 = 8.5', status: '最优表', optimal: true });
  return frames;
}
const frames = makeFrames();
if (typeof module !== 'undefined') module.exports = { makeFrames, format, initial };
if (typeof document !== 'undefined') {
  const embedded = document.documentElement.classList.contains('embedded');
  if (embedded) {
    document.documentElement.dataset.view = 'geometry';
    document.querySelector('.player').appendChild(document.querySelector('.metrics'));
    document.querySelectorAll('button[data-view]').forEach(button => {
      button.addEventListener('click', () => {
        document.documentElement.dataset.view = button.dataset.view;
        document.querySelectorAll('button[data-view]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
      });
    });
    // Same-origin only: follow the article's theme and resize without an inner scrollbar.
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => {
      const root = window.parent.document.documentElement;
      const theme = root === document.documentElement ? 'auto' : root.dataset.theme;
      document.documentElement.dataset.theme = theme === 'dark' || (theme !== 'light' && scheme.matches) ? 'dark' : 'light';
    };
    syncTheme();
    scheme.addEventListener('change', syncTheme);
    if (window.parent !== window) {
      const themeObserver = new MutationObserver(syncTheme);
      themeObserver.observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      const sizeObserver = new ResizeObserver(() => {
        if (window.frameElement) window.frameElement.style.height = `${Math.ceil(document.querySelector('main').getBoundingClientRect().height) + 2}px`;
      });
      sizeObserver.observe(document.querySelector('main'));
      window.addEventListener('pagehide', () => { themeObserver.disconnect(); sizeObserver.disconnect(); }, { once: true });
    }
  }
  const $ = id => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const sx = x => 50 + x * 78, sy = y => 308 - y * 68;
  let index = 0, playing = false, timer = null, animation = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function svgEl(tag, attrs, parent, text) {
    const el = document.createElementNS(svgNS, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (text !== undefined) el.textContent = text;
    parent.appendChild(el); return el;
  }
  const plot = $('plot-static');
  for (let x = 0; x <= 5; x++) {
    svgEl('line', { x1: sx(x), y1: sy(0), x2: sx(x), y2: sy(4), class: 'grid' }, plot);
    svgEl('text', { x: sx(x), y: sy(0) + 22, 'text-anchor': 'middle', class: 'tick' }, plot, x);
  }
  for (let y = 1; y <= 4; y++) {
    svgEl('line', { x1: sx(0), y1: sy(y), x2: sx(5.5), y2: sy(y), class: 'grid' }, plot);
    svgEl('text', { x: sx(0) - 16, y: sy(y) + 4, 'text-anchor': 'middle', class: 'tick' }, plot, y);
  }
  svgEl('polygon', { points: [[0,0],[4,0],[3.5,1.5],[2,3],[0,3]].map(p => `${sx(p[0])},${sy(p[1])}`).join(' '), class: 'feasible-area' }, plot);
  const lines = [ [[0,3],[5.5,3]], [[8/3,4],[4,0]], [[1,4],[5,0]] ];
  lines.forEach((p,i) => svgEl('line', {x1:sx(p[0][0]), y1:sy(p[0][1]), x2:sx(p[1][0]), y2:sy(p[1][1]), class:'constraint', stroke:['#94ad91','#9eafc1','#b6ad96'][i]}, plot));
  svgEl('text',{x:sx(4.15),y:sy(3)-9,fill:'#8ba285',class:'constraint-label'},plot,'5y = 15');
  svgEl('text',{x:sx(2.72),y:sy(3.75),fill:'#8198af',class:'constraint-label'},plot,'6x + 2y = 24');
  svgEl('text',{x:sx(4.27),y:sy(.55),fill:'#a0957e',class:'constraint-label'},plot,'x + y = 5');
  svgEl('line',{x1:sx(0),y1:sy(0),x2:sx(5.5),y2:sy(0),class:'axis'},plot);
  svgEl('line',{x1:sx(0),y1:sy(0),x2:sx(0),y2:sy(4.1),class:'axis'},plot);
  svgEl('text',{x:sx(5.55),y:sy(0)+4,class:'tick'},plot,'x');
  svgEl('text',{x:sx(0)-4,y:sy(4.23),class:'tick'},plot,'y');
  [[0,0],[4,0],[3.5,1.5],[2,3],[0,3]].forEach(p => svgEl('circle',{cx:sx(p[0]),cy:sy(p[1]),r:4,class:'vertex'},plot));
  svgEl('text',{x:sx(3.5)-10,y:sy(1.5)-15,'text-anchor':'end',class:'vertex-label'},plot,'(3.5, 1.5)');
  svgEl('text',{x:sx(2)+10,y:sy(3)-10,class:'vertex-label'},plot,'(2, 3)');
  svgEl('text',{x:sx(4)+10,y:sy(0)-11,class:'vertex-label'},plot,'(4, 0)');
  svgEl('text',{x:sx(.65),y:sy(1.3),fill:'#8cac96','font-size':14,'letter-spacing':3},plot,'可 行 域');
  frames.forEach((frame, i) => {
    const button = document.createElement('button');
    button.innerHTML = `<span>${frame.short}</span>`;
    button.setAttribute('aria-label', `第 ${i + 1} 步：${frame.title}`);
    button.addEventListener('click', () => { pause(); render(i); });
    $('timeline').appendChild(button);
  });
  function drawPoint(point) {
    const [x,y] = point, z = 2*x+y;
    ['point','point-halo'].forEach(id => { $(id).setAttribute('cx',sx(x)); $(id).setAttribute('cy',sy(y)); });
    const objective = $('objective');
    objective.setAttribute('x1',sx(0)); objective.setAttribute('y1',sy(z));
    objective.setAttribute('x2',sx(5.5)); objective.setAttribute('y2',sy(z-11));
    const trail = [[0,0]];
    if (y > 1e-8) trail.push([4,0]);
    trail.push(point);
    $('route').setAttribute('d',trail.map((p,i)=>`${i?'L':'M'}${sx(p[0])},${sy(p[1])}`).join(' '));
    $('coordinates').textContent = `(${Number(x.toFixed(2))}, ${Number(y.toFixed(2))})`;
    $('value').textContent = Number(z.toFixed(2));
  }
  function render(i, animate = false) {
    const previous = frames[index]; index = i;
    const f = frames[i];
    cancelAnimationFrame(animation);
    const before = previous.point, after = f.point;
    const moving = animate && !reducedMotion && before.some((v,j) => v !== after[j]);
    if (moving) {
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1,(now-start)/1100), eased = t*t*(3-2*t);
        drawPoint(before.map((v,j) => v+(after[j]-v)*eased));
        if (t<1) animation = requestAnimationFrame(tick);
      }
      animation = requestAnimationFrame(tick);
    } else drawPoint(after);
    $('table-status').textContent = f.status;
    $('iteration').textContent = f.optimal ? '已到达最优点' : f.iteration ? `第 ${f.iteration} 次迭代` : '初始解';
    $('stage-label').textContent = f.label;
    $('stage-title').textContent = f.title;
    const compactDescriptions = [
      '令 x = y = 0，松弛变量 s₁、s₂、s₃ 构成初始基，目标值 z = 0。',
      '目标行 x 的系数 −2 最负，选择 x 进基。',
      '只比较正系数行：24/6 = 4，5/1 = 5。取最小值 4，s₂ 离基；零系数行不参与。',
      '枢轴行除以 6，使枢轴元素为 1；其他行尚未消元，图中暂保留上一顶点。',
      '消去其他行的 x 系数，x 进基、s₂ 离基，到达 (4, 0)，z = 8。',
      '目标行 y 的系数 −1/3 仍为负，选择 y 进基。',
      '正系数行的比值依次为 3、12、3/2。取最小值 3/2，s₃ 离基。',
      '枢轴行除以 2/3，使枢轴元素为 1；随后消去其他行的 y 系数。',
      'y 进基、s₃ 离基，到达 (3.5, 1.5)，z = 8.5。',
      '目标行所有非基变量系数均非负，无法继续改进，当前解最优。'
    ];
    $('stage-description').textContent = embedded ? compactDescriptions[i] : f.description;
    $('operation').textContent = embedded && f.optimal ? 'x* = 3.5　·　y* = 1.5　·　z* = 8.5' : f.operation;
    $('step-icon').textContent = f.optimal ? '✓' : f.iteration;
    $('basis').textContent = f.basis.map(b => names[b]).join(', ') + (f.pending ? '（消元前）' : '');
    $('nonbasis').textContent = names.filter((_,j) => !f.basis.includes(j)).join(', ') + ' = 0' + (f.pending ? '（上一步）' : '');
    $('step-count').textContent = `${String(i+1).padStart(2,'0')} / ${frames.length}`;
    $('prev').disabled = i===0; $('next').disabled = i===frames.length-1;
    [...$('timeline').children].forEach((el,j) => {
      el.className = j===i ? 'active' : j<i ? 'done' : '';
      if(j===i) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
    });
    const hasRatio = !!f.ratios;
    let html = '<thead><tr><th scope="col">基</th>' + [...names,'右端项'].map((n,j)=>`<th scope="col" class="${f.col===j?'enter-cell':''}">${n}</th>`).join('') + (hasRatio?'<th scope="col" class="ratio-head">比值 θ</th>':'') + '</tr></thead><tbody>';
    f.table.forEach((r,ri) => {
      const cls = [ri===3?'objective-row':'',f.row===ri?'leave-row':'',f.updated?.includes(ri)?'updated-row':''].join(' ');
      html += `<tr class="${cls}"><th scope="row">${ri===3?'z':f.pending && f.row===ri?`${names[f.basis[ri]]}→${names[f.col]}`:names[f.basis[ri]]}</th>`;
      html += r.map((v,j)=>`<td class="${f.col===j?'enter-cell ':''}${ri===3 && v< -1e-9?'negative':''}">${format(v)}</td>`).join('');
      if(hasRatio) html += `<td class="ratio ${ri===f.row?'winner':''}">${ri===3?'—':f.ratios[ri]===null?'不参与':format(f.ratios[ri])}</td>`;
      html += '</tr>';
    });
    $('tableau').innerHTML = html + '</tbody>';
    if (i===frames.length-1) pause();
  }
  function schedule() {
    clearTimeout(timer);
    if (playing) timer = setTimeout(() => { render(index+1,true); if(playing) schedule(); }, 4400/Number($('speed').value));
  }
  function pause() { playing = false; clearTimeout(timer); $('play').textContent='▶ 自动播放'; $('play').setAttribute('aria-label','自动播放'); }
  function togglePlay() {
    if(playing) return pause();
    if(index===frames.length-1) render(0);
    playing=true; $('play').textContent='Ⅱ 暂停播放'; $('play').setAttribute('aria-label','暂停播放'); schedule();
  }
  $('play').addEventListener('click',togglePlay);
  $('prev').addEventListener('click',()=>{pause();render(Math.max(0,index-1),true);});
  $('next').addEventListener('click',()=>{pause();render(Math.min(frames.length-1,index+1),true);});
  $('reset').addEventListener('click',()=>{pause();render(0);});
  $('speed').addEventListener('change',schedule);
  document.addEventListener('keydown',event=>{
    if (event.target.closest('button,select,a,input,textarea') || event.ctrlKey || event.altKey || event.metaKey) return;
    if(event.code==='Space'){event.preventDefault();togglePlay();}
    if(event.code==='ArrowRight'){event.preventDefault();pause();render(Math.min(frames.length-1,index+1),true);}
    if(event.code==='ArrowLeft'){event.preventDefault();pause();render(Math.max(0,index-1),true);}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden) pause();});
  render(0);
}
