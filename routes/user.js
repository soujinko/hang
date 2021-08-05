import express from "express";
import { getConnection } from "../models/db.js";

const router = express.Router();

router.get("/:pagePk", async (req, res, next) => {
  getConnection(async (conn) => {
    try {
      conn.beginTransaction();
      let userInfo;
      let tripInfo;
      const { userPk } = res.locals.user;
      // const userPk = 2;
      const { pagePk } = req.params;
      const finduser = `select * from userView where userPk ='${pagePk}'`;
      // 해당 페이지 유저의 프로필 정보 가져오기
      conn.query(finduser, function (err, result) {
        if (err) {
          console.error(err);
          conn.rollback();
          next(err);
        }
        userInfo = Object.values(JSON.parse(JSON.stringify(result)))[0];
        conn.query(
          `select * from likes where userPk ='${userPk}' and targetPk = '${pagePk}'`,
          function (err, result) {
            if (err) {
              console.error(err);
              conn.rollback();
              next(err);
            }
            // 내가 좋아요 했으면 true
            if (result.length !== 0) {
              userInfo.like = true;
            } else {
              userInfo.like = false;
            }
          }
        );
        // 페이지 유저의 여행 정보 가져오기
        conn.query(
          `select * from trips where userPk ='${pagePk}'`,
          function (err, result) {
            if (err) {
              console.error(err);
              conn.rollback();
              next(err);
            }
            tripInfo = Object.values(JSON.parse(JSON.stringify(result)));
            res.status(200).send({ userInfo, tripInfo });
          }
        );
      });
      conn.commit();
    } catch (err) {
      console.log(err);
      conn.rollback();
      err.status = 400;
      next(err);
    } finally {
      conn.release();
    }
  });
});

export default router;
