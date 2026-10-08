"""Directed graph view of the normally bidirectional transmission network."""

from __future__ import annotations

from collections import deque

from .model import GridModel


def adjacency(model: GridModel, failed_lines: set[str] | None = None) -> dict[int, list[tuple[int, str]]]:
    failed = failed_lines or set()
    graph = {bus.bus_id: [] for bus in model.buses}
    for line in model.lines:
        if line.status.lower() == "online" and line.line_id not in failed:
            graph[line.from_bus].append((line.to_bus, line.line_id))
            graph[line.to_bus].append((line.from_bus, line.line_id))
    return graph


def components(model: GridModel, failed_lines: set[str] | None = None) -> list[set[int]]:
    graph = adjacency(model, failed_lines)
    unseen = set(graph)
    output: list[set[int]] = []
    while unseen:
        start = unseen.pop()
        found = {start}
        queue = deque([start])
        while queue:
            for neighbor, _ in graph[queue.popleft()]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    found.add(neighbor)
                    queue.append(neighbor)
        output.append(found)
    return output


def shortest_line_path(
    model: GridModel,
    start: int,
    target: int,
    failed_lines: set[str] | None = None,
) -> list[str]:
    graph = adjacency(model, failed_lines)
    previous: dict[int, tuple[int, str] | None] = {start: None}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == target:
            break
        for neighbor, line_id in graph[node]:
            if neighbor not in previous:
                previous[neighbor] = (node, line_id)
                queue.append(neighbor)
    if target not in previous:
        return []
    path: list[str] = []
    cursor = target
    while previous[cursor] is not None:
        parent, line_id = previous[cursor]  # type: ignore[misc]
        path.append(line_id)
        cursor = parent
    return list(reversed(path))
