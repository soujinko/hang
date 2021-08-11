import express from "express";
import crypto from "crypto";
import { getConnection } from "../models/db.js";
import NC_SMS from "../services/NC_SMS.js";
import dotenv from "dotenv";
import passport from "passport";
import jwt from "jsonwebtoken";
import verification from "../middleware/verification.js";
import asyncHandle from "../util/async_handler.js";
// import Redis from 'ioredis'

dotenv.config();

// const redis = new Redis(password:process.env.REDIS_PASSWORD);
const router = express.Router();

// pk, nick, profileImg전달
router.post("/sms_auth", (req, res, next) => {
    const { pNum: phoneNumber } = req.body;
    getConnection((conn) => {
      try {
        conn.beginTransaction();
        conn.query(
          `SELECT pNum FROM users WHERE pNum='${phoneNumber}'`,
          (err, data) => {
            if (err) throw err;
            if (data.length > 0) return res.sendStatus(409);
        
            // const authNumber = Math.floor(Math.random() * 90000) + 10000;
            // NC_SMS(req, next, authNumber);
            // redis에 저장
            // redis.set(phoneNumber, authNumber, 'EX', 60)
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

router.post("/p_auth", (req, res, next) => {
  const { pNum: phoneNumber, aNum: authNumber } = req.body;
  // redis 데이터 불러와서 비교
  // redis.get(phoneNumber, (err, data) => {
  //   if (err) next(err)
  //   else if (data === authNumber) res.sendStatus(202)
  //   else res.sendStatus(409)
  // })
  res.sendStatus(200)
});

router.post("/duplicate", (req, res, next) => {
  const { userId, nickname } = req.body;
  const sequel = userId
    ? `SELECT userPk FROM users WHERE userId=?`
    : `SELECT userPk FROM users WHERE nickname=?`;
  const input = userId ?? nickname
  getConnection((conn) => {
    try {
      conn.beginTransaction();
      conn.query(sequel, [input], function (err, data) {
        if (err) {
          throw err;
        } else if (data.length > 0) {
          throw new Error({ status: 409 });
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
  getConnection((conn) => {
    try {
      conn.beginTransaction();

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
          },
          process.env.PRIVATE_KEY,
          { expiresIn: "3h", algorithm: "HS512" }
        );
        const refreshToken = jwt.sign({}, process.env.PRIVATE_KEY, {
          expiresIn: "7d",
          algorithm: "HS512",
        });

        getConnection((conn) => {
          try {
            conn.beginTransaction();
            conn.query(
              `UPDATE users SET refreshToken=? WHERE userPk=?`
            , [refreshToken, user.userPk]);
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
            httpOnly:true,
            sameSite: "none",
            secure: true,
          })
          .cookie("refresh", refreshToken, {
            httpOnly:true,
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
    .clearCookie('jwt',{  httpOnly:true, secure:true, sameSite:'none'})
    .clearCookie('refresh',{  httpOnly:true, secure:true, sameSite:'none'})
    .sendStatus(204)
  }catch(err){
    next(err)
  }
});

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
