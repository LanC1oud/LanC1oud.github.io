/* Lecture 6: the slide's two-subtour pattern, with illustrative directed costs. */
(() => {
  'use strict';
  const positions = [[92,224],[92,105],[200,65],[320,65],[428,105],[428,224]];
  const subtours = [[0,1],[1,2],[2,0],[3,4],[4,5],[5,3]];
  const bridges = [[2,3],[5,0]];
  const circuit = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];
  const green = '#23816b', amber = '#b67435', gray = '#8c9d93';
  const key = ([i,j]) => `${i}:${j}`;
  const pairs = new Set(subtours.map(key)), links = new Set(bridges.map(key));
  const cost = e => pairs.has(key(e)) ? 1 : links.has(key(e)) ? 3 : 9;
  const total = es => es.reduce((sum,e) => sum + cost(e),0);
  const label = (x,y,s,c='graph-label',extra='') => `<text x="${x}" y="${y}" class="${c}" ${extra}>${s}</text>`;
  const center = 'text-anchor="middle"';
  const clamp = p => Math.max(0,Math.min(1,p));
  function edge([i,j], progress, color, {dashed=false, value=true, opacity=1}={}) {
    if (progress <= 0) return '';
    const [x1,y1] = positions[i], [x2,y2] = positions[j];
    const d = Math.hypot(x2-x1,y2-y1), dx=(x2-x1)/d, dy=(y2-y1)/d;
    const startX=x1+22*dx,startY=y1+22*dy;
    const xx=startX+(d-46)*dx*progress, yy=startY+(d-46)*dy*progress;
    const head = `${xx},${yy} ${xx-dx*9+dy*4},${yy-dy*9-dx*4} ${xx-dx*9-dy*4},${yy-dy*9+dx*4}`;
    const midX=(x1+x2)/2+dy*12, midY=(y1+y2)/2-dx*12;
    return `<g opacity="${opacity}"><line x1="${startX}" y1="${startY}" x2="${xx}" y2="${yy}" stroke="${color}" stroke-width="2.7" ${dashed?'stroke-dasharray="5 5"':''}/><polygon points="${head}" fill="${color}"/>${value&&progress>.85?`<circle cx="${midX}" cy="${midY}" r="9" fill="var(--panel)"/>${label(midX,midY+4,cost([i,j]),'graph-muted',center)}`:''}</g>`;
  }
  function plot(mode,p) {
    const titles=['同样是选边，目标是遍访六城后返回','度约束成立，但出现两个子回路','不经过起点的回路无法排出合法顺序','保留四条边，用两条跨组边接成一圈','顺序从 v₁ 开始，回到 v₁ 时不要求继续增加'];
    let out=label(260,26,titles[mode],'graph-title',center);
    const group=(x,y,w,h,stroke)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="none" stroke="${stroke}" stroke-dasharray="4 5" opacity=".47"/>`;
    if(mode<4) out+=group(52,47,188,212,gray)+group(280,47,188,212,mode===2?amber:gray);
    if(mode===0) {
      out+=subtours.map(e=>edge(e,1,gray,{dashed:true,opacity:.56})).join('');
      out+=bridges.map(e=>edge(e,1,amber,{dashed:true,opacity:.64})).join('');
    } else if(mode<=2) {
      out+=subtours.map((e,i)=>edge(e,mode===1?clamp(p*2.6-(i%3)*.8):1,mode===2&&i>=3?amber:green)).join('');
      if(mode===2) out+=label(377,158,'每走一条边，顺序至少 +1','graph-title',center);
    } else if(mode===3) {
      out+=circuit.filter(e=>pairs.has(key(e))).map(e=>edge(e,1,green)).join('');
      out+=[[2,0],[5,3]].map(e=>edge(e,1,gray,{dashed:true,opacity:.24+.53*(1-p),value:false})).join('');
      out+=bridges.map((e,i)=>edge(e,clamp(p*1.55-i*.35),amber)).join('');
    } else {
      out+=circuit.map(e=>edge(e,1,pairs.has(key(e))?green:amber)).join('');
      const e=circuit[Math.min(5,Math.floor(p*6))], q=(p*6)%1;
      if(p<1) {
        const [a,b]=e.map(i=>positions[i]);
        out+=`<circle cx="${a[0]+(b[0]-a[0])*q}" cy="${a[1]+(b[1]-a[1])*q}" r="4.5" fill="${green}"/>`;
      }
    }
    out+=positions.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="20" fill="var(--panel)" stroke="${mode===2&&i>=3?amber:green}" stroke-width="1.8"/>${label(x,y+4,`v${'₁₂₃₄₅₆'[i]}`,'graph-label',center)}${mode===4?label(x,y+36,`u = ${i}`,'graph-muted',center):''}`).join('');
    const foot=['虚线标出费用为 1 或 3 的边；其余有向边的费用为 9。','两个三城环均满足每城一进一出，但没有遍访六城。','v₄ → v₅ → v₆ → v₄：相加得到 0 ≥ 3，矛盾。','灰虚线：移除；橙线：新增。新方案仍保持每城一进一出。','遍访六城并返回起点；总费用 10。'];
    return out+label(260,302,foot[mode],'graph-muted',center);
  }
  function table(headers,rows,caption,highlights=[]) {return {headers,rows,caption,highlights};}
  const metric = (label,value) => ({label,value});
  const frames = [
    {label:'选边建模',title:'先写出每城一进一出',description:'选中 i→j 时令 xᵢⱼ=1，禁止 i→i。把每个城市的进入、离开次数都限制为 1；下面用自拟费用复现课件的双环。',formula:'min Σ cᵢⱼxᵢⱼ；Σⱼxᵢⱼ=1，Σᵢxᵢⱼ=1（均排除自环）',metrics:[metric('城市','6'),metric('每城进／出','1／1')],svg:p=>plot(0,p),table:table(['有向边','单位费用'],[['1→2、2→3、3→1','1'],['4→5、5→6、6→4','1'],['3→4、6→1','3'],['其余非自环边','9']],'课件给出两组三城环；费用为演示自拟。')},
    {label:'发现双环',title:'最低费用的指派不一定是一趟巡回',description:'六条费用为 1 的边已经让每城一进一出，费用下界 6 也达到了。但从 v₁ 出发只能到达前三个城市。',formula:'1 → 2 → 3 → 1　和　4 → 5 → 6 → 4',metrics:[metric('仅度约束最优值',String(total(subtours))),metric('回路数','2')],svg:p=>plot(1,p),table:table(['城市组','每城入度','每城出度','是否连到另一组'],[['1、2、3','1','1','否'],['4、5、6','1','1','否']],'度数都正确，却没有从任一组三城走到另一组。')},
    {label:'排除子环',title:'MTZ 顺序在子回路上会自相矛盾',description:'非起点之间若选中 i→j，序号必须至少增 1。围绕不含起点的子回路求和，左侧消去，右侧仍为正。',formula:'uᵢ − uⱼ + 6xᵢⱼ ≤ 5；xᵢⱼ=1 ⇒ uⱼ−uᵢ≥1',metrics:[metric('起点顺序','u₁ = 0'),metric('其他城市','1 ≤ uᵢ ≤ 5')],svg:p=>plot(2,p),table:table(['选中的边','必须成立'],[['4→5','u₅−u₄ ≥ 1'],['5→6','u₆−u₅ ≥ 1'],['6→4','u₄−u₆ ≥ 1'],['相加','0 ≥ 3（矛盾）']],'MTZ 约束只需施加于不同的非起点城市。',[{row:3,col:1,kind:'pivot'}])},
    {label:'接成一圈',title:'换两条边，连通两组三城',description:'移除 3→1 与 6→4，换成 3→4 与 6→1。每城的度数保持不变，现在只剩一个回路。',formula:'总费用 = 6 − 1 − 1 + 3 + 3 = 10',metrics:[metric('回路数','2 → 1'),metric('总费用','6 → 10')],svg:p=>plot(3,p),table:table(['操作','有向边','费用变化'],[['移除','3→1、6→4','−2'],['新增','3→4、6→1','+6'],['保留','其他 4 条边','0']],'这是说明约束效果的构造，不是通用的 TSP 求解算法。',[{row:1,col:1,kind:'enter'}])},
    {label:'核验最优',title:'一次遍访六城，并达到费用下界',description:'跨过两组边界至少两次，每次费用至少 3；其余边至少 1。本例巡回恰好以四条费用 1 的边、两条费用 3 的边达到下界。',formula:'1 → 2 → 3 → 4 → 5 → 6 → 1；z* = 2×3 + 4×1 = 10',metrics:[metric('访问城市','6／6'),metric('费用下界','10'),metric('最优费用',String(total(circuit)))],svg:p=>plot(4,p),table:table(['检查','巡回的结果'],[['进、出次数','各城市都是 1／1'],['非起点之间','u₂=1，u₃=2，u₄=3，u₅=4，u₆=5'],['回到起点','6→1，不施加非起点间的顺序约束'],['费用','10，达到下界']],'给城市按访问顺序编号，验证整条巡回不会被 MTZ 误删。',[{row:3,col:1,kind:'pivot'}])}
  ];
  Object.assign(window.OPT_DEMOS ||= {}, {'integer-tsp':{title:'旅行商：从双环到完整巡回',formula:'度约束 + MTZ 排除子回路',variants:[{label:'六城例题',frames}]}});
})();
