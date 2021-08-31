import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/index.js";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import csrfProtection from "csurf";
import errorHandlers from "./util/error_handlers.js";
import passport from "passport";
import passportConfig from "./passport/passport.js";
import swaggerDocs from "./config/swagger_config.js";
import fs from "fs";
import http from "http";
import verification from "./middleware/verification.js";
import keepAlive from "./models/scripts/procedures_events.js";
import logger from "./config/winston_config.js";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

app.use(express.static("public"));
const options = {
  // letsencrypt로 받은 인증서 경로를 입력
  ca: fs.readFileSync("/etc/letsencrypt/live/ruzan.shop/fullchain.pem"),
  key: fs.readFileSync("/etc/letsencrypt/live/ruzan.shop/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/ruzan.shop/cert.pem"),
  // requestCert: false,
  // rejectUnauthorized: false,
};

// const server = https.createServer(options, app);
// const server = http.createServer(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
});
<<<<<<< HEAD
=======

>>>>>>> 27052cd94d729327dbd7ed227332994a5a6b3907
const corsOption = {
  origin: [
    "https://3.34.95.155:443",
    "http://3.34.95.155:443",
    "https://54.180.143.198:443",
    "https://localhost:3000",
    "https://seunggyulee.shop",
    "https://hanging.kr",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};
<<<<<<< HEAD
app.enable("trust proxy");
=======
app.enable('trust proxy')
>>>>>>> 27052cd94d729327dbd7ed227332994a5a6b3907
app.use(cors(corsOption));
app.use(limiter);
app.use(morgan("dev"));
app.use(morgan("combined", { stream: logger.stream }));
// 헬멧은 기본적으로 15가지 보안 기능 중 11가지 기능을 제공하고, 4가지 기능은 명시적으로 사용을 지정해야한다.
app.use(helmet());
app.use(cookieParser());
app.use(express.json()); // body-parser 기능 포함
app.use(express.urlencoded({ extended: false }));
// app.use(csrfProtection({ cookie: true })); // csrfProtection은 cookieparser나 session미들웨어보다 밑에 있어야한다.
app.use(passport.initialize());
passportConfig();
app.use(/^((?!users).)*$/, verification);

app.use("/api", router);
app.use("/docs", swaggerDocs);
app.use(errorHandlers);

setInterval(keepAlive, 60 * 240 * 1000);

const server = http.createServer(app);

export default server;
