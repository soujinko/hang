import dotenv from 'dotenv'

dotenv.config()

const verification = async (req, res, next, connection, jwt) => {
  
  // 토큰 자체가 없는 경우 or cookies jwt와 headers jwt가 다른경우
  if (!req.cookies?.jwt || req.cookies?.jwt !== req.headers.token) return res.sendStatus(401)
  // jwt verify가 성공할 경우 next
  try {
    const user = jwt.verify(req.cookies.jwt, process.env.PRIVATE_KEY, {algorithms:['HS512']})
    res.locals.user = user
    next()
  } catch {
    try {
      // jwt가 무효. refresh는 유효한지 체크
      // 최상단에서 옵셔널 체이닝으로 cookie가 있는 것은 검증했으니 또 다시 검증할 필요 없음.
      // refresh가 유효하다면 jwt재발급. 데이터는 jwt에서 decode해서 꺼내와야함.
      // 마지막 경우의 수는 jwt가 존재하지만 유효하지 않고 변형된 경우임. 이는 ignoreExpiration으로 검증할 수 있음.
      // 그러나 새로운 accessToken은 db에서 정보를 받아서 새로 담아야함. 정보가 수정되었을 수 있으니까.
      // 그리고 이 경우에는 refresh가 유효하지만 db와 대조했을때 다르다면 새로 발급해주어선 안됨! 사실상 jwt와 refresh 둘다 무효인 상황인 것임.

      // 기간 지난 jwt가 변형 되진 않았는지 검증. 변형되었다면 새로 로그인
      const expiredUser = jwt.verify(req.cookies.jwt, process.env.PRIVATE_KEY, {ignoreExpiration:true})
      // refresh를 verify
      jwt.verify(req.cookies.refresh, process.env.PRIVATE_KEY, {algorithms:['HS512']})
      // refresh db저장정보와 일치여부 검사
      await connection.beginTransaction();
      const DBRefreshToken = JSON.parse(JSON.stringify(await connection.query(`SELECT refreshToken FROM users WHERE userPk= ?`, [expiredUser.userPk])))[0][0].refreshToken
      
      await connection.release()
      if (DBRefreshToken !== req.cookies.refresh) throw new Error('refresh token does not match')
      
      // (jwt 만료 && 변형되지 않음) && (refresh 유효 && 변형되지 않았을 때)
      const newAccessToken = jwt.sign(
					{ userPk: expiredUser.userPk },
					process.env.PRIVATE_KEY,
					{ expiresIn: '3h', algorithm: 'HS512' }
				);
      
      res.status(307).cookie('jwt', newAccessToken, { httpOnly:true, secure:true, sameSite:'none' }).json({newAccessToken})
    } catch(err) {
      err.status = 401
      next(err)
      // 1.jwt와 refresh가 모두 expired되었거나, 
      // 2.jwt가 무효하고 refresh가 변형이 되었거나,
      // 3.jwt가 expired되었을 뿐 아니라 변형 되었을 경우, refresh의 유효성에 상관없이 새로 로그인
    }
  }
}

export default verification
