const RAW = 'https://raw.githubusercontent.com/dutchdevil-83/tesla-model3-sop9-audio-epc/main/';
const GITHUB = 'https://github.com/dutchdevil-83/tesla-model3-sop9-audio-epc/blob/main/';
const EPC_CROSSREF_PATH = 'assets/tesla-parts/audio-speakers/epc-crossref.json';
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 16;
const ZOOM_FACTOR = 1.25;
const PATHS = {
  coverage: 'Target_Assets/coverage.json',
  lhd: 'Target_Assets/core/audio_lhd.svg',
  premium: 'Target_Assets/core/audio_premium_amp.svg',
  sourcing: 'Supplier_Feedback_and_Sourcing_2026-09-10_v2.1.md',
  manifest: 'Tesla_SOP9_Audio_EPC_Package_v2.1.0_manifest.json',
  provenance: 'PROVENANCE.json',
  qa: 'Tesla_SOP9_Audio_EPC_v2.1.0_QA.md',
  bom: 'Tesla_Model_3_Highland_SOP9_Audio_BOM_v2.2.0.xlsx'
};

const core9 = new Set(['SPK01', 'SPK02', 'SPK03', 'SPK04', 'SPK05', 'SPK06', 'SPK07', 'SPK10', 'SPK11']);
const stages = [
  { id: 'oem', name: 'OEM baseline', cost: '€0', count: 0, includes: new Set(), desc: 'Reference the existing vehicle endpoints without assigning upgrade hardware.' },
  { id: 'core9', name: 'Core Music 9', cost: '€2,816', count: 9, includes: core9, desc: 'Music-first 9-position speaker stage with V EIGHTEEN retained and DIRECTOR deferred.' },
  { id: 'core9director', name: 'Core Music 9 + DIRECTOR', cost: '€3,065', count: 9, includes: core9, desc: 'K200 Highland 7 physical front/center positions + rear-door M100 pair, V EIGHTEEN, DIRECTOR and PP-TES donor/interposer.' },
  { id: 'full15', name: 'Full 15', cost: '€3,382.98', count: 15, includes: null, desc: 'All 15 cabin speaker positions, V EIGHTEEN and harness plan with DIRECTOR deferred.' },
  { id: 'full15director', name: 'Full 15 + DIRECTOR', cost: '€3,631.98', count: 15, includes: null, desc: 'Complete staged end-state: all 15 cabin positions plus V EIGHTEEN, DIRECTOR and PP-TES planning basis.' }
];

const planHardware = {
  SPK01: 'HELIX Ci3 K200.2TES4 Highland front + center package', SPK02: 'HELIX Ci3 K200.2TES4 Highland front + center package', SPK03: 'HELIX Ci3 K200.2TES4 Highland front + center package', SPK04: 'HELIX Ci3 K200.2TES4 Highland front + center package', SPK05: 'HELIX Ci3 K200.2TES4 Highland front + center package', SPK06: 'HELIX Ci3 K200.2TES4 Highland front + center package', SPK07: 'HELIX Ci3 K200.2TES4 Highland front + center package',
  SPK08: 'HELIX Ci5 M80FM-S3 pair', SPK09: 'HELIX Ci5 M80FM-S3 pair', SPK10: 'HELIX Ci3 M100FM-S3 pair', SPK11: 'HELIX Ci3 M100FM-S3 pair', SPK12: 'HELIX Ci3 M100FM-S3 second pair', SPK13: 'HELIX Ci3 M100FM-S3 second pair', SPK14: 'HELIX Ci5 M50FM-S3 pair', SPK15: 'HELIX Ci5 M50FM-S3 pair'
};

const zoneOrder = ['Front doors', 'Instrument panel', 'Rear doors', 'Parcel shelf', 'Headliner'];
const zoneFor = component => component.ID === 'SPK01' || component.ID === 'SPK02' || component.ID === 'SPK03' || component.ID === 'SPK04' || component.ID === 'SPK08' || component.ID === 'SPK09'
  ? 'Front doors'
  : component.ID === 'SPK05' || component.ID === 'SPK06' || component.ID === 'SPK07'
    ? 'Instrument panel'
    : component.ID === 'SPK10' || component.ID === 'SPK11'
      ? 'Rear doors'
      : component.ID === 'SPK12' || component.ID === 'SPK13' ? 'Parcel shelf' : 'Headliner';

