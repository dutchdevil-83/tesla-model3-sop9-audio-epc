const DATA = {
  installed: 'data/installed-system.json',
  harness: 'data/harness-integration.json',
  vtwelve: 'data/v-twelve-connectors.json'
};

const STEPS = [
  { id: 'overview', title: 'Overview', subtitle: 'System at a glance', icon: '◉' },
  { id: 'prepare', title: 'Prepare', subtitle: 'Tools & checks', icon: '⌁' },
  { id: 'remove', title: 'Remove', subtitle: 'OEM components', icon: '▣' },
  { id: 'install', title: 'Install', subtitle: 'Hardware & wiring', icon: '◆' },
  { id: 'configure', title: 'Configure', subtitle: 'DSP settings', icon: '≋' },
  { id: 'test', title: 'Test', subtitle: 'Verify & fine-tune', icon: '▥' },
  { id: 'enjoy', title: 'Enjoy', subtitle: 'All done!', icon: '⚑' }
];

const state = { step: 0, installed: null, harness: null, vtwelve: null };
const $ = selector => document.querySelector(selector);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}

function link(label, href) {
  if (!href) return '';
  return `<a href="${esc(href)}" target="_blank" rel="noreferrer">${esc(label)}</a>`;
}

function details(title, body, open = false) {
  return `<details${open ? ' open' : ''}><summary>${esc(title)}</summary><div class="details-body">${body}</div></details>`;
}

function statusClass(status = '') {
  if (/PURCHASED|ORDERED|VERIFIED|PLANNED/i.test(status)) return 'state-good';
  if (/TBD|CHECK|REQUIRED|WARNING|DCR/i.test(status)) return 'state-warn';
  return 'state-future';
}

function renderTimeline() {
  $('#workflowTimeline').innerHTML = STEPS.map((step, index) => `
    <button class="timeline-step ${index === state.step ? 'active' : ''} ${index < state.step ? 'complete' : ''}" data-step="${index}" type="button" aria-current="${index === state.step ? 'step' : 'false'}">
      <span class="timeline-number">${index + 1}</span>
      <span class="timeline-copy"><strong>${esc(step.title)}</strong><span>${esc(step.subtitle)}</span></span>
    </button>`).join('');
}

function renderRail() {
  $('#workflowRail').innerHTML = STEPS.map((step, index) => `
    <button class="rail-step ${index === state.step ? 'active' : ''}" data-step="${index}" type="button">
      <span class="rail-icon" aria-hidden="true">${esc(step.icon)}</span>
      <span><strong>${esc(step.title)}</strong><span>${esc(step.subtitle)}</span></span>
    </button>`).join('');
}

function channelByOutput(channel) {
  return state.vtwelve.currentBuildTerminalPlan.speakerOutputs.find(item => item.channel === channel);
}

const OVERVIEW_CHANNEL_LABELS = {
  A: 'Front-left woofer', B: 'Front-right woofer', C: 'Left dash', D: 'Center dash', E: 'Right dash',
  F: 'Rear left (OEM)', G: 'Rear right (OEM)', H: 'Left tweeter', I: 'Right tweeter',
  J: 'Pioneer woofer 1', K: 'Pioneer woofer 2', L: 'Spare'
};

function renderChannelGroup(title, kind, channels) {
  return `<div class="channel-group ${kind}"><div class="channel-group-head">${esc(title)}</div>${channels.map(channel => {
    const output = channelByOutput(channel);
    const role = OVERVIEW_CHANNEL_LABELS[channel] || output?.role || 'Spare';
    return `<div class="channel-row"><span class="channel-badge">${esc(channel)}</span><span>${esc(role)}</span></div>`;
  }).join('')}</div>`;
}

function componentRow(label, subtitle, qty = '1×') {
  return `<div class="component-row"><span class="component-thumb">${esc(label.split(' ')[0])}</span><div><strong>${esc(label)}</strong><span>${esc(subtitle)}</span></div><b>${esc(qty)}</b></div>`;
}

