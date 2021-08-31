import express from "express";
import redis from "../config/redis.cluster.config.js";
import { connection } from "../models/db.js";
import { checkLikeRedis } from "../functions/req_look_aside.js";
import xssFilter from "../middleware/xssFilter.js";
import asyncHandle from "../util/async_handler.js";

const router = express.Router();

// 내가 좋아하는 유저리스트, 이미 redis에 있다면 미들웨어에서 반환
router.get(
  "/",
  checkLikeRedis,
  asyncHandle(async (req, res) => {
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
      console.log("likeusers", JSON.stringify(likeusers));
      // 첫 요청이면 redis 캐시 등록
      redis.set(`like=${userPk}`, JSON.stringify(likeusers), "EX", 86400);
      res.send(likeusers);
    } catch (err) {
      console.error(err);
      connection.rollback();
      err.status = 400;
      next(err);
    } finally {
      connection.release();
    }
  })
);

// 이미 디비에 있다면 좋아요 취소, 없다면 좋아요 등록
router.post(
  "/",
  xssFilter,
  asyncHandle(async (req, res, next) => {
    let updatePk;
    try {
      connection.beginTransaction();
      // const { userPk } = req.params;
      const { userPk } = res.locals.user;
      updatePk = userPk;
      const { targetPk, block } = req.body;
      console.log("block", block);
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
      // 차단 할 유저인데 좋아요 목록에 있거나, 좋아요 목록에 있으면 좋아요 취소
      if ((block && ifExist.length > 0) || ifExist.length > 0) {
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
      }
      // 좋아요 목록에 없고 차단할 때
      else if (block && ifExist.length === 0) {
        res.status(200).send();
      }
      // 좋아요 추가
      else {
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
      const mylikes = findlike.map((e) => e.userPk);

      redis.set(`like=${updatePk}`, JSON.stringify(findlike), "EX", 86400);
      await redis.hmset(`mypage-${updatePk}`, {
        likes: JSON.stringify(mylikes),
      });
      // console.log("조하요 다시 저장");
      connection.release();
    }
  })
);

export default router;
