"""Regression checks for the owner-confirmed PP-TES -> V TWELVE logical channel map."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = json.loads((ROOT / "docs/data/installed-system.json").read_text(encoding="utf-8"))
HARNESS_JS = (ROOT / "docs/assets/harness-map.js").read_text(encoding="utf-8")
INDEX = (ROOT / "docs/index.html").read_text(encoding="utf-8")


class HarnessMappingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.integration = BUILD["harnessIntegration"]
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

    def test_cavity_level_mapping_is_not_claimed_verified(self) -> None:
        cavity = self.integration["teslaCavityVerification"]
        self.assertEqual(cavity["status"], "PENDING")
        self.assertEqual(cavity["requiredBefore"], "CUTTING OR ENERGIZING")
        self.assertIn("continuity", cavity["scope"].lower())
        for channel in self.integration["channels"]:
            self.assertIn("CAVITY PENDING", channel["verification"])

    def test_optional_woofer_lead_stays_separate_from_parcel_shelf(self) -> None:
        woofer = self.integration["optionalWooferLead"]
        self.assertIn("NOT A TESLA SOURCE CHANNEL", woofer["status"])
        self.assertIn("X588/X593", woofer["warning"])
        self.assertEqual(BUILD["targets"]["SPK12"]["status"], "NONE / FUTURE")
        self.assertEqual(BUILD["targets"]["SPK13"]["status"], "NONE / FUTURE")

    def test_harness_ui_is_loaded_and_uses_target_specific_mapping(self) -> None:
        self.assertIn('assets/harness-map.js', INDEX)
        self.assertIn('assets/harness-map.css', INDEX)
        self.assertIn("channelsForTarget", HARNESS_JS)
        self.assertIn("DIRECT HARNESS CHANNEL", HARNESS_JS)
        self.assertIn("DSP-DERIVED OUTPUT", HARNESS_JS)
        self.assertIn("7-channel PP-TES logical topology", HARNESS_JS)


if __name__ == "__main__":
    unittest.main()
