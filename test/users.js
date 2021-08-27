import express from "express";
import crypto from "crypto";
import { connection } from "../models/db.js"
import NC_SMS from "../services/NC_SMS.js";
import dotenv from "dotenv";
import passport from "passport";
import jwt from "jsonwebtoken";
import verification from "../middleware/verification.js";
import asyncHandle from "../util/async_handler.js";
import redis from '../config/redis.cluster.config.js'
import zscanner from "../functions/zscanner.js";


dotenv.config();

const router = express.Router();
const multi = redis.multi()
// pk, nick, profileImg전달
router.post("/sms_auth", async(req, res, next) => {
  const { pNum: phoneNumber, status } = req.body;
  try {
    await connection.beginTransaction();
    // 회원가입이라면
    if (status) {
      const data = await connection.query(`SELECT pNum FROM users WHERE pNum=?`, [phoneNumber])
      if (data[0].length > 0) return res.sendStatus(409);
    };
    const authNumber = Math.floor(Math.random() * 90000) + 10000;
    // redis에 저장
    console.log('여기까진 오나요? 1', '인증번호:', authNumber)
    await redis.zadd('auth', authNumber, phoneNumber, 'EX', 60, (err, data) => {
      console.log('결과:',err, data)
    })

    await NC_SMS(req, next, authNumber);
    res.sendStatus(200);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    await connection.release();
  }
});

router.post(
  "/p_auth",
  asyncHandle(async (req, res, next) => {
    const { pNum: phoneNumber, aNum: authNumber } = req.body;
    // redis 데이터 불러와서 비교
    const storedAuthNumber = await redis.zscore('auth', phoneNumber)
    authNumber === storedAuthNumber ? res.sendStatus(200) : res.sendStatus(406)
  })
);

router.post("/duplicate", async(req, res, next) => {
  const { userId, nickname } = req.body;
  const sequel = userId
    ? `SELECT userPk FROM users WHERE userId=?`
    : `SELECT userPk FROM users WHERE nickname=?`;
  const input = userId ?? nickname;
  try {
    await connection.beginTransaction();
    await connection.query(sequel, [input], function (err, data) {
      if (err) {
        throw err;
      } else if (data.length > 0) {
        // 여기 throw로 하면 안됩니다. 그냥 status로
        return res.sendStatus(409);
      } else {
        res.sendStatus(200);
      }
    });
  } catch (err) {
    next(err);
  } finally {
    await connection.release();
  }
});

router.post("/", async(req, res, next) => {
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
    .pbkdf2Sync(password, salt, Number(process.env.ITERATION_NUM), 64, "SHA512")
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
        ],
        async(err, data) => {
          if (err) {
            await connection.rollback();
            next(err);
          } else {
            await connection.commit();
            res.sendStatus(201);
          }
        }
      );
    } catch (err) {
      await connection.rollback();
      next(err);
    } finally {
      await connection.release();
    }
  
});

router.post("/signin", (req, res, next) => {
  try {
    passport.authenticate("local", (err, user, info) => {
      if (err || !user) {
        return res.sendStatus(401);
      }
      req.login(user, { session: false }, async(err) => {
        if (err) throw err;
        const accessToken = jwt.sign(
          {
            userPk: user.userPk,
            nickname: user.nickname,
          },
          process.env.PRIVATE_KEY,
          { expiresIn: '3h', algorithm: "HS512" }
        );
        const refreshToken = jwt.sign({}, process.env.PRIVATE_KEY, {
          expiresIn: '7d',
          algorithm: "HS512",
        });

        try {
          await connection.beginTransaction();
          await connection.query(
            `UPDATE users SET refreshToken=${refreshToken} WHERE userPk=${user.userPk}`
          );
          await connection.commit();
        } catch (err) {
          await connection.rollback();
          next(err);
        } finally {
          await connection.release();
        }
        
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
router.get(
  "/block",
  verification,
  asyncHandle(async (req, res, next) => {
    const { userPk } = res.locals.user;
    const blocked = await redis.smembers(`block:${userPk}`);

    if (!blocked.length) return res.sendStatus(204);

    let inputs = [+blocked[0]];
    let sequel =
      "SELECT profileImg, nickname, userPk FROM users WHERE userPk IN (?";

    blocked.slice(1).forEach((blockedID) => {
      inputs.push(+blockedID);
      sequel += ",?";
    });
    sequel += ");";

    try {
      await connection.beginTransaction();
      const blockedUsers = (await connection.query(sequel, inputs))[0];
      res.status(200).json({ blockedUsers });
    } catch (err) {
      await connection.rollback();
      next(err);
    } finally {
      await connection.release();
    }
  })
);

// 차단
router.post(
  "/block",
  verification,
  asyncHandle(async (req, res) => {
    const { userPk } = res.locals.user;
    const { targetPk } = req.body;
    await redis.sadd(`block:${userPk}`, targetPk);
    res.sendStatus(201);
  })
);

// 차단해제
router.patch(
  "/block",
  verification,
  asyncHandle(async (req, res) => {
    const { userPk } = res.locals.user;
    const { targetPk } = req.body;
    await redis.srem(`block:${userPk}`, targetPk);
    res.sendStatus(204);
  })
);

// 회원 탈퇴 
router.delete('/quit', verification, asyncHandle(async(req, res, next) => {
  const { userPk } = res.locals.user;
  const keysToDelete = await zscanner(userPk)
  
  multi
  // delCounts의 탈퇴유저 방 목록 삭제
  .zrem('delCounts', keysToDelete)
  // 탈퇴 유저방 데이터 삭제 및 유저키 값 삭제
  .unlink(keysToDelete.push(userPk))
  .exec()
  .then(async(err, res) => {
      if (err) next(err)
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
}))

router.post('/exists', async(req, res) => {
  const { userId, pNum } = req.body;
  try {
    await connection.beginTransaction();
    const isUserExists = (
      await connection.query(
        "SELECT userPk FROM users WHERE userId=? AND pNum=?",
        [userId, pNum]
      )
    )[0];
    isUserExists.length !== 1 ? res.sendStatus(406) : res.sendStatus(200);
  } catch (err) {
    next(err);
  } finally {
    await connection.release();
  }
});

// 입력한 id와 전화번호가 일치하는지 검사하는 과정 필요
// 비밀번호 수정(p_auth에서 폰 인증문자 인증하고 -> 수정할 비밀번호 입력)
router.post('/password', async (req, res, next) => {
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
  const newPasswordAndSalt = { password: hashedPassword, salt: salt };
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE users SET ? WHERE userId = ?", [
      newPasswordAndSalt,
      userId,
    ]);
    await connection.commit();
    res.sendStatus(204);
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    await connection.release();
  }
});

router.get("/a", async(req, res) => {
  multi.set('hello', 'world').get('hello').exec().then(ok=>res.status(200).send(ok));
});

router.get(
  "/b",
  asyncHandle(async (req, res, next) => {
    throw new Error("사용자 정의 에러 발생");
  })
);

export default router;