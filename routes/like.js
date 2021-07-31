import express from "express";
const router = express.Router();
import getConnection from "../models/db.js";

// 좋아요
router.get("/", async (req, res) => {
  try {
    const { userPk } = res.locals;
    let findlike = `SELECT a.* FROM users a left join likes b on a.userPk = b.targetPk where b.userPk=${userPk}`;

    getConnection(async (conn) => {
      await conn.query(findlike, function (err, result) {
        let likeusers = Object.values(JSON.parse(JSON.stringify(result)));
        res.send({ likeusers });
      });
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      errorMessage: "좋아요 실패",
    });
  }
});

router.post("/", async (req, res) => {
  getConnection(async (conn) => {
    try {
      // const { userPk } = res.locals;
      const { targetPk, userPk } = req.body;
      console.log();
      let savelike = `INSERT INTO likes(targetPk, userPk)VALUES(${targetPk}, ${userPk})`;

      await conn.query(savelike, function (err, result) {
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

router.post("/delete", async (req, res) => {
  getConnection(async (conn) => {
    try {
      // const { userPk } = res.locals;
      const { targetPk, userPk } = req.body;
      let deletelike = `DELETE FROM likes WHERE userPk=${userPk} AND targetPk=${targetPk}`;

      await conn.query(deletelike, function (err, result) {
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