function quickBar() {
  const next = Math.min(STEPS.length - 1, state.step + 1);
  return `<div class="quick-bar">
    <div class="quick-links"><h3>Quick Access</h3><div class="quick-link-grid">
      <a class="quick-link" href="engineering.html?view=lhd">Wiring Diagrams</a>
      <a class="quick-link" href="engineering.html?view=connectors">Connector Pinouts</a>
      <button class="quick-link" type="button" data-jump="4">DSP Setup Guide</button>
      <button class="quick-link" type="button" data-jump="5">Test Procedure</button>
      <a class="quick-link" href="engineering.html?view=evidence">Parts & Sources</a>
    </div></div>
    <div class="step-nav"><div class="step-nav-buttons">
      <button class="nav-button" type="button" data-prev ${state.step === 0 ? 'disabled' : ''}>Previous</button>
      <button class="nav-button primary" type="button" data-next ${state.step === STEPS.length - 1 ? 'disabled' : ''}>${state.step === STEPS.length - 1 ? 'Complete' : `Next: ${esc(STEPS[next].title)}`}</button>
    </div><span class="step-counter">Step ${state.step + 1} of ${STEPS.length}</span></div>
  </div>`;
}

function officialRefs() {
  return (state.vtwelve.references || []).map(ref => `<p>${link(ref.label, ref.url)}</p>`).join('');
}

function serviceRefs(keys) {
  const all = state.installed.teslaService || {};
  return keys.map(key => all[key]).filter(Boolean).map(item => `<p><strong>${esc(item.label)}</strong><br>${esc(item.summary || '')}<br>${link('Open official Tesla procedure', item.url)}</p>`).join('');
}

function overview() {
  const targets = state.installed.targets;
  return `<section class="step-layout">
    <div class="overview-top">
      <article class="workflow-card"><div class="card-head"><h3>System Overview</h3></div><div class="card-body">
        <div class="system-ok"><i>✓</i><span>Single-amplifier solution - no extra subwoofer amplifier required.</span></div>
        <div class="system-flow">
          <div class="flow-node"><strong>Tesla Source</strong><span>SOP9 standard audio</span><span class="flow-mini">X171 / X175 high-level</span></div><div class="flow-arrow">→</div>
          <div class="flow-node"><strong>HELIX</strong><span>V TWELVE DSP MK2</span><span class="flow-mini">12 amplified + 14 DSP channels</span></div><div class="flow-arrow">→</div>
          <div class="flow-stack"><div class="flow-node"><strong>Cabin speakers</strong><span>A-I</span></div><div class="flow-node"><strong>Pioneer subwoofers</strong><span>J & K</span></div></div>
        </div>
      </div></article>
      <article class="workflow-card"><div class="card-head"><h3>Installed Components</h3></div><div class="card-body component-list">
        ${componentRow('HELIX V TWELVE DSP MK2', '12-channel amplifier + DSP')}
        ${componentRow('Pioneer TS-WX1220AH woofers', '12-inch donor woofers, 2 Ω working basis', '2×')}
        ${componentRow('Tesla Model 3 (Highland)', 'HELIX front/dash · OEM rear doors · parcel shelf NONE / FUTURE')}
      </div></article>
    </div>
    <div class="overview-bottom">
      <article class="workflow-card"><div class="card-head"><h3>V TWELVE Channel Assignment</h3></div><div class="card-body">
        <div class="channel-grid">
          ${renderChannelGroup('Front Stage', 'front', ['A','B','C','D','E'])}
          ${renderChannelGroup('Rear / Highs', 'rear', ['F','G','H','I'])}
          ${renderChannelGroup('Subwoofers', 'sub', ['J','K','L'])}
        </div>
        <div class="line-out-strip"><span><b>LINE OUTPUT M/N</b> reserved / unused</span><span><b>LINE INPUT</b> A-F available, unused in current high-level plan</span></div>
      </div></article>
      <article class="workflow-card"><div class="card-head"><h3>Subwoofer Wiring (J & K)</h3></div><div class="card-body sub-wiring">
        ${['J','K'].map((ch, i) => `<div class="woofer-card"><strong>Pioneer Woofer ${i + 1}</strong><span class="channel-note">2 Ω working basis</span><div class="woofer-graphic"></div><div><span class="woofer-terminal plus">+</span><span class="woofer-terminal minus">−</span></div><div class="woofer-route">To V TWELVE Output ${ch}</div></div>`).join('')}
      </div></article>
      <article class="workflow-card important-card"><div class="card-head"><h3>✓ Important</h3></div><div class="card-body check-list">
        <div class="check-item"><i>✓</i><span>Use the European 2 Ω donor-system working basis.</span></div>
        <div class="check-item"><i>✓</i><span>Each woofer gets its own amplified channel: J and K.</span></div>
        <div class="check-item"><i>✓</i><span>No bridging and no series/parallel subwoofer arrangement.</span></div>
        <div class="check-item"><i>✓</i><span>Expect approximately 120 W RMS per woofer from V TWELVE at 2 Ω.</span></div>
        <div class="check-item critical"><i>!</i><span>Measure each loose Pioneer driver DCR before first power-up.</span></div>
        <div class="check-item"><i>✓</i><span>LINE OUTPUT M/N are reserved / unused in this setup.</span></div>
      </div></article>
    </div>
    ${quickBar()}
  </section>`;
}

