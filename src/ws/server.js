import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

function sendJson(socket, payLoad) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payLoad));
}

function broadcast(wss, payLoad) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payLoad));
  }
}

export default function attachWebSocketServer(server) {
  const wss = new WebSocketServer({server,path: "/ws",maxPayload: 1024 * 1024,});

  wss.on("connection", async (socket, req) => {
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? "Rate limit exceeded"
            : "Access denied";
          socket.close(code, reason);
          return;
        }
      } catch (e) {
        console.error("WS Connection Error", e);
        socket.close(1011, "Server security error");
        return;
      }
    }

    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });
    sendJson(socket, { type: "WelCome" });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // ✅ ADD THIS (cleanup)
  wss.on("close", () => {
    clearInterval(interval);
  });

  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
  }
  return { broadcastMatchCreated };
}
