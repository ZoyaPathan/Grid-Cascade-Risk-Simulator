# Grid Cascade Risk

An educational synthetic-grid simulator with a live dashboard and a separate,
runnable Python reference pipeline. It parses a small sectioned ASCII network
file, models a 14-bus transmission graph, recalculates DC power flows after
contingencies, estimates cascading line risk, and presents mitigation review
prompts.

## Architecture and library choices

- **Dashboard:** React, Vite, Recharts, generated React Query hooks, and an
  Express API. The dashboard submits scenario assumptions to the API and
  displays the returned simulation result.
- **Data ingestion and modeling:** the `python/gridcascade` package is
  dependency-free for the synthetic walkthrough. Its modules cover ASCII
  parsing, imputation/normalization, graph construction, DC power flow, temporal
  failure hazard, cascade propagation, and risk/confidence calculations.
- **Power-system extensions:** use **pandapower** when AC load flow, reactive
  power, voltage limits, and benchmark case formats are required; **NetworkX**
  is a suitable graph toolkit for large-scale connectivity and criticality
  work. PyPSA is a strong option for dispatch and expansion studies.
- **Learned models:** **pgmpy** can replace the illustrative transition
  probabilities with a fitted Dynamic Bayesian Network; **PyTorch Geometric**
  is appropriate for a graph-neural model trained on historical cascade
  sequences. These packages are intentionally not required to run this
  reproducible demo.
- **Service API:** the existing shared API server provides the synthetic case,
  summary, and scenario-run endpoints. No user data or external integrations
  are required.

## What the sample computes

The test case has 14 buses and 20 lines, with synthetic generation, demand,
ratings, reactance, voltage observations, and map coordinates. A lossless DC
load-flow approximation solves each connected island with a generation slack
bus. If an island's listed generation cannot meet its demand, load is curtailed
proportionally across its buses before the next flow solve. After an initiating outage, the engine repeats power-flow and conditional
failure-risk calculations until no additional line crosses its trigger or the
step cap is reached. A seeded Monte Carlo estimate and Wilson interval are
reported alongside a severity score, propagation sequence, affected load, and
ranked review recommendations. The Monte Carlo estimate samples the predicted
follow-on outages as conditional Bernoulli events; its interval captures only
sampling variation, not uncertainty in the model assumptions.

## Default execution walkthrough

Run from `python/`:

```bash
python -m gridcascade --contingency L08 --load-multiplier 1.0 --failure-threshold 1.0 --samples 500
```

For this synthetic operating point, the predicted sequence is **L08 initiating
outage → L01 overload → L02 overload**. The engine then reaches a stable
topology with an isolated north generator and a generation-limited island; the
proportional-curtailment assumption estimates **232.4 MW affected load** and a
**56.1/100 severity score**. The seeded 500-sample run estimates a **100%
cascade probability** with a **95% Wilson interval of 99.2%–100%**. These values
are reproducible for the stated input and sample count, but are synthetic model
outputs, not evidence about a real network.

## Limits

This is not an official IEEE test-case file or validated planning tool. Its
synthetic operating point and illustrative hazard parameters have not been
calibrated using utility data. The DC approximation omits losses, reactive
power, voltage stability, relay/protection logic, transient dynamics, and
operator procedures. Its confidence interval describes Monte Carlo sampling
variation only; it does not represent model uncertainty. Do not use the output
to switch equipment, set protection, dispatch generation, or operate a real
grid.

See [`python/README.md`](python/README.md) for setup, tests, and the CLI walkthrough.
