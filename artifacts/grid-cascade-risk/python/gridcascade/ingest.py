"""Parse a sectioned ASCII network file and apply explicit data cleaning."""

from __future__ import annotations

import csv
import io
from collections.abc import Iterable

from .model import Bus, GridModel, Line

BUS_DEFAULTS = {
    "name": "",
    "zone": "Unassigned",
    "kind": "load",
    "load_mw": "0",
    "generation_mw": "0",
    "voltage_pu": "1.0",
    "frequency_hz": "60.0",
    "status": "online",
    "x": "0",
    "y": "0",
}
LINE_DEFAULTS = {"status": "online"}


def _rows(lines: Iterable[str], expected: set[str], defaults: dict[str, str]) -> list[dict[str, str]]:
    content = [line for line in lines if line.strip() and not line.lstrip().startswith("#")]
    if not content:
        return []
    reader = csv.DictReader(io.StringIO("\n".join(content)))
    if not reader.fieldnames:
        raise ValueError("ASCII section must start with a CSV header")
    fieldnames = {name.strip().lower() for name in reader.fieldnames if name}
    missing = expected - fieldnames
    if missing:
        raise ValueError(f"Missing required ASCII columns: {', '.join(sorted(missing))}")
    output = []
    for raw in reader:
        row = {str(key).strip().lower(): (value or "").strip() for key, value in raw.items() if key}
        for key, default in defaults.items():
            if not row.get(key):
                row[key] = default
        output.append(row)
    return output


def parse_grid_ascii(text: str, name: str = "Imported ASCII grid") -> GridModel:
    """Parse `[BUSES]` and `[LINES]` CSV sections; comments start with `#`."""
    sections: dict[str, list[str]] = {"BUSES": [], "LINES": []}
    active: str | None = None
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            active = stripped[1:-1].upper()
            if active not in sections:
                raise ValueError(f"Unknown section [{active}]; expected [BUSES] or [LINES]")
            continue
        if active and stripped and not stripped.startswith("#"):
            sections[active].append(line)

    bus_rows = _rows(sections["BUSES"], {"id"}, BUS_DEFAULTS)
    line_rows = _rows(
        sections["LINES"],
        {"id", "from_bus", "to_bus", "capacity_mw", "reactance_pu"},
        LINE_DEFAULTS,
    )
    if not bus_rows or not line_rows:
        raise ValueError("The ASCII input must include non-empty [BUSES] and [LINES] sections")

    buses = [
        Bus(
            bus_id=int(row["id"]),
            name=row["name"] or f"Bus {row['id']}",
            zone=row["zone"],
            kind=row["kind"],
            load_mw=max(0.0, float(row["load_mw"])),
            generation_mw=max(0.0, float(row["generation_mw"])),
            voltage_pu=float(row["voltage_pu"]),
            frequency_hz=float(row["frequency_hz"]),
            status=row["status"].lower(),
            x=float(row["x"]),
            y=float(row["y"]),
        )
        for row in bus_rows
    ]
    lines = [
        Line(
            line_id=row["id"],
            from_bus=int(row["from_bus"]),
            to_bus=int(row["to_bus"]),
            capacity_mw=float(row["capacity_mw"]),
            reactance_pu=float(row["reactance_pu"]),
            status=row["status"].lower(),
        )
        for row in line_rows
    ]
    ids = {bus.bus_id for bus in buses}
    if len(ids) != len(buses):
        raise ValueError("Bus IDs must be unique")
    for line in lines:
        if line.from_bus not in ids or line.to_bus not in ids:
            raise ValueError(f"Line {line.line_id} references an unknown bus")
        if line.from_bus == line.to_bus or line.capacity_mw <= 0 or line.reactance_pu <= 0:
            raise ValueError(f"Line {line.line_id} has invalid endpoints, capacity, or reactance")

    _normalize_bus_features(buses)
    return GridModel(buses=buses, lines=lines, name=name)


def _normalize_bus_features(buses: list[Bus]) -> None:
    """Min-max normalize continuous node attributes for downstream models."""
    columns = {
        "load": [bus.load_mw for bus in buses],
        "generation": [bus.generation_mw for bus in buses],
        "voltage": [bus.voltage_pu for bus in buses],
        "frequency": [bus.frequency_hz for bus in buses],
    }
    ranges = {
        key: (min(values), max(values))
        for key, values in columns.items()
    }
    for bus in buses:
        raw = {
            "load": bus.load_mw,
            "generation": bus.generation_mw,
            "voltage": bus.voltage_pu,
            "frequency": bus.frequency_hz,
        }
        for key, value in raw.items():
            low, high = ranges[key]
            bus.features[key] = 0.0 if high == low else (value - low) / (high - low)
