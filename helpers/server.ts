import * as dotenv from "dotenv";
import express from "express";
import path from "path";
import http from "http";
import cors from "cors";

dotenv.config();

// SERVER CONFIG
const PORT = process.env.PORT || 3001;
const app = express();
const server = http
	.createServer(app)
	.listen(PORT, () => console.log(`Listening on ${PORT}\n`));
app.use(express.static(path.join(__dirname, "public")));
app.use(cors({ credentials: true, origin: "*" }));
