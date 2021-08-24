// 캐쉬에 저장만 하는 함수도 필요한 이유: request 신청 라우터로 들어왓을때 처리가 필요하니까
// 길이가 99라면 캐쉬에서 빼내어 현재 request와 합쳐서 mysql로 bulk insert. 즉 총 100개
// 100개로 지정한 이유는 sequel에 문자열 붙이려고 for문 도는 시간을 줄이기 위해서
import redis from '../config/redis.cluster.config.js'
import { getConnection } from '../models/db.js'

const requestsWriteBack = (userPk , tripId, reqPk, recPk, next) => {
  redis.scard('requests', (err, reqCnt) => {
  if (err) return next(err)
  if (reqCnt < 99) {
    redis.rpush(`request:${userPk}:${reqCnt+1}`, tripId, reqPk, recPk)
    redis.sadd('requests', `request:${userPk}:${reqCnt+1}`)
  } else {
    redis.smembers('requests', (err, cachedKeys) => {
      if (err) return next(err)
      let sequel = `INSERT INTO requests(tripId, reqPk, recPk) VALUES(?, ?, ?)`
      let dataToInsert = [tripId, reqPk, recPk]
      const pivot = cachedKeys.length - 1
      for (let v of cachedKeys) {
        redis.lrange(v, 0, -1, (err, reqData) => {
          if (err) return next(err)
          sequel += `, (?, ?, ?)`
          dataToInsert = dataToInsert.concat([reqData[0], reqData[1], reqData[2]])
          if (+i === pivot) {
            getConnection((conn) => {
              try{
                conn.query(sequel, dataToInsert)
              } catch(err) {
                conn.rollback()
                next(err)
              } finally {
                conn.release()
              }
            })
          }
        })
      }
      redis.smembers('requests', (err, data) => {
        if (err) return next(err)
        redis.unlink(data)
      })
      redis.del('requests')
    })
  }
})
}

export default requestsWriteBack