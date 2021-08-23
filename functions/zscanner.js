import redis from '../config/redis.cluster.config.js'

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