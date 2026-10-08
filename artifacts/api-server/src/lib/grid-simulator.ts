import {
  GetGridCaseResponse,
  GetGridOverviewResponse,
  RunGridSimulationResponse,
  type SimulationInput,
} from "@workspace/api-zod";

const buses = [
  { id: 1, name: "North Hub", zone: "North", kind: "Slack", loadMW: 0, generationMW: 232.4, voltagePU: 1.06, frequencyHz: 60, status: "Online", x: 17, y: 48 },
  { id: 2, name: "Riverbend", zone: "North", kind: "Generator", loadMW: 21.7, generationMW: 26.6, voltagePU: 1.045, frequencyHz: 60, status: "Online", x: 34, y: 25 },
  { id: 3, name: "West Ridge", zone: "West", kind: "Load", loadMW: 94.2, generationMW: 0, voltagePU: 1.01, frequencyHz: 60, status: "Online", x: 52, y: 10 },
  { id: 4, name: "Central", zone: "Central", kind: "Load", loadMW: 47.8, generationMW: 0, voltagePU: 1.019, frequencyHz: 60, status: "Online", x: 49, y: 43 },
  { id: 5, name: "Pine Valley", zone: "West", kind: "Load", loadMW: 7.6, generationMW: 0, voltagePU: 1.02, frequencyHz: 60, status: "Online", x: 31, y: 61 },
  { id: 6, name: "Lakeside", zone: "Central", kind: "Load", loadMW: 11.2, generationMW: 0, voltagePU: 1.07, frequencyHz: 60, status: "Online", x: 13, y: 79 },
  { id: 7, name: "East Junction", zone: "East", kind: "Transfer", loadMW: 0, generationMW: 0, voltagePU: 1.062, frequencyHz: 60, status: "Online", x: 69, y: 58 },
  { id: 8, name: "East Reserve", zone: "East", kind: "Generator", loadMW: 0, generationMW: 0, voltagePU: 1.09, frequencyHz: 60, status: "Online", x: 86, y: 60 },
  { id: 9, name: "Harbor", zone: "East", kind: "Load", loadMW: 29.5, generationMW: 0, voltagePU: 1.056, frequencyHz: 60, status: "Online", x: 72, y: 34 },
  { id: 10, name: "Southport", zone: "South", kind: "Load", loadMW: 9, generationMW: 0, voltagePU: 1.051, frequencyHz: 60, status: "Online", x: 85, y: 20 },
  { id: 11, name: "Meadow", zone: "South", kind: "Load", loadMW: 3.5, generationMW: 0, voltagePU: 1.057, frequencyHz: 60, status: "Online", x: 59, y: 86 },
  { id: 12, name: "Cedar", zone: "South", kind: "Load", loadMW: 6.1, generationMW: 0, voltagePU: 1.055, frequencyHz: 60, status: "Online", x: 35, y: 88 },
  { id: 13, name: "South Ridge", zone: "South", kind: "Load", loadMW: 13.5, generationMW: 0, voltagePU: 1.05, frequencyHz: 60, status: "Online", x: 49, y: 70 },
  { id: 14, name: "Coastal", zone: "East", kind: "Load", loadMW: 14.9, generationMW: 0, voltagePU: 1.036, frequencyHz: 60, status: "Online", x: 90, y: 43 },
];

