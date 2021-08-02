import express from "express";
import { getConnection } from "../models/db.js";

const router = express.Router();

router.get("/:nickname", async (req, res, next) => {
  let userInfo;
  let tripInfo;
  getConnection(async (conn) => {
    try {
      const { userPk } = res.locals.user;
      const { nickname } = req.params;
      const findUser = `select * from users where userPk ='${nickname}'`;

      await conn.query(findUser, function (err, result) {
        if (err) throw err;
        userInfo = Object.values(JSON.parse(JSON.stringify(result)))[0];
        conn.query(
          `select * from likes where userPk ='${userPk}' and targetPk = '${nickname}'`,
          function (err, result) {
            if (err) throw err;
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
            if (err) throw err;
            tripInfo = Object.values(JSON.parse(JSON.stringify(result)));
            res.status(200).send({ userInfo, tripInfo });
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
      conn.rollback();
      console.log(err);
      err.status = 400
      next(err)
    } finally {
      conn.release();
    }
  });
});

export default router;
