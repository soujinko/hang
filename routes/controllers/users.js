const POST_sms_auth = (connection, NC_SMS, redis) => {
  return (
    async(req, res, next) => {
      const { pNum, status } = req.body;
      try {
        await connection.beginTransaction();
        const authNumber = Math.floor(Math.random() * 90000) + 10000;
        if (status) {
          const isUserExists = (await connection.query(
            `SELECT pNum FROM users WHERE pNum=?`,
            [pNum]))[0];
            if (isUserExists.length > 0) return res.sendStatus(409);
          }
          NC_SMS(req, next, authNumber);
          await redis.set(pNum, authNumber, 'EX', 60)
          return res.sendStatus(200)
      } catch (err) {
        await connection.rollback();
        next(err);
      } finally {
        await connection.release();
      }
  })
}
const POST_p_auth = (redis) => {
  return (
    async(req, res) => {
      const { pNum: phoneNumber, aNum: authNumber } = req.body;
      const storedAuthNumber = await redis.get(phoneNumber)
      authNumber === storedAuthNumber ? res.sendStatus(200) : res.sendStatus(406)
    }
  )
}

const POST_duplicate = (connection) => {
  function typeChecker(val) {
    return Object.prototype.toString.call(val).slice(8, -1) === 'String'
  }
  return (
    async(req, res, next) => {
      const { userId, nickname } = req.body;
      
      if (
          !(
            ((userId && !nickname) && typeChecker(userId)) || 
            ((nickname && !userId) && typeChecker(nickname))
           )
         ) return res.sendStatus(409)
      
      const sequel = 
        userId
        ? `SELECT userPk FROM users WHERE userId=?`
        : `SELECT userPk FROM users WHERE nickname=?`;
      const input = userId ?? nickname;
      try {
        await connection.beginTransaction();
        const isUserNicknameExists = await connection.query(sequel, [input]);
        isUserNicknameExists[0].length > 0 ? res.sendStatus(409) : res.sendStatus(200)
      } catch (err) {
        next(err);
      } finally {
        await connection.release();
      }
    }
  )
}
    


const POST = (Crypto, connection, ITERATION_NUM) => {
  return (
    async(req, res, next) => {
      const {
        userId,
        nickname,
        password,
        age,
        region,
        city,
        profileImg,
        gender,
        pNum,
      } = req.body;

      const salt = Crypto.randomBytes(64).toString("base64");
      const hashedPassword = Crypto
        .pbkdf2Sync(
          password,
          salt,
          Number(ITERATION_NUM),
          64,
          "SHA512"
        )
        .toString("base64");
      
        try {
          await connection.beginTransaction();
          await connection.query(
            `INSERT INTO
            users(nickname, userId, password, salt, region, city, age, profileImg, gender, pNum)
            VALUES(?,?,?,?,?,?,?,?,?,?)`,
            [
              nickname,
              userId,
              hashedPassword,
              salt,
              region,
              city,
              age,
              profileImg,
              gender,
              pNum,
            ]
          );
          await connection.commit()
          res.sendStatus(201);
        } catch (err) {
          await connection.rollback();
          next(err);
        } finally {
          await connection.release();
        }
    }
  )
}
    


const POST_signIn = (passport, jwt, connection, PRIVATE_KEY) => {
  return (
    (req, res, next) => {
      try {
        passport.authenticate("local", (err, user) => {
          if (err || !user) {
            return res.sendStatus(401);
          }
          const accessToken = jwt.sign(
            {
              userPk: user.userPk,
              nickname: user.nickname
            },
            PRIVATE_KEY,
            { expiresIn: '3h', algorithm: "HS512" }
          );
          const refreshToken = jwt.sign({}, PRIVATE_KEY, {
            expiresIn: '7d',
            algorithm: "HS512",
          });
          req.login(user, { session: false }, async(err) => {
            if (err) throw err;
            
            try {
              await connection.beginTransaction();
              await connection.query(`UPDATE users SET refreshToken=? WHERE userPk=?`, [
                refreshToken,
                user.userPk,
              ]);
              await connection.commit();
            } catch (err) {
              await connection.rollback();
              next(err);
            } finally {
              await connection.release();
            }
          });
          
          res
            .status(200)
            .cookie("jwt", accessToken, {
              httpOnly: true,
              sameSite: "none",
              secure: true,
            })
            .cookie("refresh", refreshToken, {
              httpOnly: true,
              sameSite: "none",
              secure: true,
            })
            .json({ accessToken });
        })(req, res);
      } catch {
        next(err);
      }
    }
  )
}

