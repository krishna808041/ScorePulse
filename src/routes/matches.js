import { Router } from "express";
import { createMatchSchema } from "../validations/matches.js";
import { Match } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { listMatchesQuerySchema } from "../validations/matches.js";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query.",
      details: parsed.error.issues,
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await Match.find().sort({ createdAt: -1 }).limit(limit);

    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: "Failed to list matches." });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid payload.",
      details: parsed.error.issues,
    });
  }

  const {
    data: { startTime, endTime, homeScore, awayScore },
  } = parsed;

  const start = new Date(startTime);
  const end = new Date(endTime);

  try {
    const event = await Match.create({
      ...parsed.data,
      startTime: start,
      endTime: end,
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      status: getMatchStatus(start, end),
    });

    return res.status(201).json({ data: event });
  } catch (e) {
    return res.status(500).json({
      message: "Failed To create Match.",
      details: e.message,
    });
  }
});
