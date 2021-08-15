import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

const redis = new Redis({password:process.env.REDIS_PASSWORD})

const zscanner = async(key) => {
  let init = 0
  let chatList = []

  do {
    const [cursor, scores] = await redis.zscan(key+'', init)
    chatList = chatList.concat(scores)
    init = cursor
  } while (init !== '0');

  return chatList
}

export default zscanner