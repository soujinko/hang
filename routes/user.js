import express from "express";
const router = express.Router();
import getConnection from "../models/db.js";

router.get("/:nickname", async (req, res) => {
  let userInfo;
  let tripInfo;
  getConnection(async (conn) => {
    try {
      const { userPk } = res.locals;
      const { nickname } = req.params;
      const finduser = `select * from users where userPk ='${nickname}'`;

      await conn.query(finduser, function (err, result) {
        userInfo = Object.values(JSON.parse(JSON.stringify(result)))[0];
        conn.query(
          `select * from likes where userPk ='${userPk}' and targetPk = '${nickname}'`,
          function (err, result) {
            if (result.length !== 0) {
              userInfo.like = true;
            } else {
              userInfo.like = false;
            }
          }
        );
        console.log("userInfo", userInfo);
        conn.query(
          `select * from trips where userPk ='${nickname}'`,
          function (err, result) {
            tripInfo = Object.values(JSON.parse(JSON.stringify(result)));
            res.send({ userInfo, tripInfo });
          }
        );
      });

      //   await conn.query(
      //     "insert into likes(targetPk, userPk)VALUES(1, 2) ",
      //     function (err, result) {
      //       console.log(result);
      //     }
      //   );
    } catch (err) {
      console.log(err);
      res.status(400).json({
        errorMessage: "유저 조회 실패",
      });
    } finally {
      conn.release();
    }
  });
});

export default router;
