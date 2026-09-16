"""Regression checks for the iPad-first installation workflow."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / "docs/index.html").read_text(encoding="utf-8")
ENGINEERING = (ROOT / "docs/engineering.html").read_text(encoding="utf-8")
WORKFLOW_JS = (ROOT / "docs/assets/workflow.js").read_text(encoding="utf-8")
WORKFLOW_CSS = (ROOT / "docs/assets/workflow.css").read_text(encoding="utf-8")
BUILD = json.loads((ROOT / "docs/data/installed-system.json").read_text(encoding="utf-8"))
HARNESS = json.loads((ROOT / "docs/data/harness-integration.json").read_text(encoding="utf-8"))
VTWELVE = json.loads((ROOT / "docs/data/v-twelve-connectors.json").read_text(encoding="utf-8"))


class InstallationWorkflowTests(unittest.TestCase):
    def test_workflow_is_default_and_engineering_workspace_is_preserved(self) -> None:
        self.assertIn('assets/workflow.css', INDEX)
        self.assertIn('assets/workflow.js', INDEX)
        self.assertIn('id="workflowTimeline"', INDEX)
        self.assertIn('href="engineering.html"', INDEX)
        self.assertIn('Tesla Parts Catalog · Audio Speakers', ENGINEERING)
        self.assertIn('data-view="lhd"', ENGINEERING)
        self.assertIn('data-view="premium"', ENGINEERING)
        self.assertIn('data-view="connectors"', ENGINEERING)
        self.assertIn('data-view="evidence"', ENGINEERING)
        self.assertIn('href="index.html"', ENGINEERING)

    def test_seven_step_timeline_and_navigation_are_present(self) -> None:
        for step_id in ('overview', 'prepare', 'remove', 'install', 'configure', 'test', 'enjoy'):
            self.assertIn(f"id: '{step_id}'", WORKFLOW_JS)
        self.assertEqual(WORKFLOW_JS.count("id: '"), 7)
        self.assertIn('data-prev', WORKFLOW_JS)
        self.assertIn('data-next', WORKFLOW_JS)
        self.assertIn('history.replaceState', WORKFLOW_JS)
        self.assertIn('function details(', WORKFLOW_JS)

    def test_workflow_uses_canonical_repository_data(self) -> None:
        self.assertIn("installed: 'data/installed-system.json'", WORKFLOW_JS)
        self.assertIn("harness: 'data/harness-integration.json'", WORKFLOW_JS)
        self.assertIn("vtwelve: 'data/v-twelve-connectors.json'", WORKFLOW_JS)

    def test_front_dash_mapping_is_not_confused_with_door_woofers(self) -> None:
        channels = {item['vTwelveChannel']: item for item in HARNESS['channels']}
        self.assertEqual(channels['A']['directTarget'], 'SPK01')
        self.assertIn('door woofer', channels['A']['sourceRole'])
        self.assertEqual(channels['B']['directTarget'], 'SPK02')
        self.assertIn('door woofer', channels['B']['sourceRole'])
        self.assertEqual(channels['C']['directTarget'], 'SPK05')
        self.assertIn('instrument-panel', channels['C']['sourceRole'])
        self.assertEqual(channels['D']['directTarget'], 'SPK06')
        self.assertIn('instrument-panel', channels['D']['sourceRole'])
        self.assertEqual(channels['E']['directTarget'], 'SPK07')
        self.assertIn('instrument-panel', channels['E']['sourceRole'])
        self.assertIn('Front Left DASH', WORKFLOW_JS)
        self.assertIn('Center DASH', WORKFLOW_JS)
        self.assertIn('Front Right DASH', WORKFLOW_JS)

    def test_current_build_status_is_truthful(self) -> None:
        targets = BUILD['targets']
        self.assertEqual(targets['SPK10']['status'], 'OEM STOCK')
        self.assertEqual(targets['SPK11']['status'], 'OEM STOCK')
        self.assertEqual(targets['SPK12']['status'], 'NONE / FUTURE')
        self.assertEqual(targets['SPK13']['status'], 'NONE / FUTURE')
        self.assertIn('Original Tesla stock speakers retained on F/G', WORKFLOW_JS)
        self.assertIn('X588/X593 are not used by the trunk subs', WORKFLOW_JS)

    def test_v_twelve_connector_labels_match_verified_data(self) -> None:
        labels = VTWELVE['connectorLabeling']
        self.assertEqual(labels['highlevelInput']['channels'], list('ABCDEFGHIJKL'))
        # V TWELVE MK2 has six RCA line inputs A-F. This intentionally corrects
        # the earlier A-D shorthand in the UI request.
        self.assertEqual(labels['lineInput']['channels'], list('ABCDEF'))
        self.assertEqual(labels['speakerOutput']['channels'], list('ABCDEFGHIJKL'))
        self.assertEqual(labels['lineOutput']['channels'], ['M', 'N'])
        control_labels = {item['label'] for item in labels['controlAndPower']}
        self.assertTrue({'USB', 'SCP', 'OPTICAL INPUT', 'REM. OUT', 'GND', 'POWER REM', '+12V'}.issubset(control_labels))
        self.assertIn("['LINE INPUT', 'A-F'", WORKFLOW_JS)

    def test_subwoofer_and_spare_outputs_are_locked(self) -> None:
        outputs = {item['channel']: item for item in VTWELVE['currentBuildTerminalPlan']['speakerOutputs']}
        self.assertEqual(outputs['J']['target'], 'SUB01')
        self.assertEqual(outputs['K']['target'], 'SUB02')
        self.assertIsNone(outputs['L']['target'])
        self.assertEqual(VTWELVE['currentBuildTerminalPlan']['lineOutputs'][0]['channel'], 'M')
        self.assertEqual(VTWELVE['currentBuildTerminalPlan']['lineOutputs'][1]['channel'], 'N')
        self.assertIn('Measure each loose Pioneer driver DCR', WORKFLOW_JS)

    def test_ipad_landscape_layout_contract(self) -> None:
        self.assertIn('@media (min-width: 980px) and (orientation: landscape)', WORKFLOW_CSS)
        self.assertIn('grid-template-columns: 245px minmax(0, 1fr)', WORKFLOW_CSS)
        self.assertIn('grid-template-columns: repeat(7, 1fr)', WORKFLOW_CSS)
        self.assertIn('.quick-bar', WORKFLOW_CSS)
        self.assertIn('.step-details details', WORKFLOW_CSS)
        self.assertIn('min-height: 52px', WORKFLOW_CSS)


if __name__ == '__main__':
    unittest.main()
