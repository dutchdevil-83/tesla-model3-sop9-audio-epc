/* Current-build overlay for the verified Tesla engineering workspace.
 * Keeps Tesla source evidence separate from owner/installer build decisions.
 */
let installedSystem = null;

const CURRENT_BUILD_TARGETS = new Set(['SPK01', 'SPK02', 'SPK03', 'SPK04', 'SPK05', 'SPK06', 'SPK07', 'SPK10', 'SPK11']);

function currentBuildTarget(targetId) {
  return installedSystem?.targets?.[targetId] || null;
}

function installedProduct(target) {
  if (!target?.productRef) return null;
  return installedSystem?.products?.[target.productRef] || null;
}

function rawEngineeringValue(value, fallback = 'NOT MAPPED') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function externalLinks(references = []) {
  if (!references.length) return '<div class="reference-empty">No official product reference is assigned.</div>';
  return `<div class="reference-links">${references.map(reference => `<a href="${esc(reference.url)}" target="_blank" rel="noreferrer"><strong>${esc(reference.label)}</strong><span>${esc(reference.url)}</span></a>`).join('')}</div>`;
}

function targetServiceReferences(target) {
  return (target?.serviceRefs || []).map(key => installedSystem?.teslaService?.[key]).filter(Boolean);
}

function renderServiceReferences(target) {
  const refs = targetServiceReferences(target);
  if (!refs.length) return '<div class="reference-empty">No target-specific Tesla Service procedure is assigned.</div>';
  return `<div class="service-list">${refs.map(reference => `
    <article class="service-item">
      <div><strong>${esc(reference.label)}</strong><span>${esc(reference.summary)}</span></div>
      <a href="${esc(reference.url)}" target="_blank" rel="noreferrer">Open official Tesla procedure</a>
    </article>`).join('')}</div>`;
}

function buildStatusTone(status = '') {
  if (/FITMENT CHECK|TBD|NOT IN|FUTURE|NONE/i.test(status)) return 'partial';
  if (/OEM STOCK/i.test(status)) return 'neutral';
  if (/PURCHASED|ORDERED/i.test(status)) return 'verified';
  return 'unknown';
}

function mappingState(targetId) {
  if (!epcCrossref) return { label: 'PENDING', tone: 'unknown', annotations: [], confidence: [], detail: 'EPC cross-reference is still loading.' };
  const matches = Object.entries(epcCrossref.annotationMappings || {})
    .filter(([, mapping]) => (mapping.targets || []).includes(targetId))
    .map(([annotation, mapping]) => ({ annotation, confidence: String(mapping.confidence || 'unknown'), note: String(mapping.note || '') }));
  if (!matches.length) return { label: 'NOT MAPPED', tone: 'gap', annotations: [], confidence: [], detail: 'No Tesla EPC annotation is mapped to this project target.' };
  const confidence = [...new Set(matches.map(item => item.confidence))];
  const details = matches.map(item => `Tesla EPC ${item.annotation}: ${humanizeToken(item.confidence)}${item.note ? ` - ${item.note}` : ''}`);
  return {
    label: 'MAPPED - CONFIDENCE RECORDED',
    tone: 'partial',
    annotations: matches.map(item => item.annotation),
    confidence,
    detail: details.join(' ')
  };
}

projectMappingFor = function projectMappingForCurrentBuild(targetId) {
  return mappingState(targetId);
};

documentationReadiness = function documentationReadinessCurrentBuild(component) {
  const metadata = stateFromEvidence(component.Metadata);
  const connector = component.Connector && component.Faceview === 'VERIFIED'
    ? { label: 'VERIFIED', tone: 'verified', detail: `${component.Connector} connector identity and faceview are recorded.` }
    : { label: 'SOURCE GAP', tone: 'gap', detail: 'Connector identity or faceview evidence is incomplete.' };
  const physical = stateFromEvidence(component.Location);
  const route = component['Cavities / route']
    ? { label: 'CAPTURED', tone: 'verified', detail: 'Cavities / route is recorded in the target coverage.' }
    : { label: 'UNKNOWN', tone: 'unknown', detail: 'No cavities / route evidence is recorded.' };
  const mapping = mappingState(component.ID);
  const dimensions = [
    { key: 'metadata', label: 'Metadata evidence', state: metadata },
    { key: 'connector', label: 'Connector / faceview evidence', state: connector },
    { key: 'physical', label: 'Physical-location evidence', state: physical },
    { key: 'route', label: 'Wiring / route evidence', state: route },
    { key: 'mapping', label: 'Tesla EPC cross-reference', state: mapping }
  ];
  const unresolved = dimensions.filter(({ state }) => ['gap', 'unknown', 'partial'].includes(state.tone));
  const readiness = unresolved.length
    ? { label: 'PARTIAL', tone: 'partial', detail: unresolved.map(({ state }) => state.detail).join(' ') }
    : { label: 'READY', tone: 'verified', detail: 'All modeled evidence dimensions are verified.' };
  const buildTarget = currentBuildTarget(component.ID);
  const stageState = stage.id === 'current' ? (buildTarget?.status || 'NOT CONFIRMED') : 'REFERENCE / FUTURE VIEW';
  return {
    dimensions,
    readiness,
    stage: { label: stageState, tone: buildStatusTone(stageState), detail: `Selected plan: ${stage.name}. Tesla evidence readiness is tracked separately.` }
  };
};

