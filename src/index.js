import express from "express";
import connectDB  from "./db/db.js";
import { matchRouter } from "./routes/matches.js";
const app = express();

const port = 8080;

app.use(express.json());

//Connect DB
connectDB();

app.get("/", (req, res) => {
  res.send("Hello form Express server!");
});

app.use("/matches",matchRouter);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
