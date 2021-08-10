import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/index.js";
import logger from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import csrfProtection from "csurf";
import errorHandlers from "./util/error_handlers.js";
import http from "http";
import passport from "passport";
import passportConfig from "./passport/passport.js";
import swaggerDocs from "./config/swagger_config.js";
import fs from "fs";
import https from "https";
import DBCleaner from "./util/db_cleaner.js";
import keepAlive from "./models/scripts/procedures_events.js";
// import webSocket from "./websocket.js";

const app = express();

dotenv.config();

const corsOption = {
  origin: ["https://localhost:3000", "https://seunggyulee.shop"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(express.static("public"));
app.use(cors(corsOption));
app.use(logger("dev"));
app.use(helmet());
app.use(cookieParser());
app.use(express.json()); // body-parser 기능 포함
app.use(express.urlencoded({ extended: false }));
// app.use(csrfProtection({ cookie: true })); // csrfProtection은 cookieparser나 session미들웨어보다 밑에 있어야한다.
app.use(passport.initialize());
passportConfig();

app.use("/api", router);
app.use("/docs", swaggerDocs);
app.use(errorHandlers);

const options = {
  // letsencrypt로 받은 인증서 경로를 입력
  ca: fs.readFileSync("/etc/letsencrypt/live/soujinko.shop/fullchain.pem"),
  key: fs.readFileSync("/etc/letsencrypt/live/soujinko.shop/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/soujinko.shop/cert.pem"),
};

const server = http.createServer(app);

setInterval(keepAlive, 60 * 240 * 1000);

server.listen(3000, () => {
  console.log("서버 연결 성공");
});

const server2 = https.createServer(options, app);

server2.listen(443, () => {
  console.log("서버 연결 성공2");
});
// https.createServer(options, app).listen(443);
// webSocket(server);

export { server, app, server2 };