stageIncludes = function stageIncludesCurrentBuild(component) {
  if (stage.id === 'current') return CURRENT_BUILD_TARGETS.has(component.ID);
  return true;
};

stageLabel = function stageLabelCurrentBuild(component) {
  const target = currentBuildTarget(component.ID);
  if (stage.id !== 'current') return 'REFERENCE / FUTURE';
  return target?.status || (CURRENT_BUILD_TARGETS.has(component.ID) ? 'CURRENT BUILD' : 'NOT IN CURRENT BUILD');
};

function productCard(target) {
  if (!target) return '<div class="hardware-card state-unknown"><strong>Build mapping pending</strong></div>';
  const product = installedProduct(target);
  const specs = product?.specs?.length ? `<ul>${product.specs.map(spec => `<li>${esc(spec)}</li>`).join('')}</ul>` : '';
  const component = target.component || 'No aftermarket speaker assigned';
  return `<section class="hardware-card state-${esc(buildStatusTone(target.status))}">
    <div class="hardware-card-head"><span>Current build hardware</span><b>${esc(target.status)}</b></div>
    <strong>${esc(component)}</strong>
    <p>${esc(target.role || '')}</p>
    ${target.adapter ? `<div class="kv"><span>Mount / adapter</span><b>${esc(target.adapter)}</b></div>` : ''}
    ${target.quantityBasis ? `<div class="kv"><span>Quantity basis</span><b>${esc(target.quantityBasis)}</b></div>` : ''}
    ${target.note ? `<div class="engineering-note">${esc(target.note)}</div>` : ''}
    ${specs}
    ${product ? externalLinks(product.references) : ''}
  </section>`;
}

function systemHardwareCards() {
  const hardware = installedSystem?.systemHardware || [];
  return hardware.map(item => `<article class="system-hardware-card state-${esc(buildStatusTone(item.status))}">
    <div><span>${esc(item.category)}</span><b>${esc(item.status)}</b></div>
    <strong>${esc(item.manufacturer)} ${esc(item.model)}</strong>
    ${item.warning ? `<div class="fitment-warning"><strong>FITMENT CHECK REQUIRED</strong><span>${esc(item.warning)}</span></div>` : ''}
    ${externalLinks(item.references || [])}
  </article>`).join('');
}

function subwooferCards() {
  const subs = installedSystem?.subwooferSubsystem || [];
  if (!subs.length) return '';
  return `<section class="inspector-section"><h3>Trunk subwoofer subsystem</h3>${subs.map(sub => `<div class="sub-card"><b>${esc(sub.id)} - ${esc(sub.manufacturer)} ${esc(sub.model)}</b><span>${esc(sub.status)}</span><small>${esc(sub.location)} - ${esc(sub.note)}</small></div>`).join('')}<div class="engineering-note warning">Do not use X588/X593 parcel-shelf wiring for these Pioneer subs. Final DSP output and load wiring stays TBD until the exact Pioneer model / impedance / voice-coil configuration is recorded.</div></section>`;
}