let components = [];
let selected = null;
let view = 'system';
let inspectTab = 'component';
let stage = stages[2];
let scale = 1;
let panX = 0;
let panY = 0;
let dragging = false;
let dragStart = null;
let zoomMode = '100%';
let epcCrossref = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const raw = path => RAW + path;
const gh = path => GITHUB + path;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}

function humanizeToken(value, fallback = 'UNKNOWN') {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  return text.replace(/[-_]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function stateFromEvidence(value) {
  const rawValue = String(value ?? '').trim();
  if (!rawValue) return { label: 'UNKNOWN', tone: 'unknown', detail: 'No evidence recorded.' };
  if (/GAP|HTTP\s*403|UNAVAILABLE|NOT AVAILABLE/i.test(rawValue)) return { label: 'SOURCE GAP', tone: 'gap', detail: rawValue };
  if (/^VERIFIED$/i.test(rawValue)) return { label: 'VERIFIED', tone: 'verified', detail: 'Source evidence is recorded.' };
  if (/VERIFIED/i.test(rawValue)) return { label: 'VERIFIED', tone: 'verified', detail: rawValue };
  return { label: humanizeToken(rawValue), tone: 'neutral', detail: rawValue };
}

function stageIncludes(component) {
  if (stage.id === 'oem') return false;
  if (stage.includes === null) return true;
  return stage.includes.has(component.ID);
}

function stageLabel(component) {
  if (stage.id === 'oem') return component.Topology.includes('PAUDIO-only') ? 'NOT IN AUDIO UPGRADE BASELINE' : 'OEM ENDPOINT';
  return stageIncludes(component) ? 'IN CURRENT STAGE' : 'DEFERRED TO FULL 15';
}

function locationPath(component) {
  return `Target_Assets/connectors/${component.Connector}/location.jpg`;
}

function metadataPath(component) {
  return `Target_Assets/connectors/${component.Connector}/metadata.json`;
}

function faceviewPath(component) {
  return `Target_Assets/${component['Faceview file']}`;
}

function projectMappingFor(targetId) {
  if (!epcCrossref) return { label: 'PENDING', tone: 'unknown', annotations: [], detail: 'EPC cross-reference is still loading.' };
  const annotations = Object.entries(epcCrossref.annotationMappings || {})
    .filter(([, mapping]) => (mapping.targets || []).includes(targetId))
    .map(([annotation]) => annotation);
  if (!annotations.length) return { label: 'NOT MAPPED', tone: 'gap', annotations, detail: 'No Tesla EPC annotation is mapped to this project target.' };
  return { label: 'VERIFIED', tone: 'verified', annotations, detail: `Mapped from Tesla EPC ${annotations.join(', Tesla EPC ')}` };
}

function documentationReadiness(component) {
  const metadata = stateFromEvidence(component.Metadata);
  const connector = component.Connector && component.Faceview === 'VERIFIED'
    ? { label: 'VERIFIED', tone: 'verified', detail: `${component.Connector} connector identity and faceview are recorded.` }
    : { label: 'SOURCE GAP', tone: 'gap', detail: 'Connector identity or faceview evidence is incomplete.' };
  const physical = stateFromEvidence(component.Location);
  const route = component['Cavities / route']
    ? { label: 'CAPTURED', tone: 'verified', detail: 'Cavities / route is recorded in the target coverage.' }
    : { label: 'UNKNOWN', tone: 'unknown', detail: 'No cavities / route evidence is recorded.' };
  const mapping = projectMappingFor(component.ID);
  const dimensions = [
    { key: 'metadata', label: 'Metadata evidence', state: metadata },
    { key: 'connector', label: 'Connector / faceview evidence', state: connector },
    { key: 'physical', label: 'Physical-location evidence', state: physical },
    { key: 'route', label: 'Wiring / route evidence', state: route },
    { key: 'mapping', label: 'Project mapping', state: mapping }
  ];
  const gaps = dimensions.filter(({ state }) => state.tone === 'gap' || state.tone === 'unknown');
  const readiness = gaps.length
    ? { label: 'PARTIAL', tone: 'partial', detail: gaps.map(({ state }) => state.detail).join(' ') }
    : { label: 'READY', tone: 'verified', detail: 'All currently modeled evidence dimensions are present.' };
  return { dimensions, readiness, stage: { label: stageLabel(component), tone: stageIncludes(component) ? 'verified' : 'deferred', detail: `Selected upgrade stage: ${stage.name}.` } };
}

function renderStateRow(item) {
  return `<div class="state-row"><span>${esc(item.label)}</span><b class="state-${esc(item.state.tone)}">${esc(item.state.label)}</b><small>${esc(item.state.detail)}</small></div>`;
}

function renderReadinessSummary() {
  const ready = components.filter(component => documentationReadiness(component).readiness.label === 'READY').length;
  const partial = components.length - ready;
  const target = $('#readinessSummary');
  if (target) target.textContent = `${ready} ready · ${partial} partial · stage inclusion tracked separately`;
}

function setupStages() {
  const select = $('#stage');
  select.innerHTML = stages.map(item => `<option value="${item.id}"${item.id === stage.id ? ' selected' : ''}>${item.name}</option>`).join('');
  select.addEventListener('change', () => {
    stage = stages.find(item => item.id === select.value) || stages[2];
    renderStage();
  });
}

function renderStage() {
  $('#activeCount').textContent = stage.count;
  $('#stageCost').textContent = stage.cost;
  $('#workspaceStage').textContent = stage.name;
  $('#railStage').textContent = stage.name;
  $('#railSummary').textContent = `${stage.count} cabin positions · ${stage.cost} known hardware basis`;
  $('#planTitle').textContent = stage.name;
  $('#planDescription').textContent = stage.desc;
  renderDock();
  renderInspector();
  renderReadinessSummary();
}

function renderDock() {
  const query = $('#search').value.trim().toLowerCase();
  const host = $('#positionDock');
  host.innerHTML = '';
  zoneOrder.forEach(zone => {
    const matches = components.filter(component => zoneFor(component) === zone);
    if (!matches.length) return;
    const row = document.createElement('div');
    row.className = 'zone-row';
    const chips = matches.map(component => {
      const hit = !query || `${component.ID} ${component.Position} ${component.Connector} ${component.Device}`.toLowerCase().includes(query);
      const classes = [stageIncludes(component) ? 'included' : 'deferred', selected && selected.ID === component.ID ? 'selected' : '', hit ? '' : 'search-hidden'].filter(Boolean).join(' ');
      return `<button class="position-chip ${classes}" data-id="${esc(component.ID)}" title="${esc(component.Topology)}" aria-label="Project target ${esc(component.ID)}, ${esc(component.Position)}, connector ${esc(component.Connector)}"><span class="chip-id">${esc(component.ID)}</span><span>${esc(component.Position)}</span><b>${esc(component.Connector)}</b></button>`;
    }).join('');
    row.innerHTML = `<div class="zone-name">${zone}</div><div class="zone-chips">${chips}</div>`;
    host.appendChild(row);
  });
  $$('.position-chip').forEach(button => button.addEventListener('click', () => window.selectComponent(button.dataset.id)));
}

function selectComponent(id) {
  selected = components.find(component => component.ID === id) || components[0];
  if (!selected) return;
  renderDock();
  renderInspector();
  $('#selectedBadge').textContent = selected.ID;
  $('#selectedMessage').textContent = selected.Position;
}

function renderInspector() {
  if (!selected) return;
  const evidence = documentationReadiness(selected);
  $('#inspectNum').textContent = selected.ID;
  $('#inspectTitle').textContent = selected.Position;
  $('#inspectSub').textContent = `Project target · ${selected.Connector} · ${selected.Device}`;
  $('#inspectStage').textContent = evidence.stage.label;
  $$('.inspect-tab').forEach(button => button.classList.toggle('active', button.dataset.inspect === inspectTab));
  const body = $('#inspectBody');
  const physical = evidence.dimensions.find(item => item.key === 'physical').state;
  const locationOk = physical.tone === 'verified';

  if (inspectTab === 'component') {
    body.innerHTML = `
      <section class="inspector-section"><h3>Project target identity</h3>
        <div class="kv"><span>Project target</span><b class="target-id">${esc(selected.ID)}</b></div>
        <div class="kv"><span>Position</span><b>${esc(selected.Position)}</b></div>
        <div class="kv"><span>Physical zone</span><b>${esc(zoneFor(selected))}</b></div>
        <div class="kv"><span>Topology</span><b>${esc(selected.Topology)}</b></div>
        <div class="kv"><span>Tesla connector PN</span><b>${esc(selected['Tesla connector PN'])}</b></div>
        <div class="kv"><span>Harness</span><b>${esc(selected.Harness)} · ${esc(selected['Harness name'])}</b></div>
      </section>
      <section class="evidence-panel"><h3>Evidence dimensions</h3>${evidence.dimensions.map(renderStateRow).join('')}
        <div class="readiness-card state-${esc(evidence.readiness.tone)}"><div><span>Documentation readiness</span><strong>${esc(evidence.readiness.label)}</strong></div><small>${esc(evidence.readiness.detail)}</small></div>
      </section>
      <div class="media-title"><span>Physical location evidence</span>${locationOk ? `<a href="${raw(locationPath(selected))}" target="_blank" rel="noreferrer">OPEN</a>` : ''}</div>
      <div class="media-card">${locationOk ? `<img src="${raw(locationPath(selected))}" alt="${esc(selected.ID)} ${esc(selected.Connector)} physical location">` : `<div class="media-empty">No retrievable location image is recorded.<br>Source state: ${esc(selected.Location)}</div>`}</div>`;
  } else if (inspectTab === 'wiring') {
    const ampPins = selected['Premium Amp pins'] ? stateFromEvidence(selected['Premium Amp pins']) : { label: 'NOT MAPPED', tone: 'unknown', detail: 'No Premium Amp pin mapping is recorded for this target.' };
    body.innerHTML = `
      <section class="inspector-section"><h3>Connector evidence</h3>
        <div class="kv"><span>Project target</span><b class="target-id">${esc(selected.ID)}</b></div>
        <div class="kv"><span>Connector</span><b>${esc(selected.Connector)}</b></div>
        <div class="kv"><span>Faceview</span><b class="state-${esc(stateFromEvidence(selected.Faceview).tone)}">${esc(stateFromEvidence(selected.Faceview).label)}</b></div>
        <div class="kv"><span>Premium amp pins</span><b class="state-${esc(ampPins.tone)}">${esc(ampPins.label)}</b></div>
      </section>
      <div class="media-title"><span>Connector faceview</span><a href="${raw(faceviewPath(selected))}" target="_blank" rel="noreferrer">OPEN</a></div><div class="media-card"><img src="${raw(faceviewPath(selected))}" alt="${esc(selected.Connector)} connector faceview"></div>
      <div class="media-title"><span>Cavities / route · captured source text</span></div><div class="route">${esc(selected['Cavities / route'] || 'UNKNOWN')}</div>
      <div class="action-row"><button type="button" data-action="metadata">Open metadata</button><button type="button" data-action="lhd">Show LHD source</button></div>`;
    body.querySelector('[data-action="metadata"]')?.addEventListener('click', () => window.open(raw(metadataPath(selected)), '_blank', 'noopener,noreferrer'));
    body.querySelector('[data-action="lhd"]')?.addEventListener('click', () => setView('lhd'));
  } else {
    const mapping = evidence.dimensions.find(item => item.key === 'mapping').state;
    body.innerHTML = `
      <section class="inspector-section"><h3>Stage and readiness are independent</h3>
        <div class="state-row"><span>Current upgrade stage</span><b class="state-${esc(evidence.stage.tone)}">${esc(evidence.stage.label)}</b><small>${esc(evidence.stage.detail)}</small></div>
        <div class="state-row"><span>Documentation readiness</span><b class="state-${esc(evidence.readiness.tone)}">${esc(evidence.readiness.label)}</b><small>${esc(evidence.readiness.detail)}</small></div>
        <div class="state-row"><span>Project mapping</span><b class="state-${esc(mapping.tone)}">${esc(mapping.label)}</b><small>${esc(mapping.detail)}</small></div>
      </section>
      <div class="hardware"><strong>${esc(planHardware[selected.ID] || 'Hardware mapping pending')}</strong><span>${selected.ID === 'SPK08' || selected.ID === 'SPK09' || selected.ID === 'SPK12' || selected.ID === 'SPK13' || selected.ID === 'SPK14' || selected.ID === 'SPK15' ? 'Effect / immersion hardware in the staged Full 15 expansion.' : 'Core Music 9 hardware mapping from the staged sourcing plan.'}</span></div>
      <div class="kv"><span>System hardware basis</span><b>${esc(stage.cost)}</b></div>
      <div class="action-row"><button type="button" data-action="sourcing">Sourcing evidence</button><button type="button" data-action="bom">BOM workbook</button></div>`;
    body.querySelector('[data-action="sourcing"]')?.addEventListener('click', () => window.open(gh(PATHS.sourcing), '_blank', 'noopener,noreferrer'));
    body.querySelector('[data-action="bom"]')?.addEventListener('click', () => window.open(gh(PATHS.bom), '_blank', 'noopener,noreferrer'));
  }
}

function setView(next) {
  view = next;
  $$('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const info = $('#infoView');
  const workspace = $('#workspaceView');
  if (view === 'system' || view === 'lhd' || view === 'premium') {
    info.classList.add('hidden');
    workspace.classList.remove('hidden');
    setSource(view === 'premium' ? PATHS.premium : PATHS.lhd, view === 'premium' ? 'Tesla Service · Premium amplifier schematic' : view === 'lhd' ? 'Tesla Service · Audio LHD schematic' : 'Tesla Service audio source + upgrade navigator');
    return;
  }
  workspace.classList.add('hidden');
  info.classList.remove('hidden');
  if (view === 'connectors') renderConnectors();
  else renderEvidence();
}

function renderConnectors() {
  const info = $('#infoView');
  info.innerHTML = `<h2>Connector evidence</h2><p>All 15 unique project target IDs remain one click away from the evidence table. Select a row to open its connector and route evidence in the inspector.</p><table class="connector-table"><thead><tr><th>Project target</th><th>Position</th><th>Connector</th><th>Housing PN</th><th>Harness</th><th>Location evidence</th><th></th></tr></thead><tbody>${components.map(component => `<tr><td><b class="target-id">${esc(component.ID)}</b></td><td>${esc(component.Position)}</td><td><b>${esc(component.Connector)}</b></td><td>${esc(component['Tesla connector PN'])}</td><td>${esc(component.Harness)} · ${esc(component['Harness name'])}</td><td>${esc(component.Location)}</td><td><button type="button" data-pick="${esc(component.ID)}">Inspect</button></td></tr>`).join('')}</tbody></table>`;
  info.querySelectorAll('[data-pick]').forEach(button => button.addEventListener('click', () => {
    window.selectComponent(button.dataset.pick);
    inspectTab = 'wiring';
    renderInspector();
  }));
}

function renderEvidence() {
  const info = $('#infoView');
  const cards = [
    ['Target coverage', PATHS.coverage, '15 project target endpoints: topology, connector, faceview, location and route evidence.'],
    ['EPC cross-reference', EPC_CROSSREF_PATH, 'Original Tesla EPC annotations, repeated occurrences, captured parts and project-target mappings.'],
    ['Sourcing / staged plan', PATHS.sourcing, 'Core Music 9 → Full 15 costs, hardware families and supplier context.'],
    ['Package manifest', PATHS.manifest, 'Package inventory and hash evidence.'],
    ['Provenance', PATHS.provenance, 'Package basis, vehicle context and source lineage.'],
    ['QA report', PATHS.qa, 'Validated package QA record.'],
    ['BOM v2.2', PATHS.bom, 'Current workbook for structured bill-of-materials analysis.']
  ];
  info.innerHTML = `<h2>Technical sources</h2><p>Source evidence remains directly available. The workspace labels EPC identifiers, project targets, evidence gaps and upgrade-stage status separately.</p><div class="evidence-grid">${cards.map(card => `<a class="evidence-card" href="${card[1] === EPC_CROSSREF_PATH ? card[1] : gh(card[1])}" target="_blank" rel="noreferrer"><strong>${card[0]}</strong><span>${card[2]}</span></a>`).join('')}<a class="evidence-card" href="https://github.com/dutchdevil-83/tesla-model3-sop9-audio-epc/tree/main/Source_Assets" target="_blank" rel="noreferrer"><strong>All captured source assets</strong><span>Browse the repository source-asset tree, including Tesla Service captures and connector imagery.</span></a><a class="evidence-card" href="catalog.html"><strong>Legacy self-contained catalog</strong><span>Open the previous engineering/procurement renderer when deep historical material is needed.</span></a></div>`;
}

function visibleCanvasElement() {
  if (document.body.classList.contains('map-mode')) return $('#vehicleMap') || $('#schematic');
  return $('#schematic');
}

function unitContentSize() {
  const element = visibleCanvasElement();
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const currentScale = Math.max(scale, MIN_ZOOM);
  if (!rect.width || !rect.height) return null;
  return { width: rect.width / currentScale, height: rect.height / currentScale };
}

function applyTransform() {
  $('#pan').style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  const readout = `${Math.round(scale * 100)}%`;
  const label = zoomMode === 'fit' ? `FIT · ${readout}` : zoomMode === 'fit-width' ? `FIT WIDTH · ${readout}` : readout;
  ['#zoomLevel', '#zLevel'].forEach(selector => { const output = $(selector); if (output) output.textContent = label; });
}

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function setZoom(value, anchor) {
  const next = clampZoom(value);
  const viewportRect = $('#viewport').getBoundingClientRect();
  const anchorX = anchor ? anchor.clientX - viewportRect.left - viewportRect.width / 2 : 0;
  const anchorY = anchor ? anchor.clientY - viewportRect.top - viewportRect.height / 2 : 0;
  const factor = next / scale;
  panX += (1 - factor) * (anchorX - panX);
  panY += (1 - factor) * (anchorY - panY);
  scale = next;
  zoomMode = 'custom';
  applyTransform();
}

function zoom(direction, anchor) {
  setZoom(scale * (direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR), anchor);
}

function fitView() {
  scale = 1;
  panX = 0;
  panY = 0;
  applyTransform();
  const content = unitContentSize();
  const viewport = $('#viewport');
  if (!content || !viewport) return;
  const availableWidth = Math.max(1, viewport.clientWidth - 48);
  const availableHeight = Math.max(1, viewport.clientHeight - 48);
  scale = clampZoom(Math.min(availableWidth / content.width, availableHeight / content.height));
  zoomMode = 'fit';
  applyTransform();
}

function fitWidth() {
  scale = 1;
  panX = 0;
  panY = 0;
  applyTransform();
  const content = unitContentSize();
  const viewport = $('#viewport');
  if (!content || !viewport) return;
  scale = clampZoom((viewport.clientWidth - 32) / content.width);
  zoomMode = 'fit-width';
  applyTransform();
}

function zoomTo100() {
  scale = 1;
  panX = 0;
  panY = 0;
  zoomMode = '100%';
  applyTransform();
}

function resetView() {
  fitView();
}

function setSource(path, title) {
  const image = $('#schematic');
  image.src = raw(path);
  $('#workspaceTitle').textContent = title;
  $('#openSource').dataset.path = path;
  resetView();
}

function setupPan() {
  const viewport = $('#viewport');
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('.zoom, .schematic-message, .epc-callout, .epc-anchor, .epc-detail, .epc-target, .vehicle-map-source, button, a')) return;
    dragging = true;
    dragStart = { x: event.clientX - panX, y: event.clientY - panY };
    viewport.classList.add('is-panning');
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', event => {
    if (!dragging) return;
    panX = event.clientX - dragStart.x;
    panY = event.clientY - dragStart.y;
    zoomMode = 'custom';
    applyTransform();
  });
  const stopDragging = event => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-panning');
    if (event.pointerId !== undefined && viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  };
  viewport.addEventListener('pointerup', stopDragging);
  viewport.addEventListener('pointercancel', stopDragging);
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    setZoom(scale * Math.min(1.35, Math.max(0.74, factor)), event);
  }, { passive: false });
}

