import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscriber = new Map();

function subscribe(matchId, socket) {
  if (!matchSubscriber.has(matchId)) {
    matchSubscriber.set(matchId, new Set());
  }
  matchSubscriber.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscriber.get(matchId);
  if (!subscribers) return;
  subscribers.delete(socket); // Remove socket FROM the Set
  if (subscribers.size === 0) {
    matchSubscriber.delete(matchId);
  }
}

function cleanupSubscriptions(socket){
  if (!socket.subscriptions) return;
  for(const matchId of socket.subscriptions){
    unsubscribe(matchId,socket)
  }
}


function sendJson(socket, payLoad) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payLoad));
}

function broadcastToAll(wss, payLoad) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payLoad));
  }
}

function broadcastToMatch(matchId , payload){
  const subscribers = matchSubscriber.get(matchId);

  if(!subscribers || subscribers.size===0) return;

  const message = JSON.stringify(payload);

  for(const client of subscribers){
    if(client.readyState === WebSocket.OPEN){
      client.send(message);
    }
  }
}



function handleMessage(socket,data){
  let message ;

  try {
      message = JSON.parse(data.toString());
  } catch (e) {
    sendJson(socket , {type : 'error' , message : 'Invalid JSON'});
    return;
  }

  if(message?.type === "subscribe" && typeof message.matchId === "string" && message.matchId.trim() !== ""){
    subscribe(message.matchId,socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket , {type : 'subscribed' , matchId : message.matchId});
    return;
  }

  if(message?.type === "unsubscribe" && typeof message.matchId === "string" && message.matchId.trim() !== ""){
    unsubscribe(message.matchId,socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket , {type : 'unsubscribed' , matchId : message.matchId});
    return;
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

    socket.subscriptions = new Set();

    sendJson(socket, { type: "Welcome" });

    socket.on('message',(data)=>{
      handleMessage(socket,data);
    });


    socket.on("error",()=>{
      console.error;
      socket.terminate();
    });

    socket.on('close',()=>{
      cleanupSubscriptions(socket);
    })
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
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  function broadcastCommentary(matchId , comment){
    broadcastToMatch(matchId , {type : 'commentary' , data : comment});
  }

  return { broadcastMatchCreated , broadcastCommentary};
}
