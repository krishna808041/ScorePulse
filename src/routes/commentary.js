import { Router } from "express";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
  matchIdParamsSchema,
} from "../validations/commentary.js";
import { Commentary } from "../db/schema.js";
import { Console } from "console";

// console.log("matchIdParamsSchema:", matchIdParamsSchema); // ← add this
// console.log("createCommentarySchema:", createCommentarySchema); // ← add this

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get("/", async (req, res) => {
  const MAX_LIMIT = 50;
  const paramsResult = matchIdParamsSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res.status(400).json({
      error: "Invalid Match ID",
      details: paramsResult.error.issues,
    });
  }
  const queryResult = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryResult.success) {
    return res.status(400).json({
      error: "Invalid query.",
      details: queryResult.error.issues,
    });
  }

  try {
    const id = paramsResult.data.id;
    const limit = Math.min(queryResult.data.limit ?? 50, MAX_LIMIT);
    const data = await Commentary.find({matchId : id}).sort({ createdAt: -1 }).limit(limit);

    return res.status(200).json({ data });
  } catch (e) {
    return res.status(500).json({ error: "Failed to list matches." });
  }
});

commentaryRouter.post("/", async (req, res) => {
  console.log("BODY:", req.body); // ✅ ADD THIS
  console.log("PARAMS:", req.params);
  const paramsResult = matchIdParamsSchema.safeParse(req.params);
  if (!paramsResult.success) {
    return res
      .status(400)
      .json({ error: "Invalid Match Id ", details: paramsResult.error.issues });
  }

  const bodyResult = createCommentarySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({
      error: "Invalid commentary payload",
      details: bodyResult.error.issues,
    });
  }

  try {
    const { minute, ...rest } = bodyResult.data;

    const result = await Commentary.create({
      matchId: paramsResult.data.id,
      minute,
      ...rest,
    });
    if(res.app.locals.broadcastCommentary){
        res.app.locals.broadcastCommentary(result.matchId.toString() , result);
    }

    return res.status(201).json({ data: result });
  } catch (e) {
    console.error("Failed To Create Commentary:", e);
    return res.status(500).json({ error: "Failed To Create Commentary" });
  }
});
