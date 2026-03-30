import { WebSocket ,WebSocketServer} from "ws";

function sendJson(socket,payLoad){
    if(socket.readyState !== WebSocket.OPEN) return;

    
    socket.send(JSON.stringify(payLoad));
}

function broadcast(wss,payLoad){
    for(const client of wss.clients){
        if(client.readyState !== WebSocket.OPEN) continue;

    
    client.send(JSON.stringify(payLoad));
    }
}

export default function attachWebSocketServer(server){
    const wss = new WebSocketServer({
        server,
        path : "/ws",
        maxPayload : 1024 * 1024
    });

    wss.on("connection",(socket)=>{
        socket.isAlive = true;
        socket.on("pong",()=>{
            socket.isAlive=true;
        })
        sendJson(socket,{type : 'WelCome'});

        socket.on('error',console.error);
    });

    const interval = setInterval(()=>{
        wss.clients.forEach((ws)=>{
            is(ws.isAlive===false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        })
    },30000)

    function broadcastMatchCreated(match){
        broadcast(wss, {type : 'match_created' , data : match});
    }
    return {broadcastMatchCreated}
};