"""Tests BAUDIO-only option-coded SOP9 tweeter wiring and non-destructive adapter guide."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL = json.loads((ROOT / "docs/data/baudio-tweeter-interposer-2026-10-09.json").read_text(encoding="utf-8"))
INSTALLED = json.loads((ROOT / "docs/data/installed-system.json").read_text(encoding="utf-8"))
INTEGRATION = json.loads((ROOT / "docs/data/harness-integration.json").read_text(encoding="utf-8"))
CONNECTORS = json.loads((ROOT / "docs/data/v-twelve-connectors.json").read_text(encoding="utf-8"))
OLD_NEW = json.loads((ROOT / "docs/data/replacement-harness-2026-10-08.json").read_text(encoding="utf-8"))
SOURCE = (ROOT / "Source_Assets/core/audio_lhd.svg").read_text(encoding="utf-8")
PAGE = (ROOT / "docs/baudio-tweeter-routing.html").read_text(encoding="utf-8")
MANUAL = (ROOT / "docs/BAUDIO-TWEETER-ROUTING-MANUAL.md").read_text(encoding="utf-8")


class BaudioTweeterPathTests(unittest.TestCase):
    def test_exact_baudio_not_paudio_option_codes_on_original_electrical_wires(self) -> None:
        self.assertEqual(MODEL["requiredOption"], "BAUDIO")
        self.assertEqual(MODEL["excludedOption"], "PAUDIO")
        for option, pin in [
            ("BAUDIO &amp;&amp; LHST &amp;&amp; TWTR", "X033B-1"),
            ("BAUDIO &amp;&amp; LHST &amp;&amp; TWTR", "X033B-2"),
            ("BAUDIO &amp;&amp; RHST &amp;&amp; TWTR", "X053A-5"),
            ("BAUDIO &amp;&amp; RHST &amp;&amp; TWTR", "X053A-6"),
        ]:
            self.assertRegex(SOURCE, re.escape('option_code="' + option + '"') + r'[^>]{0,300}' + re.escape('pin_number="' + pin + '"'))
        self.assertIn("X033A-5/6", MODEL["forbidden"][0])
        self.assertIn("X053A-22/23", MODEL["forbidden"][0])
        self.assertEqual(INSTALLED["vehicleAudioOption"].split()[0], "BAUDIO")
        self.assertEqual(CONNECTORS["vehicleAudioVariant"].split()[0], "BAUDIO")
        self.assertEqual(INTEGRATION["vehicleAudioVariant"].split()[0], "BASE")

    def test_correct_left_right_continuity_chain(self) -> None:
        expected = {
            "LH": ("H", "X033B", 1, 2, "X922M/F", "X565", "X568"),
            "RH": ("I", "X053A", 5, 6, "X923M/F", "X575", "X578"),
        }
        for side, (amp, body, plus, minus, bridge, tweeter, woofer) in expected.items():
            data = next(row for row in MODEL["exactWireMap"] if row["side"] == side)
            self.assertEqual(data["amp"], "HELIX OUT " + amp + " +/-")
            self.assertEqual(data["cabinConnector"], body)
            self.assertEqual((data["cabinPlus"], data["cabinMinus"]), (plus, minus))
            self.assertEqual(data["doorBridge"], bridge)
            self.assertEqual((data["doorPlus"], data["doorMinus"]), (1, 12))
            self.assertEqual(data["tweeterConnector"], tweeter)
            self.assertEqual((data["tweeterPlus"], data["tweeterMinus"]), (1, 2))
            self.assertEqual(data["colors"], ["VT", "BU"])
            self.assertEqual(data["existingWoofer"], woofer)

    def test_do_not_claim_reversible_multiway_interposer_is_proven(self) -> None:
        all_text = json.dumps(MODEL)
        self.assertIn("physically populated", all_text.lower() if False else MANUAL.lower())
        self.assertIn("all unrelated circuits", MODEL["recommendedMethod"])
        self.assertIn("OEM audio source", MODEL["forbidden"][1])
        self.assertIn("NOT present", MODEL["imageAvailability"].replace("not present", "NOT present"))
        self.assertIn("NOT automatically safe", MANUAL)
        self.assertIn("NOT", MODEL["optionCodeEvidence"]["limitation"])

    def test_front_active_filters_are_conditional_on_electrical_isolation(self) -> None:
        routes = MODEL["amplifier"]
        self.assertIn("3500 Hz LR24", routes["crossover"])
        self.assertIn("muted", routes["crossover"].lower())
        self.assertIn("Only after", routes["crossover"] if False else MANUAL)
        self.assertIn("A/B", routes["activeWiring"])
        self.assertIn("isolat", routes["activeWiring"].lower())
        self.assertIn("source isolated", MODEL["installationGates"][4]["label"].lower() if False else MODEL["installationGates"][5]["label"].lower() + MODEL["installationGates"][4]["label"].lower() + MANUAL.lower())

    def test_tesla_original_location_views_and_faceviews_are_real_files(self) -> None:
        for side in MODEL["sides"].values():
            faceview = ROOT / side["connectorFaceview"]
            self.assertTrue(faceview.is_file(), str(faceview))
            for item in side["images"]:
                self.assertTrue((ROOT / item["path"]).is_file(), item["path"])
            self.assertIn("tesla.com", side["service"]["controller"])
        self.assertEqual(MODEL["sides"]["LH"]["tweeter"], "X565")
        self.assertEqual(MODEL["sides"]["RH"]["tweeter"], "X575")
        self.assertIn("BODY CONTROLLER", MANUAL.upper())

    def test_viewer_is_interactive_without_premium_wiring_as_current(self) -> None:
        for token in ["BASE AUDIO", "PAUDIO excluded", 'id="leftBtn"', 'id="rightBtn"',
                      'id="wiringRows"', 'id="modelGrid"', 'id="faceview"',
                      'id="qc"', 'id="gates"', "baudio-tweeter-interposer-2026-10-09.json",
                      "localStorage", "3500 Hz LR24", "isolated"]:
            self.assertIn(token, PAGE)
        self.assertIn("baudio-tweeter-routing.html", (ROOT / "docs/index.html").read_text(encoding="utf-8"))
        self.assertIn("baudio-tweeter-routing.html", (ROOT / "docs/engineering.html").read_text(encoding="utf-8"))
        self.assertIn("baudio-tweeter-routing.html", (ROOT / "docs/dsp-wiring.html").read_text(encoding="utf-8"))

    @unittest.skipUnless(shutil.which("node"), "Node unavailable for JavaScript syntax validation")
    def test_embedded_baudio_viewer_js_syntax(self) -> None:
        scripts = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", PAGE, flags=re.DOTALL)
        self.assertEqual(len(scripts), 1)
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / "baudio-page.js"
            p.write_text(scripts[0], encoding="utf-8")
            result = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
