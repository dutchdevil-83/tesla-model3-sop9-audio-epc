/* PP-TES logical channel overlay.
 * Tesla SOP9 source roles/cavities come from the repository electrical reference.
 * The older M141318 harness routing must be repinned/reworked to those verified functions.
 */
(() => {
  const baseRenderInspector = renderInspector;
  let harnessIntegration = null;

  function integration() {
    return harnessIntegration;
  }

  function channelsForTarget(targetId) {
    const map = integration();
    if (!map) return [];
    return (map.channels || []).filter(channel =>
      channel.directTarget === targetId || (channel.derivedTargets || []).includes(targetId)
    );
  }

  function relationship(channel, targetId) {
    if (channel.directTarget === targetId) {
      return {
        label: 'DIRECT HARNESS CHANNEL',
        detail: `${channel.label} OUT +/- is the labelled return pair for this physical target after DSP amplification.`
      };
    }
    return {
      label: 'DSP-DERIVED OUTPUT',
      detail: channel.derivedNote || `${targetId} is derived in the DSP from the ${channel.label} source channel.`
    };
  }

  function sleevePair(values = []) {
    return values.length ? values.map(value => `<code>${esc(value)}</code>`).join('<span class="harness-plus"> / </span>') : '<span class="harness-muted">not assigned</span>';
  }

  function sop9Pair(channel) {
    const source = channel.teslaSop9;
    if (!source) return '<span class="harness-muted">not recorded</span>';
    return `<code>${esc(source.sourceConnector)}-${esc(source.positiveCavity)} + (${esc(source.positiveNet)})</code><span class="harness-plus"> / </span><code>${esc(source.sourceConnector)}-${esc(source.negativeCavity)} - (${esc(source.negativeNet)})</code>`;
  }

  function channelCard(channel, targetId) {
    const relation = relationship(channel, targetId);
    return `<article class="harness-channel-card">
      <div class="harness-channel-head"><strong>${esc(channel.label)}</strong><span>${esc(relation.label)}</span></div>
      <div class="harness-kv"><span>OEM logical source</span><b>${esc(channel.sourceRole)}</b></div>
      <div class="harness-kv"><span>Tesla SOP9 source</span><b>${sop9Pair(channel)}</b></div>
      <div class="harness-kv"><span>IN to V TWELVE</span><b>${sleevePair(channel.inputSleeves)}</b></div>
      <div class="harness-kv"><span>OUT to vehicle</span><b>${channel.directTarget === targetId ? sleevePair(channel.outputSleeves) : '<span class="harness-muted">dedicated DSP output route</span>'}</b></div>
      <div class="harness-kv"><span>Observed wire family</span><b>${esc(channel.observedWireFamily || 'not recorded')}</b></div>
      <p>${esc(relation.detail)}</p>
      <div class="harness-verification">${esc(channel.verification)}</div>
    </article>`;
  }

  function fullTopology(map) {
    return `<section class="inspector-section harness-topology">
      <h3>7-channel PP-TES / SOP9 topology</h3>
      <div class="harness-table-wrap"><table class="harness-table">
        <thead><tr><th>Harness label</th><th>Tesla source role</th><th>SOP9 source pair</th><th>Direct target</th><th>DSP-derived</th></tr></thead>
        <tbody>${(map.channels || []).map(channel => `<tr>
          <td><strong>${esc(channel.label)}</strong></td>
          <td>${esc(channel.sourceRole)}</td>
          <td>${sop9Pair(channel)}</td>
          <td>${esc(channel.directTarget || 'none')}</td>
          <td>${esc((channel.derivedTargets || []).join(', ') || 'none')}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="harness-direction"><b>IN</b> ${esc(map.directionSemantics?.IN || '')}<br><b>OUT</b> ${esc(map.directionSemantics?.OUT || '')}</div>
    </section>`;
  }

  function sourceVerificationBanner(map) {
    const source = map.sop9SourceVerification || {};
    return `<div class="harness-source-verified">
      <strong>Tesla SOP9 source map: ${esc(source.status || 'UNKNOWN')}</strong>
      <span>${esc(source.scope || '')}</span>
      <small>${esc(source.source || '')}</small>
    </div>`;
  }

  function reworkBanner(map) {
    const rework = map.ryzenHarnessRework || {};
    if (!rework.status) return '';
    return `<div class="fitment-warning harness-warning">
      <strong>M141318 custom-harness work: ${esc(rework.status)}</strong>
      <span>${esc(rework.scope || '')}</span>
      <small>${esc(rework.verificationBoundary || '')} ${esc(rework.finalQc || '')}</small>
    </div>`;
  }

  function optionalWoofer(map) {
    const woofer = map.optionalWooferLead;
    if (!woofer) return '';
    return `<section class="inspector-section">
      <h3>Optional woofer lead</h3>
      <div class="harness-verification">${esc(woofer.status)}</div>
      <div class="harness-sleeves">${sleevePair(woofer.labels)}</div>
      <p>${esc(woofer.plannedUse)}</p>
      <div class="engineering-note warning">${esc(woofer.warning)}</div>
    </section>`;
  }

  function appendHarnessMapping() {
    const map = integration();
    const body = document.querySelector('#inspectBody');
    if (!map || !body || !selected) return;

    const relevant = channelsForTarget(selected.ID);
    const section = document.createElement('section');
    section.className = 'harness-map-section';

    const relevantMarkup = relevant.length
      ? `<section class="inspector-section"><h3>MATCH breakout -> V TWELVE</h3>${relevant.map(channel => channelCard(channel, selected.ID)).join('')}</section>`
      : `<section class="inspector-section"><h3>MATCH breakout -> V TWELVE</h3><div class="harness-empty">No direct seven-channel PP-TES logical source is assigned to ${esc(selected.ID)} in the current build.</div></section>`;

    if (inspectTab === 'wiring') {
      section.innerHTML = `${sourceVerificationBanner(map)}${relevantMarkup}${reworkBanner(map)}${fullTopology(map)}${selected.ID === 'SPK12' || selected.ID === 'SPK13' ? optionalWoofer(map) : ''}`;
    } else if (inspectTab === 'upgrade') {
      section.innerHTML = `${sourceVerificationBanner(map)}${reworkBanner(map)}${relevantMarkup}${optionalWoofer(map)}`;
    } else {
      section.innerHTML = `${sourceVerificationBanner(map)}${relevantMarkup}`;
    }
    body.appendChild(section);
  }

  renderInspector = function renderInspectorWithHarnessMap() {
    baseRenderInspector();
    appendHarnessMapping();
  };

  fetch('data/harness-integration.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`harness-integration HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      harnessIntegration = data;
      if (selected) renderInspector();
    })
    .catch(error => console.error('harness integration load failed', error));
})();
