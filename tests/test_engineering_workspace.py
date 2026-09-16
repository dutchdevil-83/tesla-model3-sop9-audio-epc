"""Focused regression checks for the public engineering workspace semantics."""
from __future__ import annotations

import json
import re
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_JS = (ROOT / "docs/assets/app.js").read_text(encoding="utf-8")
BUILD_JS = (ROOT / "docs/assets/installed-system.js").read_text(encoding="utf-8")
MAP_JS = (ROOT / "docs/assets/vehicle-map.js").read_text(encoding="utf-8")
APP_CSS = (ROOT / "docs/assets/app.css").read_text(encoding="utf-8")
MAP_CSS = (ROOT / "docs/assets/vehicle-map.css").read_text(encoding="utf-8")
BUILD_CSS = (ROOT / "docs/assets/installed-system.css").read_text(encoding="utf-8")
COVERAGE = json.loads((ROOT / "Target_Assets/coverage.json").read_text(encoding="utf-8-sig"))
CROSSREF = json.loads((ROOT / "docs/assets/tesla-parts/audio-speakers/epc-crossref.json").read_text(encoding="utf-8"))
BUILD = json.loads((ROOT / "docs/data/installed-system.json").read_text(encoding="utf-8"))

ESSENTIAL_SELECTORS = (
    ".searchbox input", ".rail-btn", ".tab", ".position-chip", ".connector-table",
    ".inspect-title", ".inspect-sub", ".inspect-tab", ".kv",
)


def evidence_state(value: object) -> str:
    text = str(value or "").strip().upper()
    if not text:
        return "UNKNOWN"
    if "GAP" in text or "403" in text or "UNAVAILABLE" in text:
        return "SOURCE GAP"
    if "VERIFIED" in text:
        return "VERIFIED"
    return text


def target_mapping(target_id: str) -> list[dict[str, object]]:
    return [
        {"annotation": annotation, **mapping}
        for annotation, mapping in CROSSREF["annotationMappings"].items()
        if target_id in [str(target) for target in mapping.get("targets", [])]
    ]


def readiness_state(item: dict[str, object]) -> str:
    mappings = target_mapping(str(item["ID"]))
    dimensions = (
        evidence_state(item.get("Metadata")),
        "VERIFIED" if item.get("Connector") and evidence_state(item.get("Faceview")) == "VERIFIED" else "SOURCE GAP",
        evidence_state(item.get("Location")),
        "CAPTURED" if item.get("Cavities / route") else "UNKNOWN",
        "MAPPED-WITH-CONFIDENCE" if mappings else "NOT MAPPED",
    )
    return "PARTIAL" if any(state in {"SOURCE GAP", "UNKNOWN", "NOT MAPPED", "MAPPED-WITH-CONFIDENCE"} for state in dimensions) else "READY"


