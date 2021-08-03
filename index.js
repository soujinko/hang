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

const app = express();

dotenv.config();

const corsOption = {
  origin: "https://localhost:3000",
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

app.get("/", (req, res, next) => {
  console.log("쿠리쿠리", req.cookies);
  res.send("hello world");
});
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

server.listen(3000, () => {
  console.log("서버 연결 성공");
});
https.createServer(options, app).listen(443);

export { server, app };
