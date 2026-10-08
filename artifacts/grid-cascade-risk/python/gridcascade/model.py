from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Bus:
    bus_id: int
    name: str
    zone: str
    kind: str
    load_mw: float = 0.0
    generation_mw: float = 0.0
    voltage_pu: float = 1.0
    frequency_hz: float = 60.0
    status: str = "online"
    x: float = 0.0
    y: float = 0.0
    features: dict[str, float] = field(default_factory=dict)


@dataclass
class Line:
    line_id: str
    from_bus: int
    to_bus: int
    capacity_mw: float
    reactance_pu: float
    status: str = "online"
    impedance_pu: float | None = None


@dataclass
class GridModel:
    buses: list[Bus]
    lines: list[Line]
    name: str = "Synthetic grid"
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def total_load_mw(self) -> float:
        return sum(bus.load_mw for bus in self.buses)

    @property
    def total_generation_mw(self) -> float:
        return sum(bus.generation_mw for bus in self.buses)