const lines = [
  { id: "L01", fromBus: 1, toBus: 2, flowMW: 0, capacityMW: 110, reactancePU: 0.059, status: "Online" },
  { id: "L02", fromBus: 1, toBus: 5, flowMW: 0, capacityMW: 90, reactancePU: 0.223, status: "Online" },
  { id: "L03", fromBus: 2, toBus: 3, flowMW: 0, capacityMW: 75, reactancePU: 0.197, status: "Online" },
  { id: "L04", fromBus: 2, toBus: 4, flowMW: 0, capacityMW: 70, reactancePU: 0.176, status: "Online" },
  { id: "L05", fromBus: 2, toBus: 5, flowMW: 0, capacityMW: 70, reactancePU: 0.173, status: "Online" },
  { id: "L06", fromBus: 3, toBus: 4, flowMW: 0, capacityMW: 65, reactancePU: 0.171, status: "Online" },
  { id: "L07", fromBus: 4, toBus: 5, flowMW: 0, capacityMW: 85, reactancePU: 0.042, status: "Online" },
  { id: "L08", fromBus: 4, toBus: 7, flowMW: 0, capacityMW: 50, reactancePU: 0.209, status: "Online" },
  { id: "L09", fromBus: 4, toBus: 9, flowMW: 0, capacityMW: 45, reactancePU: 0.556, status: "Online" },
  { id: "L10", fromBus: 5, toBus: 6, flowMW: 0, capacityMW: 50, reactancePU: 0.252, status: "Online" },
  { id: "L11", fromBus: 6, toBus: 11, flowMW: 0, capacityMW: 30, reactancePU: 0.199, status: "Online" },
  { id: "L12", fromBus: 6, toBus: 12, flowMW: 0, capacityMW: 28, reactancePU: 0.256, status: "Online" },
  { id: "L13", fromBus: 6, toBus: 13, flowMW: 0, capacityMW: 35, reactancePU: 0.130, status: "Online" },
  { id: "L14", fromBus: 7, toBus: 8, flowMW: 0, capacityMW: 35, reactancePU: 0.176, status: "Online" },
  { id: "L15", fromBus: 7, toBus: 9, flowMW: 0, capacityMW: 35, reactancePU: 0.110, status: "Online" },
  { id: "L16", fromBus: 9, toBus: 10, flowMW: 0, capacityMW: 32, reactancePU: 0.084, status: "Online" },
  { id: "L17", fromBus: 9, toBus: 14, flowMW: 0, capacityMW: 24, reactancePU: 0.270, status: "Online" },
  { id: "L18", fromBus: 10, toBus: 11, flowMW: 0, capacityMW: 26, reactancePU: 0.192, status: "Online" },
  { id: "L19", fromBus: 12, toBus: 13, flowMW: 0, capacityMW: 22, reactancePU: 0.199, status: "Online" },
  { id: "L20", fromBus: 13, toBus: 14, flowMW: 0, capacityMW: 22, reactancePU: 0.348, status: "Online" },
];

const model = GetGridCaseResponse.parse({
  name: "Synthetic IEEE 14-bus teaching case",
  version: "1.0.0",
  modelNote: "Synthetic operating point inspired by the IEEE 14-bus topology. It is not a validated benchmark file or an operational power-flow model.",
  defaultContingency: "L08",
  buses,
  lines,
});

type Bus = (typeof buses)[number];
type Line = (typeof lines)[number];
type LineFlow = { line: Line; flowMW: number; loadingPercent: number };

function solveLinear(matrix: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const augmented = matrix.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row;
    }
    if (Math.abs(augmented[pivot][col]) < 1e-10) throw new Error("Singular DC load-flow matrix");
    [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];
    const scale = augmented[col][col];
    for (let j = col; j <= n; j++) augmented[col][j] /= scale;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let j = col; j <= n; j++) augmented[row][j] -= factor * augmented[col][j];
    }
  }
  return augmented.map((row) => row[n]);
}

function connectedComponents(activeLines: Line[]): number[][] {
  const unseen = new Set(buses.map((bus) => bus.id));
  const components: number[][] = [];
  while (unseen.size) {
    const start = unseen.values().next().value as number;
    const stack = [start];
    const component: number[] = [];
    unseen.delete(start);
    while (stack.length) {
      const current = stack.pop()!;
      component.push(current);
      for (const line of activeLines) {
        const next = line.fromBus === current ? line.toBus : line.toBus === current ? line.fromBus : -1;
        if (next !== -1 && unseen.delete(next)) stack.push(next);
      }
    }
    components.push(component);
  }
  return components;
}

