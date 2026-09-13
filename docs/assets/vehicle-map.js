/* Tesla Parts Catalog Audio Speakers map. Original numbered artwork remains the primary visual. */
(() => {
  const CANONICAL_SVG = 'assets/tesla-parts/audio-speakers/audio-speakers.svg';
  const SOURCE_PNG_FALLBACK = 'https://epc.tesla.com/resources/images/Model3/Highland/NL/Audio%20Speakers%20TI-6789_41ee8600-5062-4d1f-acb9-99e40abe74d0.png';
  const CROSSREF = 'assets/tesla-parts/audio-speakers/epc-crossref.json';
  const SVG_SHA = '043e4161ca010de424e97939df669638c458b6ea0287a1e9cc049cd3b5684909';
  const SOURCE_PNG_SHA = '86330aae2440487a7cfa524b4b7adc793c87ee45806644cf69f491148d1faf29';

  const pan = document.querySelector('#pan');
  const schematic = document.querySelector('#schematic');
  const viewport = document.querySelector('#viewport');
  if (!pan || !schematic || !viewport) return;

  let epc = null;
  let activeCalloutId = null;
  let activeAnnotation = null;
  let imageFallbackUsed = false;

  const shell = document.createElement('div');
  shell.id = 'vehicleLayer';
  shell.className = 'vehicle-map-shell';
  shell.innerHTML = `
    <div id="vehicleMap" class="vehicle-map" role="group" aria-label="Tesla Parts Catalog Audio Speakers vehicle illustration">
      <img id="epcVehicleImage" src="${CANONICAL_SVG}" alt="Tesla Parts Catalog Model 3 Highland Audio Speakers illustration with original numbered callouts">
      <div id="epcCallouts" class="epc-callouts" aria-label="Clickable Tesla Parts Catalog callouts"></div>
    </div>`;
  pan.insertBefore(shell, schematic);

  const source = document.createElement('div');
  source.className = 'vehicle-map-source';
  source.innerHTML = `<b>Tesla Parts Catalog · Audio Speakers</b><span>Canonical interactive SVG recovered from the supplied HAR.</span><code>SVG SHA-256 ${SVG_SHA.slice(0, 16)}…</code>`;
  viewport.appendChild(source);

  const detail = document.createElement('section');
  detail.id = 'epcDetail';
  detail.className = 'epc-detail hidden';
  detail.setAttribute('aria-live', 'polite');
  viewport.appendChild(detail);

  const image = shell.querySelector('#epcVehicleImage');
  image.addEventListener('error', () => {
    if (imageFallbackUsed) return;
    imageFallbackUsed = true;
    image.src = SOURCE_PNG_FALLBACK;
    source.classList.add('remote-fallback');
    source.querySelector('span').textContent = 'Canonical local SVG failed to load; using the captured Tesla source PNG fallback.';
    source.querySelector('code').textContent = `PNG SHA-256 ${SOURCE_PNG_SHA.slice(0, 16)}…`;
  });

  const originalSetView = window.setView;
  const originalSelect = window.selectComponent;

  function escHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
  }

  function humanize(value, fallback = 'UNKNOWN') {
    const text = String(value ?? '').trim();
    if (!text) return fallback;
    return text.replace(/[-_]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
  }

  function mapping(annotation) {
    return epc?.annotationMappings?.[String(annotation)] || { targets: [], confidence: 'unmapped', note: 'No project cross-reference yet.' };
  }

  function parts(annotation) {
    return (epc?.parts || []).filter(part => String(part.annotation) === String(annotation));
  }

  function occurrencesFor(annotation) {
    return (epc?.callouts || []).filter(callout => String(callout.annotation) === String(annotation));
  }

  function occurrenceLabel(callout) {
    const occurrences = occurrencesFor(callout.annotation);
    const index = occurrences.findIndex(item => item.id === callout.id) + 1;
    return `occurrence ${index} of ${occurrences.length}`;
  }

  function calloutTitle(callout) {
    const capturedParts = parts(callout.annotation);
    const currentMapping = mapping(callout.annotation);
    const label = capturedParts.length ? capturedParts.map(part => `${part.partNumber} ${part.description}`).join(' / ') : 'Parts Catalog callout';
    const target = currentMapping.targets?.length ? ` → ${currentMapping.targets.join(', ')}` : '';
    return `Tesla EPC ${callout.annotation}, ${occurrenceLabel(callout)}: ${label}${target}`;
  }

  function annotationsForTarget(id) {
    if (!epc) return [];
    return Object.entries(epc.annotationMappings || {})
      .filter(([, currentMapping]) => (currentMapping.targets || []).includes(id))
      .map(([annotation]) => annotation);
  }

  function matchingAnnotations() {
    const query = (document.querySelector('#search')?.value || '').trim().toLowerCase();
    if (!query || !epc) return null;
    const matchedTargets = new Set((components || [])
      .filter(component => `${component.ID} ${component.Position} ${component.Connector} ${component.Device}`.toLowerCase().includes(query))
      .map(component => component.ID));
    const result = new Set();
    for (const [annotation, currentMapping] of Object.entries(epc.annotationMappings || {})) {
      if ((currentMapping.targets || []).some(id => matchedTargets.has(id))) result.add(annotation);
    }
    for (const part of epc.parts || []) {
      if (`${part.annotation} ${part.partNumber} ${part.description}`.toLowerCase().includes(query)) result.add(String(part.annotation));
    }
    return result;
  }

  function renderCallouts() {
    const host = shell.querySelector('#epcCallouts');
    if (!host || !epc) return;
    const searchMatches = matchingAnnotations();
    const selectedAnnotations = selected ? new Set(annotationsForTarget(selected.ID)) : new Set();
    host.innerHTML = (epc.callouts || []).map(callout => {
      const annotation = String(callout.annotation);
      const currentMapping = mapping(annotation);
      const mapped = (currentMapping.targets || []).length > 0;
      const searchDim = searchMatches && searchMatches.size > 0 && !searchMatches.has(annotation);
      const classes = ['epc-callout', mapped ? 'mapped' : 'unmapped', selectedAnnotations.has(annotation) ? 'target-related' : '', activeAnnotation === annotation ? 'group-active' : '', activeCalloutId === callout.id ? 'active' : '', searchDim ? 'search-dim' : ''].filter(Boolean).join(' ');
      return `<button class="${classes}" style="--x:${callout.xPct}%;--y:${callout.yPct}%" data-epc-callout="${callout.id}" data-annotation="${escHtml(annotation)}" aria-label="${escHtml(calloutTitle(callout))}" title="${escHtml(calloutTitle(callout))}"><span class="epc-visible-label" aria-hidden="true">EPC ${escHtml(annotation)}</span><span class="sr-only">${escHtml(occurrenceLabel(callout))}</span></button>`;
    }).join('');
    host.querySelectorAll('[data-epc-callout]').forEach(button => button.addEventListener('click', () => selectCallout(Number(button.dataset.epcCallout), button.dataset.annotation)));
  }

  function targetChip(id) {
    const component = (components || []).find(item => item.ID === id);
    if (!component) return `<span class="epc-target missing"><b>${escHtml(id)}</b><span>NOT MAPPED</span></span>`;
    const readiness = documentationReadiness(component);
    return `<button class="epc-target" data-epc-target="${escHtml(component.ID)}"><b>${escHtml(component.ID)}</b><span>${escHtml(component.Position)}</span><em>${escHtml(component.Connector)}</em><small class="state-${escHtml(readiness.stage.tone)}">${escHtml(readiness.stage.label)}</small></button>`;
  }

  function renderDetail() {
    if (!epc || !activeAnnotation) {
      detail.classList.add('hidden');
      return;
    }
    const annotation = String(activeAnnotation);
    const capturedParts = parts(annotation);
    const currentMapping = mapping(annotation);
    const occurrences = occurrencesFor(annotation).length;
    const targetIds = currentMapping.targets || [];
    const mappingConfidence = currentMapping.confidence || 'UNKNOWN';
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <div class="epc-detail-head"><div><span class="epc-kicker">TESLA EPC IDENTIFIER</span><strong class="epc-identifier">EPC ${escHtml(annotation)}</strong><small>${occurrences} source drawing occurrence${occurrences === 1 ? '' : 's'} · ${escHtml(humanize(mappingConfidence))} (<code>${escHtml(mappingConfidence)}</code>)</small></div><button class="epc-close" type="button" aria-label="Close EPC detail">×</button></div>
      <div class="epc-semantics">This is a Tesla EPC part/family identifier. It may repeat in the source drawing and is not a unique project target ID.</div>
      <div class="epc-count-grid"><div class="epc-count"><span>Source drawing occurrences</span><strong>${occurrences}</strong></div><div class="epc-count"><span>Mapped project targets</span><strong>${targetIds.length}</strong></div></div>
      <div class="epc-count-note">Source callout count, Tesla part quantity and mapped project-target count are separate evidence values.</div>
      <div class="epc-parts"><h3>Tesla part evidence</h3>${capturedParts.length ? capturedParts.map(part => `<div class="epc-part"><div><b>${escHtml(part.description)}</b><span>Part number · ${escHtml(part.partNumber)}</span><span>Tesla quantity · ${escHtml(part.quantity ?? 'UNKNOWN')}</span></div><strong>${part.price != null ? `€${Number(part.price).toFixed(2)}` : 'UNKNOWN'}</strong></div>`).join('') : '<div class="epc-empty">No part row captured for this annotation.</div>'}</div>
      <div class="epc-confidence"><span>Mapping confidence</span><b>${escHtml(humanize(mappingConfidence))}</b><code>${escHtml(mappingConfidence)}</code></div>
      <div class="epc-map-note"><strong>Explanatory mapping note</strong><p>${escHtml(currentMapping.note || 'No explanatory mapping note is recorded.')}</p></div>
      <div class="epc-source-warning">${escHtml(epc.mappingWarning || 'The cross-reference preserves source identifiers separately from project target IDs.')}</div>
      ${targetIds.length ? `<div class="epc-target-title">PROJECT TARGETS · ${targetIds.length} physical position${targetIds.length === 1 ? '' : 's'} · click to open component and wiring evidence</div><div class="epc-targets">${targetIds.map(targetChip).join('')}</div>` : '<div class="epc-no-target"><b>NOT MAPPED</b> to one of the 15 cabin upgrade targets. The source annotation is retained as evidence.</div>'}`;
    detail.querySelector('.epc-close')?.addEventListener('click', () => {
      activeAnnotation = null;
      activeCalloutId = null;
      renderDetail();
      renderCallouts();
    });
    detail.querySelectorAll('[data-epc-target]').forEach(button => button.addEventListener('click', () => window.selectComponent(button.dataset.epcTarget)));
  }

  function selectCallout(id, annotation) {
    activeCalloutId = id;
    activeAnnotation = String(annotation);
    renderCallouts();
    renderDetail();
  }

  window.selectComponent = function selectProjectTarget(id) {
    originalSelect(id);
    const annotations = annotationsForTarget(id);
    if (annotations.length) {
      activeAnnotation = annotations[0];
      activeCalloutId = null;
    } else {
      activeAnnotation = null;
      activeCalloutId = null;
    }
    renderDetail();
    renderCallouts();
  };

  function showVehicleMap() {
    view = 'system';
    document.body.classList.add('map-mode');
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === 'system'));
    document.querySelector('#infoView')?.classList.add('hidden');
    document.querySelector('#workspaceView')?.classList.remove('hidden');
    shell.classList.remove('hidden');
    schematic.classList.add('hidden');
    source.classList.remove('hidden');
    const title = document.querySelector('#workspaceTitle');
    if (title) title.textContent = 'Tesla Parts Catalog · Audio Speakers';
    const pill = document.querySelector('.source-pill');
    if (pill) {
      pill.textContent = 'TESLA PARTS CATALOG';
      pill.title = 'Original Audio Speakers showcase artwork extracted from the supplied HAR';
    }
    const badge = document.querySelector('#selectedBadge');
    if (badge && selected) badge.textContent = selected.ID;
    const message = document.querySelector('#selectedMessage');
    if (message && selected) message.textContent = selected.Position;
    fitView();
    renderCallouts();
    renderDetail();
  }

  window.setView = function setWorkspaceView(next) {
    if (next === 'system') {
      showVehicleMap();
      return;
    }
    document.body.classList.remove('map-mode');
    shell.classList.add('hidden');
    source.classList.add('hidden');
    detail.classList.add('hidden');
    schematic.classList.remove('hidden');
    const pill = document.querySelector('.source-pill');
    if (pill) {
      pill.textContent = 'TESLA SERVICE SOURCE';
      pill.title = 'Captured Tesla Service electrical-reference source';
    }
    originalSetView(next);
  };

  document.querySelector('#search')?.addEventListener('input', renderCallouts);
  document.querySelector('#stage')?.addEventListener('change', () => queueMicrotask(() => {
    renderCallouts();
    renderDetail();
  }));
  const crossrefPromise = window.__epcCrossrefPromise || (window.__epcCrossrefPromise = fetch(CROSSREF, { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error(`EPC cross-reference HTTP ${response.status}`);
    return response.json();
  }));
  crossrefPromise.then(data => {
    epc = data;
    renderCallouts();
    if (selected) {
      const annotations = annotationsForTarget(selected.ID);
      if (annotations.length) {
        activeAnnotation = annotations[0];
        renderDetail();
      }
    }
  }).catch(error => {
    console.error(error);
    source.classList.add('source-error');
    source.querySelector('span').textContent = 'EPC cross-reference failed to load; original artwork remains available.';
  });

  showVehicleMap();
  let attempts = 0;
  const ready = setInterval(() => {
    attempts += 1;
    if (Array.isArray(components) && components.length === 15) {
      clearInterval(ready);
      renderCallouts();
      showVehicleMap();
    } else if (attempts > 200) {
      clearInterval(ready);
    }
  }, 25);
})();