function prepare() {
  return `<section class="step-layout">
    <div class="step-titlebar"><div><h2>Prepare</h2><p>Verify the car, harness and amplifier before removing trim.</p></div><span class="step-status">PRE-POWER GATE</span></div>
    <div class="wide-grid">
      <article class="workflow-card"><div class="card-head"><h3>Tools & Checks</h3></div><div class="card-body sequence-list">
        ${[
          ['Photograph every OEM connector before unplugging it', 'Keep connector IDs and wire colors visible in the photo.'],
          ['Identify the M141318 donor harness', 'It is a donor/interposer only; it is not plug-and-play for Highland.'],
          ['Label A-G before repinning', 'Apply the final VT-A through VT-G sleeve labels from the verified SOP9 map.'],
          ['Continuity-check the finished harness', 'No channel may rely only on an old Ryzen sleeve label.'],
          ['Measure both Pioneer donor woofers', 'Record loose-driver DCR before J/K are connected or energized.'],
          ['Confirm V TWELVE terminal polarity', 'HIGHLEVEL is -X/+X. OUTPUT CHANNELS are +X/-X.']
        ].map((row, i) => `<div class="sequence-item"><span class="sequence-num">${i + 1}</span><div><strong>${esc(row[0])}</strong><span>${esc(row[1])}</span></div></div>`).join('')}
      </div></article>
      <article class="workflow-card important-card"><div class="card-head"><h3>Do not skip</h3></div><div class="card-body check-list">
        <div class="check-item critical"><i>!</i><span>Follow Tesla's official low-voltage isolation procedure whenever the work requires LV disconnection.</span></div>
        <div class="check-item critical"><i>!</i><span>The PP-TES 1.7B Ryzen harness must be repinned/re-routed to the verified SOP9 circuits before connection.</span></div>
        <div class="check-item"><i>✓</i><span>Keep the original Tesla rear door speakers connected to F/G returns.</span></div>
        <div class="check-item"><i>✓</i><span>Leave shelf endpoints X588/X593 unused.</span></div>
      </div></article>
    </div>
    <div class="step-details">
      ${details('Harness verification boundary', `<p>${esc(state.harness.ryzenHarnessRework.verificationBoundary)}</p><p><strong>Final QC:</strong> ${esc(state.harness.ryzenHarnessRework.finalQc)}</p>`, true)}
      ${details('Tesla safety procedure', serviceRefs(['TESLA_LV_POWER']))}
      ${details('HELIX connector reference', officialRefs())}
    </div>
    ${quickBar()}
  </section>`;
}

