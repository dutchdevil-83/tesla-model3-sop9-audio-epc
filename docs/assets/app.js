const RAW='https://raw.githubusercontent.com/dutchdevil-83/tesla-model3-sop9-audio-epc/main/';
const GITHUB='https://github.com/dutchdevil-83/tesla-model3-sop9-audio-epc/blob/main/';
const PATHS={
  coverage:'Target_Assets/coverage.json',
  lhd:'Target_Assets/core/audio_lhd.svg',
  premium:'Target_Assets/core/audio_premium_amp.svg',
  sourcing:'Supplier_Feedback_and_Sourcing_2026-09-10_v2.1.md',
  manifest:'Tesla_SOP9_Audio_EPC_Package_v2.1.0_manifest.json',
  provenance:'PROVENANCE.json',
  qa:'Tesla_SOP9_Audio_EPC_v2.1.0_QA.md',
  bom:'Tesla_Model_3_Highland_SOP9_Audio_BOM_v2.2.0.xlsx'
};
const core9=new Set(['SPK01','SPK02','SPK03','SPK04','SPK05','SPK06','SPK07','SPK10','SPK11']);
const stages=[
  {id:'oem',name:'OEM baseline',cost:'€0',count:0,includes:new Set(),desc:'Reference the existing vehicle endpoints without assigning upgrade hardware.'},
  {id:'core9',name:'Core Music 9',cost:'€2,816',count:9,includes:core9,desc:'Music-first 9-position speaker stage with V EIGHTEEN retained and DIRECTOR deferred.'},
  {id:'core9director',name:'Core Music 9 + DIRECTOR',cost:'€3,065',count:9,includes:core9,desc:'K200 Highland 7 physical front/center positions + rear-door M100 pair, V EIGHTEEN, DIRECTOR and PP-TES donor/interposer.'},
  {id:'full15',name:'Full 15',cost:'€3,382.98',count:15,includes:null,desc:'All 15 cabin speaker positions, V EIGHTEEN and harness plan with DIRECTOR deferred.'},
  {id:'full15director',name:'Full 15 + DIRECTOR',cost:'€3,631.98',count:15,includes:null,desc:'Complete staged end-state: all 15 cabin positions plus V EIGHTEEN, DIRECTOR and PP-TES planning basis.'}
];
const planHardware={
  SPK01:'HELIX Ci3 K200.2TES4 Highland front + center package',SPK02:'HELIX Ci3 K200.2TES4 Highland front + center package',SPK03:'HELIX Ci3 K200.2TES4 Highland front + center package',SPK04:'HELIX Ci3 K200.2TES4 Highland front + center package',SPK05:'HELIX Ci3 K200.2TES4 Highland front + center package',SPK06:'HELIX Ci3 K200.2TES4 Highland front + center package',SPK07:'HELIX Ci3 K200.2TES4 Highland front + center package',
  SPK08:'HELIX Ci5 M80FM-S3 pair',SPK09:'HELIX Ci5 M80FM-S3 pair',SPK10:'HELIX Ci3 M100FM-S3 pair',SPK11:'HELIX Ci3 M100FM-S3 pair',SPK12:'HELIX Ci3 M100FM-S3 second pair',SPK13:'HELIX Ci3 M100FM-S3 second pair',SPK14:'HELIX Ci5 M50FM-S3 pair',SPK15:'HELIX Ci5 M50FM-S3 pair'
};
const zoneOrder=['Front doors','Instrument panel','Rear doors','Parcel shelf','Headliner'];
const zoneFor=c=>c.ID==='SPK01'||c.ID==='SPK02'||c.ID==='SPK03'||c.ID==='SPK04'||c.ID==='SPK08'||c.ID==='SPK09'?'Front doors':c.ID==='SPK05'||c.ID==='SPK06'||c.ID==='SPK07'?'Instrument panel':c.ID==='SPK10'||c.ID==='SPK11'?'Rear doors':c.ID==='SPK12'||c.ID==='SPK13'?'Parcel shelf':'Headliner';
let components=[];let selected=null;let view='system';let inspectTab='component';let stage=stages[2];let scale=1;let panX=0;let panY=0;let dragging=false;let dragStart=null;
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];const raw=p=>RAW+p;const gh=p=>GITHUB+p;
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function stageIncludes(c){if(stage.id==='oem')return false;if(stage.includes===null)return true;return stage.includes.has(c.ID);}
function stageClass(c){if(stage.id==='oem')return 'baseline';return stageIncludes(c)?'included':'deferred';}
function stageLabel(c){if(stage.id==='oem')return c.Topology.includes('PAUDIO-only')?'NOT IN BAUDIO BASELINE':'OEM ENDPOINT';return stageIncludes(c)?'IN CURRENT STAGE':'DEFERRED TO FULL 15';}
function locationPath(c){return `Target_Assets/connectors/${c.Connector}/location.jpg`;}
function metadataPath(c){return `Target_Assets/connectors/${c.Connector}/metadata.json`;}
function faceviewPath(c){return `Target_Assets/${c['Faceview file']}`;}
function setupStages(){const sel=$('#stage');sel.innerHTML=stages.map(s=>`<option value="${s.id}"${s.id===stage.id?' selected':''}>${s.name}</option>`).join('');sel.addEventListener('change',()=>{stage=stages.find(s=>s.id===sel.value)||stages[2];renderStage();});}
function renderStage(){
  $('#activeCount').textContent=stage.count;$('#stageCost').textContent=stage.cost;$('#workspaceStage').textContent=stage.name;$('#railStage').textContent=stage.name;$('#railSummary').textContent=`${stage.count} cabin positions · ${stage.cost} known hardware basis`;$('#planTitle').textContent=stage.name;$('#planDescription').textContent=stage.desc;
  renderDock();renderInspector();
}
function renderDock(){
  const q=$('#search').value.trim().toLowerCase();const host=$('#positionDock');host.innerHTML='';
  zoneOrder.forEach(zone=>{
    const matches=components.filter(c=>zoneFor(c)===zone);if(!matches.length)return;
    const row=document.createElement('div');row.className='zone-row';const chips=matches.map(c=>{const hit=!q||`${c.Position} ${c.Connector} ${c.Device}`.toLowerCase().includes(q);const cls=[stageClass(c),selected&&selected.ID===c.ID?'selected':'',hit?'':'search-hidden'].join(' ');return `<button class="position-chip ${cls}" data-id="${c.ID}" title="${esc(c.Topology)}"><span class="chip-num">${String(c['#']).padStart(2,'0')}</span><span>${esc(c.Position)}</span><b>${esc(c.Connector)}</b></button>`;}).join('');row.innerHTML=`<div class="zone-name">${zone}</div><div class="zone-chips">${chips}</div>`;host.appendChild(row);
  });
  $$('.position-chip').forEach(b=>b.addEventListener('click',()=>selectComponent(b.dataset.id)));
}
function selectComponent(id){selected=components.find(c=>c.ID===id)||components[0];renderDock();renderInspector();$('#selectedBadge').textContent=selected.Connector;$('#selectedMessage').textContent=selected.Position;}
function renderInspector(){if(!selected)return;$('#inspectNum').textContent=String(selected['#']).padStart(2,'0');$('#inspectTitle').textContent=selected.Position;$('#inspectSub').textContent=`${selected.Connector} · ${selected.Device}`;$('#inspectStage').textContent=stageLabel(selected);
  $$('.inspect-tab').forEach(b=>b.classList.toggle('active',b.dataset.inspect===inspectTab));
  const body=$('#inspectBody');
  if(inspectTab==='component'){
    const locationOk=!selected.Location.includes('GAP');body.innerHTML=`
      <div class="kv"><span>Physical zone</span><b>${esc(zoneFor(selected))}</b></div>
      <div class="kv"><span>Topology</span><b>${esc(selected.Topology)}</b></div>
      <div class="kv"><span>Tesla connector PN</span><b>${esc(selected['Tesla connector PN'])}</b></div>
      <div class="kv"><span>Harness</span><b>${esc(selected.Harness)} · ${esc(selected['Harness name'])}</b></div>
      <div class="kv"><span>Asset coverage</span><b class="${locationOk?'verified':'gap'}">${esc(selected.Location)}</b></div>
      <div class="media-title"><span>Physical location</span>${locationOk?`<a href="${raw(locationPath(selected))}" target="_blank" rel="noreferrer">OPEN</a>`:''}</div>
      <div class="media-card">${locationOk?`<img src="${raw(locationPath(selected))}" alt="${esc(selected.Connector)} physical location">`:`<div class="media-empty">No retrievable X566 location image exists in the validated target set.<br>The documented HTTP 403 gap is preserved.</div>`}</div>`;
  } else if(inspectTab==='wiring'){
    body.innerHTML=`
      <div class="kv"><span>Connector</span><b>${esc(selected.Connector)}</b></div><div class="kv"><span>Faceview</span><b class="verified">${esc(selected.Faceview)}</b></div><div class="kv"><span>Premium amp pins</span><b>${esc(selected['Premium Amp pins']||'Not mapped in target coverage')}</b></div>
      <div class="media-title"><span>Connector faceview</span><a href="${raw(faceviewPath(selected))}" target="_blank" rel="noreferrer">OPEN</a></div><div class="media-card"><img src="${raw(faceviewPath(selected))}" alt="${esc(selected.Connector)} connector faceview"></div>
      <div class="media-title"><span>Cavities / route</span></div><div class="route">${esc(selected['Cavities / route'])}</div>
      <div class="action-row"><button onclick="window.open('${raw(metadataPath(selected))}','_blank')">Open metadata</button><button onclick="setView('lhd')">Show LHD source</button></div>`;
  } else {
    body.innerHTML=`
      <div class="kv"><span>Current plan</span><b>${esc(stage.name)}</b></div><div class="kv"><span>Position status</span><b class="${stageIncludes(selected)?'verified':'gap'}">${esc(stageLabel(selected))}</b></div>
      <div class="hardware"><strong>${esc(planHardware[selected.ID]||'Hardware mapping pending')}</strong><span>${selected.ID==='SPK08'||selected.ID==='SPK09'||selected.ID==='SPK12'||selected.ID==='SPK13'||selected.ID==='SPK14'||selected.ID==='SPK15'?'Effect / immersion hardware in the staged Full 15 expansion.':'Core Music 9 hardware mapping from the staged sourcing plan.'}</span></div>
      <div class="kv"><span>System hardware basis</span><b>${esc(stage.cost)}</b></div><div class="kv"><span>Engineering state</span><b class="verified">${esc(selected['Engineering status'])}</b></div>
      <div class="action-row"><button onclick="window.open('${gh(PATHS.sourcing)}','_blank')">Sourcing evidence</button><button onclick="window.open('${gh(PATHS.bom)}','_blank')">BOM workbook</button></div>`;
  }
}
function setSource(path,title){$('#schematic').src=raw(path);$('#workspaceTitle').textContent=title;$('#openSource').dataset.path=path;resetView();}
function setView(next){view=next;$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const info=$('#infoView'),workspace=$('#workspaceView');
  if(view==='system'||view==='lhd'||view==='premium'){info.classList.add('hidden');workspace.classList.remove('hidden');setSource(view==='premium'?PATHS.premium:PATHS.lhd,view==='premium'?'Tesla Service · Premium amplifier schematic':view==='lhd'?'Tesla Service · Audio LHD schematic':'Tesla Service audio source + upgrade navigator');return;}
  workspace.classList.add('hidden');info.classList.remove('hidden');if(view==='connectors')renderConnectors();else renderEvidence();
}
function renderConnectors(){const info=$('#infoView');info.innerHTML=`<h2>Connector evidence</h2><p>The 15 target endpoints remain one click away without occupying the primary engineering canvas.</p><table class="connector-table"><thead><tr><th>#</th><th>Position</th><th>Connector</th><th>Housing PN</th><th>Harness</th><th>Location</th><th></th></tr></thead><tbody>${components.map(c=>`<tr><td>${String(c['#']).padStart(2,'0')}</td><td>${esc(c.Position)}</td><td><b>${esc(c.Connector)}</b></td><td>${esc(c['Tesla connector PN'])}</td><td>${esc(c.Harness)} · ${esc(c['Harness name'])}</td><td>${esc(c.Location)}</td><td><button data-pick="${c.ID}">Inspect</button></td></tr>`).join('')}</tbody></table>`;$$('[data-pick]').forEach(b=>b.addEventListener('click',()=>{selectComponent(b.dataset.pick);inspectTab='wiring';renderInspector();}));}
function renderEvidence(){const info=$('#infoView');const cards=[['Target coverage',PATHS.coverage,'15 target endpoints: topology, connector, faceview, location and route evidence.'],['Sourcing / staged plan',PATHS.sourcing,'Core Music 9 → Full 15 costs, hardware families and supplier context.'],['Package manifest',PATHS.manifest,'Package inventory and hash evidence.'],['Provenance',PATHS.provenance,'Package basis, vehicle context and source lineage.'],['QA report',PATHS.qa,'Validated package QA record.'],['BOM v2.2',PATHS.bom,'Current workbook for structured bill-of-materials analysis.']];info.innerHTML=`<h2>Technical sources</h2><p>Evidence is still here. It simply no longer impersonates the user interface.</p><div class="evidence-grid">${cards.map(c=>`<a class="evidence-card" href="${gh(c[1])}" target="_blank" rel="noreferrer"><strong>${c[0]}</strong><span>${c[2]}</span></a>`).join('')}<a class="evidence-card" href="https://github.com/dutchdevil-83/tesla-model3-sop9-audio-epc/tree/main/Source_Assets" target="_blank" rel="noreferrer"><strong>All captured source assets</strong><span>Browse the repository source-asset tree, including Tesla Service captures and connector imagery.</span></a><a class="evidence-card" href="catalog.html"><strong>Legacy self-contained catalog</strong><span>Open the previous engineering/procurement renderer when deep historical material is needed.</span></a></div>`;}
function applyTransform(){ $('#pan').style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;}
function zoom(delta){scale=Math.min(2.8,Math.max(.55,scale+delta));applyTransform();}
function resetView(){scale=1;panX=0;panY=0;applyTransform();}
function setupPan(){const v=$('#viewport');v.addEventListener('pointerdown',e=>{if(e.target.closest('.zoom,.schematic-message,.epc-callout,.epc-anchor,.epc-detail,.epc-target,.vehicle-map-source,button,a'))return;dragging=true;dragStart={x:e.clientX-panX,y:e.clientY-panY};v.setPointerCapture(e.pointerId);});v.addEventListener('pointermove',e=>{if(!dragging)return;panX=e.clientX-dragStart.x;panY=e.clientY-dragStart.y;applyTransform();});v.addEventListener('pointerup',()=>dragging=false);v.addEventListener('pointercancel',()=>dragging=false);v.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();zoom(e.deltaY<0?.12:-.12);},{passive:false});}
function wireEvents(){$$('[data-view]').forEach(b=>b.addEventListener('click',e=>{if(b.tagName==='A')return;setView(b.dataset.view);}));$$('.inspect-tab').forEach(b=>b.addEventListener('click',()=>{inspectTab=b.dataset.inspect;renderInspector();}));$('#search').addEventListener('input',renderDock);$('#openSource').addEventListener('click',()=>window.open(raw($('#openSource').dataset.path||PATHS.lhd),'_blank'));$('#fit').addEventListener('click',resetView);$('#zoomOut').addEventListener('click',()=>zoom(-.15));$('#zoomIn').addEventListener('click',()=>zoom(.15));$('#zMinus').addEventListener('click',()=>zoom(-.15));$('#zPlus').addEventListener('click',()=>zoom(.15));$('#zReset').addEventListener('click',resetView);setupPan();}
async function init(){setupStages();wireEvents();setSource(PATHS.lhd,'Tesla Service audio source + upgrade navigator');try{const r=await fetch(raw(PATHS.coverage),{cache:'no-store'});if(!r.ok)throw new Error(`coverage HTTP ${r.status}`);components=await r.json();if(!Array.isArray(components)||components.length!==15)throw new Error('expected 15 target endpoints');selected=components[0];const meta=components.filter(c=>c.Metadata==='VERIFIED').length,faces=components.filter(c=>c.Faceview==='VERIFIED').length,loc=components.filter(c=>!c.Location.includes('GAP')).length;$('#metadataCount').textContent=`${meta}/15`;$('#faceviewCount').textContent=`${faces}/15`;$('#locationCount').textContent=`${loc}/15`;renderStage();selectComponent(selected.ID);}catch(err){console.error(err);$('#inspectTitle').textContent='Coverage data unavailable';$('#inspectSub').textContent='Target_Assets/coverage.json could not be loaded';$('#positionDock').innerHTML='<div class="media-empty">Coverage data failed to load. Open Technical Sources to inspect the repository source directly.</div>';}}
init();

