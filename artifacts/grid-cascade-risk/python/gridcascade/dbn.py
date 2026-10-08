"""Small two-state temporal Bayesian hazard model for the teaching simulator."""

from __future__ import annotations

import math


def _sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, value))))


def failure_probability(
    loading_ratio: float,
    neighbor_failures: int,
    voltage_deviation_pu: float,
    previous_probability: float = 0.02,
    failure_threshold: float = 1.0,
) -> float:
    """Bayesian filtering step for failure hazard, including survival evidence."""
    # Transition CPD: stress and failed neighbors increase the Normal -> Failed
    # transition; the Failed state is persistent once entered.
    transition_probability = _sigmoid(
        -3.5
        + (loading_ratio - 0.80 * failure_threshold) * 9.0
        + min(neighbor_failures, 4) * 0.55
    )
    # Remaining online is negative evidence: retain half the prior risk mass
    # before applying this interval's new transition hazard.
    predicted_failure = previous_probability * 0.5 + (
        1.0 - previous_probability
    ) * transition_probability

    # Observation CPD: unusual observed voltage is supporting evidence. The
    # dashboard does not solve AC voltages; this is an input observation only.
    log_likelihood_ratio = max(
        -5.0,
        min(
            5.0,
            (loading_ratio - 0.80 * failure_threshold) * 6.0
            + max(0.0, abs(voltage_deviation_pu) - 0.03) * 4.0,
        ),
    )
    likelihood_ratio = math.exp(log_likelihood_ratio)
    numerator = predicted_failure * likelihood_ratio
    denominator = numerator + (1.0 - predicted_failure)
    return numerator / denominator if denominator else predicted_failure


def component_state(loading_ratio: float, failed: bool = False) -> str:
    if failed:
        return "Failed"
    if loading_ratio >= 1.0:
        return "Overloaded"
    if loading_ratio >= 0.8:
        return "Stressed"
    return "Normal"
