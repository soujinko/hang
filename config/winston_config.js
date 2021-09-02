import winston from "winston";
import Daily from "winston-daily-rotate-file";
import dotenv from "dotenv";
import SlackHook from "winston-slack-webhook-transport";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const { File, Console } = winston.transports;
const {
  combine,
  timestamp,
  printf,
  colorize,
  simple,
  align,
  prettyPrint,
  splat,
  label,
} = winston.format;

const logDir = __dirname + "/../logs";
const logFormat = printf((info) => {
  return `${info.timestamp} ${info.level}: ${process.env.NODE_ENV} - ${info.message}`;
});

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// EPIPE에러발생시 exit 하지 않도록 하는 예시
function ignoreEpipe(err) {
  return err.code !== "EPIPE";
}

// level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
const logger = winston.createLogger({
  exitOnError: false,
  level: process.env.NODE_ENV !== "production" ? "debug" : "info",
  format: combine(
    timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    align(),
    logFormat
  ),
  exceptionHandlers: [
    new File({
      filename: "logs/" + "exceptions.log",
      maxsize: 5242880,
    }),
  ],
  transports: [
    // default: info
    new SlackHook({
      level: "error",
      webhookUrl:
        "https://hooks.slack.com/services/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",
      channel: "errors",
      username: "ERROR BOT",
      unfurlLinks: true,
      unfurlMedia: true,
      iconUrl:
        "https://a.slack-edge.com/production-standard-emoji-assets/13.0/google-medium/1f4a2.png",
      formatter: (info) => {
        return {
          text: `*${process.env.NAME}*:*${process.env.NODE_ENV}* => ${info.level}: ${info.message}`,
        };
      },
    }),
    new Daily({
      level: "info",
      datePattern: "YYYY-MM-DD",
      dirname: "logs/",
      filename: `%DATE%.log`,
      maxFiles: "7d",
      maxSize: 5242880,
      // zippedArchive: true
    }),
    new Daily({
      level: "error",
      datePattern: "YYYY-MM-DD",
      dirname: "logs/",
      filename: `%DATE%.error.log`,
      maxFiles: "7d",
      maxSize: 5242880,
      // zippedArchive: true
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new Console({
      format: combine(
        colorize(),
        // label({label:'HANG'}),
        simple()
        // prettyPrint(),
        // splat()
      ),
      level: "debug",
      handleExceptions: true,
    })
  );
}

logger.stream = {
  write: function (message, encoding) {
    logger.info(message);
  },
};

export default logger;
