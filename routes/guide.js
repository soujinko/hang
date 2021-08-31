import express from "express";
import { connection } from "../models/db.js";
import checkDate from "../functions/checkDatefunc.js";
import xssFilter from "../middleware/xssFilter.js";
import asyncHandle from "../util/async_handler.js";

const router = express.Router();

router.get(
  "/",
  asyncHandle(async (req, res, next) => {
    try {
      let tripInfo = [];
      connection.beginTransaction();
      const { userPk } = res.locals.user;

      // 나의 여행 정보 가져오기 (약속 없는)
      const findMyTrip = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select * from trips where userPk =? and partner is NULL`,
            [userPk]
          )
        )
      )[0].forEach((e) => {
        tripInfo.push(e);
      });

      res.send(tripInfo);

      connection.commit();
    } catch (err) {
      console.log(err);
      connection.rollback();
      err.status = 400;
      next(err);
    } finally {
      connection.release();
    }
  })
);

router.post(
  "/",
  xssFilter,
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;
      const { pagePk, tripId, startDate, endDate } = req.body;

      let startMyDate = Date.parse(startDate);
      let endMyDate = Date.parse(endDate);
      let today = new Date();
      today = today.toISOString().slice(0, 10);
      // 오늘날짜 이전 선택 안되게
      if (startMyDate < Date.parse(today)) {
        return res.status(400).send({ errorMessage: "날짜 오류" });
      }
      // 페이지 유저의 지역
      const pageUserProfile = JSON.parse(
        JSON.stringify(
          await connection.query(`SELECT region FROM userView WHERE userPk=?`, [
            pagePk,
          ])
        )
      )[0];
      // 약속 신청할 여행
      const checkTrip = JSON.parse(
        JSON.stringify(
          await connection.query(`SELECT * FROM trips WHERE tripId=?`, [tripId])
        )
      )[0];
      // 페이지 유저와 지역 다르면 약속 신청 불가
      if (checkTrip[0].region !== pageUserProfile[0].region)
        return res
          .status(400)
          .send({ errorMessage: "길잡이의 지역을 확인해 주세요" });

      // 이미 요청한 약속이면 신청 불가
      const requestExist = JSON.parse(
        JSON.stringify(
          await connection.query(
            `SELECT * FROM requests WHERE tripId=? AND reqPk=? AND recPk=?`,
            [tripId, userPk, pagePk]
          )
        )
      )[0];
      if (requestExist.length > 0)
        return res
          .status(400)
          .send({ errorMessage: "이미 가이드를 요청했어요" });

      // 나의 확정 약속과 겹치면 false 안겹치면 true
      const checkDates = await checkDate(pagePk, startMyDate, endMyDate, res);

      const insertRequest = async () => {
        if (checkDates) {
          const result = await connection.query(
            `INSERT INTO requests (tripId, reqPk, recPk) VALUES (?, ?, ?)`,
            [tripId, userPk, pagePk]
          );
          if (result[0].affectedRows === 0) throw new Error();

          await connection.commit();
          res.status(201).send();
        } else return;
      };

      // 약속 데이터 등록
      insertRequest();
    } catch (err) {
      console.error(err);
      await connection.rollback();
      res.status(400).send({ errorMessage: err.message });
    } finally {
      connection.release();
    }
  })
);

export default router;
