"""Regression checks for the PP-TES -> SOP9 -> V TWELVE engineering map."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = json.loads((ROOT / "docs/data/installed-system.json").read_text(encoding="utf-8"))
HARNESS = json.loads((ROOT / "docs/data/harness-integration.json").read_text(encoding="utf-8"))
HARNESS_JS = (ROOT / "docs/assets/harness-map.js").read_text(encoding="utf-8")
INDEX = (ROOT / "docs/index.html").read_text(encoding="utf-8")


class HarnessMappingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.integration = HARNESS
        self.channels = {channel["label"]: channel for channel in self.integration["channels"]}

    def test_seven_store_confirmed_logical_channels_are_recorded(self) -> None:
        self.assertEqual(
            list(self.channels),
            ["Front Low Left", "Front Low Right", "Front Left", "Center", "Front Right", "Rear Left", "Rear Right"],
        )
        self.assertEqual(self.channels["Front Low Left"]["directTarget"], "SPK01")
        self.assertEqual(self.channels["Front Low Right"]["directTarget"], "SPK02")
        self.assertEqual(self.channels["Front Left"]["directTarget"], "SPK05")
        self.assertEqual(self.channels["Center"]["directTarget"], "SPK06")
        self.assertEqual(self.channels["Front Right"]["directTarget"], "SPK07")
        self.assertEqual(self.channels["Rear Left"]["directTarget"], "SPK10")
        self.assertEqual(self.channels["Rear Right"]["directTarget"], "SPK11")

    def test_dash_channels_match_store_description(self) -> None:
        self.assertIn("instrument-panel", self.channels["Front Left"]["sourceRole"])
        self.assertIn("instrument-panel", self.channels["Center"]["sourceRole"])
        self.assertIn("instrument-panel", self.channels["Front Right"]["sourceRole"])
        self.assertEqual(self.channels["Front Left"]["derivedTargets"], ["SPK03"])
        self.assertEqual(self.channels["Front Right"]["derivedTargets"], ["SPK04"])

    def test_in_out_sleeves_keep_polarity_and_direction(self) -> None:
        for label, channel in self.channels.items():
            self.assertEqual(channel["inputSleeves"], [f"{label} IN +", f"{label} IN -"])
            self.assertEqual(channel["outputSleeves"], [f"{label} OUT +", f"{label} OUT -"])
        self.assertIn("high-level input", self.integration["directionSemantics"]["IN"])
        self.assertIn("speaker output", self.integration["directionSemantics"]["OUT"])

    def test_sop9_source_functions_are_verified_from_repository_reference(self) -> None:
        source = self.integration["sop9SourceVerification"]
        self.assertEqual(source["status"], "VERIFIED")
        self.assertIn("X171", source["source"])
        self.assertIn("X175", source["source"])
        for channel in self.integration["channels"]:
            self.assertEqual(channel["verification"], "TESLA SOP9 SOURCE FUNCTION VERIFIED")
            self.assertIn(channel["teslaSop9"]["sourceConnector"], {"X171", "X175"})

    def test_exact_sop9_source_connector_pairs(self) -> None:
        expected = {
            "Front Low Left": ("X171", "6", "AMP2_2P", "5", "AMP2_2N"),
            "Front Low Right": ("X171", "2", "AMP2_1P", "1", "AMP2_1N"),
            "Front Left": ("X175", "10", "AMP3_1_P", "9", "AMP3_1_N"),
            "Center": ("X171", "7", "AMP2_4P", "8", "AMP2_4N"),
            "Front Right": ("X175", "4", "AMP3_3_P", "3", "AMP3_3_N"),
            "Rear Left": ("X175", "13", "AMP3_2_P", "14", "AMP3_2_N"),
            "Rear Right": ("X171", "3", "AMP2_3P", "4", "AMP2_3N"),
        }
        for label, values in expected.items():
            source = self.channels[label]["teslaSop9"]
            actual = (
                source["sourceConnector"],
                source["positiveCavity"],
                source["positiveNet"],
                source["negativeCavity"],
                source["negativeNet"],
            )
            self.assertEqual(actual, values, label)

    def test_ryzen_harness_rework_is_separate_from_verified_tesla_map(self) -> None:
        rework = self.integration["ryzenHarnessRework"]
        self.assertIn("REPIN", rework["status"])
        self.assertIn("already verified", rework["verificationBoundary"])
        self.assertIn("continuity", rework["finalQc"].lower())
        self.assertNotIn("teslaCavityVerification", self.integration)

    def test_optional_woofer_lead_stays_separate_from_parcel_shelf(self) -> None:
        woofer = self.integration["optionalWooferLead"]
        self.assertIn("NOT A TESLA SOURCE CHANNEL", woofer["status"])
        self.assertIn("X588/X593", woofer["warning"])
        self.assertEqual(BUILD["targets"]["SPK12"]["status"], "NONE / FUTURE")
        self.assertEqual(BUILD["targets"]["SPK13"]["status"], "NONE / FUTURE")

    def test_harness_ui_is_loaded_and_exposes_verified_sop9_pairs(self) -> None:
        self.assertIn('assets/harness-map.js', INDEX)
        self.assertIn('assets/harness-map.css', INDEX)
        self.assertIn("data/harness-integration.json", HARNESS_JS)
        self.assertIn("channelsForTarget", HARNESS_JS)
        self.assertIn("DIRECT HARNESS CHANNEL", HARNESS_JS)
        self.assertIn("DSP-DERIVED OUTPUT", HARNESS_JS)
        self.assertIn("Tesla SOP9 source", HARNESS_JS)
        self.assertIn("7-channel PP-TES / SOP9 topology", HARNESS_JS)


if __name__ == "__main__":
    unittest.main()
