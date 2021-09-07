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

dotenv.config();

const app = express();

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

app.enable('trust proxy')
app.use(cors(corsOption));
app.use(morgan("dev"));
app.use(morgan("combined", { stream: logger.stream }));
app.use(helmet());
app.use(cookieParser());
app.use(express.json()); // body-parser 기능 포함
app.use(express.urlencoded({ extended: false }));
app.use(passport.initialize());
passportConfig();
app.use(/^((?!users).)*$/, verification);

app.use("/api", router);
app.use("/docs", swaggerDocs);
app.use(errorHandlers);

setInterval(keepAlive, 60 * 240 * 1000);

const server = http.createServer(app);

export default server;
