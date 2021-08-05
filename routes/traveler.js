import express from "express";
import { getConnection } from "../models/db.js";
import { connection } from "../models/db.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    connection.beginTransaction();
    // const { userPk } = res.locals.user;
    const { tripId, userPk } = req.body;
    // 오늘 날짜 구하기
    let today = new Date();
    today = today.toISOString().slice(0, 10);

    // 내지역 길잡이 비활된 상태라면 에러
    const getMyProfile = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select guide from userview where userPk=${userPk}`
        )
      )
    )[0][0];

    if (getMyProfile.guide === 0) {
      throw new Error("내 지역 길잡이를 활성화하세요");
    }

    // 해당 여행의 날짜 여행 주인 pk 가져오기
    const checkTripDate = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select left(startDate, 10), left(endDate, 10), userPk, partner from trips where tripId=${tripId}`
        )
      )
    )[0].map((e) => [
      e["left(startDate, 10)"],
      e["left(endDate, 10)"],
      e.userPk,
      e.partner,
    ]);
    console.log("checkTripDate1", checkTripDate);
    let startMyDate = Date.parse(checkTripDate[0][0]);
    let endMyDate = Date.parse(checkTripDate[0][1]);
    let pagePk = checkTripDate[0][2];
    let partner = checkTripDate[0][3];

    console.log("checkTripDate", checkTripDate, startMyDate, endMyDate, pagePk);

    const checkExistRequest = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select * from requests where tripId=${tripId} and reqPk=${userPk} and recPk=${pagePk} `
        )
      )
    )[0];

    // 해당 여행이 기한 지났으면 오류
    if (endMyDate < Date.parse(today)) {
      throw new Error("기한이 지난 여행입니다");
    }

    // 이미 신청했으면 오류 / 파트너가 있으면 오류
    if (checkExistRequest.length > 0) {
      throw new Error("이미 길잡이 신청한 여행입니다");
    } else if (partner !== null) {
      throw new Error("이미 길잡이가 있는 여행입니다.");
    }

    // 나의 확정약속/여행정보 가져와서 겹치면 오류
    const userTripDates = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select left(startDate, 10), left(endDate, 10), tripId from trips where userPk=${userPk} or partner=${userPk}`
        )
      )
    )[0].map((e) => [e["left(startDate, 10)"], e["left(endDate, 10)"]]);
    console.log("userTripDates", userTripDates);

    let count = 0;
    userTripDates.forEach((e) => {
      let startOld = Date.parse(e[0]);
      let endOld = Date.parse(e[1]);
      if (startMyDate >= startOld && startMyDate <= endOld) {
        throw new Error("해당 날짜에 이미 약속이 있어요");
      } else if (endMyDate >= startOld && endMyDate <= endOld) {
        throw new Error("해당 날짜에 이미 약속이 있어요");
      } else if (startMyDate <= startOld && endMyDate >= endOld) {
        throw new Error("해당 날짜에 이미 약속이 있어요");
      } else {
        count += 1;
        console.log("count", count);
      }
    });

    // 리퀘스트 등록하기
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
