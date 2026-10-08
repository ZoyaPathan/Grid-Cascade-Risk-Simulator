# Python reference simulator

This is a runnable, dependency-free reference implementation of the project's
data ingestion, network graph, DC power-flow, temporal hazard, cascade, and risk
modules. It uses Python's standard library so the synthetic demonstration can
run without installing scientific packages.

## Run it

From the `python/` directory:

```bash
python -m unittest discover -s tests -v
python -m gridcascade --samples 250 --contingency L08 --load-multiplier 1.0 --failure-threshold 1.0
```

The demo reads `gridcascade/data/ieee14.synthetic.txt`, runs the default
contingency, prints cascade steps, affected load, severity, Monte Carlo estimate,
95% Wilson interval, remaining line risk, and single-line criticality.

For another file, provide `--input path/to/grid.txt`. The parser expects two
CSV-like sections:

```text
[BUSES]
id,name,zone,kind,load_mw,generation_mw,voltage_pu,frequency_hz,status,x,y
1,North Hub,North,Slack,0,232.4,1.06,60,online,17,48
...
[LINES]
id,from_bus,to_bus,capacity_mw,reactance_pu,status
L01,1,2,110,0.059,online
...
```

Lines beginning with `#` are ignored. Missing numeric values use the documented
field defaults; duplicate bus IDs, unknown endpoints, invalid line capacities,
and unknown sections fail explicitly.
