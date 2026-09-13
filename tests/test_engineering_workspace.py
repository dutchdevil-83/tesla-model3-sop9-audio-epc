"""Focused regression checks for the public engineering workspace semantics."""
from __future__ import annotations

import json
import re
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP_JS = (ROOT / "docs/assets/app.js").read_text(encoding="utf-8")
MAP_JS = (ROOT / "docs/assets/vehicle-map.js").read_text(encoding="utf-8")
CSS = "\n".join((ROOT / path).read_text(encoding="utf-8") for path in ("docs/assets/app.css", "docs/assets/vehicle-map.css"))
COVERAGE = json.loads((ROOT / "Target_Assets/coverage.json").read_text(encoding="utf-8-sig"))
CROSSREF = json.loads((ROOT / "docs/assets/tesla-parts/audio-speakers/epc-crossref.json").read_text(encoding="utf-8"))


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
    target_id = str(item["ID"])
    mapping_present = any(target_id in [str(target) for target in mapping.get("targets", [])] for mapping in CROSSREF["annotationMappings"].values())
    dimensions = (
        evidence_state(item.get("Metadata")),
        "VERIFIED" if item.get("Connector") and evidence_state(item.get("Faceview")) == "VERIFIED" else "SOURCE GAP",
        evidence_state(item.get("Location")),
        "CAPTURED" if item.get("Cavities / route") else "UNKNOWN",
        "VERIFIED" if mapping_present else "NOT MAPPED",
    )
    return "PARTIAL" if any(state in {"SOURCE GAP", "UNKNOWN", "NOT MAPPED"} for state in dimensions) else "READY"


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
        self.assertIn("Project target", APP_JS)
        self.assertIn('class="chip-id">${esc(component.ID)}', APP_JS)

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
        self.assertTrue(all(target in {f"SPK{index:02d}" for index in range(1, 16)} for target in mapping["targets"]))

    def test_source_gap_is_partial_and_stage_is_independent(self) -> None:
        by_id = {str(item["ID"]): item for item in COVERAGE}
        self.assertEqual(readiness_state(by_id["SPK05"]), "PARTIAL")
        self.assertEqual(readiness_state(by_id["SPK08"]), "READY")
        self.assertIn("documentationReadiness", APP_JS)
        self.assertIn("Documentation readiness", APP_JS)
        self.assertIn("Current upgrade stage", APP_JS)
        self.assertIn("DEFERRED TO FULL 15", APP_JS)
        self.assertNotIn("selected['Engineering status']", APP_JS)
        self.assertNotIn('selected["Engineering status"]', APP_JS)

    def test_viewer_has_high_range_pointer_navigation_and_svg_source(self) -> None:
        self.assertRegex(APP_JS, r"MAX_ZOOM\s*=\s*16")
        for marker in ("fitView", "fitWidth", "zoomTo100", "resetView", "setZoom", "event.clientX", "event.preventDefault()"):
            self.assertIn(marker, APP_JS)
        self.assertIn("assets/tesla-parts/audio-speakers/audio-speakers.svg", MAP_JS)
        self.assertIn("SOURCE_PNG_FALLBACK", MAP_JS)
        self.assertNotIn("schematic.src = SOURCE_PNG_FALLBACK", MAP_JS)

    def test_essential_typography_does_not_return_to_old_small_scale(self) -> None:
        self.assertIsNone(re.search(r"font-size\s*:\s*(?:8|9|10|11)px", CSS))


if __name__ == "__main__":
    unittest.main()
