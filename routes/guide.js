import express from "express";
import { getConnection } from "../models/db.js";
import { connection } from "../models/db.js";

const router = express.Router();

router.get("/", (req, res, next) => {
  getConnection((conn) => {
    try {
      let tripInfo = [];
      conn.beginTransaction();

      const { userPk } = res.locals.user;
      // const { userPk } = req.params;
      const findMyTrip = `select * from trips where userPk =? and partner is NULL`;
      // 해당 페이지 유저의 프로필 정보 가져오기
      conn.query(findMyTrip, [userPk], function (err, result) {
        if (err) {
          console.error(err);
          // 빈값일 때 에러처리
          conn.rollback();
          next(err);
        }
        // console.log("나의 여행정보", result);
        // console.log("result", result);
        Object.values(JSON.parse(JSON.stringify(result))).forEach((e) => {
          tripInfo.push(e);
        });

        res.send(tripInfo);
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

router.post("/",async (req, res, next) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    // const { userPk } = req.params;
    const { pagePk, tripId, startDate, endDate } = req.body;

    let startMyDate = Date.parse(startDate);
    let endMyDate = Date.parse(endDate);
    let today = new Date();
    today = today.toISOString().slice(0, 10);

    if (startMyDate < Date.parse(today)) {
      throw new Error("날짜 오류");
    }

    const checkTrip = JSON.parse(
      JSON.stringify(
        await connection.query(
          `SELECT * FROM trips WHERE tripId=${tripId} AND startDate='${startDate}' AND endDate='${endDate}'`
        )
      )
    )[0];

    if (checkTrip.length === 0) {
      throw new Error("여행 정보 없음");
    }

    const requestExist = JSON.parse(
      JSON.stringify(
        await connection.query(
          `SELECT * FROM requests WHERE tripId=${tripId} AND reqPk=${userPk} AND recPk=${pagePk}`
        )
      )
    )[0];
    
    if (requestExist.length > 0) {
      throw new Error("이미 가이드를 요청했어요");
    }

    const userTripDates = JSON.parse(
      JSON.stringify(
        await connection.query(
          `SELECT LEFT(startDate, 10), LEFT(endDate, 10), tripId FROM trips WHERE userPk=${pagePk} OR partner=${pagePk}`
        )
      )
    )[0].map((e) => [e["LEFT(startDate, 10)"], e["LEFT(endDate, 10)"]]);
    // console.log("userTripDates", userTripDates);

    let count = 0;
    userTripDates.forEach((e) => {
      let startOld = Date.parse(e[0]);
      let endOld = Date.parse(e[1]);
      if (startMyDate > startOld && startMyDate < endOld) {
        throw new Error("날짜 겹침1");
      } else if (endMyDate > startOld && endMyDate < endOld) {
        throw new Error("날짜 겹침2");
      } else if (startMyDate <= startOld && endMyDate >= endOld) {
        throw new Error("날짜 겹침3");
      } else {
        count += 1;
        console.log("count", count);
      }
    });
    
    if (count === userTripDates.length) {
      const result = await connection.query(
        `INSERT INTO requests (tripId, reqPk, recPk) VALUES (${tripId}, ${userPk}, ${pagePk})`
      );
      
      if (result[0].affectedRows === 0) {
        throw new Error("디비 등록하다 오류");
      } else {
        await connection.commit();
        res.status(201).send();
      }
    }
  } catch (err) {
    console.error(err);
    await connection.rollback();
    res.status(400).send({ errorMessage: err.message });
  } finally {
    connection.release();
  }
});

export default router;
