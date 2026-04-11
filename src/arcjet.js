import arcjet, { detectBot, slidingWindow, shield } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE ?? "LIVE";

if (!["LIVE", "DRY_RUN"].includes(arcjetMode)) {
  throw new Error("ARCJET_MODE must be LIVE or DRY_RUN");
}
if (process.env.NODE_ENV === "production" && !arcjetKey) {
  throw new Error("ARCJET_KEY is required in production");
}
export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetMode, interval: "10s", max: 50 }),
      ],
    })
  : null;
export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      rules: [
        shield({ mode: arcjetMode }),
        detectBot({
          mode: arcjetMode,
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
        }),
        slidingWindow({ mode: arcjetMode, interval: "2s", max: 5 }),
      ],
    })
  : null;

export function securityMiddleware() {
  return async (req, res, next) => {

    if (!httpArcjet) return next();

    try {
      const decision = await httpArcjet.protect(req);
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).json({ error: "Too Many Requests." });
        }
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    } catch (e) {
      console.error("Arcjet Error :- ", e);
      return res.status(503).json({ error: "Service Unavailable" });
    }
  };
}