function wireEvents() {
  $$('[data-view]').forEach(button => button.addEventListener('click', () => {
    if (button.tagName !== 'A') setView(button.dataset.view);
  }));
  $$('.inspect-tab').forEach(button => button.addEventListener('click', () => {
    inspectTab = button.dataset.inspect;
    renderInspector();
  }));
  $('#search').addEventListener('input', renderDock);
  $('#openSource').addEventListener('click', () => window.open(raw($('#openSource').dataset.path || PATHS.lhd), '_blank', 'noopener,noreferrer'));
  $('#fit').addEventListener('click', fitView);
  $('#fitWidth').addEventListener('click', fitWidth);
  $('#zoom100').addEventListener('click', zoomTo100);
  $('#resetView').addEventListener('click', resetView);
  $('#zoomOut').addEventListener('click', () => zoom(-1));
  $('#zoomIn').addEventListener('click', () => zoom(1));
  $('#zMinus').addEventListener('click', () => zoom(-1));
  $('#zPlus').addEventListener('click', () => zoom(1));
  $('#z100').addEventListener('click', zoomTo100);
  $('#zFit').addEventListener('click', fitView);
  $('#schematic').addEventListener('load', () => {
    if (!document.body.classList.contains('map-mode')) fitView();
  });
  setupPan();
}

