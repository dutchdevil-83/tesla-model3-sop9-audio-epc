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

    def test_seven_logical_channels_are_recorded(self) -> None:
        self.assertEqual(
            list(self.channels),
            ["Front Low Left", "Front Low Right", "Front Left", "Center", "Front Right", "Rear Left", "Rear Right"],
        )
        targets = ["SPK01", "SPK02", "SPK05", "SPK06", "SPK07", "SPK10", "SPK11"]
        self.assertEqual([channel["directTarget"] for channel in self.integration["channels"]], targets)
        self.assertEqual([channel["vTwelveChannel"] for channel in self.integration["channels"]], list("ABCDEFG"))

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
            self.assertEqual(len(channel["finalSleeveLabels"]), 4)
        self.assertIn("highlevel input", self.integration["directionSemantics"]["IN"].lower())
        self.assertIn("speaker output", self.integration["directionSemantics"]["OUT"].lower())
        self.assertIn("IN -", self.integration["labelingRule"]["inputPolarity"])
        self.assertIn("OUT +", self.integration["labelingRule"]["outputPolarity"])

    def test_sop9_source_functions_and_speaker_returns_are_verified(self) -> None:
        source = self.integration["sop9SourceVerification"]
        self.assertEqual(source["status"], "VERIFIED")
        self.assertIn("X171", source["source"])
        self.assertIn("X175", source["source"])
        for channel in self.integration["channels"]:
            self.assertEqual(channel["verification"], "TESLA SOP9 SOURCE + SPEAKER RETURN VERIFIED")
            self.assertIn(channel["teslaSop9"]["sourceConnector"], {"X171", "X175"})
            self.assertTrue(channel["speakerSide"]["connector"].startswith("X"))

    def test_exact_sop9_source_connector_pairs_and_colors(self) -> None:
        expected = {
            "Front Low Left": ("X171", "6", "AMP2_2P", "YE", "5", "AMP2_2N", "BU"),
            "Front Low Right": ("X171", "2", "AMP2_1P", "YE/WH", "1", "AMP2_1N", "BU/WH"),
            "Front Left": ("X175", "10", "AMP3_1_P", "YE", "9", "AMP3_1_N", "VT"),
            "Center": ("X171", "7", "AMP2_4P", "GY", "8", "AMP2_4N", "BU"),
            "Front Right": ("X175", "4", "AMP3_3_P", "TN", "3", "AMP3_3_N", "BK"),
            "Rear Left": ("X175", "13", "AMP3_2_P", "RD", "14", "AMP3_2_N", "BK"),
            "Rear Right": ("X171", "3", "AMP2_3P", "RD/WH", "4", "AMP2_3N", "BK"),
        }
        for label, values in expected.items():
            source = self.channels[label]["teslaSop9"]
            actual = (
                source["sourceConnector"], source["positiveCavity"], source["positiveNet"], source["positiveWireColor"],
                source["negativeCavity"], source["negativeNet"], source["negativeWireColor"],
            )
            self.assertEqual(actual, values, label)

    def test_exact_speaker_side_connectors_and_colors(self) -> None:
        expected = {
            "Front Low Left": ("X568", "YE", "BU"),
            "Front Low Right": ("X578", "YE", "BU"),
            "Front Left": ("X566", "YE", "VT"),
            "Center": ("X595", "GY", "BU"),
            "Front Right": ("X576", "TN", "BK"),
            "Rear Left": ("X586", "RD", "BK"),
            "Rear Right": ("X591", "RD", "BK"),
        }
        for label, values in expected.items():
            speaker = self.channels[label]["speakerSide"]
            self.assertEqual((speaker["connector"], speaker["positiveWireColor"], speaker["negativeWireColor"]), values, label)

    def test_tweeter_outputs_have_dedicated_verified_speaker_colors(self) -> None:
        outputs = {item["vTwelveOutput"]: item for item in self.integration["derivedOutputs"]}
        self.assertEqual(outputs["H"]["target"], "SPK03")
        self.assertEqual(outputs["H"]["speakerConnector"], "X565")
        self.assertEqual((outputs["H"]["positiveWireColor"], outputs["H"]["negativeWireColor"]), ("VT", "BU"))
        self.assertEqual(outputs["I"]["target"], "SPK04")
        self.assertEqual(outputs["I"]["speakerConnector"], "X575")
        self.assertEqual((outputs["I"]["positiveWireColor"], outputs["I"]["negativeWireColor"]), ("VT", "BU"))

    def test_ryzen_harness_rework_is_separate_from_verified_tesla_map(self) -> None:
        rework = self.integration["ryzenHarnessRework"]
        self.assertIn("REPIN", rework["status"])
        self.assertIn("verified", rework["verificationBoundary"].lower())
        self.assertIn("continuity", rework["finalQc"].lower())
        self.assertNotIn("teslaCavityVerification", self.integration)

    def test_optional_woofer_lead_is_not_a_v_twelve_sub_power_output(self) -> None:
        woofer = self.integration["optionalWooferLead"]
        self.assertIn("NOT USED AS V TWELVE SPEAKER OUTPUT", woofer["status"])
        self.assertIn("LINE OUTPUT M/N", woofer["plannedUse"])
        self.assertIn("X588/X593", woofer["warning"])
        self.assertEqual(BUILD["targets"]["SPK12"]["status"], "NONE / FUTURE")
        self.assertEqual(BUILD["targets"]["SPK13"]["status"], "NONE / FUTURE")

    def test_harness_ui_is_loaded_and_exposes_verified_sop9_colors(self) -> None:
        self.assertIn('assets/harness-map.js', INDEX)
        self.assertIn('assets/harness-map.css', INDEX)
        self.assertIn("data/harness-integration.json", HARNESS_JS)
        self.assertIn("channelsForTarget", HARNESS_JS)
        self.assertIn("DIRECT HARNESS CHANNEL", HARNESS_JS)
        self.assertIn("DSP-DERIVED OUTPUT", HARNESS_JS)
        self.assertIn("Tesla SOP9 source", HARNESS_JS)
        self.assertIn("Speaker-side return", HARNESS_JS)
        self.assertIn("Recommended final sleeves", HARNESS_JS)
        self.assertIn("7-channel PP-TES / SOP9 / V TWELVE topology", HARNESS_JS)


if __name__ == "__main__":
    unittest.main()
