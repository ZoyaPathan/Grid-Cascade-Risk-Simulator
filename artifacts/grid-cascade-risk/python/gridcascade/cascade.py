"""Iterative line-outage propagation with re-solved DC power flows."""

from __future__ import annotations

from .dbn import component_state, failure_probability
from .model import GridModel
from .power_flow import solve_dc_power_flow


def simulate_cascade(
    model: GridModel,
    initiating_line: str,
    load_multiplier: float = 1.0,
    failure_threshold: float = 1.0,
    trigger_probability: float = 0.68,
    max_steps: int = 8,
) -> dict:
    known = {line.line_id for line in model.lines}
    if initiating_line not in known:
        raise ValueError(f"Unknown initiating line: {initiating_line}")

    failed = {initiating_line}
    events = [{
        "step": 0,
        "component_id": initiating_line,
        "probability": 1.0,
        "loading_percent": 100.0,
        "reason": "User-selected initiating contingency",
    }]
    timeline = []
    previous_probability: dict[str, float] = {}
    final_flow = solve_dc_power_flow(model, failed, load_multiplier)

    for step in range(1, max_steps + 1):
        final_flow = solve_dc_power_flow(model, failed, load_multiplier)
        ranked = []
        for line in model.lines:
            if line.line_id in failed:
                continue
            loading_ratio = final_flow.loading_percent[line.line_id] / 100
            # Predict deterministic trips only for physically overloaded lines;
            # stressed-but-subcritical components remain represented in risk
            # probabilities but do not cascade automatically.
            if loading_ratio < failure_threshold:
                continue
            endpoints = {line.from_bus, line.to_bus}
            neighbor_failures = sum(
                1 for failed_line in model.lines
                if failed_line.line_id in failed
                and endpoints.intersection({failed_line.from_bus, failed_line.to_bus})
            )
            voltage_evidence = max(
                (final_flow.voltage_deviation_pu[bus] for bus in endpoints),
                key=abs,
            )
            probability = failure_probability(
                loading_ratio,
                neighbor_failures,
                voltage_evidence,
                previous_probability.get(line.line_id, 0.02),
                failure_threshold,
            )
            previous_probability[line.line_id] = probability
            ranked.append((probability, line.line_id, final_flow.loading_percent[line.line_id]))

        ranked.sort(reverse=True)
        timeline.append({
            "step": f"T{step - 1}",
            "risk_percent": round(min(100.0, max((row[0] for row in ranked), default=0) * 100), 2),
            "failed_lines": len(failed),
        })
        if not ranked or ranked[0][0] < trigger_probability:
            break
        probability, line_id, loading_percent = ranked[0]
        failed.add(line_id)
        events.append({
            "step": step,
            "component_id": line_id,
            "probability": round(probability, 5),
            "loading_percent": round(loading_percent, 2),
            "reason": f"Sequential DBN estimate exceeded trigger probability ({trigger_probability:.2f})",
        })
    else:
        raise RuntimeError(f"Cascade did not stabilize within {max_steps} steps")

    final_flow = solve_dc_power_flow(model, failed, load_multiplier)
    line_risks = []
    for line in model.lines:
        outage = line.line_id in failed
        ratio = final_flow.loading_percent[line.line_id] / 100
        endpoints = {line.from_bus, line.to_bus}
        neighbor_failures = sum(
            1 for item in model.lines
            if item.line_id in failed and endpoints.intersection({item.from_bus, item.to_bus})
        )
        voltage = max(
            (final_flow.voltage_deviation_pu[bus] for bus in endpoints),
            key=abs,
        )
        probability = 1.0 if outage else failure_probability(
            ratio,
            neighbor_failures,
            voltage,
            previous_probability.get(line.line_id, 0.02),
            failure_threshold,
        )
        line_risks.append({
            "line_id": line.line_id,
            "loading_percent": 0.0 if outage else round(final_flow.loading_percent[line.line_id], 2),
            "failure_probability": round(probability, 5),
            "state": component_state(ratio, outage),
            "flow_mw": 0.0 if outage else round(final_flow.line_flows_mw[line.line_id], 3),
            "capacity_mw": line.capacity_mw,
        })

    return {
        "failed_lines": failed,
        "events": events,
        "timeline": timeline,
        "line_risks": line_risks,
        "affected_load_mw": round(final_flow.shed_load_mw, 2),
        "cascade_severity": round(
            __import__("gridcascade.risk", fromlist=["severity_score"])
            .severity_score(model, failed, final_flow.shed_load_mw),
            2,
        ),
        "stable": True,
        "islands": [sorted(island) for island in final_flow.islands],
    }


def monte_carlo_cascade_probability(
    model: GridModel,
    initiating_line: str,
    load_multiplier: float = 1.0,
    samples: int = 250,
    failure_threshold: float = 1.0,
    seed: int | None = None,
) -> tuple[float, int]:
    if not 50 <= samples <= 1000:
        raise ValueError("samples must be between 50 and 1000")
    base = simulate_cascade(
        model,
        initiating_line,
        load_multiplier,
        failure_threshold,
    )
    conditional_probabilities = [
        event["probability"] for event in base["events"][1:]
    ]
    if seed is None:
        seed = ord(initiating_line[2]) + round(load_multiplier * 1000) + samples
    random_state = seed & 0xFFFFFFFF

    def draw() -> float:
        nonlocal random_state
        random_state = (random_state * 1664525 + 1013904223) & 0xFFFFFFFF
        return random_state / 0x100000000

    successes = 0
    for _ in range(samples):
        path_succeeds = True
        for probability in conditional_probabilities:
            if draw() >= probability:
                path_succeeds = False
        if path_succeeds:
            successes += 1
    return successes / samples, successes