const DELETE_signOut = () => {
  return (
    (req, res, next) => {
    try {
      res
        .clearCookie("jwt", { httpOnly: true, secure: true, sameSite: "none" })
        .clearCookie("refresh", {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .sendStatus(204);
    } catch (err) {
      next(err);
    }
    }
  )
}

const GET_chat = (zscanner, connection, redis) => {
  return (
    async(req, res, next) => {
      const { userPk } = res.locals.user;
      const chatList = await zscanner(userPk)
      
      try {
        await connection.beginTransaction()
        let result = []
        let obj = {}
        for (let i = 0; i < chatList.length; i++) {
          if (i % 2 === 0) {
            obj['lastChat'] = await redis.lrange(chatList[i], -1, -1)
            for (let v of chatList[i].split(':')) {
              if (userPk !== +v && +v) {
              const nickAndProf = await connection.query('SELECT profileImg, nickname FROM users WHERE userPk=?', [+v])
              const value = nickAndProf[0][0]
              if (value) {
                obj['nickname'] = value.nickname
                obj['profileImg'] = value.profileImg
                obj['targetPk'] = +v
              }
              }
            }
          } else {
            obj['unchecked'] = chatList[i]
            if (obj.nickname) result.push(obj)
            obj = {}
          }
        }
        
        res.status(200).json({result})
      } catch(err) {
        await connection.rollback()
        next(err)
      } finally {
        await connection.release()
      }
    }
  )
}

const GET_block = (redis, connection) => {
  return (
    async(req, res, next) => {
      const { userPk } = res.locals.user;
      const blockedPk = await redis.smembers(`block:${userPk}`)
      
      if (!blockedPk.length) return res.sendStatus(204)
      
      let inputs = [+blockedPk[0]]
      let sequel = 'SELECT profileImg, nickname, userPk FROM users WHERE userPk IN (?'
      
      blockedPk.slice(1).forEach(blockedID => {
        inputs.push(+blockedID)
        sequel += ',?'
      })
      sequel += ');'

      try {
        await connection.beginTransaction()
        const blockedUsers = (await connection.query(sequel, inputs))[0]
        res.status(200).json({blockedPk, blockedUsers})
      } catch (err) {
        connection.rollback()
        next(err)
      } finally {
        connection.release()
      }
    }
  )
}

const POST_block = (redis, connection) => {
  return (
    async(req, res, next) => {
      const { userPk } = res.locals.user;
      const { targetPk } = req.body;
      const pksAndReversed = [userPk, targetPk, targetPk, userPk]
      try {
        await redis.sadd(`block:${userPk}`, targetPk)
        await connection.beginTransaction()
        await connection.query('UPDATE trips SET partner=NULL WHERE (userPk=? AND partner=?) OR (userPk=? AND partner=?)', pksAndReversed)
        await connection.query('DELETE FROM requests WHERE (recPk=? AND reqPk=?) OR (recPk=? AND reqPk=?)', pksAndReversed)
        await connection.commit()
        res.sendStatus(201)
      } catch(err) {
        await connection.rollback()
        next()
      } finally {
        await connection.release()
      }
    }
  )
}

const PATCH_block = (redis) => {
  return (
    async(req, res) => {
      const { userPk } = res.locals.user;
      const { targetPk } = req.body;
      await redis.srem(`block:${userPk}`, targetPk)
      res.sendStatus(204)
    }
  )
}

const DELETE_quit = (zscanner, redis, connection) => {
  return (
    async(req, res, next) => {
      const { userPk } = res.locals.user;
      const keysToDelete = await zscanner(userPk)
      // delCounts의 탈퇴유저 방 목록 삭제
      if (keysToDelete.length > 0) redis.zrem('delCounts', keysToDelete)
      // 탈퇴 유저방 데이터 삭제 및 유저키 값 삭제
      redis.unlink(keysToDelete.push(userPk))
      .then(async(resolve) => {
          try {
            await connection.beginTransaction()
            await connection.query('DELETE FROM users WHERE userPk=?', [userPk])
            await connection.commit()
            res.sendStatus(204)
          } catch(err) {
            await connection.rollback()
            next(err)
          } finally {
            await connection.release()
          }
      })
    }
  )
}

const POST_exists = (connection) => {
  return (
    async(req, res, next) => {
      const { userId, pNum } = req.body;
      try {
        await connection.beginTransaction()
        const isUserExists = (await connection.query('SELECT userPk FROM users WHERE userId=? AND pNum=?', [userId, pNum]))[0]
        isUserExists.length !== 1 ? res.sendStatus(406) : res.sendStatus(200)
      } catch(err) {
        next(err)
      } finally {
        connection.release()
      }
    }
  )
}
  


const POST_password = (Crypto, connection, ITERATION_NUM) => {
  return (
    async (req, res, next) => {
      const { newPassword, userId } = req.body;
      const salt = Crypto.randomBytes(64).toString("base64");
      const hashedPassword = Crypto
            .pbkdf2Sync(
              newPassword,
              salt,
              Number(ITERATION_NUM),
              64,
              "SHA512"
            )
            .toString("base64");
      const newPasswordAndSalt = { password: hashedPassword, salt: salt }
      try {
        await connection.beginTransaction()
        await connection.query('UPDATE users SET ? WHERE userId = ?', [newPasswordAndSalt, userId])
        await connection.commit()
        res.sendStatus(204)
      } catch(err) {
        await connection.rollback()
        next(err)
      } finally {
        await connection.release()
      }
    }
  )
}
  
    
export { 
  POST_sms_auth, 
  POST_p_auth, 
  POST_duplicate, 
  POST, 
  POST_signIn, 
  DELETE_signOut, 
  GET_chat, 
  GET_block, 
  POST_block, 
  PATCH_block, 
  DELETE_quit,
  POST_exists, 
  POST_password
 }