function removeStep() {
  const rows = [
    ['Front doors', 'Remove front door trim for SPK01/SPK02 and tweeter access for SPK03/SPK04.'],
    ['Instrument panel', 'Remove IP end caps / A-pillar upper trims and dash grille for SPK05/SPK06/SPK07.'],
    ['Rear doors', 'Rear speakers stay OEM. Open trim only if wiring inspection or harness work requires access.'],
    ['Parcel shelf', 'No shelf speaker installation in this build. X588/X593 stay reference-only.'],
    ['Headliner', 'No SPK14/SPK15 replacement in the current build. Do not remove headliner for this stage.']
  ];
  return `<section class="step-layout">
    <div class="step-titlebar"><div><h2>Remove OEM access panels</h2><p>Only remove the panels required for the current build and follow the linked Tesla Service procedures in sequence.</p></div><span class="step-status">TESLA SERVICE FIRST</span></div>
    <article class="workflow-card"><div class="card-head"><h3>Access sequence</h3></div><div class="card-body sequence-list">${rows.map((row,i) => `<div class="sequence-item"><span class="sequence-num">${i+1}</span><div><strong>${esc(row[0])}</strong><span>${esc(row[1])}</span></div></div>`).join('')}</div></article>
    <div class="step-details">
      ${details('Front door woofer / trim procedures', serviceRefs(['TESLA_FRONT_WOOFER','TESLA_FRONT_DOOR_TRIM']), true)}
      ${details('Front tweeter procedures', serviceRefs(['TESLA_FRONT_TWEETER']))}
      ${details('Dash speaker / grille procedures', serviceRefs(['TESLA_DASH_SIDE','TESLA_DASH_CENTER','TESLA_DASH_GRILLE']))}
      ${details('Rear-door reference procedures', serviceRefs(['TESLA_REAR_DOOR_TRIM','TESLA_REAR_DOOR_HARNESS']))}
      ${details('Future-only parcel / headliner procedures', serviceRefs(['TESLA_PARCEL_WOOFER','TESLA_HEADLINER']))}
    </div>
    ${quickBar()}
  </section>`;
}

function sourcePair(channel) {
  const t = channel.teslaSop9;
  return `${t.sourceConnector}-${t.positiveCavity} ${t.positiveWireColor} + / ${t.sourceConnector}-${t.negativeCavity} ${t.negativeWireColor} -`;
}

function returnPair(channel) {
  const s = channel.speakerSide;
  return `${s.connector}-${s.positiveCavity} ${s.positiveWireColor} + / ${s.connector}-${s.negativeCavity} ${s.negativeWireColor} -`;
}

function connectorMap() {
  const c = state.vtwelve.connectorLabeling;
  const blocks = [
    ['HIGHLEVEL INPUT', 'A-L', c.highlevelInput.channels, `terminal order ${c.highlevelInput.polarityOrderPerChannel.join(' / ')}`],
    ['LINE INPUT', 'A-F', c.lineInput.channels, 'RCA low-level; unused'],
    ['OUTPUT CHANNELS', 'A-L', c.speakerOutput.channels, `terminal order ${c.speakerOutput.polarityOrderPerChannel.join(' / ')}`],
    ['LINE OUTPUT', 'M/N', c.lineOutput.channels, 'processed RCA; reserved']
  ];
  return `<div class="connector-map">${blocks.map(block => `<div class="connector-block"><strong>${esc(block[0])} <span>${esc(block[1])}</span></strong><span>${esc(block[3])}</span><div class="connector-chips">${block[2].map(ch => `<span class="connector-chip">${esc(ch)}</span>`).join('')}</div></div>`).join('')}</div>
    <div class="connector-map" style="margin-top:10px">${c.controlAndPower.map(item => `<div class="connector-block"><strong>${esc(item.label)}</strong><span>${esc(item.purpose)}${item.currentBuildUse ? ` · ${esc(item.currentBuildUse)}` : ''}${item.currentBuildState ? ` · ${esc(item.currentBuildState)}` : ''}</span></div>`).join('')}</div>`;
}