function runDcFlow(outages: Set<string>, loadMultiplier: number): { flows: LineFlow[]; shedLoadMW: number } {
  const activeLines = lines.filter((line) => !outages.has(line.id));
  const flows = new Map<string, number>();
  let shedLoadMW = 0;
  const busById = new Map(buses.map((bus) => [bus.id, bus]));

  for (const component of connectedComponents(activeLines)) {
    const componentBuses = component.map((id) => busById.get(id)!);
    const generation = componentBuses.reduce((sum, bus) => sum + bus.generationMW, 0);
    const demand = componentBuses.reduce((sum, bus) => sum + bus.loadMW * loadMultiplier, 0);
    if (generation < demand) shedLoadMW += demand - generation;
    const servedLoadFraction = demand > generation && demand > 0 ? generation / demand : 1;
    if (generation === 0 || component.length === 1) {
      for (const line of activeLines) {
        if (component.includes(line.fromBus) && component.includes(line.toBus)) flows.set(line.id, 0);
      }
      continue;
    }

    const slack = componentBuses.reduce((best, bus) => bus.generationMW > best.generationMW ? bus : best);
    const unknown = component.filter((id) => id !== slack.id);
    const indexByBus = new Map(unknown.map((id, index) => [id, index]));
    const matrix = unknown.map(() => unknown.map(() => 0));
    const injection = new Map<number, number>();
    for (const bus of componentBuses) {
      injection.set(
        bus.id,
        (bus.generationMW - bus.loadMW * loadMultiplier * servedLoadFraction) / 100,
      );
    }
    injection.set(slack.id, injection.get(slack.id)! - [...injection.values()].reduce((sum, value) => sum + value, 0));

    for (const line of activeLines) {
      const from = indexByBus.get(line.fromBus);
      const to = indexByBus.get(line.toBus);
      if (from === undefined && to === undefined) continue;
      const susceptance = 1 / line.reactancePU;
      if (from !== undefined) matrix[from][from] += susceptance;
      if (to !== undefined) matrix[to][to] += susceptance;
      if (from !== undefined && to !== undefined) {
        matrix[from][to] -= susceptance;
        matrix[to][from] -= susceptance;
      }
    }
    const solved = solveLinear(matrix, unknown.map((id) => injection.get(id)!));
    const angles = new Map<number, number>([[slack.id, 0]]);
    unknown.forEach((id, index) => angles.set(id, solved[index]));
    for (const line of activeLines) {
      if (!component.includes(line.fromBus) || !component.includes(line.toBus)) continue;
      flows.set(line.id, ((angles.get(line.fromBus)! - angles.get(line.toBus)!) / line.reactancePU) * 100);
    }
  }

  return {
    shedLoadMW,
    flows: lines.map((line) => {
      const flowMW = flows.get(line.id) ?? 0;
      return { line, flowMW, loadingPercent: Math.abs(flowMW) / line.capacityMW * 100 };
    }),
  };
}

function logistic(value: number): number {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));
}

function dbnFailureProbability(
  line: Line,
  loadingRatio: number,
  failedLines: Set<string>,
  previousProbability: number,
  failureThreshold: number,
): number {
  const endpoints = new Set([line.fromBus, line.toBus]);
  const neighborFailures = lines.filter((failedLine) =>
    failedLines.has(failedLine.id)
    && (endpoints.has(failedLine.fromBus) || endpoints.has(failedLine.toBus)),
  ).length;
  const endpointBuses = buses.filter((bus) => endpoints.has(bus.id));
  const voltageDeviation = endpointBuses.reduce((largest, bus) =>
    Math.abs(bus.voltagePU - 1) > Math.abs(largest) ? bus.voltagePU - 1 : largest,
  0);
  const transitionProbability = logistic(
    -3.5 + (loadingRatio - 0.8 * failureThreshold) * 9 + Math.min(neighborFailures, 4) * 0.55,
  );
  // A component that remains online provides survival evidence; retain half
  // the prior risk mass before applying this interval's hazard.
  const predictedFailure = previousProbability * 0.5
    + (1 - previousProbability) * transitionProbability;
  const logLikelihoodRatio = Math.max(
    -5,
    Math.min(
      5,
      (loadingRatio - 0.8 * failureThreshold) * 6
        + Math.max(0, Math.abs(voltageDeviation) - 0.03) * 4,
    ),
  );
  const likelihoodRatio = Math.exp(logLikelihoodRatio);
  return (predictedFailure * likelihoodRatio)
    / (predictedFailure * likelihoodRatio + (1 - predictedFailure));
}

