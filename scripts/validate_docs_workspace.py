#!/usr/bin/env python3
"""Fail CI when the public audio workspace drifts from validated repo assets."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "docs" / "index.html"
APP_JS = ROOT / "docs" / "assets" / "app.js"
BUILD_JS = ROOT / "docs" / "assets" / "installed-system.js"
MAP_JS = ROOT / "docs" / "assets" / "vehicle-map.js"
APP_CSS = ROOT / "docs" / "assets" / "app.css"
MAP_CSS = ROOT / "docs" / "assets" / "vehicle-map.css"
BUILD_CSS = ROOT / "docs" / "assets" / "installed-system.css"
BUILD_DATA = ROOT / "docs" / "data" / "installed-system.json"
EPC_XREF = ROOT / "docs" / "assets" / "tesla-parts" / "audio-speakers" / "epc-crossref.json"
EPC_SVG = ROOT / "docs" / "assets" / "tesla-parts" / "audio-speakers" / "audio-speakers.svg"
EPC_PNG = ROOT / "docs" / "assets" / "tesla-parts" / "audio-speakers" / "audio-speakers.png"
COVERAGE = ROOT / "Target_Assets" / "coverage.json"
EXPECTED_EPC_SVG_SHA256 = "043e4161ca010de424e97939df669638c458b6ea0287a1e9cc049cd3b5684909"
EXPECTED_EPC_PNG_SHA256 = "86330aae2440487a7cfa524b4b7adc793c87ee45806644cf69f491148d1faf29"


def fail(message: str) -> None:
    raise SystemExit(f"workspace validation failed: {message}")


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


for path in (INDEX, APP_JS, BUILD_JS, MAP_JS, APP_CSS, MAP_CSS, BUILD_CSS, BUILD_DATA, EPC_XREF, EPC_SVG, COVERAGE):
    require(path.is_file(), f"missing required file: {path.relative_to(ROOT)}")

index = INDEX.read_text(encoding="utf-8")
app_js = APP_JS.read_text(encoding="utf-8")
build_js = BUILD_JS.read_text(encoding="utf-8")
map_js = MAP_JS.read_text(encoding="utf-8")
source = index + "\n" + app_js + "\n" + build_js + "\n" + map_js
coverage = json.loads(COVERAGE.read_text(encoding="utf-8-sig"))
epc = json.loads(EPC_XREF.read_text(encoding="utf-8"))
build = json.loads(BUILD_DATA.read_text(encoding="utf-8"))

require(isinstance(coverage, list) and len(coverage) == 15, "coverage.json must contain exactly 15 target endpoints")
expected_ids = {f"SPK{i:02d}" for i in range(1, 16)}
actual_ids = {str(item.get("ID")) for item in coverage}
require(actual_ids == expected_ids, f"target IDs differ: expected {sorted(expected_ids)}, got {sorted(actual_ids)}")
require(len([item.get("ID") for item in coverage]) == len(actual_ids), "project target IDs must remain unique")
target_numbers = [item.get("#") for item in coverage]
require(len(target_numbers) == len(set(target_numbers)) and set(target_numbers) == set(range(1, 16)), "project target numbers must remain unique 1-15")

# GitHub Pages publishes /docs only. Service-reference assets outside docs are intentionally resolved via raw GitHub URLs.
require("../Target_Assets/" not in source, "public workspace contains an out-of-/docs relative Target_Assets path")
require("https://raw.githubusercontent.com/dutchdevil-83/tesla-model3-sop9-audio-epc/main/" in app_js, "workspace must resolve repository Service assets through the public raw repo base")
require("assets/installed-system.js" in index and "assets/installed-system.css" in index, "current-build overlay is not loaded by the published page")
require("data/installed-system.json" in build_js, "current-build data is not loaded by the published page")

# The primary view must use the canonical HAR-derived Tesla Parts Catalog SVG, never the retired hand-drawn car.
require("VEHICLE MAP" in index and ">Vehicle map<" in index, "vehicle map is not the primary workspace navigation")
require("Tesla Parts Catalog · Audio Speakers" in index, "Parts Catalog Audio Speakers is not the primary showcase title")
require("assets/tesla-parts/audio-speakers/audio-speakers.svg" in map_js, "canonical local Parts Catalog SVG path is not referenced")
require("Audio%20Speakers%20TI-6789_41ee8600-5062-4d1f-acb9-99e40abe74d0.png" in map_js, "captured source PNG fallback is missing")
require(EXPECTED_EPC_SVG_SHA256 in map_js, "workspace does not pin the canonical Parts Catalog SVG SHA-256")
require(EXPECTED_EPC_PNG_SHA256 in map_js, "workspace does not pin the captured source PNG SHA-256")
require("assets/model3-highland-map.svg" not in map_js, "retired custom vehicle illustration is still used by the UI")
require("showVehicleMap" in map_js and "epcCallouts" in map_js, "Parts Catalog vehicle interaction layer is missing")

# Validate the exact HAR-derived cross-reference rather than hard-coded replacement hotspot coordinates.
require(epc.get("title") == "Audio Speakers", "EPC cross-reference title is not Audio Speakers")
require(epc.get("systemGroupExternalReference") == "f4141a01-51b2-4100-9616-1451fead933e", "unexpected Audio Speakers system-group reference")
require(epc.get("sourceSvg", {}).get("sha256") == EXPECTED_EPC_SVG_SHA256, "EPC cross-reference SVG hash differs from canonical HAR asset")
require(epc.get("sourceImage", {}).get("sha256") == EXPECTED_EPC_PNG_SHA256, "EPC cross-reference PNG hash differs from captured HAR asset")
callouts = epc.get("callouts", [])
require(len(callouts) == 18, f"expected 18 original Tesla callout circles, found {len(callouts)}")
annotations = {str(item.get("annotation")) for item in callouts}
require({"1", "2", "3", "4", "5", "6", "7", "8", "9", "10"}.issubset(annotations), f"missing expected Tesla annotations: {sorted(annotations)}")
annotation_counts = Counter(str(item.get("annotation")) for item in callouts)
require(any(count > 1 for count in annotation_counts.values()), "repeated Tesla EPC annotations must remain representable")
require("Tesla EPC" in map_js and "EPC ${" in map_js, "UI must label source annotations as Tesla EPC identifiers")
require("Project target" in app_js + build_js and "SPK" in app_js + build_js, "UI must label project identifiers as project targets")

mapped_targets: set[str] = set()
for mapping in epc.get("annotationMappings", {}).values():
    mapped_targets.update(str(v) for v in mapping.get("targets", []))
require(mapped_targets == expected_ids, f"EPC-to-project cross-reference does not cover all SPK01-SPK15 targets: {sorted(mapped_targets)}")
for annotation, mapping in epc.get("annotationMappings", {}).items():
    require(set(str(target) for target in mapping.get("targets", [])).issubset(expected_ids), f"EPC annotation {annotation} maps to an invalid project target")
require(any(len(mapping.get("targets", [])) > 1 for mapping in epc.get("annotationMappings", {}).values()), "one-to-many EPC mappings must remain representable")
require("MAPPED - CONFIDENCE RECORDED" in build_js and "mapping.confidence" in build_js, "mapping existence must stay separate from mapping confidence")
require("return { label: 'VERIFIED', tone: 'verified', annotations" not in build_js, "current-build mapping logic must not promote mapping presence to VERIFIED")
for target_id, expected_confidence in (("SPK08", "location-count-candidate"), ("SPK14", "probable-location-pair")):
    matches = [mapping for mapping in epc.get("annotationMappings", {}).values() if target_id in mapping.get("targets", [])]
    require(matches and matches[0].get("confidence") == expected_confidence, f"{target_id} confidence source changed unexpectedly")

# Current purchased build: hardware state is not the same thing as Tesla source evidence.
require(build.get("schemaVersion") == 1, "unexpected installed-system schema")
targets = build.get("targets", {})
require(set(targets) == expected_ids, "installed-system.json must map every SPK01-SPK15 reference target")
require(targets["SPK01"].get("component") == "HELIX Ci7 W200FM-S3", "front woofer purchase mapping changed")
require(targets["SPK03"].get("component") == "HELIX Ci7 T20FM-SC", "front tweeter purchase mapping changed")
require(targets["SPK05"].get("component") == "HELIX Ci7 M100FM-S3", "dash midrange purchase mapping changed")
require(targets["SPK06"].get("component") == "HELIX Ci3 C100.2FM-S3 MK2", "center coaxial purchase mapping changed")
require(targets["SPK10"].get("status") == "OEM STOCK" and targets["SPK11"].get("status") == "OEM STOCK", "rear doors must remain Tesla OEM in current build")
require(targets["SPK12"].get("status") == "NONE / FUTURE" and targets["SPK13"].get("status") == "NONE / FUTURE", "parcel-shelf positions must remain absent/future")
subs = build.get("subwooferSubsystem", [])
require(len(subs) == 2 and all(item.get("manufacturer") == "Pioneer" for item in subs), "current build must retain two Pioneer trunk subwoofer placeholders")
require(all(item.get("model") == "TBD" for item in subs), "Pioneer model must remain TBD until exact hardware is supplied")
require("Do not use X588/X593" in build_js, "trunk subwoofer subsystem must stay separate from parcel-shelf connector wiring")

amp = next((item for item in build.get("systemHardware", []) if item.get("id") == "AMP01"), None)
harness = next((item for item in build.get("systemHardware", []) if item.get("id") == "HARNESS01"), None)
require(amp and amp.get("model") == "V TWELVE DSP MK2", "current DSP amplifier must be HELIX V TWELVE DSP MK2")
require(harness and "FITMENT CHECK REQUIRED" in harness.get("status", ""), "PP-TES Ryzen harness must retain explicit Highland fitment warning")
require("NOT compatible with Model 3 Highland" in harness.get("warning", ""), "Ryzen vs Highland compatibility warning was removed")

# Raw technical identifiers must never be humanized.
coverage_by_id = {str(item.get("ID")): item for item in coverage}
require(coverage_by_id["SPK01"].get("Premium Amp pins") == "X561-7/8", "SPK01 premium amp pins changed")
require(coverage_by_id["SPK08"].get("Premium Amp pins") == "X560-9/10", "SPK08 premium amp pins changed")
require("rawEngineeringValue(selected['Premium Amp pins'])" in build_js and "${esc(ampPinsRaw)}" in build_js, "wiring inspector must render raw premium amp pin identifiers verbatim")
require("stateFromEvidence(selected['Premium Amp pins'])" not in build_js, "technical pin identifiers must not pass through token humanization")

# Readiness is derived from independent evidence dimensions; legacy Engineering status is not an aggregate UI status.
def evidence_state(value: object) -> str:
    text = str(value or "").strip().upper()
    if not text:
        return "UNKNOWN"
    if "GAP" in text or "403" in text or "UNAVAILABLE" in text:
        return "SOURCE GAP"
    if "VERIFIED" in text:
        return "VERIFIED"
    return text

require(evidence_state(coverage_by_id["SPK05"].get("Location")) == "SOURCE GAP", "known X566 source gap must remain explicit")
require("documentationReadinessCurrentBuild" in build_js and "Documentation readiness" in build_js, "UI must expose derived documentation readiness")
require("selected['Engineering status']" not in source and 'selected["Engineering status"]' not in source, "legacy aggregate Engineering status must not be rendered as readiness")

# Viewer semantics are source-level regressions that do not require brittle pixel assertions.
require("MAX_ZOOM = 16" in app_js, "schematic viewer must retain a substantially larger zoom range")
for marker in ("fitView", "fitWidth", "zoomTo100", "resetView", "setZoom", "event.clientX", "event.preventDefault()"):
    require(marker in app_js, f"schematic viewer navigation marker missing: {marker}")
require("audio-speakers.svg" in map_js and "SOURCE_PNG_FALLBACK" in map_js, "canonical SVG and captured remote fallback behavior must remain present")

# Essential interface typography is guarded by focused unit tests. Nonessential provenance text is allowed to be smaller.
css = APP_CSS.read_text(encoding="utf-8") + "\n" + MAP_CSS.read_text(encoding="utf-8") + "\n" + BUILD_CSS.read_text(encoding="utf-8")
for selector in (".searchbox input", ".rail-btn", ".tab", ".position-chip", ".connector-table", ".inspect-title", ".inspect-sub", ".inspect-tab", ".kv"):
    match = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", css, re.S)
    require(match is not None, f"essential typography selector missing: {selector}")
    size = re.search(r"font-size\s*:\s*(\d+)px", match.group(1))
    if size:
        require(int(size.group(1)) >= 12, f"essential workspace typography below 12px: {selector}")

# Official reference contract: store links/summaries, not vendored third-party manuals.
require("teslaService" in build and build.get("teslaService"), "Tesla Service procedure cross-reference missing")
require(all(str(item.get("url", "")).startswith("https://service.tesla.com/") for item in build["teslaService"].values()), "Tesla Service references must use official service.tesla.com URLs")
for product in build.get("products", {}).values():
    require(product.get("references"), f"official product references missing for {product.get('name')}")
    require(any("audiotec-fischer.de" in reference.get("url", "") for reference in product["references"]), f"Audiotec Fischer source missing for {product.get('name')}")

# The SVG is the canonical local UI asset and must be pinned byte-for-byte.
actual_svg_hash = hashlib.sha256(EPC_SVG.read_bytes()).hexdigest()
require(actual_svg_hash == EXPECTED_EPC_SVG_SHA256, f"canonical Parts Catalog SVG hash mismatch: {actual_svg_hash}")
if EPC_PNG.is_file():
    actual_png_hash = hashlib.sha256(EPC_PNG.read_bytes()).hexdigest()
    require(actual_png_hash == EXPECTED_EPC_PNG_SHA256, f"local Parts Catalog PNG hash mismatch: {actual_png_hash}")

for banned in ("vehicle-svg", '<path class="outline"', "class='outline'"):
    require(banned not in source, f"banned generic vehicle renderer marker returned: {banned}")

for rel in ("Target_Assets/core/audio_lhd.svg", "Target_Assets/core/audio_premium_amp.svg"):
    require((ROOT / rel).is_file(), f"missing Tesla Service source schematic: {rel}")
    require(Path(rel).name in app_js, f"workspace no longer references Tesla Service source schematic: {rel}")

location_count = 0
for item in coverage:
    connector = str(item.get("Connector", "")).strip()
    faceview = str(item.get("Faceview file", "")).strip()
    location_state = str(item.get("Location", ""))
    require(connector, f"{item.get('ID')} has no connector")
    require((ROOT / "Target_Assets" / "connectors" / connector / "metadata.json").is_file(), f"missing metadata for {connector}")
    require(faceview and (ROOT / "Target_Assets" / faceview).is_file(), f"missing faceview for {connector}: {faceview}")
    location = ROOT / "Target_Assets" / "connectors" / connector / "location.jpg"
    if connector == "X566":
        require("GAP" in location_state, "X566 must retain explicit visual-gap state")
        require(not location.exists(), "X566 unexpectedly has a target location image; coverage/fallback logic must be reviewed")
    else:
        require(location.is_file(), f"missing target location image for {connector}")
        location_count += 1
require(location_count == 14, f"expected 14 target location images, found {location_count}")

print("Public audio workspace validation: PASS")
print("  target endpoints     : 15/15")
print("  current build        : owner-confirmed hardware overlay present")
print("  rear doors           : Tesla OEM retained")
print("  parcel shelf         : none/future; Pioneer trunk subs separate")
print("  Tesla EPC callouts   : 18 original callout circles")
print("  mapping confidence   : preserved; mapping presence is not VERIFIED")
print("  raw identifiers      : amp pin strings preserved")
print("  Parts Catalog SVG    : canonical local asset + hash pinned")
print("  location images      : 14/15 (X566 documented gap)")
print("  Service references   : official Tesla + Audiotec Fischer links")
