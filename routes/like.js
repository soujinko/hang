import { getConnection } from "../models/db.js";
import express from "express";

const router = express.Router();

// 좋아요
router.get("/", async (req, res) => {
  try {
    const { userPk } = res.locals;
    let findLike = `SELECT a.* FROM users a left join likes b on a.userPk = b.targetPk where b.userPk=${userPk}`;

    getConnection((conn) => {
      conn.query(findLike, function (err, result) {
        if (err) next(err);
        let likeUsers = Object.values(JSON.parse(JSON.stringify(result)));
        res.status(200).json({ likeUsers });
      });
    });
  } catch (err) {
    err.status = 400;
    console.log(err);
    next(err)
  }
});

router.post("/", async (req, res) => {
  getConnection(async (conn) => {
    try {
      // const { userPk } = res.locals;
      const { targetPk, userPk } = req.body;
      console.log();
      let saveLike = `INSERT INTO likes(targetPk, userPk)VALUES(${targetPk}, ${userPk})`;

      await conn.query(saveLike, function (err, result) {
        res.status(200).send();
      });
    } catch (err) {
      console.log(err);
      res.status(400).json({
        errorMessage: "좋아요 실패",
      });
    } finally {
      conn.release();
    }
  });
});

router.delete("/", async (req, res) => {
  getConnection(async (conn) => {
    try {
      // const { userPk } = res.locals;
      const { targetPk, userPk } = req.body;
      let deleteLike = `DELETE FROM likes WHERE userPk=${userPk} AND targetPk=${targetPk}`;

      await conn.query(deleteLike, function (err, result) {
        res.status(200).send();
      });
    } catch (err) {
      console.log(err);
      res.status(400).json({
        errorMessage: "좋아요 취소 실패",
      });
    } finally {
      conn.release();
    }
  });
});

export default router;
