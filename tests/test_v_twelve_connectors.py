"""Regression checks for HELIX V TWELVE DSP MK2 connector labels and build assignment."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "docs/data/v-twelve-connectors.json").read_text(encoding="utf-8"))
INDEX = (ROOT / "docs/index.html").read_text(encoding="utf-8")
UI = (ROOT / "docs/assets/v-twelve-map.js").read_text(encoding="utf-8")


class VTwelveConnectorTests(unittest.TestCase):
    def test_factory_highlevel_connector_labels_are_exact(self) -> None:
        highlevel = DATA["connectorLabeling"]["highlevelInput"]
        self.assertEqual(highlevel["channels"], list("ABCDEFGHIJKL"))
        self.assertEqual(highlevel["polarityOrderPerChannel"], ["-", "+"])
        self.assertEqual(
            highlevel["rows"][0]["terminals"],
            ["-A", "+A", "-B", "+B", "-C", "+C", "-D", "+D", "-E", "+E", "-F", "+F"],
        )
        self.assertEqual(
            highlevel["rows"][1]["terminals"],
            ["-G", "+G", "-H", "+H", "-I", "+I", "-J", "+J", "-K", "+K", "-L", "+L"],
        )

    def test_factory_speaker_output_labels_are_exact(self) -> None:
        output = DATA["connectorLabeling"]["speakerOutput"]
        self.assertEqual(output["channels"], list("ABCDEFGHIJKL"))
        self.assertEqual(output["polarityOrderPerChannel"], ["+", "-"])
        self.assertEqual(output["blocks"][0]["upper"], ["+A", "-A", "+B", "-B", "+C", "-C"])
        self.assertEqual(output["blocks"][0]["lower"], ["+D", "-D", "+E", "-E", "+F", "-F"])
        self.assertEqual(output["blocks"][1]["upper"], ["+G", "-G", "+H", "-H", "+I", "-I"])
        self.assertEqual(output["blocks"][1]["lower"], ["+J", "-J", "+K", "-K", "+L", "-L"])

    def test_other_physical_connector_labels_are_recorded(self) -> None:
        labels = DATA["connectorLabeling"]
        self.assertEqual(labels["lineInput"]["channels"], list("ABCDEF"))
        self.assertEqual(labels["lineOutput"]["channels"], ["M", "N"])
        controls = {item["label"]: item for item in labels["controlAndPower"]}
        for required in ["USB", "SCP", "CONTROL / STATUS", "OPTICAL INPUT", "REM. OUT", "GND", "POWER REM", "+12V"]:
            self.assertIn(required, controls)
        self.assertEqual(controls["SCP"]["currentBuildUse"], "DIRECTOR for SCP")

    def test_current_build_input_plan_maps_seven_pp_tes_channels_to_a_through_g(self) -> None:
        plan = DATA["currentBuildTerminalPlan"]
        inputs = {item["channel"]: item for item in plan["highlevelInputs"]}
        self.assertEqual(inputs["A"]["harnessLabel"], "Front Low Left")
        self.assertEqual(inputs["B"]["harnessLabel"], "Front Low Right")
        self.assertEqual(inputs["C"]["harnessLabel"], "Front Left")
        self.assertEqual(inputs["D"]["harnessLabel"], "Center")
        self.assertEqual(inputs["E"]["harnessLabel"], "Front Right")
        self.assertEqual(inputs["F"]["harnessLabel"], "Rear Left")
        self.assertEqual(inputs["G"]["harnessLabel"], "Rear Right")
        for channel in "HIJKL":
            self.assertEqual(inputs[channel]["state"], "SPARE")

    def test_output_plan_preserves_direct_channels_and_derives_tweeters(self) -> None:
        outputs = {item["channel"]: item for item in DATA["currentBuildTerminalPlan"]["speakerOutputs"]}
        self.assertEqual(outputs["A"]["target"], "SPK01")
        self.assertEqual(outputs["B"]["target"], "SPK02")
        self.assertEqual(outputs["C"]["target"], "SPK05")
        self.assertEqual(outputs["D"]["target"], "SPK06")
        self.assertEqual(outputs["E"]["target"], "SPK07")
        self.assertEqual(outputs["F"]["target"], "SPK10")
        self.assertEqual(outputs["G"]["target"], "SPK11")
        self.assertEqual(outputs["H"]["target"], "SPK03")
        self.assertIn("HIGHLEVEL C", outputs["H"]["source"])
        self.assertEqual(outputs["I"]["target"], "SPK04")
        self.assertIn("HIGHLEVEL E", outputs["I"]["source"])
        self.assertEqual(outputs["J"]["target"], "SUB01")
        self.assertIn("TBD", outputs["J"]["state"])
        self.assertEqual(outputs["K"]["target"], "SUB02")
        self.assertEqual(outputs["L"]["state"], "SPARE")

    def test_plan_is_not_presented_as_factory_or_verified_vehicle_wiring(self) -> None:
        plan = DATA["currentBuildTerminalPlan"]
        self.assertIn("PROPOSED", plan["status"])
        self.assertIn("DO NOT ENERGIZE", plan["status"])
        self.assertIn("installation-plan decisions", UI)
        self.assertIn("Factory connector labels", UI)

    def test_workspace_loads_v_twelve_assets(self) -> None:
        self.assertIn('assets/v-twelve-map.css', INDEX)
        self.assertIn('assets/v-twelve-map.js', INDEX)
        self.assertIn("HIGHLEVEL INPUT", UI)
        self.assertIn("OUTPUT CHANNELS", UI)
        self.assertIn("DIRECTOR for SCP", UI)


if __name__ == "__main__":
    unittest.main()
