/* Vehicle map recovery layer. Keeps Tesla source schematics in their own tabs. */
(()=>{
  const hotspots={
    SPK01:{x:20.5,y:38.5,type:'woofer'},SPK02:{x:79.5,y:38.5,type:'woofer'},
    SPK03:{x:24.0,y:31.0,type:'tweeter'},SPK04:{x:76.0,y:31.0,type:'tweeter'},
    SPK05:{x:39.0,y:27.5,type:'dash'},SPK06:{x:50.0,y:24.0,type:'dash'},SPK07:{x:61.0,y:27.5,type:'dash'},
    SPK08:{x:27.5,y:45.0,type:'mid'},SPK09:{x:72.5,y:45.0,type:'mid'},
    SPK10:{x:23.5,y:67.5,type:'rear'},SPK11:{x:76.5,y:67.5,type:'rear'},
    SPK12:{x:40.0,y:86.5,type:'immersion'},SPK13:{x:60.0,y:86.5,type:'immersion'},
    SPK14:{x:40.0,y:63.5,type:'immersion'},SPK15:{x:60.0,y:63.5,type:'immersion'}
  };

  const pan=document.querySelector('#pan');
  const schematic=document.querySelector('#schematic');
  if(!pan||!schematic) return;

  const shell=document.createElement('div');
  shell.id='vehicleLayer';
  shell.className='vehicle-map-shell';
  shell.innerHTML=`
    <div id="vehicleMap" class="vehicle-map" role="group" aria-label="Interactive Model 3 Highland speaker-location map">
      <img src="assets/model3-highland-map.svg" alt="Custom technical top-down Model 3 Highland vehicle map">
      <div id="vehicleHotspots"></div>
      <div class="vehicle-map-note">CUSTOM INTERACTIVE VEHICLE MAP · NOT TESLA OEM ARTWORK</div>
    </div>`;
  pan.insertBefore(shell,schematic);

  const source=document.createElement('div');
  source.className='vehicle-map-source';
  source.innerHTML='<b>Vehicle-location view</b>Custom interactive engineering map. Tesla Service wiring sheets remain available under LHD and Premium Amp.';
  document.querySelector('#viewport')?.appendChild(source);

  const originalSetView=window.setView;
  const originalSelect=window.selectComponent;

  function currentStageClass(c){
    try{return stageClass(c);}catch(_){return 'baseline';}
  }
  function currentQuery(){return (document.querySelector('#search')?.value||'').trim().toLowerCase();}

  function renderVehicleHotspots(){
    const host=document.querySelector('#vehicleHotspots');
    if(!host||!Array.isArray(components)||components.length!==15) return;
    const q=currentQuery();
    host.innerHTML=components.map(c=>{
      const p=hotspots[c.ID];
      if(!p) return '';
      const hit=!q||`${c.Position} ${c.Connector} ${c.Device}`.toLowerCase().includes(q);
      const classes=['vehicle-hotspot',`type-${p.type}`,currentStageClass(c),selected&&selected.ID===c.ID?'selected':'',hit?'':'search-hidden'].filter(Boolean).join(' ');
      const number=String(c['#']).padStart(2,'0');
      const label=`${number} · ${c.Position} · ${c.Connector}`;
      return `<button class="${classes}" style="--x:${p.x}%;--y:${p.y}%" data-hotspot="${c.ID}" data-label="${esc(label)}" title="${esc(label)}" aria-label="${esc(label)}">${number}</button>`;
    }).join('');
    host.querySelectorAll('[data-hotspot]').forEach(btn=>btn.addEventListener('click',()=>window.selectComponent(btn.dataset.hotspot)));
  }

  window.selectComponent=function(id){
    originalSelect(id);
    renderVehicleHotspots();
  };

  function showVehicleMap(){
    view='system';
    document.body.classList.add('map-mode');
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='system'));
    document.querySelector('#infoView')?.classList.add('hidden');
    document.querySelector('#workspaceView')?.classList.remove('hidden');
    shell.classList.remove('hidden');
    schematic.classList.add('hidden');
    source.classList.remove('hidden');
    const title=document.querySelector('#workspaceTitle');if(title)title.textContent='Interactive Model 3 Highland vehicle map';
    const pill=document.querySelector('.source-pill');if(pill){pill.textContent='CUSTOM MAP';pill.title='Custom interactive vehicle-location map; not Tesla OEM artwork';}
    const badge=document.querySelector('#selectedBadge');if(badge&&selected)badge.textContent=selected.Connector;
    const msg=document.querySelector('#selectedMessage');if(msg&&selected)msg.textContent=selected.Position;
    resetView();
    renderVehicleHotspots();
  }

  window.setView=function(next){
    if(next==='system'){showVehicleMap();return;}
    document.body.classList.remove('map-mode');
    shell.classList.add('hidden');
    source.classList.add('hidden');
    schematic.classList.remove('hidden');
    const pill=document.querySelector('.source-pill');if(pill){pill.textContent='TESLA SERVICE SOURCE';pill.title='Captured Tesla Service electrical-reference source';}
    originalSetView(next);
  };

  document.querySelector('#search')?.addEventListener('input',renderVehicleHotspots);
  document.querySelector('#stage')?.addEventListener('change',()=>queueMicrotask(renderVehicleHotspots));

  // Make the vehicle map the primary screen immediately; populate hotspots as soon as coverage arrives.
  showVehicleMap();
  let attempts=0;
  const ready=setInterval(()=>{
    attempts+=1;
    if(Array.isArray(components)&&components.length===15){clearInterval(ready);renderVehicleHotspots();showVehicleMap();}
    else if(attempts>200) clearInterval(ready);
  },25);
})();