function install() {
  const rows = state.harness.channels.map(channel => {
    const target = state.installed.targets?.[channel.directTarget] || {};
    return `<tr>
      <td><b>${esc(channel.vTwelveChannel)}</b><small>${esc(channel.label)}</small></td>
      <td class="raw-code">${esc(sourcePair(channel))}</td>
      <td class="raw-code">${esc(returnPair(channel))}</td>
      <td><b>${esc(channel.directTarget)}</b><small>${esc(target.component || channel.sourceRole)}</small></td>
      <td class="state-good">VERIFIED SOP9 MAP</td>
    </tr>`;
  }).join('');
  const derived = [
    ...state.harness.derivedOutputs.map(item => ({ channel:item.vTwelveOutput, target:item.target, role:item.role, source:item.source, state:'PLANNED' })),
    ...state.harness.subwooferOutputs.map(item => ({ channel:item.vTwelveOutput, target:item.target, role:item.role, source:item.source, state:item.workingBasis }))
  ];
  return `<section class="step-layout">
    <div class="step-titlebar"><div><h2>Install hardware & wiring</h2><p>Tesla-side source/return map, V TWELVE terminal assignment, and speaker-side return are shown together.</p></div><span class="step-status">A-G VERIFIED SOURCE MAP</span></div>
    <article class="workflow-card"><div class="card-head"><h3>Tesla SOP9 → HELIX A-G → speaker return</h3></div><div class="card-body"><div class="workflow-table-wrap"><table class="workflow-table"><thead><tr><th>HELIX</th><th>Tesla source (+ / -)</th><th>Speaker return (+ / -)</th><th>Target</th><th>State</th></tr></thead><tbody>${rows}</tbody></table></div></div></article>
    <article class="workflow-card"><div class="card-head"><h3>Full-active / subwoofer outputs</h3></div><div class="card-body"><div class="workflow-table-wrap"><table class="workflow-table"><thead><tr><th>Output</th><th>Target</th><th>Role</th><th>Signal basis</th><th>State</th></tr></thead><tbody>${derived.map(item => `<tr><td><b>${esc(item.channel)}</b></td><td>${esc(item.target)}</td><td>${esc(item.role)}</td><td>${esc(item.source)}</td><td class="${statusClass(item.state)}">${esc(item.state)}</td></tr>`).join('')}<tr><td><b>L</b></td><td>-</td><td>Spare amplified channel</td><td>-</td><td class="state-future">SPARE</td></tr><tr><td><b>M/N</b></td><td>-</td><td>Processed line outputs</td><td>DSP</td><td class="state-future">RESERVED / UNUSED</td></tr></tbody></table></div></div></article>
    <article class="workflow-card"><div class="card-head"><h3>V TWELVE Connector Labeling</h3></div><div class="card-body">${connectorMap()}</div></article>
    <div class="step-details">
      ${details('Critical polarity rule', `<p><strong>HIGHLEVEL INPUT:</strong> ${esc(state.harness.labelingRule.inputPolarity)}</p><p><strong>OUTPUT CHANNELS:</strong> ${esc(state.harness.labelingRule.outputPolarity)}</p>`, true)}
      ${details('Harness repin / reroute warning', `<div class="warning-box">${esc(state.harness.ryzenHarnessRework.scope)}</div>`)}
      ${details('Official HELIX / Pioneer references', officialRefs())}
    </div>
    ${quickBar()}
  </section>`;
}

