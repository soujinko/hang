import express from "express";
import dotenv from "dotenv";
import { redisClient } from "../index.js";
import { connection } from "../models/db.js";
import { checkLikeRedis } from "../functions/req_look_aside.js";

dotenv.config();

const router = express.Router();

// 내가 좋아하는 유저리스트, 이미 redis에 있다면 미들웨어에서 반환
router.get("/", checkLikeRedis, async (req, res) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;

    const likeusers = JSON.parse(
      JSON.stringify(
        await connection.query(
          `SELECT a.* FROM userView a left join likes b on a.userPk = b.targetPk where b.userPk=?`,
          [userPk]
        )
      )
    )[0];
    // 첫 요청이면 redis 캐시 등록
    redisClient.set(`like=${userPk}`, JSON.stringify(likeusers), "EX", 86400);
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

// 이미 디비에 있다면 좋아요 취소, 없다면 좋아요 등록
router.post("/", async (req, res, next) => {
  let updatePk;
  try {
    connection.beginTransaction();
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
          `SELECT a.* FROM userView a left join likes b on a.userPk = b.targetPk where b.userPk=?`,
          [updatePk]
        )
      )
    )[0];
    console.log("findlike", findlike);
    // 레디스 마이페이지 해시 좋아요 리스트 업데이트
    const updatelike = findlike.map((e) => e.userPk);
    await redisClient.hmset(`mypage-${userPk}`, {
      likes: JSON.stringify(updatelike),
    });
    // 좋아요 추가 시 다시 좋아요 데이터 세팅 / 유지시간 1시간
    redisClient.set(`like=${updatePk}`, JSON.stringify(findlike), "EX", 3600);
    connection.release();
  }
});

export default router;
