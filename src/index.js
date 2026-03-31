import express from "express";
import connectDB  from "./db/db.js";
import http from "http";
import createMatchRouter from "./routes/matches.js";
import attachWebSocketServer from "./ws/server.js"
import { securityMiddleware } from "./arcjet.js";


const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app)


app.use(express.json());

//Connect DB
connectDB();

app.get("/", (req, res) => {
  res.send("Hello form Express server!");
});

const { broadcastMatchCreated } = attachWebSocketServer(server);

app.use(securityMiddleware())

app.use("/matches",createMatchRouter(broadcastMatchCreated));





server.listen(PORT, HOST,() => {
  const baseUrl = HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server is running on ${baseUrl}`);
  console.log(`Websocket Server is running on ${baseUrl.replace('http','ws')}/ws`);
});