function configure() {
  const outputs = state.vtwelve.currentBuildTerminalPlan.speakerOutputs;
  const tweeterSpecs = state.installed.products?.CI7_T20?.specs || [];
  return `<section class="step-layout">
    <div class="step-titlebar"><div><h2>Configure DSP</h2><p>Keep routing explicit. Final crossover, gain, delay and EQ values are set during commissioning after physical verification.</p></div><span class="step-status">DSP PC-TOOL</span></div>
    <article class="workflow-card"><div class="card-head"><h3>Output roles A-L</h3></div><div class="card-body"><div class="info-grid">${outputs.map(item => `<div class="info-tile"><strong>${esc(item.channel)} · ${esc(item.target || 'Spare')}</strong><span>${esc(item.role)}</span><span class="${statusClass(item.state)}">${esc(item.state)}</span></div>`).join('')}</div></div></article>
    <div class="wide-grid">
      <article class="workflow-card"><div class="card-head"><h3>Configuration order</h3></div><div class="card-body sequence-list">${[
        ['Input routing', 'Map HIGHLEVEL A-G to the verified Tesla SOP9 source functions.'],
        ['Direct speaker outputs', 'Keep A-G aligned with their direct speaker returns.'],
        ['Tweeters', 'H = left tweeter from C; I = right tweeter from E. Apply a protective high-pass before any full-level test.'],
        ['Subwoofers', 'J/K use the DSP mono low-frequency mix, one Pioneer woofer per channel.'],
        ['Unused channels', 'L stays spare. M/N remain reserved/unused.'],
        ['Tuning', 'Set final crossover, level, time alignment and EQ only after physical verification and polarity checks.']
      ].map((row,i) => `<div class="sequence-item"><span class="sequence-num">${i+1}</span><div><strong>${esc(row[0])}</strong><span>${esc(row[1])}</span></div></div>`).join('')}</div></article>
      <article class="workflow-card important-card"><div class="card-head"><h3>Tweeter manufacturer limits</h3></div><div class="card-body check-list">${tweeterSpecs.map(spec => `<div class="check-item"><i>✓</i><span>${esc(spec)}</span></div>`).join('')}<div class="check-item critical"><i>!</i><span>Do not run H/I full-range during commissioning.</span></div></div></article>
    </div>
    <div class="step-details">${details('Official HELIX references', officialRefs(), true)}${details('Why the dash labels matter', `<p>HIGHLEVEL C is <strong>Front Left DASH</strong>, D is <strong>Center DASH</strong>, and E is <strong>Front Right DASH</strong>. Those are the three instrument-panel speakers behind the windshield. A/B are the front door woofer sources.</p>`)}</div>
    ${quickBar()}
  </section>`;
}

function testStep() {
  const checks = [
    ['Harness continuity', 'Check each A-G IN pair and corresponding A-G OUT return before plugging in the amplifier.'],
    ['Pioneer DCR', 'Measure each loose TS-WX1220AH donor woofer. Stop if the measured load does not match the expected 2 Ω working basis.'],
    ['Polarity', 'Verify HIGHLEVEL -/+ orientation and OUTPUT +/- orientation at the V TWELVE.'],
    ['First power-up', 'Start at low master volume with protective DSP filters enabled.'],
    ['Channel-by-channel', 'Confirm A through K one at a time. Listen for wrong location, inversion, rubbing, trim buzz or unexpected output.'],
    ['Tweeters H/I', 'Confirm protective high-pass is active before raising level.'],
    ['Reassembly gate', 'Only reinstall trim after all channels, polarity and mechanical fit checks pass.']
  ];
  return `<section class="step-layout">
    <div class="step-titlebar"><div><h2>Test & verify</h2><p>Verify one channel at a time at low level. Reinstall trim only after routing, polarity and mechanical checks pass.</p></div><span class="step-status">COMMISSIONING</span></div>
    <article class="workflow-card"><div class="card-head"><h3>Verification sequence</h3></div><div class="card-body sequence-list">${checks.map((row,i) => `<div class="sequence-item"><span class="sequence-num">${i+1}</span><div><strong>${esc(row[0])}</strong><span>${esc(row[1])}</span></div></div>`).join('')}</div></article>
    <div class="warning-box"><strong>Stop condition:</strong> unexpected load, hot wiring, amplifier protection, output from the wrong physical speaker, or polarity that does not match the verified map. Fix the cause before continuing.</div>
    <div class="step-details">${details('Harness final QC', `<p>${esc(state.harness.ryzenHarnessRework.finalQc)}</p>`, true)}${details('Relevant Tesla service references', serviceRefs(['TESLA_FRONT_DOOR_TRIM','TESLA_DASH_GRILLE','TESLA_REAR_DOOR_TRIM']))}</div>
    ${quickBar()}
  </section>`;
}

