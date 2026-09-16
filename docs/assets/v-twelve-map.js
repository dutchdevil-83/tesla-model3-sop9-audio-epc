/* HELIX V TWELVE DSP MK2 connector / terminal overlay.
 * Factory connector labels come from the amplifier/manual.
 * A-L current-build assignments are installation-plan decisions, not HELIX channel names.
 */
(() => {
  const baseRenderInspector = renderInspector;
  let vTwelve = null;

  function terminalPlan() {
    return vTwelve?.currentBuildTerminalPlan || null;
  }

  function highlevelForTarget(targetId) {
    const plan = terminalPlan();
    if (!plan) return [];
    return (plan.highlevelInputs || []).filter(input =>
      input.target === targetId || (input.derivedTargets || []).includes(targetId)
    );
  }

  function outputForTarget(targetId) {
    const plan = terminalPlan();
    if (!plan) return [];
    return (plan.speakerOutputs || []).filter(output => output.target === targetId);
  }

  function channelTerminals(channel, type) {
    if (!channel) return '';
    return type === 'input'
      ? `<code>-${esc(channel)}</code><span class="vt-arrow"> / </span><code>+${esc(channel)}</code>`
      : `<code>+${esc(channel)}</code><span class="vt-arrow"> / </span><code>-${esc(channel)}</code>`;
  }

  function factoryConnectorSummary() {
    const labels = vTwelve?.connectorLabeling;
    if (!labels) return '';
    return `<section class="inspector-section vt-factory-map">
      <h3>HELIX V TWELVE factory connector labels</h3>
      <div class="vt-connector-card">
        <div class="vt-connector-title"><strong>HIGHLEVEL INPUT</strong><span>12 differential inputs A-L</span></div>
        <div class="vt-grid-row"><span>Upper</span><b>-A +A · -B +B · -C +C · -D +D · -E +E · -F +F</b></div>
        <div class="vt-grid-row"><span>Lower</span><b>-G +G · -H +H · -I +I · -J +J · -K +K · -L +L</b></div>
      </div>
      <div class="vt-connector-card">
        <div class="vt-connector-title"><strong>OUTPUT CHANNELS</strong><span>12 amplified outputs A-L</span></div>
        <div class="vt-grid-row"><span>A-F block</span><b>+A -A · +B -B · +C -C / +D -D · +E -E · +F -F</b></div>
        <div class="vt-grid-row"><span>G-L block</span><b>+G -G · +H -H · +I -I / +J -J · +K -K · +L -L</b></div>
      </div>
      <div class="vt-connector-card vt-secondary">
        <div class="vt-grid-row"><span>LINE INPUT</span><b>A-F RCA · unused in current PP-TES plan</b></div>
        <div class="vt-grid-row"><span>LINE OUTPUT</span><b>M / N RCA · reserved</b></div>
        <div class="vt-grid-row"><span>SCP</span><b>DIRECTOR for SCP</b></div>
        <div class="vt-grid-row"><span>POWER</span><b>GND · POWER REM · +12V</b></div>
      </div>
      <div class="engineering-note">Factory labels above are physical HELIX connector labels. The A-L speaker assignments below are the current installation plan and can still be changed in DSP PC-Tool / wiring before installation.</div>
    </section>`;
  }

  function targetTerminalCard(targetId) {
    const inputs = highlevelForTarget(targetId);
    const outputs = outputForTarget(targetId);
    if (!inputs.length && !outputs.length) return '';

    const rows = [];
    inputs.forEach(input => {
      const derived = input.target !== targetId;
      rows.push(`<div class="vt-terminal-row">
        <span>${derived ? 'DSP source input' : 'High-level input'}</span>
        <b>HIGHLEVEL ${esc(input.channel)} ${channelTerminals(input.channel, 'input')}</b>
        <small>${esc(input.harnessLabel || 'No direct PP-TES label')} · ${esc(input.role)}${derived ? ' · shared source for this derived output' : ''}</small>
      </div>`);
    });
    outputs.forEach(output => {
      rows.push(`<div class="vt-terminal-row">
        <span>Amplified output</span>
        <b>OUTPUT ${esc(output.channel)} ${channelTerminals(output.channel, 'output')}</b>
        <small>${esc(output.role)} · ${esc(output.source || '')}</small>
        <em>${esc(output.state)}</em>
      </div>`);
    });

    return `<section class="inspector-section vt-target-map">
      <h3>V TWELVE terminal assignment</h3>
      ${rows.join('')}
      <div class="vt-plan-state">${esc(terminalPlan()?.status || '')}</div>
    </section>`;
  }

  function fullAssignmentTable() {
    const plan = terminalPlan();
    if (!plan) return '';
    const outputs = plan.speakerOutputs || [];
    return `<section class="inspector-section vt-assignment-overview">
      <h3>Current V TWELVE A-L output plan</h3>
      <div class="harness-table-wrap"><table class="harness-table vt-table">
        <thead><tr><th>Output</th><th>Target</th><th>Load / role</th><th>DSP source</th><th>State</th></tr></thead>
        <tbody>${outputs.map(output => `<tr>
          <td><strong>${esc(output.channel)}</strong><br><code>+${esc(output.channel)} / -${esc(output.channel)}</code></td>
          <td>${esc(output.target || 'spare')}</td>
          <td>${esc(output.role)}</td>
          <td>${esc(output.source || 'none')}</td>
          <td>${esc(output.state)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="engineering-note warning">J/K are reserved only. Do not connect the Pioneer subwoofers until model, impedance and voice-coil configuration are known and the resulting V TWELVE load is verified.</div>
    </section>`;
  }

  function appendVTwelveMap() {
    if (!vTwelve || !selected) return;
    const body = document.querySelector('#inspectBody');
    if (!body) return;
    const wrapper = document.createElement('section');
    wrapper.className = 'vt-map-section';

    if (inspectTab === 'wiring') {
      wrapper.innerHTML = `${targetTerminalCard(selected.ID)}${factoryConnectorSummary()}`;
    } else if (inspectTab === 'upgrade') {
      wrapper.innerHTML = `${targetTerminalCard(selected.ID)}${fullAssignmentTable()}${factoryConnectorSummary()}`;
    } else {
      wrapper.innerHTML = targetTerminalCard(selected.ID);
    }
    body.appendChild(wrapper);
  }

  renderInspector = function renderInspectorWithVTwelveMap() {
    baseRenderInspector();
    appendVTwelveMap();
  };

  fetch('data/v-twelve-connectors.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`v-twelve-connectors HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      vTwelve = data;
      if (selected) renderInspector();
    })
    .catch(error => console.error('V TWELVE connector map load failed', error));
})();
