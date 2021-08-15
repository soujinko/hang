import winston from 'winston'
import dotenv from 'dotenv'

dotenv.config()

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: {service:'user-service'},
  transports: [
    new winston.transports.File({ filename: 'error.log', level:'error' }),
    new winston.transports.File({ filename: 'combined.log'}) // default: info
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}