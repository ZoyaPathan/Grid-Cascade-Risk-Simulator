---
name: Cascade trip thresholds
description: Keep probabilistic failure forecasts distinct from deterministic cascade propagation triggers.
---

Use failure probability for ranking and risk reporting, but only propagate a deterministic outage when the component also meets a physical trip condition (such as overload) or an explicitly modeled protection event. Repeatedly feeding an accumulating DBN posterior directly into automatic trips can eventually fail healthy components and prevent the cascade loop from stabilizing.

**Why:** In the synthetic grid simulator, posterior persistence alone repeatedly tripped non-overloaded lines, producing runaway cascades rather than a stable endpoint.

**How to apply:** In future iterative reliability simulations, define the probability model and outage-selection trigger separately, and include a bounded equilibrium condition.