const BAUDIO_CURRENT_END_POINTS = {
  SPK01: { id: 'X568', part: '1075207-00-A', label: 'Front left BAUDIO door woofer', route: 'X568 1 (+ YE), 2 (- BU) -> X033B 3/4' },
  SPK02: { id: 'X578', part: '1075207-00-A', label: 'Front right BAUDIO door woofer', route: 'X578 1 (+ YE), 2 (- BU) -> X053B 2/1' },
  SPK03: { id: 'X565', part: '1015004-00-B', label: 'Front left BAUDIO tweeter', route: 'X565 1 (+ VT), 2 (- BU) -> X922F 1/12 -> X033B 1/2 (BAUDIO)' },
  SPK04: { id: 'X575', part: '1015004-00-B', label: 'Front right BAUDIO tweeter', route: 'X575 1 (+ VT), 2 (- BU) -> X923F 1/12 -> X053A 5/6 (BAUDIO)' }
};
const BAUDIO_SOURCE_FACEVIEWS = {
  X568: 'Source_Assets/faceviews/yazaki_7283-6443-40.svg',
  X578: 'Source_Assets/faceviews/yazaki_7283-6443-40.svg',
  X565: 'Source_Assets/faceviews/delphi_13649797.svg',
  X575: 'Source_Assets/faceviews/delphi_13649797.svg'
};

renderInspector = function renderInspectorCurrentBuild() {
  if (!selected) return;
  const evidence = documentationReadiness(selected);
  const target = currentBuildTarget(selected.ID);
  const mapping = projectMappingFor(selected.ID);
  const physical = evidence.dimensions.find(item => item.key === 'physical')?.state || { tone: 'unknown' };
  const baseEndpoint = BAUDIO_CURRENT_END_POINTS[selected.ID] || null;
  const displayConnector = baseEndpoint?.id || selected.Connector;
  const locationOk = Boolean(baseEndpoint) || physical.tone === 'verified';
  const physicalImage = baseEndpoint ? raw('Source_Assets/connectors/' + displayConnector + '/location.jpg') : raw(locationPath(selected));
  const metadataLink = baseEndpoint ? raw('Source_Assets/connectors/' + displayConnector + '/metadata.json') : raw(metadataPath(selected));
  const faceviewLink = baseEndpoint ? raw(BAUDIO_SOURCE_FACEVIEWS[displayConnector]) : raw(faceviewPath(selected));
  const currentRoute = baseEndpoint?.route || rawEngineeringValue(selected['Cavities / route'], 'UNKNOWN');
  const ampPinsRaw = installedSystem?.vehicleAudioOption?.startsWith('BAUDIO')
    ? 'NOT APPLICABLE TO BAUDIO: PAUDIO premium amplifier is not present'
    : rawEngineeringValue(selected['Premium Amp pins']);

  $('#inspectNum').textContent = selected.ID;
  $('#inspectTitle').textContent = selected.Position;
  $('#inspectSub').textContent = `Current BAUDIO target - ${displayConnector} - ${baseEndpoint?.label || selected.Device}`;
  $('#inspectStage').textContent = evidence.stage.label;
  $$('.inspect-tab').forEach(button => button.classList.toggle('active', button.dataset.inspect === inspectTab));
  const body = $('#inspectBody');

  if (inspectTab === 'component') {
    body.innerHTML = `
      ${productCard(target)}
      <section class="inspector-section"><h3>Project target identity</h3>
        <div class="kv"><span>Project target</span><b class="target-id">${esc(selected.ID)}</b></div>
        <div class="kv"><span>Position</span><b>${esc(selected.Position)}</b></div>
        <div class="kv"><span>Physical zone</span><b>${esc(zoneFor(selected))}</b></div>
        <div class="kv"><span>Current BAUDIO endpoint</span><b>${esc(displayConnector)}</b></div>
        <div class="kv"><span>Current connector PN</span><b>${esc(baseEndpoint?.part || selected['Tesla connector PN'])}</b></div>
      </section>
      <section class="evidence-panel"><h3>Evidence dimensions</h3>${evidence.dimensions.map(renderStateRow).join('')}
        <div class="readiness-card state-${esc(evidence.readiness.tone)}"><div><span>Documentation readiness</span><strong>${esc(evidence.readiness.label)}</strong></div><small>${esc(evidence.readiness.detail)}</small></div>
      </section>
      <section class="inspector-section"><h3>Tesla Service procedures</h3>${renderServiceReferences(target)}</section>
      <div class="media-title"><span>Physical location evidence</span>${locationOk ? `<a href="${physicalImage}" target="_blank" rel="noreferrer">OPEN</a>` : ''}</div>
      <div class="media-card">${locationOk ? `<img src="${raw(locationPath(selected))}" alt="${esc(selected.ID)} ${esc(displayConnector)} BAUDIO physical location">` : `<div class="media-empty">No retrievable location image is recorded.<br>Source state: ${esc(selected.Location)}</div>`}</div>`;
  } else if (inspectTab === 'wiring') {
    body.innerHTML = `
      <section class="inspector-section"><h3>Connector / wiring evidence</h3>
        <div class="kv"><span>Project target</span><b class="target-id">${esc(selected.ID)}</b></div>
        <div class="kv"><span>Current connector (BAUDIO)</span><b>${esc(displayConnector)}</b></div>
        <div class="kv"><span>Premium amplifier reference</span><b class="raw-id">${esc(ampPinsRaw)}</b></div>
        <div class="kv"><span>Cavities / route</span><b>${esc(currentRoute)}</b></div>
        <div class="kv"><span>EPC cross-reference</span><b class="state-${esc(mapping.tone)}">${esc(mapping.label)}</b></div>
        <div class="engineering-note">${esc(mapping.detail)}</div>
      </section>
      <section class="inspector-section"><h3>DSP / integration hardware</h3>${systemHardwareCards()}</section>
      ${subwooferCards()}
      <section class="inspector-section"><h3>Service / trim access</h3>${renderServiceReferences(target)}</section>
      <div class="action-row"><button type="button" data-action="faceview">Open connector faceview</button><button type="button" data-action="metadata">Open connector metadata</button></div>`;
    body.querySelector('[data-action="faceview"]')?.addEventListener('click', () => window.open(faceviewLink, '_blank', 'noopener,noreferrer'));
    body.querySelector('[data-action="metadata"]')?.addEventListener('click', () => window.open(metadataLink, '_blank', 'noopener,noreferrer'));
  } else {
    body.innerHTML = `
      ${productCard(target)}
      <section class="inspector-section"><h3>Current build state</h3>
        <div class="state-row"><span>Hardware state</span><b class="state-${esc(buildStatusTone(target?.status))}">${esc(target?.status || 'NOT CONFIRMED')}</b><small>${esc(target?.note || 'Mapped from the current purchased-build register.')}</small></div>
        <div class="state-row"><span>Tesla evidence readiness</span><b class="state-${esc(evidence.readiness.tone)}">${esc(evidence.readiness.label)}</b><small>${esc(evidence.readiness.detail)}</small></div>
        <div class="state-row"><span>EPC mapping</span><b class="state-${esc(mapping.tone)}">${esc(mapping.label)}</b><small>${esc(mapping.detail)}</small></div>
      </section>
      <section class="inspector-section"><h3>System hardware</h3>${systemHardwareCards()}</section>
      ${subwooferCards()}
      <section class="inspector-section"><h3>Official installation references</h3>${renderServiceReferences(target)}</section>`;
  }
};