function wilsonInterval(successes: number, total: number): [number, number] {
  const z = 1.96;
  const p = successes / total;
  const denominator = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denominator;
  const half = z * Math.sqrt((p * (1 - p) / total) + (z * z / (4 * total * total))) / denominator;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export function getGridCase() {
  const baseFlows = runDcFlow(new Set(), 1);
  return GetGridCaseResponse.parse({
    ...model,
    lines: baseFlows.flows.map(({ line, flowMW }) => ({ ...line, flowMW })),
  });
}

export function simulateGrid(input: SimulationInput) {
  if (!lines.some((line) => line.id === input.contingencyLineId)) {
    throw new Error(`Unknown line ${input.contingencyLineId}`);
  }

  const outageSet = new Set<string>([input.contingencyLineId]);
  const previousProbability = new Map<string, number>();
  const steps: Array<{ step: number; componentId: string; componentType: string; probability: number; loadingPercent: number; reason: string }> = [{
    step: 0,
    componentId: input.contingencyLineId,
    componentType: "Transmission line",
    probability: 1,
    loadingPercent: 100,
    reason: "User-selected initiating contingency",
  }];
  const timeline: Array<{ step: string; riskPercent: number; failedLines: number }> = [];
  let finalFlows: LineFlow[] = [];
  let shedLoadMW = 0;

  for (let step = 1; step <= 6; step++) {
    const result = runDcFlow(outageSet, input.loadMultiplier);
    finalFlows = result.flows;
    shedLoadMW = result.shedLoadMW;
    const candidates = result.flows
      .filter(({ line, loadingPercent }) =>
        !outageSet.has(line.id) && loadingPercent >= input.failureThreshold * 100,
      )
      .map((flow) => ({
        ...flow,
        probability: dbnFailureProbability(
          flow.line,
          flow.loadingPercent / 100,
          outageSet,
          previousProbability.get(flow.line.id) ?? 0.02,
          input.failureThreshold,
        ),
      }))
      .sort((a, b) => b.probability - a.probability);
    for (const candidate of candidates) previousProbability.set(candidate.line.id, candidate.probability);
    const next = candidates.find((candidate) => candidate.probability >= 0.68);
    timeline.push({
      step: `T${step - 1}`,
      riskPercent: Math.min(100, Math.max(0, ...candidates.map((item) => item.probability * 100))),
      failedLines: outageSet.size,
    });
    if (!next) break;
    outageSet.add(next.line.id);
    steps.push({
      step,
      componentId: next.line.id,
      componentType: "Transmission line",
      probability: next.probability,
      loadingPercent: next.loadingPercent,
      reason: `Post-contingency loading is ${next.loadingPercent.toFixed(0)}% of the synthetic line rating`,
    });
  }

  finalFlows = runDcFlow(outageSet, input.loadMultiplier).flows;
  const lineRisks = finalFlows.map(({ line, flowMW, loadingPercent }) => {
    const failed = outageSet.has(line.id);
    const failureProbability = failed ? 1 : dbnFailureProbability(
      line,
      loadingPercent / 100,
      outageSet,
      previousProbability.get(line.id) ?? 0.02,
      input.failureThreshold,
    );
    const state = failed ? "Failed" : loadingPercent >= 100 ? "Overloaded" : loadingPercent >= 80 ? "Stressed" : "Normal";
    return { lineId: line.id, fromBus: line.fromBus, toBus: line.toBus, loadingPercent: failed ? 0 : loadingPercent, failureProbability, state, flowMW: failed ? 0 : flowMW, capacityMW: line.capacityMW };
  });

  const conditionalProbabilities = steps.slice(1).map((event) => event.probability);
  let seed = input.contingencyLineId.charCodeAt(2) + Math.round(input.loadMultiplier * 1000) + input.samples;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  let successes = 0;
  for (let i = 0; i < input.samples; i++) {
    let pathSucceeds = true;
    for (const probability of conditionalProbabilities) {
      if (random() >= probability) pathSucceeds = false;
    }
    if (pathSucceeds) successes++;
  }
  const estimatedProbability = successes / input.samples;
  const [confidenceLower, confidenceUpper] = wilsonInterval(successes, input.samples);
  const totalLoadMW = buses.reduce((sum, bus) => sum + bus.loadMW * input.loadMultiplier, 0);
  const failedComponents = outageSet.size;
  const riskStatus = estimatedProbability >= 0.65 ? "High Risk" : estimatedProbability >= 0.3 ? "At Risk" : "Normal";
  const cascadeSeverity = Math.min(100, (failedComponents / lines.length) * 45 + (shedLoadMW / Math.max(totalLoadMW, 1)) * 55);

  const mostLoaded = lineRisks.filter((item) => item.state !== "Failed").sort((a, b) => b.loadingPercent - a.loadingPercent).slice(0, 3);
  const mitigations = mostLoaded.map((item, index) => ({
    priority: index + 1,
    action: `Review transfer or dispatch options affecting ${item.lineId} (${item.fromBus}–${item.toBus})`,
    expectedImpact: `Reduce modeled loading from ${item.loadingPercent.toFixed(0)}% toward the configured threshold`,
    rationale: "This line has the highest remaining modeled utilization in the post-contingency state.",
  }));
  if (mitigations.length === 0) mitigations.push({
    priority: 1,
    action: "Review islanded-load and generation balance",
    expectedImpact: `Assess up to ${shedLoadMW.toFixed(1)} MW of modeled load shortfall`,
    rationale: "The remaining topology contains an island without sufficient modeled generation.",
  });

  return RunGridSimulationResponse.parse({
    scenarioName: `${input.contingencyLineId} outage · ${Math.round(input.loadMultiplier * 100)}% load`,
    riskStatus,
    cascadePredicted: failedComponents > 1,
    cascadeSeverity,
    affectedLoadMW: shedLoadMW,
    failedComponents,
    estimatedProbability,
    confidenceLower,
    confidenceUpper,
    stable: steps.length < 7,
    steps,
    lineRisks,
    timeline,
    mitigations,
    assumptions: [
      "Synthetic 14-bus topology and ratings are for demonstration only; the case is not an operating grid model.",
      "DC power flow uses a linear, lossless approximation and does not calculate reactive power or voltage stability.",
      "Failure probabilities use a simplified two-state temporal Bayesian filter with an illustrative logistic transition CPD; it is not calibrated to field outage records.",
      `A deterministic Monte Carlo estimate uses ${input.samples} draws; its interval captures sampling variation, not model uncertainty.`,
      "Do not use these outputs to operate, switch, or protect real grid equipment.",
    ],
  });
}

export function getGridOverview() {
  const baseline = simulateGrid({
    contingencyLineId: model.defaultContingency,
    loadMultiplier: 1,
    failureThreshold: 1,
    samples: 250,
  });
  const baseFlow = runDcFlow(new Set(), 1);
  return GetGridOverviewResponse.parse({
    caseName: model.name,
    buses: buses.length,
    lines: lines.length,
    totalLoadMW: buses.reduce((sum, bus) => sum + bus.loadMW, 0),
    totalGenerationMW: buses.reduce((sum, bus) => sum + bus.generationMW, 0),
    riskStatus: baseline.riskStatus,
    defaultContingency: model.defaultContingency,
    estimatedProbability: baseline.estimatedProbability,
    overloadedLines: baseFlow.flows.filter((flow) => flow.loadingPercent >= 100).length,
  });
}
