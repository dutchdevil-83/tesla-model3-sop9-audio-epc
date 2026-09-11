#!/usr/bin/env python3
"""Fail CI when the public audio workspace drifts from validated repo assets."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "docs" / "index.html"
APP_JS = ROOT / "docs" / "assets" / "app.js"
MAP_JS = ROOT / "docs" / "assets" / "vehicle-map.js"
EPC_XREF = ROOT / "docs" / "assets" / "tesla-parts" / "audio-speakers" / "epc-crossref.json"
EPC_PNG = ROOT / "docs" / "assets" / "tesla-parts" / "audio-speakers" / "audio-speakers.png"
COVERAGE = ROOT / "Target_Assets" / "coverage.json"
EXPECTED_EPC_PNG_SHA256 = "86330aae2440487a7cfa524b4b7adc793c87ee45806644cf69f491148d1faf29"


def fail(message: str) -> None:
    raise SystemExit(f"workspace validation failed: {message}")


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


for path in (INDEX, APP_JS, MAP_JS, EPC_XREF, COVERAGE):
    require(path.is_file(), f"missing required file: {path.relative_to(ROOT)}")

index = INDEX.read_text(encoding="utf-8")
app_js = APP_JS.read_text(encoding="utf-8")
map_js = MAP_JS.read_text(encoding="utf-8")
source = index + "\n" + app_js + "\n" + map_js
coverage = json.loads(COVERAGE.read_text(encoding="utf-8-sig"))
epc = json.loads(EPC_XREF.read_text(encoding="utf-8"))

require(isinstance(coverage, list) and len(coverage) == 15, "coverage.json must contain exactly 15 target endpoints")
expected_ids = {f"SPK{i:02d}" for i in range(1, 16)}
actual_ids = {str(item.get("ID")) for item in coverage}
require(actual_ids == expected_ids, f"target IDs differ: expected {sorted(expected_ids)}, got {sorted(actual_ids)}")

# GitHub Pages publishes /docs only. Service-reference assets outside docs are intentionally resolved via raw GitHub URLs.
require("../Target_Assets/" not in source, "public workspace contains an out-of-/docs relative Target_Assets path")
require(
    "https://raw.githubusercontent.com/dutchdevil-83/tesla-model3-sop9-audio-epc/main/" in app_js,
    "workspace must resolve repository Service assets through the public raw repo base",
)

# The primary view must use the HAR-derived Tesla Parts Catalog illustration, never the retired hand-drawn car.
require("VEHICLE MAP" in index and ">Vehicle map<" in index, "vehicle map is not the primary workspace navigation")
require("Tesla Parts Catalog · Audio Speakers" in index, "Parts Catalog Audio Speakers is not the primary showcase title")
require("assets/tesla-parts/audio-speakers/audio-speakers.png" in map_js, "stable local Parts Catalog PNG path is not referenced")
require("Audio%20Speakers%20TI-6789_41ee8600-5062-4d1f-acb9-99e40abe74d0.png" in map_js, "HAR source-image fallback is missing")
require(EXPECTED_EPC_PNG_SHA256 in map_js, "workspace does not pin the captured Parts Catalog PNG SHA-256")
require("assets/model3-highland-map.svg" not in map_js, "retired custom vehicle illustration is still used by the UI")
require("showVehicleMap" in map_js and "epcCallouts" in map_js, "Parts Catalog vehicle interaction layer is missing")

# Validate the exact HAR-derived cross-reference rather than hard-coded replacement hotspot coordinates.
require(epc.get("title") == "Audio Speakers", "EPC cross-reference title is not Audio Speakers")
require(epc.get("systemGroupExternalReference") == "f4141a01-51b2-4100-9616-1451fead933e", "unexpected Audio Speakers system-group reference")
require(epc.get("sourceImage", {}).get("sha256") == EXPECTED_EPC_PNG_SHA256, "EPC cross-reference PNG hash differs from captured HAR asset")
callouts = epc.get("callouts", [])
require(len(callouts) == 18, f"expected 18 original Tesla callout circles, found {len(callouts)}")
annotations = {str(item.get("annotation")) for item in callouts}
require({"1", "2", "3", "4", "5", "6", "7", "8", "9", "10"}.issubset(annotations), f"missing expected Tesla annotations: {sorted(annotations)}")

mapped_targets: set[str] = set()
for item in epc.get("annotationMappings", {}).values():
    mapped_targets.update(str(v) for v in item.get("targets", []))
require(mapped_targets == expected_ids, f"EPC-to-project cross-reference does not cover all SPK01-SPK15 targets: {sorted(mapped_targets)}")
require(len(epc.get("parts", [])) >= 10, "EPC cross-reference lost captured parts rows")

# If the binary has been materialized by the importer, pin it byte-for-byte. The UI has a HAR URL fallback until then.
if EPC_PNG.is_file():
    actual_hash = hashlib.sha256(EPC_PNG.read_bytes()).hexdigest()
    require(actual_hash == EXPECTED_EPC_PNG_SHA256, f"local Parts Catalog PNG hash mismatch: {actual_hash}")

# Never silently reintroduce the old generic hand-drawn renderer from v1.x/v2.0.
for banned in ("vehicle-svg", '<path class="outline"', "class='outline'"):
    require(banned not in source, f"banned generic vehicle renderer marker returned: {banned}")

for rel in ("Target_Assets/core/audio_lhd.svg", "Target_Assets/core/audio_premium_amp.svg"):
    require((ROOT / rel).is_file(), f"missing Tesla Service source schematic: {rel}")
    require(Path(rel).name in app_js, f"workspace no longer references Tesla Service source schematic: {rel}")

core9 = {"SPK01", "SPK02", "SPK03", "SPK04", "SPK05", "SPK06", "SPK07", "SPK10", "SPK11"}
for endpoint in core9:
    require(endpoint in app_js, f"Core Music 9 mapping lost endpoint {endpoint}")

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
print("  Tesla EPC callouts   : 18 original callout circles")
print("  EPC target mapping   : SPK01-SPK15 covered")
print("  primary view         : Parts Catalog Audio Speakers")
print(f"  Parts Catalog PNG    : {'local + hash pinned' if EPC_PNG.is_file() else 'HAR URL fallback; importer can materialize local binary'}")
print("  location images      : 14/15 (X566 documented gap)")
print("  Service schematics   : audio_lhd.svg + audio_premium_amp.svg")
print("  custom vehicle asset : not used")
