// ==UserScript==
// @name         Tesla Model 3 SOP9 Audio Asset Collector
// @namespace    local.marco.tesla.sop9.audio
// @version      1.1.6
// @description  One-click discovery and native STORE ZIP export of Tesla SOP9 audio schematics, connector metadata, locations and faceviews.
// @match        https://service.tesla.com/docs/Model3/ElectricalReference/prog-*/*
// @run-at       document-idle
// ==/UserScript==


(() => {
  'use strict';

  const VERSION = '1.1.6';
  const ZIP_CONCURRENCY = 6;
  const CONNECTOR_ID_RE = /\bX\d{3}[A-Z]?\b/g;
  const AUDIO_TERMS_RE = /(?:audio|speaker|woofer|tweeter|subwoofer|premium\s*amp|radio|a2b|superhorn|headliner|parcel\s*shelf)/i;

  const FETCH_TIMEOUT_MS = 20_000;
  const ZIP_HEARTBEAT_MS = 1_000;

  const CORE_ASSETS = [
    'interactive/svg/audio_lhd.svg',
    'interactive/svg/audio_premium_amp.svg',
    'interactive/json/connector_reference_export.json',
    'interactive/csv/index_devices.csv',
    'interactive/csv/index_pages.csv',
    'interactive/csv/index_explorer.csv',
  ];

  function getProgramRoot() {
    const match = location.pathname.match(/^(.*\/ElectricalReference\/prog-[^/]+\/)/i);
    if (!match) {
      throw new Error('Open a Tesla Model 3 Electrical Reference page under /ElectricalReference/prog-*/ first.');
    }
    return new URL(match[1], location.origin).href;
  }

  function nowIsoSafe() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function sha256(bytes) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return toHex(digest);
  }

  function decodeUtf8(bytes) {
    return new TextDecoder('utf-8').decode(bytes);
  }

  function encodeUtf8(text) {
    return new TextEncoder().encode(text);
  }

  // CRC-32 is required by the ZIP format even when entries use STORE (no compression).
  // Computing it as each asset is added avoids a second full pass over all binary data
  // during the final archive build.
  const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function asUint8Array(value) {
    if (value instanceof Uint8Array) {
      return value;
    }
    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    throw new TypeError('ZIP entry data must be Uint8Array, ArrayBuffer or an ArrayBuffer view.');
  }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, Math.min(2107, date.getFullYear()));
    const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    return { dosDate, dosTime };
  }

  function setU16(view, offset, value) {
    view.setUint16(offset, value & 0xFFFF, true);
  }

  function setU32(view, offset, value) {
    view.setUint32(offset, value >>> 0, true);
  }

  async function createStoredZipBlob(entries, onProgress) {
    if (entries.length >= 0xFFFF) {
      throw new Error(`ZIP64 would be required for ${entries.length} entries; this collector intentionally limits standard ZIP output to 65,534 entries.`);
    }

    const localChunks = [];
    const centralChunks = [];
    const centralRecords = [];
    const { dosDate, dosTime } = dosDateTime();
    let offset = 0;

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const nameBytes = encodeUtf8(entry.path);
      const data = asUint8Array(entry.bytes);
      if (nameBytes.length > 0xFFFF) {
        throw new Error(`ZIP path is too long: ${entry.path}`);
      }
      if (data.byteLength > 0xFFFFFFFF) {
        throw new Error(`ZIP entry exceeds 4 GiB and requires ZIP64: ${entry.path}`);
      }
      if (offset > 0xFFFFFFFF) {
        throw new Error('ZIP archive exceeds the 4 GiB standard ZIP limit; ZIP64 is not enabled.');
      }

      const localOffset = offset;
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      setU32(lv, 0, 0x04034B50); // local file header signature
      setU16(lv, 4, 20); // version needed: ZIP 2.0
      setU16(lv, 6, 0x0800); // UTF-8 filename
      setU16(lv, 8, 0); // STORE
      setU16(lv, 10, dosTime);
      setU16(lv, 12, dosDate);
      setU32(lv, 14, entry.crc32);
      setU32(lv, 18, data.byteLength);
      setU32(lv, 22, data.byteLength);
      setU16(lv, 26, nameBytes.length);
      setU16(lv, 28, 0);
      localHeader.set(nameBytes, 30);

      localChunks.push(localHeader, data);
      offset += localHeader.byteLength + data.byteLength;
      centralRecords.push({ entry, nameBytes, dataLength: data.byteLength, localOffset });

      if (onProgress) {
        onProgress({
          phase: 'files',
          percent: entries.length ? ((index + 1) / entries.length) * 85 : 85,
          currentFile: entry.path,
          current: index + 1,
          total: entries.length,
        });
      }
      if ((index + 1) % 20 === 0) {
        await yieldToUi();
      }
    }

    const centralOffset = offset;
    for (let index = 0; index < centralRecords.length; index++) {
      const { entry, nameBytes, dataLength, localOffset } = centralRecords[index];
      const central = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(central.buffer);
      setU32(cv, 0, 0x02014B50); // central directory header signature
      setU16(cv, 4, 20); // made by ZIP 2.0 / DOS-compatible
      setU16(cv, 6, 20); // version needed
      setU16(cv, 8, 0x0800); // UTF-8 filename
      setU16(cv, 10, 0); // STORE
      setU16(cv, 12, dosTime);
      setU16(cv, 14, dosDate);
      setU32(cv, 16, entry.crc32);
      setU32(cv, 20, dataLength);
      setU32(cv, 24, dataLength);
      setU16(cv, 28, nameBytes.length);
      setU16(cv, 30, 0); // extra length
      setU16(cv, 32, 0); // comment length
      setU16(cv, 34, 0); // disk number start
      setU16(cv, 36, 0); // internal attrs
      setU32(cv, 38, 0); // external attrs
      setU32(cv, 42, localOffset);
      central.set(nameBytes, 46);
      centralChunks.push(central);
      offset += central.byteLength;

      if (onProgress) {
        onProgress({
          phase: 'directory',
          percent: 85 + (centralRecords.length ? ((index + 1) / centralRecords.length) * 14 : 14),
          currentFile: entry.path,
          current: index + 1,
          total: centralRecords.length,
        });
      }
      if ((index + 1) % 50 === 0) {
        await yieldToUi();
      }
    }

    const centralSize = offset - centralOffset;
    if (centralOffset > 0xFFFFFFFF || centralSize > 0xFFFFFFFF) {
      throw new Error('ZIP central directory exceeds standard ZIP limits; ZIP64 is not enabled.');
    }

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    setU32(ev, 0, 0x06054B50); // end of central directory signature
    setU16(ev, 4, 0);
    setU16(ev, 6, 0);
    setU16(ev, 8, centralRecords.length);
    setU16(ev, 10, centralRecords.length);
    setU32(ev, 12, centralSize);
    setU32(ev, 16, centralOffset);
    setU16(ev, 20, 0);

    if (onProgress) {
      onProgress({ phase: 'blob', percent: 100, currentFile: 'finalizing browser Blob' });
    }
    await yieldToUi();
    return new Blob([...localChunks, ...centralChunks, eocd], { type: 'application/zip' });
  }

  function yieldToUi() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  function normalizeMime(value, fallback = 'application/octet-stream') {
    return (value || fallback).split(';', 1)[0].trim() || fallback;
  }


  function zipSafeName(value) {
    return String(value).replace(/[\\:*?"<>|]/g, '_');
  }

  async function mapLimit(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;

    async function runner() {
      while (true) {
        const index = next++;
        if (index >= items.length) {
          return;
        }
        results[index] = await worker(items[index], index);
      }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
    return results;
  }

  function createStatusUi() {
    const wrap = document.createElement('div');
    wrap.id = 'sop9-audio-collector';
    wrap.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:18px',
      'z-index:2147483647',
      'font:12px Arial,sans-serif',
      'color:#171a20',
      'background:#fff',
      'border:1px solid #aaa',
      'box-shadow:0 2px 8px rgba(0,0,0,.16)',
      'width:250px',
    ].join(';');

    wrap.innerHTML = `
      <button id="sop9-collect-button" style="width:100%;height:34px;border:0;border-bottom:1px solid #aaa;background:#171a20;color:#fff;font-weight:700;cursor:pointer">Collect + ZIP</button>
      <div style="padding:8px 10px">
        <div id="sop9-collect-status">Ready</div>
        <div style="height:4px;background:#eee;margin-top:7px;overflow:hidden"><div id="sop9-collect-progress" style="height:100%;width:0;background:#e82127"></div></div>
        <div id="sop9-collect-detail" style="margin-top:6px;color:#5c5e62;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
      </div>`;

    document.body.appendChild(wrap);
    return {
      button: wrap.querySelector('#sop9-collect-button'),
      status: wrap.querySelector('#sop9-collect-status'),
      progress: wrap.querySelector('#sop9-collect-progress'),
      detail: wrap.querySelector('#sop9-collect-detail'),
      set(text, percent = null, detail = '') {
        this.status.textContent = text;
        if (percent !== null) {
          this.progress.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        }
        this.detail.textContent = detail;
      },
      busy(value) {
        this.button.disabled = value;
        this.button.style.opacity = value ? '.6' : '1';
        this.button.style.cursor = value ? 'wait' : 'pointer';
      },
    };
  }

  function recordDiscoveryReason(map, connectorId, reason) {
    if (!connectorId || !/^X\d{3}[A-Z]?$/.test(connectorId)) {
      return;
    }
    if (!map.has(connectorId)) {
      map.set(connectorId, new Set());
    }
    map.get(connectorId).add(reason);
  }

  function connectorRecordText(record) {
    const cavityText = (record.cavities || []).flatMap(cavity => [
      cavity.cavityName,
      cavity.destCavityName,
      cavity.destDeviceName,
    ]).filter(Boolean);

    return [
      record.connectorID,
      record.deviceName,
      record.harnessDesignator,
      record.harnessName,
      ...cavityText,
    ].filter(Boolean).join(' ');
  }

  function discoverConnectors(connectorReference, svgTexts) {
    const reasons = new Map();
    const byId = new Map(
      connectorReference
        .filter(row => row?.connectorID)
        .map(row => [String(row.connectorID).toUpperCase(), row]),
    );

    // Primary source: connector IDs actually rendered on Tesla's audio schematics.
    for (const [label, svgText] of Object.entries(svgTexts)) {
      const matches = svgText.match(CONNECTOR_ID_RE) || [];
      for (const connectorId of matches) {
        recordDiscoveryReason(reasons, connectorId.toUpperCase(), `referenced by ${label}`);
      }
    }

    // Secondary source: connector-reference rows whose device/signal metadata is audio related.
    // This catches useful audio endpoints that may be option-gated or not rendered in both SVGs.
    for (const record of connectorReference) {
      const connectorId = String(record?.connectorID || '').toUpperCase();
      if (!connectorId) {
        continue;
      }
      if (AUDIO_TERMS_RE.test(connectorRecordText(record))) {
        recordDiscoveryReason(reasons, connectorId, 'audio-related connector metadata');
      }
    }

    // Automatically include the mate of any discovered inline F/M connector when present.
    // Example: X935F <-> X935M. This is deterministic and avoids broad graph expansion
    // through unrelated body-controller destinations.
    for (const connectorId of [...reasons.keys()]) {
      const match = connectorId.match(/^(X\d{3})([FM])$/);
      if (!match) {
        continue;
      }
      const mate = `${match[1]}${match[2] === 'F' ? 'M' : 'F'}`;
      if (byId.has(mate)) {
        recordDiscoveryReason(reasons, mate, `inline mate of ${connectorId}`);
      }
    }

    return {
      byId,
      reasons,
      connectorIds: [...reasons.keys()].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
    };
  }

  async function collectAndZip(ui) {
    const root = getProgramRoot();
    const zipEntries = [];
    const zipEntryByPath = new Map();

    function addZipFile(path, value) {
      const bytes = asUint8Array(value);
      const normalizedPath = String(path).replace(/^\/+/, '');
      const entry = { path: normalizedPath, bytes, crc32: crc32(bytes) };
      const existingIndex = zipEntryByPath.get(normalizedPath);
      if (existingIndex !== undefined) {
        zipEntries[existingIndex] = entry;
      } else {
        zipEntryByPath.set(normalizedPath, zipEntries.length);
        zipEntries.push(entry);
      }
      return entry;
    }
    const manifest = {
      schemaVersion: 2,
      collector: {
        name: 'Tesla Model 3 SOP9 Audio Asset Collector',
        version: VERSION,
      },
      generatedAt: new Date().toISOString(),
      sourceRoot: root,
      sourcePage: location.href,
      privacy: 'Uses the current same-origin authenticated browser session. Cookies, authorization headers and tokens are never written to the ZIP.',
      discovery: {
        method: 'audio schematic connector references + audio-related connector metadata + automatic inline F/M mate discovery',
        connectorCount: 0,
        connectors: [],
      },
      assets: [],
      totals: {
        assetCount: 0,
        missingCount: 0,
        uncompressedBytes: 0,
      },
    };
    const missing = [];
    const cache = new Map();
    const fetchedUrls = new Map();

    const setProgress = (text, current, total, detail = '') => {
      const pct = total ? (current / total) * 100 : 0;
      ui.set(text, pct, detail);
    };

    async function fetchIntoZip({ url, zipPath, connectorId = null, purpose = null, required = false }) {
      const absoluteUrl = new URL(url, root).href;

      if (fetchedUrls.has(absoluteUrl)) {
        const prior = fetchedUrls.get(absoluteUrl);
        if (zipPath && prior.bytes) {
          addZipFile(zipPath, prior.bytes);
        }
        return prior;
      }

      const started = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let response;
        try {
          response = await fetch(absoluteUrl, {
            credentials: 'include',
            cache: 'no-store',
            redirect: 'follow',
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const errorEntry = {
            url: absoluteUrl,
            connectorId,
            purpose,
            required,
            httpStatus: response.status,
            statusText: response.statusText || '',
            error: `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
          };
          missing.push(errorEntry);
          fetchedUrls.set(absoluteUrl, { ok: false, error: errorEntry });
          return { ok: false, error: errorEntry };
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        const mimeType = normalizeMime(response.headers.get('content-type'));
        const digest = await sha256(bytes);
        const finalZipPath = zipPath || `raw/${zipSafeName(new URL(absoluteUrl).pathname.split('/').pop() || 'asset.bin')}`;

        addZipFile(finalZipPath, bytes);

        const assetEntry = {
          url: absoluteUrl,
          connectorId,
          purpose,
          zipPath: finalZipPath,
          mimeType,
          byteSize: bytes.byteLength,
          sha256: digest,
          httpStatus: response.status,
          elapsedMs: Math.round(performance.now() - started),
        };
        manifest.assets.push(assetEntry);
        manifest.totals.uncompressedBytes += bytes.byteLength;

        const result = { ok: true, bytes, mimeType, sha256: digest, assetEntry };
        fetchedUrls.set(absoluteUrl, result);
        cache.set(absoluteUrl, result);
        return result;
      } catch (error) {
        const errorEntry = {
          url: absoluteUrl,
          connectorId,
          purpose,
          required,
          httpStatus: null,
          statusText: '',
          error: error?.name === 'AbortError'
            ? `Fetch timed out after ${Math.round(FETCH_TIMEOUT_MS / 1000)} seconds`
            : (error instanceof Error ? error.message : String(error)),
        };
        missing.push(errorEntry);
        fetchedUrls.set(absoluteUrl, { ok: false, error: errorEntry });
        return { ok: false, error: errorEntry };
      }
    }

    async function addGeneratedJson(zipPath, value, connectorId = null, purpose = 'generated metadata', sourceUrl = null) {
      const text = JSON.stringify(value, null, 2);
      const bytes = encodeUtf8(text);
      addZipFile(zipPath, bytes);
      const digest = await sha256(bytes);
      manifest.assets.push({
        url: sourceUrl,
        connectorId,
        purpose,
        zipPath,
        mimeType: 'application/json',
        byteSize: bytes.byteLength,
        sha256: digest,
        httpStatus: null,
        generated: true,
      });
      manifest.totals.uncompressedBytes += bytes.byteLength;
    }

    ui.set('Collecting core assets...', 2, 'audio schematics + connector reference');

    const coreResults = new Map();
    for (let i = 0; i < CORE_ASSETS.length; i++) {
      const path = CORE_ASSETS[i];
      const result = await fetchIntoZip({
        url: path,
        zipPath: `core/${path.split('/').pop()}`,
        purpose: 'core discovery source',
        required: path.includes('connector_reference_export.json') || path.includes('audio_lhd.svg') || path.includes('audio_premium_amp.svg'),
      });
      coreResults.set(path, result);
      setProgress('Collecting core assets...', i + 1, CORE_ASSETS.length, path);
    }

    const connectorRefResult = coreResults.get('interactive/json/connector_reference_export.json');
    if (!connectorRefResult?.ok) {
      throw new Error('connector_reference_export.json could not be loaded; automatic connector discovery cannot continue.');
    }

    const connectorReference = JSON.parse(decodeUtf8(connectorRefResult.bytes));
    const svgTexts = {};
    for (const path of ['interactive/svg/audio_lhd.svg', 'interactive/svg/audio_premium_amp.svg']) {
      const result = coreResults.get(path);
      if (result?.ok) {
        svgTexts[path.split('/').pop()] = decodeUtf8(result.bytes);
      }
    }

    ui.set('Discovering audio connectors...', 12, 'no hardcoded connector list');
    const discovery = discoverConnectors(connectorReference, svgTexts);
    manifest.discovery.connectorCount = discovery.connectorIds.length;
    manifest.discovery.connectors = discovery.connectorIds.map(connectorId => ({
      connectorId,
      reasons: [...discovery.reasons.get(connectorId)].sort(),
      metadataFound: discovery.byId.has(connectorId),
    }));

    await addGeneratedJson(
      'catalog/discovered-connectors.json',
      manifest.discovery.connectors,
      null,
      'automatic connector discovery result',
      new URL('interactive/json/connector_reference_export.json', root).href,
    );

    const assetJobs = [];
    const faceviewJobs = new Map();

    for (const connectorId of discovery.connectorIds) {
      const record = discovery.byId.get(connectorId) || { connectorID: connectorId };
      await addGeneratedJson(
        `connectors/${connectorId}/metadata.json`,
        record,
        connectorId,
        'connector metadata extracted from connector reference',
        new URL('interactive/json/connector_reference_export.json', root).href,
      );

      assetJobs.push({
        url: `locations/${connectorId}.jpg`,
        zipPath: `connectors/${connectorId}/location.jpg`,
        connectorId,
        purpose: 'connector location image',
      });

      const faceview = String(record.terminalFaceview || '').trim();
      if (faceview) {
        const facePath = faceview.startsWith('faceviews/') ? faceview : `faceviews/${faceview}`;
        const faceUrl = new URL(facePath, root).href;
        if (!faceviewJobs.has(faceUrl)) {
          faceviewJobs.set(faceUrl, {
            url: facePath,
            zipPath: `faceviews/${zipSafeName(facePath.split('/').pop())}`,
            connectorId,
            purpose: 'terminal faceview',
          });
        }
      }
    }

    assetJobs.push(...faceviewJobs.values());

    let completed = 0;
    ui.set(`Collecting ${assetJobs.length} discovered assets...`, 15, 'locations + faceviews');
    await mapLimit(assetJobs, ZIP_CONCURRENCY, async job => {
      const result = await fetchIntoZip(job);
      completed++;
      const pct = 15 + (completed / Math.max(1, assetJobs.length)) * 70;
      ui.set(
        `Collecting discovered assets ${completed}/${assetJobs.length}`,
        pct,
        `${job.connectorId || ''} ${job.url}`.trim(),
      );
      return result;
    });

    manifest.totals.assetCount = manifest.assets.length;
    manifest.totals.missingCount = missing.length;

    const readme = [
      'Tesla Model 3 SOP9 Audio Asset Collector',
      `Collector version: ${VERSION}`,
      `Generated: ${manifest.generatedAt}`,
      `Source: ${root}`,
      '',
      'Discovery:',
      '- Connector IDs found in Audio-LHD / Audio-Premium Amp SVGs.',
      '- Connector records containing audio/speaker/woofer/tweeter/subwoofer/amp/radio/A2B terminology.',
      '- Inline F/M connector mates are included automatically when present in connector metadata.',
      '',
      'Integrity:',
      '- manifest.json records source URL, connector ID, MIME type, byte size and SHA-256 for each packaged asset.',
      '- missing-assets.json records the attempted URL, connector ID, HTTP status/status text and error.',
      '',
      'Privacy:',
      '- The collector uses the current same-origin authenticated browser session.',
      '- Cookies, authorization headers and tokens are not exported.',
    ].join('\n');
    addZipFile('README.txt', encodeUtf8(readme));

    const missingBytes = encodeUtf8(JSON.stringify(missing, null, 2));
    addZipFile('missing-assets.json', missingBytes);

    // Freeze final totals after generated connector metadata is included.
    manifest.totals.assetCount = manifest.assets.length;
    manifest.totals.missingCount = missing.length;
    const manifestBytes = encodeUtf8(JSON.stringify(manifest, null, 2));
    addZipFile('manifest.json', manifestBytes);

    ui.set('Creating ZIP (native STORE)...', 88, `${zipEntries.length} files; ${missing.length} missing`);

    // Native standard-ZIP writer. This deliberately avoids third-party archive
    // generation because the observed Tesla collection can stall before any per-file
    // progress callback. STORE is sufficient here: most payload
    // bytes are already-compressed JPEGs and the EPC importer only needs a valid ZIP.
    const zipStarted = performance.now();
    let lastDetail = 'building local file records';
    const heartbeat = setInterval(() => {
      const seconds = Math.max(0, Math.round((performance.now() - zipStarted) / 1000));
      ui.set(`Creating ZIP (native STORE)... ${seconds}s`, null, lastDetail);
    }, ZIP_HEARTBEAT_MS);

    let blob;
    try {
      blob = await createStoredZipBlob(zipEntries, metadata => {
        const pct = 88 + (Math.max(0, Math.min(100, metadata.percent || 0)) / 100) * 11;
        if (metadata.phase === 'files') {
          lastDetail = `files ${metadata.current}/${metadata.total}: ${metadata.currentFile}`;
        } else if (metadata.phase === 'directory') {
          lastDetail = `directory ${metadata.current}/${metadata.total}: ${metadata.currentFile}`;
        } else {
          lastDetail = metadata.currentFile || metadata.phase;
        }
        ui.set('Creating ZIP (native STORE)...', pct, lastDetail);
      });
    } finally {
      clearInterval(heartbeat);
    }

    ui.set('Starting download...', 99, `${Math.round(blob.size / 1024 / 1024 * 10) / 10} MiB ZIP ready`);
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `Tesla_Model3_SOP9_audio_assets_${nowIsoSafe()}.zip`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);

    ui.set('ZIP complete', 100, `${manifest.discovery.connectorCount} connectors; ${manifest.totals.assetCount} assets; ${missing.length} missing; native STORE`);
    console.info('[SOP9 Audio Collector] manifest', manifest);
    if (missing.length) {
      console.table(missing);
    }
    return { manifest, missing };
  }

  const ui = createStatusUi();
  let running = false;

  async function run() {
    if (running) {
      return;
    }
    running = true;
    ui.busy(true);
    try {
      await collectAndZip(ui);
    } catch (error) {
      console.error('[SOP9 Audio Collector]', error);
      ui.set('Collector failed', 0, error instanceof Error ? error.message : String(error));
    } finally {
      running = false;
      ui.busy(false);
    }
  }

  ui.button.addEventListener('click', run);
  console.info(`[SOP9 Audio Collector] v${VERSION} loaded. Use the floating Collect + ZIP button.`);
})();