function loadEpcCrossref() {
  if (!window.__epcCrossrefPromise) {
    window.__epcCrossrefPromise = fetch(EPC_CROSSREF_PATH, { cache: 'no-store' }).then(response => {
      if (!response.ok) throw new Error(`EPC cross-reference HTTP ${response.status}`);
      return response.json();
    });
  }
  return window.__epcCrossrefPromise;
}

async function init() {
  setupStages();
  wireEvents();
  setSource(PATHS.lhd, 'Tesla Service audio source + upgrade navigator');
  loadEpcCrossref().then(data => {
    epcCrossref = data;
    renderStage();
  }).catch(error => console.error(error));
  try {
    const response = await fetch(raw(PATHS.coverage), { cache: 'no-store' });
    if (!response.ok) throw new Error(`coverage HTTP ${response.status}`);
    components = await response.json();
    if (!Array.isArray(components) || components.length !== 15) throw new Error('expected 15 target endpoints');
    selected = components[0];
    const metadata = components.filter(component => component.Metadata === 'VERIFIED').length;
    const faceviews = components.filter(component => component.Faceview === 'VERIFIED').length;
    const locations = components.filter(component => !/GAP/i.test(component.Location)).length;
    $('#metadataCount').textContent = `${metadata}/15`;
    $('#faceviewCount').textContent = `${faceviews}/15`;
    $('#locationCount').textContent = `${locations}/15`;
    renderStage();
    selectComponent(selected.ID);
  } catch (error) {
    console.error(error);
    $('#inspectTitle').textContent = 'Coverage data unavailable';
    $('#inspectSub').textContent = 'Target_Assets/coverage.json could not be loaded';
    $('#positionDock').innerHTML = '<div class="media-empty">Coverage data failed to load. Open Technical Sources to inspect the repository source directly.</div>';
  }
}

init();
