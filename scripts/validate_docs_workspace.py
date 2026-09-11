#!/usr/bin/env python3
"""Fail CI when the public audio workspace drifts from validated repo assets."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "docs" / "index.html"
APP_JS = ROOT / "docs" / "assets" / "app.js"
MAP_JS = ROOT / "docs" / "assets" / "vehicle-map.js"
MAP_SVG = ROOT / "docs" / "assets" / "model3-highland-map.svg"
COVERAGE = ROOT / "Target_Assets" / "coverage.json"


def fail(message: str) -> None:
    raise SystemExit(f"workspace validation failed: {message}")


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


for path in (INDEX, APP_JS, MAP_JS, MAP_SVG, COVERAGE):
    require(path.is_file(), f"missing required file: {path.relative_to(ROOT)}")

index = INDEX.read_text(encoding="utf-8")
app_js = APP_JS.read_text(encoding="utf-8")
map_js = MAP_JS.read_text(encoding="utf-8")
map_svg = MAP_SVG.read_text(encoding="utf-8")
source = index + "\n" + app_js + "\n" + map_js
coverage = json.loads(COVERAGE.read_text(encoding="utf-8-sig"))

require(isinstance(coverage, list) and len(coverage) == 15, "coverage.json must contain exactly 15 target endpoints")
expected_ids = {f"SPK{i:02d}" for i in range(1, 16)}
actual_ids = {str(item.get("ID")) for item in coverage}
require(actual_ids == expected_ids, f"target IDs differ: expected {sorted(expected_ids)}, got {sorted(actual_ids)}")

# GitHub Pages publishes /docs only. Relative ../Target_Assets paths therefore do not exist in the published site.
require("../Target_Assets/" not in source, "public workspace contains an out-of-/docs relative Target_Assets path")
require(
    "https://raw.githubusercontent.com/dutchdevil-83/tesla-model3-sop9-audio-epc/main/" in app_js,
    "workspace must resolve repository assets through the public raw repo base",
)

# The default workspace must be an interactive vehicle-location surface, not the legacy generic outline or a wiring sheet.
require("assets/model3-highland-map.svg" in map_js, "interactive Model 3 vehicle map asset is not referenced")
require("vehicle-map.js" in index and "vehicle-map.css" in index, "vehicle-map runtime is not loaded by docs/index.html")
require("VEHICLE MAP" in index and ">Vehicle map<" in index, "vehicle map is not the primary workspace navigation")
require("NOT TESLA OEM" in map_svg.upper(), "custom vehicle artwork must state that it is not Tesla OEM artwork")
require("showVehicleMap" in map_js, "vehicle map default-view renderer is missing")

# Never silently reintroduce the old generic hand-drawn renderer from v1.x/v2.0.
for banned in ("vehicle-svg", '<path class="outline"', "class='outline'"):
    require(banned not in source, f"banned generic vehicle renderer marker returned: {banned}")

# Hotspot table must explicitly cover every target endpoint exactly once.
hotspot_ids = set(re.findall(r"SPK\d{2}(?=:\{x:)", map_js))
require(hotspot_ids == expected_ids, f"vehicle-map hotspots differ from target IDs: {sorted(hotspot_ids)}")

for rel in ("Target_Assets/core/audio_lhd.svg", "Target_Assets/core/audio_premium_amp.svg"):
    require((ROOT / rel).is_file(), f"missing Tesla source schematic: {rel}")
    require(Path(rel).name in app_js, f"workspace no longer references Tesla source schematic: {rel}")

# The staged sourcing plan defines Core Music 9 as front/center seven plus the rear-door pair.
core9 = {"SPK01", "SPK02", "SPK03", "SPK04", "SPK05", "SPK06", "SPK07", "SPK10", "SPK11"}
for endpoint in core9:
    require(endpoint in app_js, f"Core Music 9 mapping lost endpoint {endpoint}")

location_count = 0
for item in coverage:
    connector = str(item.get("Connector", "")).strip()
    faceview = str(item.get("Faceview file", "")).strip()
    location_state = str(item.get("Location", ""))
    require(connector, f"{item.get('ID')} has no connector")
    require(
        (ROOT / "Target_Assets" / "connectors" / connector / "metadata.json").is_file(),
        f"missing metadata for {connector}",
    )
    require(faceview and (ROOT / "Target_Assets" / faceview).is_file(), f"missing faceview for {connector}: {faceview}")
    location = ROOT / "Target_Assets" / "connectors" / connector / "location.jpg"
    if connector == "X566":
        require("GAP" in location_state, "X566 must retain explicit visual-gap state")
        require(
            not location.exists(),
            "X566 unexpectedly has a target location image; coverage must be reviewed before changing fallback logic",
        )
    else:
        require(location.is_file(), f"missing target location image for {connector}")
        location_count += 1

require(location_count == 14, f"expected 14 target location images, found {location_count}")
print("Public audio workspace validation: PASS")
print("  target endpoints : 15/15")
print("  vehicle hotspots : 15/15")
print("  primary view     : interactive Model 3 vehicle map")
print("  location images  : 14/15 (X566 documented gap)")
print("  source schematics: audio_lhd.svg + audio_premium_amp.svg")
print("  generic vehicle  : rejected")
print("  Pages asset paths: raw repository source")
