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
function rejectUpgrade(socket, statusCode, message) {
  const response =
    `HTTP/1.1 ${statusCode} ${message}\r\n` +
    `Connection: close\r\n` +
    `Content-Type: text/plain\r\n` +
    `Content-Length: ${Buffer.byteLength(message)}\r\n` +
    `\r\n` +
    message;

  socket.end(response);
}

export default function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
  const onUpgradeSocketError = (err) => {
    console.error("WS pre-upgrade socket error", err);
  };

  // Arcjet check BEFORE handshake
  server.on("upgrade", async (req, socket, head) => {
    socket.on("error", onUpgradeSocketError);
    if (req.url !== "/ws") {
      rejectUpgrade(socket, 404, "Not Found");
      return;
    }

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            rejectUpgrade(socket, 429, "Rate limit exceeded");
          } else {
            rejectUpgrade(socket, 403, "Access denied");
          }
          return;
        }
      } catch (e) {
        console.error("WS Upgrade Error", e);
        rejectUpgrade(socket, 500, "Server security error");
        return;
      }
    }
    if (socket.destroyed) return;
    socket.removeListener("error", onUpgradeSocketError);

    // Arcjet passed — complete the handshake
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (socket, req) => {
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

  wss.on("close", () => {
    clearInterval(interval);
  });

  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
  }
  return { broadcastMatchCreated };
}