function applyInstalledBuild() {
  if (!installedSystem) return;
  stages.splice(0, stages.length,
    { id: 'current', name: 'Current build - purchased', cost: 'PURCHASED', count: 9, includes: CURRENT_BUILD_TARGETS, desc: 'HELIX i7/i3 front and center upgrade; Tesla OEM rear doors retained; parcel shelf/headliner upgrade positions not fitted; 2x Pioneer trunk subs tracked separately.' },
    { id: 'future', name: 'Future / Tesla reference map', cost: 'TBD', count: 15, includes: null, desc: 'All 15 Tesla project-reference endpoints remain available for evidence and future planning without pretending currently absent speakers are installed.' }
  );
  stage = stages[0];
  Object.assign(planHardware, Object.fromEntries(Object.entries(installedSystem.targets || {}).map(([id, target]) => [id, target.component || target.status])));
  const select = $('#stage');
  if (select) {
    select.innerHTML = stages.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
    select.value = stage.id;
  }
  renderStage();
  const architecture = [...document.querySelectorAll('.summary-card')].find(card => card.textContent.includes('Architecture'));
  if (architecture) architecture.innerHTML = '<div class="summary-label">Architecture</div><div class="summary-main">HELIX V TWELVE DSP MK2</div><div class="summary-sub">12 amplified channels / 14 DSP channels. DIRECTOR for SCP ordered. Rear doors remain OEM; Pioneer trunk subs are separate from parcel-shelf endpoints.</div>';
  const vehicle = document.querySelector('.vehicle');
  if (vehicle) vehicle.textContent = '2026 Premium LR RWD trim / BAUDIO Base Audio / LHD';
}

fetch('data/installed-system.json', { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error(`installed-system HTTP ${response.status}`);
    return response.json();
  })
  .then(data => {
    installedSystem = data;
    applyInstalledBuild();
  })
  .catch(error => console.error('installed system load failed', error));
