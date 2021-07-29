import express from "express";
const router = express.Router();
import getConnection from "../models/db.js";

// 좋아요
router.get("/", async (req, res) => {
  try {
    const { userPk } = res.locals;
    let findlike = `SELECT * FROM users `;

    getConnection(async (conn) => {
      await conn.query(findlike, function (err, result) {
        console.log(result);

        conn.release();
        res.status(200);
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
  try {
    const { userPk } = res.locals;
    const { targetPk } = req.body;
    let savelike = `INSERT INTO likes(targetId, id)VALUES('${targetPk}', '${userPk}')`;

    getConnection(async (conn) => {
      await conn.query(savelike, function (err, result) {
        console.log(result);

        conn.release();
        res.status(200);
      });
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      errorMessage: "좋아요 실패",
    });
  }
});

router.delete("/", async (req, res) => {
  try {
    const { userPk } = res.locals;
    const { targetPk } = req.body;
    let deletelike = `DELETE FROM likes WHRER userPk='${userPk}' AND targetPk='${targetPk}'`;

    getConnection(async (conn) => {
      await conn.query(deletelike, function (err, result) {
        console.log(result);
        conn.release();
        res.status(200);
      });
    });
  } catch (err) {
    conn.release();
    console.log(err);
    res.status(400).json({
      errorMessage: "좋아요 취소 실패",
    });
  }
});

// let like = `INSERT INTO likes(targetId, id)VALUES('${targetId}', '${id}')`;
// let find = `SELECT * FROM users LEFT JOIN likes ON users.id = likes.id where users.id='${id}'`;
// let data =
//   "INSERT INTO users (nickname, userId, region, city, age, guide ) VALUES ('말랑', 'sj23', '서초구', '서울','30', 0 )";
// let user = "select id from users where nickname='고수진' or nickname='말랑'";
export default router;
