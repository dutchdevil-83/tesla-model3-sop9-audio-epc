Tesla Model 3 SOP9 Audio Asset Collector
Collector version: 1.1.6
Generated: 2026-09-10T11:50:22.583Z
Source: https://service.tesla.com/docs/Model3/ElectricalReference/prog-333/

Discovery:
- Connector IDs found in Audio-LHD / Audio-Premium Amp SVGs.
- Connector records containing audio/speaker/woofer/tweeter/subwoofer/amp/radio/A2B terminology.
- Inline F/M connector mates are included automatically when present in connector metadata.

Integrity:
- manifest.json records source URL, connector ID, MIME type, byte size and SHA-256 for each packaged asset.
- missing-assets.json records the attempted URL, connector ID, HTTP status/status text and error.

Privacy:
- The collector uses the current same-origin authenticated browser session.
- Cookies, authorization headers and tokens are not exported.