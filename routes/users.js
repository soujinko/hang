import express from "express";
import crypto from "crypto";
import { getConnection, connection } from "../models/db.js";
import NC_SMS from "../services/NC_SMS.js";
import dotenv from "dotenv";
import passport from "passport";
import jwt from "jsonwebtoken";
import verification from "../middleware/verification.js";
import asyncHandle from "../util/async_handler.js";
import Redis from 'ioredis'
import zscanner from '../functions/zscanner.js'

dotenv.config();

const router = express.Router();
const redis = new Redis({password:process.env.REDIS_PASSWORD})
// pk, nick, profileImg전달
router.post("/sms_auth", (req, res, next) => {
  const { pNum: phoneNumber } = req.body;
  getConnection((conn) => {
    try {
      conn.beginTransaction();
      conn.query(
        `SELECT pNum FROM users WHERE pNum=?`,
        [phoneNumber],
        (err, data) => {
          if (err) throw err;
          if (data.length > 0) return res.sendStatus(409);

          // const authNumber = Math.floor(Math.random() * 90000) + 10000;
          // NC_SMS(req, next, authNumber);
          
          // redis에 저장
          
          // redis.zadd('auth', authNumber, phoneNumber)
          res.sendStatus(200);
        }
      );
    } catch (err) {
      conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  });
});

router.post("/p_auth", asyncHandle(async(req, res, next) => {
  const { pNum: phoneNumber, aNum: authNumber } = req.body;
  // redis 데이터 불러와서 비교
  // const storedAuthNumber = await redis.zscore('auth', phoneNumber)
  // authNumber === storedAuthNumber ? res.sendStatus(200) : res.sendStatus(406)
  res.sendStatus(200);
}));

router.post("/duplicate", (req, res, next) => {
  const { userId, nickname } = req.body;
  const sequel = userId
    ? `SELECT userPk FROM users WHERE userId=?`
    : `SELECT userPk FROM users WHERE nickname=?`;
  const input = userId ?? nickname;
  getConnection((conn) => {
    try {
      conn.beginTransaction();
      conn.query(sequel, [input], function (err, data) {
        if (err) {
          throw err;
        } else if (data.length > 0) {
          // 여기 throw로 하면 안됩니다. 그냥 status로
          return res.sendStatus(409)
        } else {
          res.sendStatus(200);
        }
      });
    } catch (err) {
      next(err);
    } finally {
      conn.release();
    }
  });
});

router.post("/", (req, res, next) => {
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

  const salt = crypto.randomBytes(64).toString("base64");
  const hashedPassword = crypto
    .pbkdf2Sync(
      password,
      salt,
      Number(process.env.ITERATION_NUM),
      64,
      "SHA512"
    )
    .toString("base64");
  getConnection((conn) => {
    try {
      conn.beginTransaction();
      conn.query(
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
        ],
        (err, data) => {
          if (err) {
            conn.rollback();
            next(err);
          } else {
            conn.commit();
            res.sendStatus(201);
          }
        }
      );
    } catch (err) {
      conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  });
});

router.post("/signin", (req, res, next) => {
  try {
    passport.authenticate("local", (err, user, info) => {
      if (err || !user) {
        return res.sendStatus(401);
      }
      req.login(user, { session: false }, (err) => {
        if (err) throw err;
        const accessToken = jwt.sign(
          {
            userPk: user.userPk,
            nickname: user.nickname
          },
          process.env.PRIVATE_KEY,
          { expiresIn: "3h", algorithm: "HS512" }
        );
        const refreshToken = jwt.sign({}, process.env.PRIVATE_KEY, {
          expiresIn: "30d",
          algorithm: "HS512",
        });

        getConnection((conn) => {
          try {
            conn.beginTransaction();
            conn.query(`UPDATE users SET refreshToken=? WHERE userPk=?`, [
              refreshToken,
              user.userPk,
            ]);
            conn.commit();
          } catch (err) {
            conn.rollback();
            next(err);
          } finally {
            conn.release();
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
      });
    })(req, res);
  } catch {
    next(err);
  }
});

router.delete("/signout", verification, (req, res, next) => {
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
});

router.get("/chat", verification, asyncHandle(async(req, res, next) => {
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
          
          obj['nickname'] = nickAndProf[0][0].nickname
          obj['profileImg'] = nickAndProf[0][0].profileImg
          obj['targetPk'] = +v
          }
        }
      } else {
        obj['unchecked'] = chatList[i]
        result.push(obj)
        obj = {}
      }
    }
    console.log(result)
    res.status(200).json({result})
  } catch(err) {
    await connection.rollback()
    next(err)
  } finally {
    await connection.release()
  }
}))

// 차단한 사람들의 정보 가져오기
router.get('/block', verification, asyncHandle(async(req, res, next) => {
  const { userPk } = res.locals.user;
  const blocked = await redis.smembers(`block:${userPk}`)
  
  if (!blocked.length) return res.sendStatus(204)
  
  let inputs = [+blocked[0]]
  let sequel = 'SELECT profileImg, nickname, userPk FROM users WHERE userPk IN (?'
  
  blocked.slice(1).forEach(blockedID => {
    inputs.push(+blockedID)
    sequel += ',?'
  })
  sequel += ');'

  try {
    await connection.beginTransaction()
    const blockedUsers = (await connection.query(sequel, inputs))[0]
    res.status(200).json({blockedUsers})
  } catch (err) {
    connection.rollback()
    next(err)
  } finally {
    connection.release()
  }
}))

// 차단
router.post('/block', verification, asyncHandle(async(req, res) => {
  const { userPk } = res.locals.user;
  const { targetPk } = req.body;
  await redis.sadd(`block:${userPk}`, targetPk)
  res.sendStatus(201)
}))

// 차단해제
router.patch('/block', verification, asyncHandle(async(req, res) => {
  const { userPk } = res.locals.user;
  const { targetPk } = req.body;
  await redis.srem(`block:${userPk}`, targetPk)
  res.sendStatus(204)
}))

// 회원 탈퇴 
router.delete('/quit', verification, async(req, res, next) => {
  const { userPk } = res.locals.user;
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

router.post('/user_exists', async(req, res) => {
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
})

// 입력한 id와 전화번호가 일치하는지 검사하는 과정 필요
// 비밀번호 수정(p_auth에서 폰 인증문자 인증하고 -> 수정할 비밀번호 입력)
router.post('/password', verification, async (req, res, next) => {
  const { newPassword, userId } = req.body;
  const salt = crypto.randomBytes(64).toString("base64");
  const hashedPassword = crypto
        .pbkdf2Sync(
          newPassword,
          salt,
          Number(process.env.ITERATION_NUM),
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
})


router.get("/a", verification, (req, res) => {
  res.status(200).json({ status: true });
});

router.get(
  "/b",
  asyncHandle(async (req, res, next) => {
    throw new Error("사용자 정의 에러 발생");
  })
);

export default router;
