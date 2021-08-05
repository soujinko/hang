import express from "express";
import { getConnection } from "../models/db.js";
import { connection } from "../models/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  getConnection(async (conn) => {
    try {
      let tripInfo = [];
      conn.beginTransaction();

      const { userPk } = res.locals.user;
      // const { userPk } = req.params;
      const findMyTrip = `select * from trips where userPk ='${userPk}' and partner is NULL`;
      // 해당 페이지 유저의 프로필 정보 가져오기
      conn.query(findMyTrip, function (err, result) {
        if (err) {
          console.error(err);
          conn.rollback();
          next(err);
        }
        // console.log("나의 여행정보", result);
        Object.values(JSON.parse(JSON.stringify(result))).forEach((e) => {
          tripInfo.push(e);
        });

        res.send(tripInfo);
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

router.post("/:userPk", async (req, res, next) => {
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
      // console.log("날짜 오류");
      throw new Error();
    }

    const checkTrip = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select * from trips where tripId=${tripId} and startDate='${startDate}' and endDate='${endDate}'`
        )
      )
    )[0];

    if (checkTrip.length === 0) {
      console.log("여행 정보 없음");
      throw new Error();
    }

    const userTripDates = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select left(startDate, 10), left(endDate, 10), tripId from trips where userPk=${pagePk} or partner=${pagePk}`
        )
      )
    )[0].map((e) => [e["left(startDate, 10)"], e["left(endDate, 10)"]]);
    console.log("userTripDates", userTripDates);

    let count = 0;
    userTripDates.forEach((e) => {
      let startOld = Date.parse(e[0]);
      let endOld = Date.parse(e[1]);
      if (startMyDate >= startOld && startMyDate <= endOld) {
        // console.log("날짜 겹침1");
        throw new Error();
      } else if (endMyDate >= startOld && endMyDate <= endOld) {
        // console.log("날짜 겹침2");
        throw new Error();
      } else if (startMyDate <= startOld && endMyDate >= endOld) {
        // console.log("날짜 겹침3");
        throw new Error();
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
        throw new Error();
      } else {
        await connection.commit();
        res.status(201).send();
      }
    }
  } catch (err) {
    console.error(err);
    await connection.rollback();
    err.status = 400;
    next(err);
  } finally {
    connection.release();
  }
});

export default router;
