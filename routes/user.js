import express from "express";
import { connection } from "../models/db.js";

const router = express.Router();

router.get("/:pagePk", async (req, res, next) => {
  try {
    connection.beginTransaction();

    const { userPk } = res.locals.user;
    const { pagePk } = req.params;
    // const finduser = `select * from userView where userPk ='${pagePk}'`;
    // 해당 페이지 유저의 프로필 정보 가져오기
    let userInfo = JSON.parse(
      JSON.stringify(
        await connection.query(`select * from userView where userPk =?`, [
          userPk,
        ])
      )
    )[0][0];
    // 내 좋아요 정보 불러오기
    const findlikes = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select * from likes where userPk =? and targetPk = ?`,
          [userPk, pagePk]
        )
      )
    )[0];
    //  내 좋아요에 있으면 true, 아니면 false
    if (findlikes.length !== 0) {
      userInfo.like = true;
    } else {
      userInfo.like = false;
    }

    const tripInfo = JSON.parse(
      JSON.stringify(
        await connection.query(`select * from trips where userPk =?`, [pagePk])
      )
    )[0];
    connection.commit();
    res.status(200).send({ userInfo, tripInfo });
  } catch (err) {
    console.log(err);
    conn.rollback();
    err.status = 400;
    next(err);
  } finally {
    conn.release();
  }
});

export default router;
