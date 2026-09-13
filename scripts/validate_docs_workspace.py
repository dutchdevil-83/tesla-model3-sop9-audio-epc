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
MAP_JS = ROOT / "docs" / "assets" / "vehicle-map.js"
APP_CSS = ROOT / "docs" / "assets" / "app.css"
MAP_CSS = ROOT / "docs" / "assets" / "vehicle-map.css"
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


for path in (INDEX, APP_JS, MAP_JS, APP_CSS, MAP_CSS, EPC_XREF, EPC_SVG, COVERAGE):
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
require(len([item.get("ID") for item in coverage]) == len(actual_ids), "project target IDs must remain unique")
target_numbers = [item.get("#") for item in coverage]
require(len(target_numbers) == len(set(target_numbers)) and set(target_numbers) == set(range(1, 16)), "project target numbers must remain unique 1-15")

# GitHub Pages publishes /docs only. Service-reference assets outside docs are intentionally resolved via raw GitHub URLs.
require("../Target_Assets/" not in source, "public workspace contains an out-of-/docs relative Target_Assets path")
require(
    "https://raw.githubusercontent.com/dutchdevil-83/tesla-model3-sop9-audio-epc/main/" in app_js,
    "workspace must resolve repository Service assets through the public raw repo base",
)

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
require("Project target" in app_js and "SPK" in app_js, "UI must label project identifiers as project targets")

mapped_targets: set[str] = set()
for item in epc.get("annotationMappings", {}).values():
    mapped_targets.update(str(v) for v in item.get("targets", []))
require(mapped_targets == expected_ids, f"EPC-to-project cross-reference does not cover all SPK01-SPK15 targets: {sorted(mapped_targets)}")
for annotation, mapping in epc.get("annotationMappings", {}).items():
    require(set(str(target) for target in mapping.get("targets", [])).issubset(expected_ids), f"EPC annotation {annotation} maps to an invalid project target")
require(any(len(mapping.get("targets", [])) > 1 for mapping in epc.get("annotationMappings", {}).values()), "one-to-many EPC mappings must remain representable")
annotation_one_occurrences = annotation_counts.get("1", 0)
annotation_one_parts = [part.get("quantity") for part in epc.get("parts", []) if str(part.get("annotation")) == "1"]
annotation_one_targets = epc.get("annotationMappings", {}).get("1", {}).get("targets", [])
require(annotation_one_occurrences == 1 and 2 in annotation_one_parts and len(annotation_one_targets) == 2, "quantity, source occurrences and mapped targets must remain distinct evidence values")
require(len(epc.get("parts", [])) >= 10, "EPC cross-reference lost captured parts rows")

# Readiness is derived from independent evidence dimensions; the historical source field is not an aggregate UI status.
def evidence_state(value: object) -> str:
    text = str(value or "").strip().upper()
    if not text:
        return "UNKNOWN"
    if "GAP" in text or "403" in text or "UNAVAILABLE" in text:
        return "SOURCE GAP"
    if "VERIFIED" in text:
        return "VERIFIED"
    return text


def readiness_state(item: dict[str, object]) -> str:
    mapping_present = any(str(item.get("ID")) in [str(target) for target in mapping.get("targets", [])] for mapping in epc.get("annotationMappings", {}).values())
    dimensions = (
        evidence_state(item.get("Metadata")),
        "VERIFIED" if item.get("Connector") and evidence_state(item.get("Faceview")) == "VERIFIED" else "SOURCE GAP",
        evidence_state(item.get("Location")),
        "CAPTURED" if item.get("Cavities / route") else "UNKNOWN",
        "VERIFIED" if mapping_present else "NOT MAPPED",
    )
    return "PARTIAL" if any(state in {"SOURCE GAP", "UNKNOWN", "NOT MAPPED"} for state in dimensions) else "READY"


readiness_by_id = {str(item.get("ID")): readiness_state(item) for item in coverage}
require(readiness_by_id.get("SPK05") == "PARTIAL", "known X566 source gap must produce PARTIAL documentation readiness")
require("documentationReadiness" in app_js and "Documentation readiness" in app_js, "UI must expose derived documentation readiness")
require("selected['Engineering status']" not in app_js and 'selected["Engineering status"]' not in app_js, "legacy aggregate Engineering status must not be rendered as readiness")
require("DEFERRED TO FULL 15" in app_js and "Current upgrade stage" in app_js, "deferred stage inclusion must remain distinct from evidence readiness")

# Viewer semantics are source-level regressions that do not require brittle pixel assertions.
require("MAX_ZOOM = 16" in app_js, "schematic viewer must retain a substantially larger zoom range")
for marker in ("fitView", "fitWidth", "zoomTo100", "resetView", "setZoom", "event.clientX", "event.preventDefault()"):
    require(marker in app_js, f"schematic viewer navigation marker missing: {marker}")
require("audio-speakers.svg" in map_js and "SOURCE_PNG_FALLBACK" in map_js, "canonical SVG and captured remote fallback behavior must remain present")

# Essential interface text may not regress to the old 8-11px scale.
css = APP_CSS.read_text(encoding="utf-8") + "\n" + MAP_CSS.read_text(encoding="utf-8")
require(not re.search(r"font-size\s*:\s*(?:8|9|10|11)px", css), "essential workspace typography regressed below 12px")

# The SVG is the canonical local UI asset and must be pinned byte-for-byte.
actual_svg_hash = hashlib.sha256(EPC_SVG.read_bytes()).hexdigest()
require(actual_svg_hash == EXPECTED_EPC_SVG_SHA256, f"canonical Parts Catalog SVG hash mismatch: {actual_svg_hash}")

# The local PNG is retained as source-image provenance only; runtime fallback remains the captured remote URL.
if EPC_PNG.is_file():
    actual_png_hash = hashlib.sha256(EPC_PNG.read_bytes()).hexdigest()
    require(actual_png_hash == EXPECTED_EPC_PNG_SHA256, f"local Parts Catalog PNG hash mismatch: {actual_png_hash}")

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
print("  Parts Catalog SVG    : canonical local asset + hash pinned")
print(f"  PNG provenance       : {'local copy + hash pinned' if EPC_PNG.is_file() else 'remote source hash pinned; local copy not materialized'}")
print("  location images      : 14/15 (X566 documented gap)")
print("  Service schematics   : audio_lhd.svg + audio_premium_amp.svg")
print("  custom vehicle asset : not used")
