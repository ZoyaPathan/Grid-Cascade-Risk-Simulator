"""Lossless DC power-flow approximation with per-island slack balancing."""

from __future__ import annotations

from dataclasses import dataclass

from .graph import components
from .model import GridModel, Line


@dataclass
class PowerFlowResult:
    line_flows_mw: dict[str, float]
    loading_percent: dict[str, float]
    voltage_deviation_pu: dict[int, float]
    shed_load_mw: float
    islands: list[set[int]]


def _solve(matrix: list[list[float]], rhs: list[float]) -> list[float]:
    n = len(rhs)
    if n == 0:
        return []
    a = [row[:] + [rhs[i]] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda row: abs(a[row][col]))
        if abs(a[pivot][col]) < 1e-12:
            raise ValueError("Singular DC load-flow matrix; check network connectivity")
        a[col], a[pivot] = a[pivot], a[col]
        divisor = a[col][col]
        a[col] = [value / divisor for value in a[col]]
        for row in range(n):
            if row != col:
                factor = a[row][col]
                a[row] = [left - factor * right for left, right in zip(a[row], a[col])]
    return [a[row][-1] for row in range(n)]


def solve_dc_power_flow(
    model: GridModel,
    failed_lines: set[str] | None = None,
    load_multiplier: float = 1.0,
    base_mva: float = 100.0,
) -> PowerFlowResult:
    failed = failed_lines or set()
    active = [
        line for line in model.lines
        if line.status.lower() == "online" and line.line_id not in failed
    ]
    bus_by_id = {bus.bus_id: bus for bus in model.buses}
    line_flows = {line.line_id: 0.0 for line in model.lines}
    islands = components(model, failed)
    shed_load = 0.0

    for island in islands:
        island_buses = [bus_by_id[bus_id] for bus_id in island]
        generation = sum(bus.generation_mw for bus in island_buses)
        demand = sum(bus.load_mw * load_multiplier for bus in island_buses)
        if generation < demand:
            shed_load += demand - generation
        served_load_fraction = generation / demand if demand > generation and demand > 0 else 1.0
        if generation <= 0 or len(island) < 2:
            continue

        slack = max(island_buses, key=lambda bus: bus.generation_mw)
        unknown = sorted(island - {slack.bus_id})
        index = {bus_id: i for i, bus_id in enumerate(unknown)}
        matrix = [[0.0 for _ in unknown] for _ in unknown]
        injections = {
            bus.bus_id: (
                bus.generation_mw
                - bus.load_mw * load_multiplier * served_load_fraction
            ) / base_mva
            for bus in island_buses
        }
        injections[slack.bus_id] -= sum(injections.values())

        island_lines = [
            line for line in active
            if line.from_bus in island and line.to_bus in island
        ]
        for line in island_lines:
            susceptance = 1.0 / line.reactance_pu
            i = index.get(line.from_bus)
            j = index.get(line.to_bus)
            if i is not None:
                matrix[i][i] += susceptance
            if j is not None:
                matrix[j][j] += susceptance
            if i is not None and j is not None:
                matrix[i][j] -= susceptance
                matrix[j][i] -= susceptance

        angles = {slack.bus_id: 0.0}
        angles.update(zip(unknown, _solve(matrix, [injections[bus_id] for bus_id in unknown])))
        for line in island_lines:
            line_flows[line.line_id] = (
                (angles[line.from_bus] - angles[line.to_bus])
                / line.reactance_pu
                * base_mva
            )

    line_by_id: dict[str, Line] = {line.line_id: line for line in model.lines}
    loading = {
        line_id: abs(flow) / line_by_id[line_id].capacity_mw * 100
        for line_id, flow in line_flows.items()
    }
    # This is the parsed operating-point voltage deviation, not an AC solved voltage.
    voltage_deviation = {
        bus.bus_id: bus.voltage_pu - 1.0
        for bus in model.buses
    }
    return PowerFlowResult(line_flows, loading, voltage_deviation, shed_load, islands)
