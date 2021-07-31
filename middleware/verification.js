import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { getConnection, connection } from '../models/db.js'

dotenv.config()

const verification = async (req, res, next) => {
  // 토큰 자체가 없는 경우
  if (!req.cookies?.jwt) return res.status(401).json({message:'로그인이 필요한 서비스입니다.'})
  // jwt verify가 성공할 경우 refresh check
  try{
    const user = jwt.verify(req.cookies.jwt, process.env.PRIVATE_KEY, {algorithms:['HS512']})
    res.locals.user = user
    try {
      // refresh 유효성 검사 후, 유효하다면 db와 대조. 일치하지 않는다면 DB와 client의 refresh 모두 재설정
      jwt.verify(req.cookies.refresh, process.env.PRIVATE_KEY, {algorithms:['HS512']})
      getConnection((conn)=> {
        try {
          conn.beginTransaction();
          conn.query(`SELECT refreshToken FROM users WHERE userPk=${user.userPk}`, (err, DBRefreshToken) => {
          if (err) throw err;
          if (JSON.parse(JSON.stringify(DBRefreshToken[0].refreshToken)) !== req.cookies.refresh) {
            const refreshToken = jwt.sign({}, process.env.PRIVATE_KEY, {expiresIn:'7d', algorithm:'HS512'})
            // 새 refresh
            conn.query(`UPDATE users SET refreshToken='${refreshToken}' WHERE userPk=${user.userPk}`)
            conn.commit()
            res.cookie('refresh', refreshToken, { httpOnly:true })
          }
          next()
        })
        
        } catch(err) {
          conn.rollback();
          next(err)
        } finally {
          conn.release();
        }
      })
      // jwt와 refresh가 모두 유효하게 되었음
      
    } catch {
       // refresh가 verify에서 실패한 상황. 재발급 해서 쿠키로 보내주고 DB 저장
      const refreshToken = jwt.sign({}, process.env.PRIVATE_KEY, {expiresIn:'7d', algorithm:'HS512'})
      res.cookie('refresh', refreshToken, { httpOnly: true })
      getConnection((conn)=>{
        try{
          conn.beginTransaction();
          conn.query(`UPDATE users SET refreshToken='${refreshToken}' WHERE=${user.userPk}`)
          conn.commit();
        } catch(err) {
          conn.rollback()
          next(err)
        } finally {
          conn.release()
        }
      })
     // jwt만 인증에 성공한 상황이었으나 refresh를 재발급해 모두 유효하게 됨
     next()
    }
  }catch{
    try {
      // jwt가 무효. refresh는 유효한지 체크
      // 맨위에서 옵셔널 체이닝으로 cookie가 있는 것은 검증했으니 또 다시 검증할 필요 없음.
      // refresh가 유효하다면 jwt재발급. 데이터는 jwt에서 decode해서 꺼내와야함.
      // 마지막 경우의 수는 jwt가 존재하지만 유효하지 않고 변형된 경우임. 이는 ignoreExpiration으로 검증할 수 있음.
      // 그러나 새로운 accessToken은 db에서 정보를 받아서 새로 담아야함. 정보가 수정되었을 수 있으니까.
      // 그리고 이 경우에는 refresh가 유효하지만 db와 대조했을때 다르다면 새로 발급해주어선 안됨! 사실상 jwt와 refresh 둘다 무효인 상황인 것임.

      // 기간 지난 jwt가 변형 되진 않았는지 검증. 변형되었다면 새로 로그인
      const expiredUser = jwt.verify(req.cookies.jwt, process.env.PRIVATE_KEY, {ignoreExpiration:true})
      // refresh를 verify 후 DB와 대조. DB와 다르면 새로 로그인
      jwt.verify(req.cookies.refresh, process.env.PRIVATE_KEY, {algorithms:['HS512']})
      
      await connection.beginTransaction();
      const DBRefreshToken = JSON.parse(JSON.stringify(await connection.query(`SELECT refreshToken FROM users WHERE userPk=${expiredUser.userPk}`)))[0][0].refreshToken
      await connection.release()
      
      if (DBRefreshToken !== req.cookies.refresh) throw new Error({message:'유효하지 않은 토큰입니다.'})
      
      // jwt는 만료되었으나 변형되지 않았고, refresh는 유효하며 변형되지 않았을 때.
      const newAccessToken = jwt.sign(
					{
						userPk: expiredUser.userPk,
						nickname: expiredUser.nickname,
						profileImg: expiredUser.profileImg,
					},
					process.env.PRIVATE_KEY,
					{ expiresIn: '3h', algorithm: 'HS512' }
				);
      res.cookie('jwt', newAccessToken, { httpOnly: true })
      next()
    } catch {
      // 1.jwt와 refresh가 모두 expired되었거나, 
      // 2.jwt가 무효하고 refresh가 변형이 되었거나,
      // 3.jwt가 expired되었을 뿐 아니라 변형 되었을 경우, refresh의 유효성에 상관없이 새로 로그인
      return res.status(401).json({message:'로그인이 필요한 서비스입니다.'})
    }
  }
}

export default verification