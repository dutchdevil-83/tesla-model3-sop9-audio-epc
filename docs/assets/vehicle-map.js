/* Tesla Parts Catalog Audio Speakers map. Original numbered artwork remains the primary visual. */
(()=>{
  const LOCAL_IMAGE='assets/tesla-parts/audio-speakers/audio-speakers.png';
  const HAR_IMAGE='https://epc.tesla.com/resources/images/Model3/Highland/NL/Audio%20Speakers%20TI-6789_41ee8600-5062-4d1f-acb9-99e40abe74d0.png';
  const CROSSREF='assets/tesla-parts/audio-speakers/epc-crossref.json';
  const IMAGE_SHA='86330aae2440487a7cfa524b4b7adc793c87ee45806644cf69f491148d1faf29';

  const pan=document.querySelector('#pan');
  const schematic=document.querySelector('#schematic');
  const viewport=document.querySelector('#viewport');
  if(!pan||!schematic||!viewport) return;

  let epc=null;
  let activeCalloutId=null;
  let activeAnnotation=null;
  let imageFallbackUsed=false;

  const shell=document.createElement('div');
  shell.id='vehicleLayer';
  shell.className='vehicle-map-shell';
  shell.innerHTML=`
    <div id="vehicleMap" class="vehicle-map" role="group" aria-label="Tesla Parts Catalog Audio Speakers vehicle illustration">
      <img id="epcVehicleImage" src="${LOCAL_IMAGE}" alt="Tesla Parts Catalog Model 3 Highland Audio Speakers illustration with original numbered callouts">
      <div id="epcCallouts" class="epc-callouts" aria-label="Clickable Tesla Parts Catalog callouts"></div>
    </div>`;
  pan.insertBefore(shell,schematic);

  const source=document.createElement('div');
  source.className='vehicle-map-source';
  source.innerHTML=`<b>Tesla Parts Catalog · Audio Speakers</b><span>Exact showcase artwork recovered from the supplied HAR.</span><code>SHA-256 ${IMAGE_SHA.slice(0,16)}…</code>`;
  viewport.appendChild(source);

  const detail=document.createElement('section');
  detail.id='epcDetail';
  detail.className='epc-detail hidden';
  detail.setAttribute('aria-live','polite');
  viewport.appendChild(detail);

  const image=shell.querySelector('#epcVehicleImage');
  image.addEventListener('error',()=>{
    if(imageFallbackUsed) return;
    imageFallbackUsed=true;
    image.src=HAR_IMAGE;
    source.classList.add('remote-fallback');
    source.querySelector('span').textContent='Exact HAR-referenced artwork. Local repo copy is not present yet; using the captured source URL.';
  });

  const originalSetView=window.setView;
  const originalSelect=window.selectComponent;

  function escHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function mapping(annotation){return epc?.annotationMappings?.[String(annotation)]||{targets:[],confidence:'unmapped',note:'No project cross-reference yet.'};}
  function parts(annotation){return (epc?.parts||[]).filter(p=>String(p.annotation)===String(annotation));}
  function calloutTitle(c){
    const ps=parts(c.annotation),m=mapping(c.annotation);
    const label=ps.length?ps.map(p=>`${p.partNumber} ${p.description}`).join(' / '):'Parts Catalog callout';
    const target=m.targets?.length?` → ${m.targets.join(', ')}`:'';
    return `Tesla EPC ${c.annotation}: ${label}${target}`;
  }
  function annotationsForTarget(id){
    if(!epc) return [];
    return Object.entries(epc.annotationMappings||{}).filter(([,m])=>(m.targets||[]).includes(id)).map(([a])=>a);
  }
  function matchingAnnotations(){
    const q=(document.querySelector('#search')?.value||'').trim().toLowerCase();
    if(!q||!epc) return null;
    const matchedTargets=new Set((components||[]).filter(c=>`${c.ID} ${c.Position} ${c.Connector} ${c.Device}`.toLowerCase().includes(q)).map(c=>c.ID));
    const result=new Set();
    for(const [ann,m] of Object.entries(epc.annotationMappings||{})) if((m.targets||[]).some(id=>matchedTargets.has(id))) result.add(ann);
    for(const p of epc.parts||[]) if(`${p.annotation} ${p.partNumber} ${p.description}`.toLowerCase().includes(q)) result.add(String(p.annotation));
    return result;
  }

  function renderCallouts(){
    const host=shell.querySelector('#epcCallouts');
    if(!host||!epc) return;
    const searchMatches=matchingAnnotations();
    const selectedAnnotations=selected?new Set(annotationsForTarget(selected.ID)):new Set();
    host.innerHTML=(epc.callouts||[]).map(c=>{
      const ann=String(c.annotation),m=mapping(ann),mapped=(m.targets||[]).length>0;
      const searchDim=searchMatches&&searchMatches.size>0&&!searchMatches.has(ann);
      const classes=['epc-callout',mapped?'mapped':'unmapped',selectedAnnotations.has(ann)?'target-related':'',activeAnnotation===ann?'group-active':'',activeCalloutId===c.id?'active':'',searchDim?'search-dim':''].filter(Boolean).join(' ');
      return `<button class="${classes}" style="--x:${c.xPct}%;--y:${c.yPct}%" data-epc-callout="${c.id}" data-annotation="${escHtml(ann)}" aria-label="${escHtml(calloutTitle(c))}" title="${escHtml(calloutTitle(c))}"><span class="sr-only">${escHtml(ann)}</span></button>`;
    }).join('');
    host.querySelectorAll('[data-epc-callout]').forEach(btn=>btn.addEventListener('click',()=>selectCallout(Number(btn.dataset.epcCallout),btn.dataset.annotation)));
  }

  function targetChip(id){
    const c=(components||[]).find(x=>x.ID===id);
    if(!c) return `<span class="epc-target missing">${escHtml(id)}</span>`;
    return `<button class="epc-target" data-epc-target="${c.ID}"><b>${String(c['#']).padStart(2,'0')}</b><span>${escHtml(c.Position)}</span><em>${escHtml(c.Connector)}</em></button>`;
  }

  function renderDetail(){
    if(!epc||!activeAnnotation){detail.classList.add('hidden');return;}
    const ann=String(activeAnnotation),ps=parts(ann),m=mapping(ann);
    const occurrences=(epc.callouts||[]).filter(c=>String(c.annotation)===ann).length;
    detail.classList.remove('hidden');
    detail.innerHTML=`
      <div class="epc-detail-head"><div><span class="epc-kicker">TESLA EPC CALLOUT</span><strong>${escHtml(ann)}</strong><small>${occurrences} callout${occurrences===1?'':'s'} in vehicle drawing · ${escHtml(m.confidence||'unmapped')}</small></div><button class="epc-close" aria-label="Close EPC detail">×</button></div>
      <div class="epc-parts">${ps.length?ps.map(p=>`<div class="epc-part"><div><b>${escHtml(p.description)}</b><span>${escHtml(p.partNumber)} · qty ${escHtml(p.quantity??'—')}</span></div><strong>${p.price!=null?`€${Number(p.price).toFixed(2)}`:'—'}</strong></div>`).join(''):'<div class="epc-empty">No part row captured for this annotation.</div>'}</div>
      <div class="epc-map-note">${escHtml(m.note||'No project mapping yet.')}</div>
      ${(m.targets||[]).length?`<div class="epc-target-title">PROJECT TARGETS · click to open component + wiring evidence</div><div class="epc-targets">${m.targets.map(targetChip).join('')}</div>`:'<div class="epc-no-target">Not mapped to one of the 15 cabin upgrade targets.</div>'}`;
    detail.querySelector('.epc-close')?.addEventListener('click',()=>{activeAnnotation=null;activeCalloutId=null;renderDetail();renderCallouts();});
    detail.querySelectorAll('[data-epc-target]').forEach(btn=>btn.addEventListener('click',()=>window.selectComponent(btn.dataset.epcTarget)));
  }

  function selectCallout(id,annotation){activeCalloutId=id;activeAnnotation=String(annotation);renderCallouts();renderDetail();}

  window.selectComponent=function(id){
    originalSelect(id);
    const anns=annotationsForTarget(id);
    if(anns.length){activeAnnotation=anns[0];activeCalloutId=null;renderDetail();}
    renderCallouts();
  };

  function showVehicleMap(){
    view='system';document.body.classList.add('map-mode');
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='system'));
    document.querySelector('#infoView')?.classList.add('hidden');document.querySelector('#workspaceView')?.classList.remove('hidden');
    shell.classList.remove('hidden');schematic.classList.add('hidden');source.classList.remove('hidden');
    const title=document.querySelector('#workspaceTitle');if(title)title.textContent='Tesla Parts Catalog · Audio Speakers';
    const pill=document.querySelector('.source-pill');if(pill){pill.textContent='TESLA PARTS CATALOG';pill.title='Original Audio Speakers showcase artwork extracted from the supplied HAR';}
    const badge=document.querySelector('#selectedBadge');if(badge&&selected)badge.textContent=selected.Connector;
    const msg=document.querySelector('#selectedMessage');if(msg&&selected)msg.textContent=selected.Position;
    resetView();renderCallouts();
  }

  window.setView=function(next){
    if(next==='system'){showVehicleMap();return;}
    document.body.classList.remove('map-mode');shell.classList.add('hidden');source.classList.add('hidden');detail.classList.add('hidden');schematic.classList.remove('hidden');
    const pill=document.querySelector('.source-pill');if(pill){pill.textContent='TESLA SERVICE SOURCE';pill.title='Captured Tesla Service electrical-reference source';}
    originalSetView(next);
  };

  document.querySelector('#search')?.addEventListener('input',renderCallouts);
  document.querySelector('#stage')?.addEventListener('change',()=>queueMicrotask(renderCallouts));
  fetch(CROSSREF,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`EPC cross-reference HTTP ${r.status}`);return r.json();}).then(data=>{
    epc=data;renderCallouts();if(selected){const anns=annotationsForTarget(selected.ID);if(anns.length){activeAnnotation=anns[0];renderDetail();}}
  }).catch(err=>{console.error(err);source.classList.add('source-error');source.querySelector('span').textContent='EPC cross-reference failed to load; original artwork remains available.';});

  showVehicleMap();
  let attempts=0;
  const ready=setInterval(()=>{attempts++;if(Array.isArray(components)&&components.length===15){clearInterval(ready);renderCallouts();showVehicleMap();}else if(attempts>200)clearInterval(ready);},25);
})();
