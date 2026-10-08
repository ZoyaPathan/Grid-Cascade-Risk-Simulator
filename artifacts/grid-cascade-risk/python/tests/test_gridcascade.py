from __future__ import annotations

import unittest
from pathlib import Path

from gridcascade.cascade import simulate_cascade
from gridcascade.ingest import parse_grid_ascii
from gridcascade.power_flow import solve_dc_power_flow
from gridcascade.risk import wilson_interval

CASE_PATH = Path(__file__).parents[1] / "gridcascade" / "data" / "ieee14.synthetic.txt"


class GridCascadeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.model = parse_grid_ascii(CASE_PATH.read_text(encoding="utf-8"))

    def test_ascii_case_parses_and_normalizes(self) -> None:
        self.assertEqual(len(self.model.buses), 14)
        self.assertEqual(len(self.model.lines), 20)
        self.assertEqual(self.model.buses[0].features["load"], 0)
        self.assertAlmostEqual(self.model.total_load_mw, 259.0)

    def test_dc_power_flow_is_balanced_before_contingency(self) -> None:
        result = solve_dc_power_flow(self.model)
        self.assertAlmostEqual(result.shed_load_mw, 0.0)
        self.assertEqual(len(result.line_flows_mw), 20)
        self.assertTrue(all(value >= 0 for value in result.loading_percent.values()))

    def test_contingency_propagates_and_stabilizes(self) -> None:
        result = simulate_cascade(self.model, "L08")
        self.assertTrue(result["stable"])
        self.assertEqual(result["events"][0]["component_id"], "L08")
        self.assertIn("Failed", {row["state"] for row in result["line_risks"]})

    def test_invalid_contingency_fails_explicitly(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unknown initiating line"):
            simulate_cascade(self.model, "missing")

    def test_wilson_interval_contains_estimate(self) -> None:
        low, high = wilson_interval(70, 100)
        self.assertLess(low, 0.70)
        self.assertGreater(high, 0.70)

    def test_missing_values_are_imputed(self) -> None:
        text = """[BUSES]
id,name,load_mw,generation_mw
1,Slack,,
2,Load,8,
[LINES]
id,from_bus,to_bus,capacity_mw,reactance_pu
T1,1,2,20,0.2
"""
        model = parse_grid_ascii(text)
        self.assertEqual(model.buses[0].load_mw, 0.0)
        self.assertEqual(model.buses[1].generation_mw, 0.0)
        self.assertEqual(model.buses[0].frequency_hz, 60.0)


if __name__ == "__main__":
    unittest.main()
