import { getConnection } from "../models/db.js";
import express from "express";

const router = express.Router();

router.use(verification())
router.use(alarms())

// 좋아요
router.get("/", async (req, res) => {
  getConnection(async (conn) => {
    try {
      conn.beginTransaction();
      const { userPk } = res.locals.user;
      // 내가 좋아요한 목록 불러오기
      let findlike = `SELECT a.* FROM userView a left join likes b on a.userPk = b.targetPk where b.userPk=${userPk}`;

      conn.query(findlike, function (err, result) {
        if (err) {
          console.error(err);
          conn.rollback();
          next(err);
        }
        let likeusers = Object.values(JSON.parse(JSON.stringify(result)));
        res.send({ likeusers });
      });
      conn.commit();
    } catch (err) {
      console.error(err);
      conn.rollback();
      err.status = 400;
      next(err);
    } finally {
      conn.release();
    }
  });
});

router.post("/", async (req, res) => {
  getConnection(async (conn) => {
    try {
      conn.beginTransaction();
      const { userPk } = res.locals.user;
      const { targetPk } = req.body;
      // 좋아요 저장하기
      let savelike = `INSERT INTO likes(targetPk, userPk)VALUES(${targetPk}, ${userPk})`;

      conn.query(savelike, function (err, result) {
        if (err) {
          console.error(err);
          conn.rollback();
          next(err);
        }
        res.status(200).send();
      });
      conn.commit();
    } catch (err) {
      console.error(err);
      conn.rollback();
      err.status = 400;
      next(err);
    } finally {
      conn.release();
    }
  });
});

router.delete("/", async (req, res) => {
  getConnection(async (conn) => {
    try {
      conn.beginTransaction();
      const { userPk } = res.locals.user;
      const { targetPk } = req.body;
      // 좋아요 취소하기
      let deletelike = `DELETE FROM likes WHERE userPk=${userPk} AND targetPk=${targetPk}`;

      conn.query(deletelike, function (err, result) {
        if (err) {
          console.error(err);
          conn.rollback();
          next(err);
        }
        res.status(200).send();
      });
      conn.commit();
    } catch (err) {
      console.error(err);
      conn.rollback();
      err.status = 400;
      next(err);
    } finally {
      conn.release();
    }
  });
});

export default router;
