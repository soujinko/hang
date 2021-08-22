// KEYS는 O(N)의 시간복잡도를 가지므로 SCAN으로 대체
// DEL은 연산동안 redis가 정지하므로 background에서 별도의 thread로 처리되는 unlink사용
// 마찬가지의 원리로 백업시 SAVE가 아닌 BGSAVE하여야 함

import Redis from 'ioredis'
import dotenv from 'dotenv'
import { getConnection } from '../models/db.js'

dotenv.config()

const redis = new Redis({ password:process.env.REDIS_PASSWORD })

// cursor가 0이 될때까지 while을 돕니다. 모든 key를 얻기 위해
const getAllMatchingKeys = async (userPk, next) => {
  let init = 0
  let result = []
  try {
    do {
      const [cursor, keys] = await redis.scan(init, 'MATCH', `requests:${userPk}:*`, 'COUNT', '100')
      result = result.concat(keys)
      init = cursor
    } while (cursor !== '0');
  } catch(err) {
    next(err)
  }
    return result;
}

const requestsWriteBackAndQuery = async (userPk, next) => {
    const cachedRequests = await getAllMatchingKeys(userPk, next)
    // cachedRequests 길이가 0이건 말건 어차피 mysql을 들러야함. 그래서 getConnection부터
    getConnection((conn) => {
      try{
        conn.beginTransaction();
        // 캐쉬에 userPk에 해당하는 request가 있을 경우 만 if내로 진입. 없다면 바로 쿼리해서 보내주면 됨.
        if (cachedRequests.length > 0) {
          // 캐쉬에 userPk에 해당하는 request가 있는 경우 -> 지금까지 쌓인 request 캐쉬를 db에 저장하고(status 컨트롤을 하려면 저장해야 함) 조회해서 가져감
          redis.smembers('requests', (err, cachedKeys) => {
            if (err) return next(err)
            // 문자열 연산을 실행하기 위한 시작점을 위해 첫 번째 데이터를 sequel문 안에 포함시키고 시작함
            redis.lrange(cachedKeys[0], (err, start) => {
              if (err) return next(err)
              let sequel = `INSERT INTO requests(tripId, reqPk, recPk) VALUES(?, ?, ?)`
              let cachedData = [start[0][0], start[0][1], start[0][2]]
              // 캐쉬에 저장된 데이터 갯수가 1이었을 경우 : 위 sequel 그대로 실행하고 끝내면 됨
              if (cachedKeys.length === 1) {
                conn.query(sequel, cachedData)
                conn.commit()
              // 캐쉬에 저장된 데이터 갯수가 2 이상일 경우
              } else {
                const pivot = cachedKeys.length - 1
                for (let [i,key] of Object.entries(cachedKeys.slice(1))) {
                  redis.lrange(key, 0, -1, (err, reqData) => {
                    if (err) return next(err)
                    sequel += `, (?, ?, ?)`
                    cachedData = cachedData.concat([reqData[0], reqData[1], reqData[2]])
                    // +i와 pivot이 같은 경우란 cachedKeys를 끝까지 돌았다는 것이다. sequel에 ,(...)문자열을 더한 상태가 유지되려면 이 block내에서 끝내야 하기때문에 어쩔 수 없음
                    if (+i === pivot) {
                      conn.query(sequel, cachedData)
                      conn.commit()
                    }
                  })
                } 
              }
            })
          })
        }
        // 캐쉬 데이터 insert 과정 끝(if 캐쉬에 userPk에 해당하는 데이터가 있었다면)
        // 돌려보낼 데이터 조회
        conn.query(`SELECT * FROM requests WHERE recPk=${userPk}`, (err, data) => {
          if (err) return next(err)
          res.status(200).json({data})
        })
      } catch(err) {
        conn.rollback()
        next(err)
      } finally {
        conn.release()
      }
    })
    // getConnection 끝. 기존 cash 삭제
    redis.smembers('requests', (err, data) => {
      if (err) return next(err)
      redis.unlink(data)
    })
    redis.del('requests')
}

export default requestsWriteBackAndQuery