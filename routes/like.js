import { getConnection } from "../models/db.js";
import express from "express";
import dotenv from "dotenv";
import { redisClient } from "../index.js";
import { connection } from "../models/db.js";

dotenv.config();

// const redis = new Redis({ password: process.env.REDIS_PASSWORD });

const router = express.Router();

// 같은 요청 시 캐시에서 먼저 찾기 미들웨어
const checkRedis = (req, res, next) => {
  const { userPk } = res.locals.user;
  console.log(1, userPk);

  redisClient.get(`like=${userPk}`, (error, likeusers) => {
    if (error) res.status(400).send(error);
    if (likeusers !== null) {
      console.log("redisdata", likeusers);
      res.status(200).send(likeusers);
    } else next();
  });
};

router.get("/", checkRedis, async (req, res) => {
  try {
    connection.beginTransaction();
    // const { userPk } = req.params;
    const { userPk } = res.locals.user;

    const likeusers = JSON.parse(
      JSON.stringify(
        await connection.query(
          `SELECT a.* FROM userView a left join likes b on a.userPk = b.targetPk where b.userPk=?`,
          [userPk]
        )
      )
    )[0];
    console.log("likeusers", JSON.stringify(likeusers));
    // 첫 요청이면 redis 캐시 등록
    redisClient.set(`like=${userPk}`, JSON.stringify(likeusers));
    res.send(likeusers);
  } catch (err) {
    console.error(err);
    connection.rollback();
    err.status = 400;
    next(err);
  } finally {
    connection.release();
  }
});

// // 좋아요
// router.get("/", async (req, res, next) => {
//   getConnection(async (conn) => {
//     try {
//       conn.beginTransaction();
//       const { userPk } = res.locals.user;
//       // const { userPk } = req.params;

//       // 내가 좋아요한 목록 불러오기
//       let findlike = `SELECT a.* FROM userView a left join likes b on a.userPk = b.targetPk where b.userPk=${userPk}`;

//       conn.query(findlike, function (err, result) {
//         if (err) {
//           console.error(err);
//           conn.rollback();
//           next(err);
//         }
//         let likeusers = Object.values(JSON.parse(JSON.stringify(result)));
//         res.send({ likeusers });
//       });
//       conn.commit();
//     } catch (err) {
//       console.error(err);
//       conn.rollback();
//       err.status = 400;
//       next(err);
//     } finally {
//       conn.release();
//     }
//   });
// });

router.post("/", async (req, res, next) => {
  let updatePk;
  try {
    connection.beginTransaction();
    // const { userPk } = req.params;
    const { userPk } = res.locals.user;
    updatePk = userPk;
    const { targetPk } = req.body;
    let result;
    // 좋아요 저장하기
    const ifExist = JSON.parse(
      JSON.stringify(
        await connection.query(
          `SELECT * FROM likes where userPk=? and targetPk=?`,
          [userPk, targetPk]
        )
      )
    )[0];
    console.log("ifExist", ifExist);
    if (ifExist.length > 0) {
      result = await connection.query(
        `DELETE FROM likes WHERE userPk=? AND targetPk=?`,
        [userPk, targetPk]
      );
      if (result[0].affectedRows === 0) {
        throw new Error();
      } else {
        await connection.commit();
        res.status(200).send();
      }
    } else {
      result = await connection.query(
        `INSERT INTO likes(targetPk, userPk)VALUES(?, ?)`,
        [targetPk, userPk]
      );
      if (result[0].affectedRows === 0) {
        throw new Error();
      } else {
        await connection.commit();
        res.status(200).send();
      }
    }
  } catch (err) {
    console.error(err);
    connection.rollback();
    err.status = 400;
    next(err);
  } finally {
    const findlike = JSON.parse(
      JSON.stringify(
        await connection.query(
          `SELECT a.* FROM userView a left join likes b on a.userPk = b.targetPk where b.userPk=${updatePk}`
        )
      )
    )[0];
    console.log("findlike", findlike);
    redisClient.set(`like=${updatePk}`, JSON.stringify(findlike));
    connection.release();
  }
});

// router.delete("/", async (req, res, next) => {
//   getConnection(async (conn) => {
//     try {
//       conn.beginTransaction();
//       const { userPk } = res.locals.user;
//       const { targetPk } = req.body;
//       // 좋아요 취소하기
//       let deletelike = `DELETE FROM likes WHERE userPk=${userPk} AND targetPk=${targetPk}`;

//       conn.query(deletelike, function (err, result) {
//         if (err) {
//           console.error(err);
//           conn.rollback();
//           next(err);
//         }
//         res.status(200).send();
//       });
//       conn.commit();
//     } catch (err) {
//       console.error(err);
//       conn.rollback();
//       err.status = 400;
//       next(err);
//     } finally {
//       conn.release();
//     }
//   });
// });

export default router;
