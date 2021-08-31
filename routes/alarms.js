import express from "express";
import { connection } from "../models/db.js";
import asyncHandle from "../util/async_handler.js";

const router = express.Router();

//새로운 알람 유무
router.get(
  "/",
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;

      //나의 리퀘스트 내역 불러오기
      const result = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select checked FROM requests WHERE recPk=?`,
            userPk
          )
        )
      );
      if (result.length > 0) {
        const existNewRequests = result[0].map((e) => e.checked);
        console.log("existNewRequests", existNewRequests);
        if (existNewRequests.includes(0)) {
          res.status(200).send(true);
        } else {
          res.status(200).send(false);
        }
      } else {
        res.status(200).send(false);
      }
    } catch (err) {
      console.error(err);
      await connection.rollback();
      err.status = 400;
      next(err);
    } finally {
      connection.release();
    }
  })
);

// 세부 알람 내역 호출
router.get(
  "/detail",
  asyncHandle(async (req, res, next) => {
    let user;
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;
      user = userPk;

      //나의 리퀘스트 내역 불러오기
      const result = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select b.tripId, a.reqPk, a.checked FROM requests a left join trips b on a.tripId = b.tripid WHERE a.recPk=? and a.checked not in (2) ORDER BY a.requestId DESC`,
            userPk
          )
        )
      )[0];
      if (result.length > 0) {
        // 요청 여행 리스트
        let alarms = [];
        // const tripList = result.map((e) => e.tripId);
        const mytrips = JSON.parse(
          JSON.stringify(
            await connection.query(
              `select tripId from trips WHERE userPk=?`,
              userPk
            )
          )
        )[0].map((e) => e.tripId);

        result.forEach(async (e) => {
          let alarm = {};
          const requsers = JSON.parse(
            JSON.stringify(
              await connection.query(
                `select nickname, profileImg from userView WHERE userPk=?`,
                e.reqPk
              )
            )
          )[0][0];

          alarm.nickname = requsers.nickname;
          alarm.profileImg = requsers.profileImg;
          alarm.guide = mytrips.includes(e.tripId) ? true : false;
          alarm.checked = e.checked;
          alarms.push(alarm);

          if (alarms.length === result.length) {
            res.status(200).send({ alarms });
          }
        });
      } else {
        res.status(200).send({ errorMessage: "요청 알람 없음" });
      }
    } catch (err) {
      console.error(err);
      await connection.rollback();
      err.status = 400;
      next(err);
    } finally {
      // 상세내역 확인 후에는 미확인 알람 상태 확인으로 변경
      await connection.query(
        `update requests set checked=1 WHERE recPk=? and checked=0`,
        user
      );
      await connection.commit();
      connection.release();
    }
  })
);

// 알람 삭제
router.delete(
  "/",
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;
      // const { userPk } = req.params;

      //나의 리퀘스트 내역 불러오기
      const result = await connection.query(
        `update requests set checked=2 WHERE recPk=? and checked = 1 and checked not in (2)`,
        userPk
      );

      if (result[0].affectedRows === 0) {
        res.status(400).send({ errorMessage: "삭제할 알람 없음" });
      } else {
        await connection.commit();
        res.status(200).send();
      }
    } catch (err) {
      console.error(err);
      await connection.rollback();
      err.status = 400;
      next(err);
    } finally {
      connection.release();
    }
  })
);

export default router;
