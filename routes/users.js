import express from "express";
import crypto from "crypto";
import { getConnection, connection } from "../models/db.js";
import NC_SMS from "../services/NC_SMS.js";
import dotenv from "dotenv";
import passport from "passport";
import jwt from "jsonwebtoken";
import verification from "../middleware/verification.js";
import asyncHandle from "../util/async_handler.js";

dotenv.config();

const router = express.Router();

// pk, nick, profileImg전달
router.get("/", verification, (req, res, next) => {
  const { userPk } = res.locals.user;
  getConnection((conn) => {
    try {
      conn.beginTransaction();
      conn.query(
        `SELECT userPk, nickname, profileImg FROM users WHERE userPk=${userPk}`,
        (err, data) => {
          if (err) throw err;
          if (data.length > 0) {
            const { userPk, nickname, profileImg } = JSON.parse(
              JSON.stringify(data[0])
            );
            res.status(200).json({ userPk, nickname, profileImg });
          } else res.status(400);
        }
      );
    } catch (err) {
      next(err);
    }
  });
});

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
          }
        );
        conn.query(`DELETE FROM auth WHERE pNum=${phoneNumber}`);

        const authNumber = Math.floor(Math.random() * 90000) + 10000;
        NC_SMS(req, next, authNumber);

        conn.query(
          `INSERT INTO auth(pNum, aNum) VALUES('${phoneNumber}', ${authNumber})`
        );
        conn.commit();
  res.sendStatus(200);
      } catch (err) {
        conn.rollback();
        next(err);
      } finally {
        conn.release();
      }
    });
});

router.post("/p_auth", (req, res, next) => {
  const { pNum, aNum } = req.body;
  getConnection((conn) => {
    try {
      conn.beginTransaction();
      // 인증번호는 극히 적은 확률로 같은 숫자가 존재할 수 있음. 또한 특정 사용자가 특정 번호를 입력했다는 증명이 되어야함. 그래서 AND
      conn.query(
        `SELECT * FROM auth WHERE pNum='${pNum}' AND aNum=${aNum}`,
        (err, data) => {
          if (err) throw err;
          const authInfo = JSON.parse(JSON.stringify(data));
          if (
            Math.floor(+new Date(authInfo[0]?.time) / 1000) -
              Math.floor(+new Date() / 1000) >=
            -60
          ) {
            // 핸드폰 번호, 인증번호, 유효기간 모두 성립
            conn.query(`DELETE FROM auth WHERE pNum='${pNum}'`);
            conn.commit();
            res.sendStatus(200);
          } else res.sendStatus(401);
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

router.post("/duplicate", (req, res, next) => {
  const { userId, nickname } = req.body;
  const sequel = userId
    ? `SELECT userPk FROM users WHERE userId='${userId}'`
    : `SELECT userPk FROM users WHERE nickname='${nickname}'`;
  getConnection(async (conn) => {
    try {
      conn.beginTransaction();
      conn.query(sequel, function (err, data) {
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
        ]
      );

      conn.commit();
      res.sendStatus(201);
    } catch (err) {
      conn.rollback();
      err.status = 500;
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
              `UPDATE users SET refreshToken='${refreshToken}' WHERE userPk='${user.userPk}'`
            );
            conn.commit();
          } catch (err) {
            conn.rollback();
            next(err);
          } finally {
            conn.release();
          }
        });

        res.cookie("jwt", accessToken, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });
        res.cookie("refresh", refreshToken, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });
        res.sendStatus(200);
      });
    })(req, res);
  } catch {
    next(err);
  }
});

router.delete('/signout', verification, (req, res, next)=>{
  try {
    res.clearCookie('jwt')
    res.clearCookie('refresh')
    res.sendStatus(204)
  }catch(err){
    next(err)
  }
})

router.get("/a", verification, (req, res) => {
  res.send("true");
});

router.get(
  "/b",
  asyncHandle(async (req, res, next) => {
    throw new Error("사용자 정의 에러 발생");
  })
);

export default router;
