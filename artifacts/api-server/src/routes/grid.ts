import { Router, type IRouter } from "express";
import {
  RunGridSimulationBody,
} from "@workspace/api-zod";
import { getGridCase, getGridOverview, simulateGrid } from "../lib/grid-simulator";

const router: IRouter = Router();

router.get("/grid-case", (_req, res): void => {
  res.json(getGridCase());
});

router.get("/grid-overview", (_req, res): void => {
  res.json(getGridOverview());
});

router.post("/simulation/run", (req, res): void => {
  const parsed = RunGridSimulationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    res.json(simulateGrid(parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run simulation";
    res.status(400).json({ error: message });
  }
});

export default router;