function enjoy() {
  const t = state.installed.targets;
  return `<section class="step-layout">
    <div class="step-titlebar"><div><h2>Enjoy</h2><p>Current-build handoff with future and reference-only positions kept separate from installed hardware.</p></div><span class="step-status">BUILD SUMMARY</span></div>
    <div class="wide-grid">
      <article class="workflow-card"><div class="card-head"><h3>Current physical build</h3></div><div class="card-body info-grid">
        <div class="info-tile"><strong>Front woofers</strong><span>${esc(t.SPK01.component)} pair on A/B.</span></div>
        <div class="info-tile"><strong>Dash L/C/R</strong><span>${esc(t.SPK05.component)} / ${esc(t.SPK06.component)} / ${esc(t.SPK07.component)} on C/D/E.</span></div>
        <div class="info-tile"><strong>Tweeters</strong><span>${esc(t.SPK03.component)} pair on H/I.</span></div>
        <div class="info-tile"><strong>Rear doors</strong><span>Original Tesla stock speakers retained on F/G.</span></div>
        <div class="info-tile"><strong>Subwoofers</strong><span>2× Pioneer TS-WX1220AH donor woofers on J/K.</span></div>
        <div class="info-tile"><strong>Parcel shelf</strong><span>NONE / FUTURE. X588/X593 are not used by the trunk subs.</span></div>
      </div></article>
      <article class="workflow-card important-card"><div class="card-head"><h3>Future / not fitted</h3></div><div class="card-body check-list"><div class="check-item"><i>✓</i><span>Rear-door aftermarket speaker upgrade can be added later.</span></div><div class="check-item"><i>✓</i><span>Parcel-shelf speakers remain absent.</span></div><div class="check-item"><i>✓</i><span>SPK08/09 and SPK14/15 remain Tesla reference endpoints, not current installed hardware.</span></div><div class="check-item"><i>✓</i><span>DIRECTOR for SCP is ordered and documented separately from speaker routing.</span></div></div></article>
    </div>
    <div class="success-box">The installation workflow remains a guide over the verified repository data. Use the Engineering Workspace for full Tesla Parts Catalog, Service schematic, connector metadata and source evidence.</div>
    <div class="step-details">${details('Open engineering evidence', `<p><a href="engineering.html?view=system">Vehicle map</a> · <a href="engineering.html?view=lhd">Tesla Service LHD</a> · <a href="engineering.html?view=premium">Premium amp</a> · <a href="engineering.html?view=connectors">Connector evidence</a> · <a href="engineering.html?view=evidence">Technical sources</a></p>`, true)}</div>
    ${quickBar()}
  </section>`;
}

function renderStep() {
  const renderers = [overview, prepare, removeStep, install, configure, testStep, enjoy];
  $('#workflowMain').innerHTML = renderers[state.step]();
  $('#workflowMain').scrollTop = 0;
  document.title = `Step ${state.step + 1} · ${STEPS[state.step].title} · Tesla SOP9 Audio`;
}

function selectStep(index, updateHash = true) {
  const next = Math.max(0, Math.min(STEPS.length - 1, Number(index)));
  state.step = next;
  renderTimeline();
  renderRail();
  renderStep();
  if (updateHash) history.replaceState(null, '', `#${STEPS[next].id}`);
  $('#workflowMain')?.focus({ preventScroll: true });
}

function wireEvents() {
  document.addEventListener('click', event => {
    const stepButton = event.target.closest('[data-step]');
    if (stepButton) return selectStep(stepButton.dataset.step);
    if (event.target.closest('[data-prev]')) return selectStep(state.step - 1);
    if (event.target.closest('[data-next]')) return selectStep(state.step + 1);
    const jump = event.target.closest('[data-jump]');
    if (jump) return selectStep(jump.dataset.jump);
  });
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#','');
    const index = STEPS.findIndex(step => step.id === id);
    if (index >= 0 && index !== state.step) selectStep(index, false);
  });
}

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return response.json();
}

async function init() {
  wireEvents();
  try {
    [state.installed, state.harness, state.vtwelve] = await Promise.all([
      loadJson(DATA.installed), loadJson(DATA.harness), loadJson(DATA.vtwelve)
    ]);
    const hashStep = STEPS.findIndex(step => step.id === location.hash.replace('#',''));
    selectStep(hashStep >= 0 ? hashStep : 0, false);
  } catch (error) {
    $('#workflowMain').innerHTML = `<div class="warning-box"><strong>Installation workflow data failed to load.</strong><br>${esc(error.message)}</div>`;
    console.error(error);
  }
}

init();
