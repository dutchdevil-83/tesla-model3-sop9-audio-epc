"""Gate for 2026-10 Highland replacement harness wiring, VCP safety and UI."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "docs/data/replacement-harness-2026-10-08.json").read_text(encoding="utf-8"))
HARNESS = json.loads((ROOT / "docs/data/harness-integration.json").read_text(encoding="utf-8"))
DSP = json.loads((ROOT / "docs/data/v-twelve-connectors.json").read_text(encoding="utf-8"))
BUILD = json.loads((ROOT / "docs/data/installed-system.json").read_text(encoding="utf-8"))
HTML = (ROOT / "docs/dsp-wiring.html").read_text(encoding="utf-8")
MANUAL = (ROOT / "docs/HIGHLAND-REPLACEMENT-DSP-MANUAL.md").read_text(encoding="utf-8")
WORKFLOW = (ROOT / "docs/assets/workflow.js").read_text(encoding="utf-8")


class HighlandReplacementEvidenceTests(unittest.TestCase):
    def test_seven_photographed_pairs_and_terminals(self) -> None:
        self.assertEqual(len(DATA["channels"]), 7)
        self.assertEqual([x["channel"] for x in DATA["channels"]], list("ABCDEFG"))
        self.assertEqual(len(DATA["newHarness"]["photos"]), 9)
        for old, new in zip(HARNESS["channels"], DATA["channels"]):
            self.assertEqual(old["vTwelveChannel"], new["channel"])
            self.assertEqual(old["label"], new["replacement"]["label"])
            self.assertEqual(old["observedNewWirePlus"], new["replacement"]["wirePlus"])
            self.assertEqual(old["observedNewWireMinus"], new["replacement"]["wireMinus"])
            self.assertFalse(old["newConnectorCavitiesVerified"])
            self.assertEqual(new["dsp"]["inputMinus"], "-" + new["channel"])
            self.assertEqual(new["dsp"]["inputPlus"], "+" + new["channel"])
            self.assertEqual(new["dsp"]["outputPlus"], "+" + new["channel"])
            self.assertEqual(new["dsp"]["outputMinus"], "-" + new["channel"])

    def test_historical_old_colours_are_not_misrepresented_as_measured(self) -> None:
        self.assertIn("NOT VERIFIED", DATA["channels"][0]["oldRyzen"]["actualDSPConnection"])
        self.assertIn("actual old dsp terminal", DATA["sourceEvidence"]["old"].lower())
        self.assertIn("actual", HTML)
        self.assertIn("Not observed", HTML)

    def test_official_model_year_boundary_and_part_number_uncertainty(self) -> None:
        comparison = DATA["manufacturerComparison"]
        self.assertEqual(comparison["previous"]["orderNumber"], "M141318")
        self.assertEqual(comparison["replacementFamily"]["orderNumber"], "M141320")
        self.assertFalse(comparison["previous"]["highlandCompatible"])
        self.assertTrue(comparison["replacementFamily"]["highlandCompatible"])
        self.assertFalse(comparison["replacementFamily"]["actualReceivedPartIdentityVerified"])
        self.assertIn("M141320", BUILD["systemHardware"][2]["status"])

    def test_no_unproven_connector_face_cavities(self) -> None:
        self.assertFalse(DATA["channels"][0]["replacement"].get("newPlugCavityVerified", False))
        for x in DATA["channels"]:
            self.assertIn("NOT VERIFIED", x["tesla"]["newPlugCavityStatus"])
        self.assertIn("exact replacement connector cavities", HTML)

    def test_tweeter_outputs_fail_closed_and_manufacturer_hp(self) -> None:
        outputs = {o["channel"]: o for o in DSP["currentBuildTerminalPlan"]["speakerOutputs"]}
        for c in "HI":
            self.assertIn("MUTED/DISCONNECTED", outputs[c]["state"])
            self.assertIn("HP >2.5 KHZ", outputs[c]["state"])
        active = DATA["routingPresets"]["physicallyIsolatedActive"]
        tw = next(o for o in active["outputs"] if o["ch"] == "H/I")
        self.assertIn("3.5 kHz LR24", tw["hp"])
        self.assertIn("2 ohm minimum", DATA["speakerLoadSafety"])
        self.assertIn("passive crossover", DATA["routingPresets"]["factorySharedLowTw"]["gate"])

    def test_virtual_subs_and_physical_jk_are_not_mixed_up(self) -> None:
        virtual = {v["virtual"] for v in DATA["virtualInputs"]}
        self.assertIn("Subwoofer 1 (K)", virtual)
        self.assertIn("Subwoofer 2 (L)", virtual)
        outputs = {o["channel"]: o for o in DSP["currentBuildTerminalPlan"]["speakerOutputs"]}
        self.assertIn("physical J", outputs["J"]["source"])
        self.assertIn("physical K", outputs["K"]["source"])
        self.assertIn("VCP OFF", DATA["subwooferRemoteControl"])
        self.assertIn("VCP ON", DATA["subwooferRemoteControl"])
        self.assertIn("DIRECTOR", MANUAL)

    def test_public_page_has_live_interactions_and_links(self) -> None:
        for snippet in ('id="inputRows"', 'id="outputRows"', 'id="comparison"', 'id="vcpTable"',
                        'id="filterTable"', 'id="checkItems"', 'id="saveOld"', 'id="scenario"',
                        "localStorage", "fetch('data/replacement-harness-2026-10-08.json'",
                        'HIGHLAND-REPLACEMENT-DSP-MANUAL.md'):
            self.assertIn(snippet, HTML)
        self.assertIn("dsp-wiring.html", (ROOT / "docs/index.html").read_text(encoding="utf-8"))
        self.assertIn("dsp-wiring.html", (ROOT / "docs/engineering.html").read_text(encoding="utf-8"))
        self.assertIn("dsp-wiring.html", WORKFLOW)
        self.assertIn("NOT APPROVED FOR FIRST POWER-UP", HTML)

    @unittest.skipUnless(shutil.which("node"), "Node.js needed to check inline site JavaScript")
    def test_inline_interactive_javascript_syntax(self) -> None:
        scripts = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", HTML, flags=re.DOTALL)
        self.assertEqual(len(scripts), 1)
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / "dsp-wiring-inline.js"
            p.write_text(scripts[0], encoding="utf-8")
            done = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
            self.assertEqual(done.returncode, 0, done.stderr)


if __name__ == "__main__":
    unittest.main()