class EngineeringWorkspaceTests(unittest.TestCase):
    def test_project_target_namespace_is_unique(self) -> None:
        ids = [str(item["ID"]) for item in COVERAGE]
        numbers = [item["#"] for item in COVERAGE]
        self.assertEqual(ids, [f"SPK{index:02d}" for index in range(1, 16)])
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(numbers, list(range(1, 16)))
        self.assertEqual(len(numbers), len(set(numbers)))

    def test_repeated_epc_annotations_are_labeled_as_source_identifiers(self) -> None:
        counts = Counter(str(callout["annotation"]) for callout in CROSSREF["callouts"])
        self.assertGreater(counts["5"], 1)
        self.assertGreater(counts["6"], 1)
        self.assertIn('class="epc-visible-label" aria-hidden="true">EPC ', MAP_JS)
        self.assertIn("Tesla EPC", MAP_JS)
        self.assertIn("Project target", APP_JS + BUILD_JS)

    def test_mapping_presence_does_not_become_verified(self) -> None:
        self.assertEqual(target_mapping("SPK08")[0]["confidence"], "location-count-candidate")
        self.assertEqual(target_mapping("SPK14")[0]["confidence"], "probable-location-pair")
        self.assertNotIn("return { label: 'VERIFIED', tone: 'verified', annotations", BUILD_JS)
        self.assertIn("MAPPED - CONFIDENCE RECORDED", BUILD_JS)
        self.assertIn("mapping.confidence", BUILD_JS)
        self.assertEqual(readiness_state(next(item for item in COVERAGE if item["ID"] == "SPK08")), "PARTIAL")
        self.assertEqual(readiness_state(next(item for item in COVERAGE if item["ID"] == "SPK14")), "PARTIAL")

    def test_one_to_many_mapping_keeps_counts_separate(self) -> None:
        mapping = CROSSREF["annotationMappings"]["1"]
        occurrences = sum(str(callout["annotation"]) == "1" for callout in CROSSREF["callouts"])
        quantity = next(part["quantity"] for part in CROSSREF["parts"] if str(part["annotation"]) == "1")
        self.assertEqual(occurrences, 1)
        self.assertEqual(quantity, 2)
        self.assertEqual(mapping["targets"], ["SPK12", "SPK13"])
        self.assertIn("Source drawing occurrences", MAP_JS)
        self.assertIn("Mapped project targets", MAP_JS)
        self.assertIn("Tesla part quantity", MAP_JS)

    def test_source_gap_and_mapping_confidence_are_independent(self) -> None:
        by_id = {str(item["ID"]): item for item in COVERAGE}
        self.assertEqual(readiness_state(by_id["SPK05"]), "PARTIAL")
        self.assertIn("documentationReadinessCurrentBuild", BUILD_JS)
        self.assertIn("Tesla EPC cross-reference", BUILD_JS)
        self.assertIn("REFERENCE / FUTURE", BUILD_JS)
        self.assertNotIn("selected['Engineering status']", APP_JS + BUILD_JS)

    def test_raw_pin_identifiers_are_preserved(self) -> None:
        by_id = {str(item["ID"]): item for item in COVERAGE}
        self.assertEqual(by_id["SPK01"]["Premium Amp pins"], "X561-7/8")
        self.assertEqual(by_id["SPK08"]["Premium Amp pins"], "X560-9/10")
        self.assertEqual(by_id["SPK03"]["Premium Amp pins"], "")
        self.assertIn("rawEngineeringValue(selected['Premium Amp pins'])", BUILD_JS)
        self.assertIn("${esc(ampPinsRaw)}", BUILD_JS)
        self.assertNotIn("stateFromEvidence(selected['Premium Amp pins'])", BUILD_JS)

    def test_current_build_matches_owner_confirmed_hardware(self) -> None:
        targets = BUILD["targets"]
        self.assertEqual(BUILD["systemHardware"][0]["model"], "V TWELVE DSP MK2")
        self.assertEqual(targets["SPK01"]["component"], "HELIX Ci7 W200FM-S3")
        self.assertEqual(targets["SPK03"]["component"], "HELIX Ci7 T20FM-SC")
        self.assertEqual(targets["SPK05"]["component"], "HELIX Ci7 M100FM-S3")
        self.assertEqual(targets["SPK06"]["component"], "HELIX Ci3 C100.2FM-S3 MK2")
        self.assertEqual(targets["SPK10"]["status"], "OEM STOCK")
        self.assertEqual(targets["SPK11"]["status"], "OEM STOCK")
        self.assertEqual(targets["SPK12"]["status"], "NONE / FUTURE")
        self.assertEqual(targets["SPK13"]["status"], "NONE / FUTURE")
        self.assertEqual(len(BUILD["subwooferSubsystem"]), 2)
        self.assertTrue(all(sub["manufacturer"] == "Pioneer" and sub["model"] == "TBD" for sub in BUILD["subwooferSubsystem"]))

    def test_harness_fitment_warning_is_not_silenced(self) -> None:
        harness = next(item for item in BUILD["systemHardware"] if item["id"] == "HARNESS01")
        self.assertIn("FITMENT CHECK REQUIRED", harness["status"])
        self.assertIn("NOT compatible with Model 3 Highland", harness["warning"])
        self.assertIn("pp-tes-1-7b-highland", harness["references"][1]["url"])

    def test_viewer_has_high_range_pointer_navigation_and_svg_source(self) -> None:
        self.assertRegex(APP_JS, r"MAX_ZOOM\s*=\s*16")
        for marker in ("fitView", "fitWidth", "zoomTo100", "resetView", "setZoom", "event.clientX", "event.preventDefault()"):
            self.assertIn(marker, APP_JS)
        self.assertIn("assets/tesla-parts/audio-speakers/audio-speakers.svg", MAP_JS)
        self.assertIn("SOURCE_PNG_FALLBACK", MAP_JS)
        self.assertNotIn("schematic.src = SOURCE_PNG_FALLBACK", MAP_JS)

    def test_essential_typography_contract_is_targeted(self) -> None:
        css = APP_CSS + "\n" + MAP_CSS + "\n" + BUILD_CSS
        for selector in ESSENTIAL_SELECTORS:
            match = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", css, re.S)
            self.assertIsNotNone(match, selector)
            size = re.search(r"font-size\s*:\s*(\d+)px", match.group(1))
            if size:
                self.assertGreaterEqual(int(size.group(1)), 12, selector)
        grouped_control_rule = re.search(r"\.stage-select select\s*,\s*\.controlbar button\s*\{([^}]*)\}", css, re.S)
        self.assertIsNotNone(grouped_control_rule)
        self.assertRegex(grouped_control_rule.group(1), r"font-size\s*:\s*(?:1[2-9]|[2-9]\d)px")
        self.assertRegex(BUILD_CSS, r"\.reference-links span\s*\{[^}]*font-size\s*:\s*12px")


if __name__ == "__main__":
    unittest.main()
