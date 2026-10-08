"""Command-line walk-through for the synthetic 14-bus cascading-outage case."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .cascade import monte_carlo_cascade_probability, simulate_cascade
from .ingest import parse_grid_ascii
from .risk import critical_single_outages, wilson_interval

DEFAULT_CASE = Path(__file__).parent / "data" / "ieee14.synthetic.txt"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_CASE, help="Sectioned ASCII bus/line file")
    parser.add_argument("--contingency", default="L08", help="Initiating line outage (default: L08)")
    parser.add_argument("--load-multiplier", type=float, default=1.0)
    parser.add_argument("--failure-threshold", type=float, default=1.0)
    parser.add_argument("--samples", type=int, default=250)
    args = parser.parse_args()

    model = parse_grid_ascii(args.input.read_text(encoding="utf-8"), args.input.stem)
    cascade = simulate_cascade(
        model,
        args.contingency,
        args.load_multiplier,
        args.failure_threshold,
    )
    probability, successes = monte_carlo_cascade_probability(
        model,
        args.contingency,
        args.load_multiplier,
        args.samples,
        args.failure_threshold,
    )
    lower, upper = wilson_interval(successes, args.samples)
    top_risks = sorted(
        (row for row in cascade["line_risks"] if row["state"] != "Failed"),
        key=lambda row: row["failure_probability"],
        reverse=True,
    )[:5]
    critical = critical_single_outages(model, args.load_multiplier)[:5]

    report = {
        "case": model.name,
        "bus_count": len(model.buses),
        "line_count": len(model.lines),
        "total_load_mw": model.total_load_mw,
        "total_generation_mw": model.total_generation_mw,
        "scenario": {
            "initiating_contingency": args.contingency,
            "load_multiplier": args.load_multiplier,
            "failure_threshold": args.failure_threshold,
            "failed_lines": sorted(cascade["failed_lines"]),
            "cascade_predicted": len(cascade["failed_lines"]) > 1,
            "affected_load_mw": cascade["affected_load_mw"],
            "severity_score_0_to_100": cascade["cascade_severity"],
            "estimated_probability": round(probability, 4),
            "wilson_95_percent_interval": [round(lower, 4), round(upper, 4)],
            "stable": cascade["stable"],
            "islands": cascade["islands"],
        },
        "propagation_events": cascade["events"],
        "highest_remaining_line_risks": top_risks,
        "top_single_line_criticality": critical,
        "model_scope": [
            "Synthetic, educational input data; not an official IEEE case.",
            "Linear, lossless DC power flow; no reactive power, voltage stability, protection, or transient dynamics.",
            "DBN-inspired transition probabilities are illustrative and not calibrated against field failure records.",
            "Use for research and software demonstrations only; never for real-grid control decisions.",
        ],
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
