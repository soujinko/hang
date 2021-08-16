import { transports, format, createLogger } from 'winston'
import Daily from 'winston-daily-rotate-file'
import dotenv from 'dotenv'
import SlackHook from 'winston-slack-webhook-transport'

const { File, Console } = transports
const { combine, timestamp, printf, colorize, simple, align } = format

const logFormat = printf(info => {
  return `${info.timestamp} ${info.level}: ${info.message}`
})

dotenv.config()

const levels = {
  levels:{
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  },
  colors:{
    error:'red',
    warn:'yellow',
    info:'green',
    debug:'blue'
  } 
};

// EPIPE에러발생시 exit 하지 않도록
function ignoreEpipe(err) {
  return err.code !== 'EPIPE';
}

// level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
const logger = createLogger({
  exitOnError: false,
  levels: levels,
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    align(),
    logFormat()
  ),
  exceptionHandlers:[
    new File({ filename: '/var/log/winston/exceptions.log'})
  ],
  rejectionHandlers:[
    new File({ filename: '/var/log/winston/rejections.log'})
  ],
  transports: [
     // default: info
    new SlackHook({
      webhookUrl: 'https://hooks.slack.com/services/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',
      channel: 'errors',
      username: 'ERROR BOT',
      level: 'error'
    }),
    new Daily({
      level: 'info',
      datePattern: 'YYYY-MM-DD',
      dirname: '/var/log/winston/',
      filename: `%DATE%.log`,
      maxFiles: '7d',
      // zippedArchive: true
    }),
    new Daily({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: '/var/log/winston/',
      filename: `%DATE%.error.log`,
      maxFiles: '7d',
      // zippedArchive: true
    })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new Console({
    format: combine(
      colorize(),
      simple()
      ),
    level:'debug',
    handleExceptions:true
  }))
}

logger.stream = {
  write:function(message, encoding) {
    logger.info(message)
  }
}

export default logger