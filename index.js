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
import verification from "./middleware/verification.js";
import keepAlive from "./models/scripts/procedures_events.js";
import { Server } from "socket.io";

// import webSocket from "./websocket.js";

const app = express();

dotenv.config();

const corsOption = {
  origin: [
    "https://localhost:3000",
    "https://seunggyulee.shop",
    "https://hanging.kr",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(express.static("public"));
app.use(cors(corsOption));
app.use(logger("dev"));
// 헬멧은 기본적으로 15가지 보안 기능 중 11가지 기능을 제공하고, 4가지 기능은 명시적으로 사용을 지정해야한다.
// app.use(helmet());
app.use(cookieParser());
app.use(express.json()); // body-parser 기능 포함
app.use(express.urlencoded({ extended: false }));
// app.use(csrfProtection({ cookie: true })); // csrfProtection은 cookieparser나 session미들웨어보다 밑에 있어야한다.
app.use(passport.initialize());
passportConfig();
// app.use(/^((?!users).)*$/, verification);
app.get("/", async (req, res, next) => {
  res.send({});
});

app.use("/api", router);
app.use("/docs", swaggerDocs);
app.use(errorHandlers);

const options = {
  // letsencrypt로 받은 인증서 경로를 입력
  ca: fs.readFileSync("/etc/letsencrypt/live/soujinko.shop/fullchain.pem"),
  key: fs.readFileSync("/etc/letsencrypt/live/soujinko.shop/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/soujinko.shop/cert.pem"),
  requestCert: false,
  rejectUnauthorized: false,
};

const server = http.createServer(app);

setInterval(keepAlive, 60 * 240 * 1000);

// server.listen(3000, () => {
//   console.log("서버 연결 성공");
// });

const server2 = https.createServer(options, app);
server2.listen(443, () => {
  console.log("서버 연결 성공2");
});
const io = new Server(server2, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("확인용 로그: 알람용 소켓 연결됨");
});
// https.createServer(options, app).listen(443);

export { server, app, server2 };
