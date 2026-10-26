'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sources = {'artificial':'linear-models.js','linear-models':'linear-models.js','lp-cases':'linear-models.js','duality':'duality.js','sensitivity':'duality.js','transport-model':'transport.js','transport-start':'transport.js','transport-optimize':'transport.js'};
  const id = new URLSearchParams(location.search).get('demo') || 'duality';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let spec, variant = 0, index = 0, playing = false, timer, animation;
  document.documentElement.dataset.view = 'geometry';
  const media = matchMedia('(prefers-color-scheme: dark)');
  function syncTheme() {
    let preference;
    try { if (parent !== window) preference = parent.document.documentElement.dataset.theme; } catch (_) { /* Standalone preview may be framed elsewhere. */ }
    document.documentElement.dataset.theme = preference === 'dark' || (preference !== 'light' && media.matches) ? 'dark' : 'light';
  }
  syncTheme(); media.addEventListener('change', syncTheme);
  let parentObserver;
  try {
    if (parent !== window) {
      parentObserver = new MutationObserver(syncTheme);
      parentObserver.observe(parent.document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    }
  } catch (_) { /* The article uses same-origin embedding. */ }
  const sizeObserver = new ResizeObserver(() => {
    try { if (frameElement) frameElement.style.height = `${Math.ceil($('demo').getBoundingClientRect().height)+2}px`; } catch (_) { /* No parent access is needed to run the demo. */ }
  });
  sizeObserver.observe($('demo'));
  function frames() { return spec.variants[variant].frames; }
  function pause() { playing=false;clearTimeout(timer);$('play').textContent='▶ 自动播放';$('play').setAttribute('aria-label','自动播放'); }
  function draw(frame, progress) { $('graphic').innerHTML = typeof frame.svg === 'function' ? frame.svg(progress) : frame.svg || ''; }
  function render(next, animate=false) {
    cancelAnimationFrame(animation); index=next;
    const all=frames(), frame=all[index];
    $('stage-title').textContent=frame.title;
    $('description').textContent=frame.description;
    $('formula').textContent=frame.formula || '';
    $('note').textContent=frame.note || '';
    $('graphic').setAttribute('aria-label',frame.title+'：'+frame.description);
    $('step-count').textContent=`${String(index+1).padStart(2,'0')} / ${all.length}`;
    $('prev').disabled=index===0;$('next').disabled=index===all.length-1;
    $('metrics').innerHTML=(frame.metrics||[]).map(m=>`<div class="metric"><span>${escape(m.label)}</span><strong>${escape(m.value)}</strong></div>`).join('');
    const table=frame.table||{headers:['步骤','结论'],rows:[[frame.title,frame.formula||frame.description]]};
    $('table-caption').textContent=(table.caption||'与图解同步的计算')+(table.headers.length>7?'（表格可横向滑动）':'');
    $('table').innerHTML='<thead><tr>'+table.headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')+'</tr></thead><tbody>'+table.rows.map((row,r)=>'<tr>'+row.map((value,c)=>{const hi=(table.highlights||[]).find(h=>h.row===r&&h.col===c);return `<td class="${hi?escape(hi.kind):''}">${escape(value)}</td>`;}).join('')+'</tr>').join('')+'</tbody>';
    [...$('timeline').children].forEach((button,i)=>{button.className=i===index?'active':i<index?'done':'';if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    if(animate&&!reduced&&typeof frame.svg==='function'){
      const started=performance.now(),duration=1000/Math.min(1.5,Number($('speed').value));
      const tick=now=>{const p=Math.min(1,(now-started)/duration);draw(frame,p*p*(3-2*p));if(p<1)animation=requestAnimationFrame(tick);};
      draw(frame,0);animation=requestAnimationFrame(tick);
    } else draw(frame,1);
    if(index===all.length-1)pause();
  }
  function loadVariant(i) {
    pause(); variant=i;
    const model = spec.variants[i].formula || spec.formula;
    $('model').textContent=model;
    document.querySelector('header').classList.toggle('long-model', model.length>45);
    [...$('variants').children].forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));
    $('timeline').style.setProperty('--steps',frames().length);
    $('timeline').innerHTML='';
    frames().forEach((frame,j)=>{const b=document.createElement('button');b.textContent=frame.label||String(j+1);b.setAttribute('aria-label',`第 ${j+1} 步：${frame.title}`);b.title=frame.title;b.addEventListener('click',()=>{pause();render(j,true);});$('timeline').appendChild(b);});
    render(0);
  }
  function schedule() { clearTimeout(timer);if(playing)timer=setTimeout(()=>{render(index+1,true);if(playing)schedule();},4200/Number($('speed').value)); }
  function toggle() { if(playing)return pause();if(index===frames().length-1)render(0);playing=true;$('play').textContent='Ⅱ 暂停播放';$('play').setAttribute('aria-label','暂停播放');schedule(); }
  function initialize() {
    spec=window.OPT_DEMOS?.[id];if(!spec)throw new Error('Missing demo '+id);
    document.title=spec.title+' · 最优化方法';$('demo-title').textContent=spec.title;$('model').textContent=spec.formula;
    if(spec.variants.length>1)spec.variants.forEach((v,i)=>{const b=document.createElement('button');b.textContent=v.label;b.setAttribute('aria-pressed',String(i===0));b.addEventListener('click',()=>loadVariant(i));$('variants').appendChild(b);});
    $('play').addEventListener('click',toggle);
    $('prev').addEventListener('click',()=>{pause();render(Math.max(0,index-1),true);});
    $('next').addEventListener('click',()=>{pause();render(Math.min(frames().length-1,index+1),true);});
    $('reset').addEventListener('click',()=>loadVariant(variant));$('speed').addEventListener('change',schedule);
    document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>{document.documentElement.dataset.view=b.dataset.view;document.querySelectorAll('button[data-view]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===b)));}));
    document.addEventListener('keydown',event=>{if(event.target.closest('button,select,a,input,textarea')||event.ctrlKey||event.altKey||event.metaKey)return;if(event.code==='Space'){event.preventDefault();toggle();}if(event.code==='ArrowRight'){event.preventDefault();pause();render(Math.min(frames().length-1,index+1),true);}if(event.code==='ArrowLeft'){event.preventDefault();pause();render(Math.max(0,index-1),true);}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    loadVariant(0);document.documentElement.dataset.ready='true';
  }
  if(!sources[id]){$('stage-title').textContent='未找到演示';return;}
  const script=document.createElement('script');script.src=sources[id];script.onload=initialize;script.onerror=()=>{$('stage-title').textContent='演示暂时未能载入，请刷新重试。';};document.head.appendChild(script);
  window.addEventListener('pagehide',()=>{pause();cancelAnimationFrame(animation);sizeObserver.disconnect();parentObserver?.disconnect();},{once:true});
})();
