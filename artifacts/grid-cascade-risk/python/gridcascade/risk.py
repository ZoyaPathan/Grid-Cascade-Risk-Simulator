"""Cascade severity, single-component criticality, and sampling intervals."""

from __future__ import annotations

import math

from .model import GridModel
from .power_flow import solve_dc_power_flow


def severity_score(
    model: GridModel,
    failed_lines: set[str],
    affected_load_mw: float,
) -> float:
    load_fraction = affected_load_mw / max(model.total_load_mw, 1.0)
    component_fraction = len(failed_lines) / max(len(model.lines), 1)
    return min(100.0, 55.0 * load_fraction + 45.0 * component_fraction)


def critical_single_outages(model: GridModel, load_multiplier: float = 1.0) -> list[dict[str, float | str]]:
    """Rank individual lines by simulated load shed and worst remaining loading."""
    results = []
    for line in model.lines:
        flow = solve_dc_power_flow(model, {line.line_id}, load_multiplier)
        remaining = [
            loading for line_id, loading in flow.loading_percent.items()
            if line_id != line.line_id
        ]
        results.append({
            "line_id": line.line_id,
            "load_shed_mw": round(flow.shed_load_mw, 2),
            "worst_loading_percent": round(max(remaining, default=0.0), 2),
            "criticality_score": round(
                flow.shed_load_mw * 0.6 + max(remaining, default=0.0) * 0.4,
                2,
            ),
        })
    return sorted(results, key=lambda item: float(item["criticality_score"]), reverse=True)


def wilson_interval(successes: int, samples: int, z: float = 1.96) -> tuple[float, float]:
    if samples <= 0:
        raise ValueError("samples must be positive")
    probability = successes / samples
    denominator = 1 + z * z / samples
    center = (probability + z * z / (2 * samples)) / denominator
    margin = z * math.sqrt(
        probability * (1 - probability) / samples
        + z * z / (4 * samples * samples)
    ) / denominator
    return max(0.0, center - margin), min(1.0, center + margin)
