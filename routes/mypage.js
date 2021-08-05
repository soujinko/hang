import express from "express";
import { getConnection } from "../models/db.js";
import { connection } from "../models/db.js";

// 내 프로필, 여행 일정, 확정 약속 불러오기
router.get("/", async (req, res, next) => {
  getConnection(async (conn) => {
    conn.beginTransaction();
    try {
      let userInfo;
      let tripInfo;
      let confirmed = [];
      const { userPk } = res.locals.user;
      // const { userPk } = req.params;
      const finduser = `select * from userView where userPk ='${userPk}'`;
      //유저의 프로필 정보 가져오기
      conn.query(finduser, function (err, result) {
        if (err) {
          console.error(err);
          conn.rollback();
          // next(err);
        }
        userInfo = Object.values(JSON.parse(JSON.stringify(result)))[0];
        // 유저의 여행 정보 가져오기
        conn.query(
          `select * from trips where userPk =${userPk}`,
          function (err, result) {
            if (err) {
              console.error(err);
              conn.rollback();
              // next(err);
            }
            let tripInfo = Object.values(JSON.parse(JSON.stringify(result)));
            console.log("나의 여행 리스트", tripInfo);

            // 내가 가이드로 등록한 여행자 (확정 약속)
            tripInfo.forEach((e) => {
              if (e.partner) {
                let element = {};
                conn.query(
                  `select * from users where userPk =${e.partner}`,
                  function (err, result) {
                    element.userPk = result[0].userPk;
                    element.tripId = e.tripId;
                    element.guide = true;
                    element.nickname = result[0].nickname;
                    element.startDate = e.startDate;
                    element.endDate = e.endDate;
                    element.region = e.region;
                    element.city = e.city;
                    confirmed.push(element);
                    // console.log("컨펌된 약속 내여행", myPromise.confirmed);
                  }
                );
              }
            });

            // 나를 가이드로 등록한 여행자 (확정 약속)
            conn.query(
              `select * from users a left join trips b on a.userPk = b.userPk where b.partner = ${userPk} `,
              function (err, result) {
                let confirmTraveler = Object.values(
                  JSON.parse(JSON.stringify(result))
                );
                console.log("확정약소2", confirmTraveler);
                confirmTraveler.forEach((e) => {
                  let element = {};
                  element.userPk = e.userPk;
                  element.tripId = e.tripId;
                  element.guide = false;
                  element.nickname = e.nickname;
                  element.startDate = e.startDate;
                  element.endDate = e.endDate;
                  element.region = e.region;
                  element.city = e.city;
                  confirmed.push(element);
                });
                res.send({ userInfo, tripInfo, confirmed });
              }
            );
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

// 나의 약속 불러오기 (미확정)
router.get("/promise", async (req, res, next) => {
  try {
    connection.beginTransaction();
    // const { userPk } = req.params;
    const { userPk } = res.locals.user;

    let requested = [];
    let received = [];
    const reqList = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select a.*, b.tripId, b.requestId from users a left join requests b on a.userPk = b.recPk where b.reqPk=${userPk}`
        )
      )
    )[0];
    reqList.forEach(async (e) => {
      let element = {};
      const elements = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select * from trips where tripId = ${e.tripId}`
          )
        )
      )[0];
      elements.forEach((el) => {
        element.userPk = e.userPk;
        element.requestId = e.requestId;
        element.tripId = e.tripId;
        element.nickname = e.nickname;
        element.startDate = el.startDate;
        element.endDate = el.endDate;
        element.region = el.region;
        element.city = el.city;
      });
      requested.push(element);
    });

    const recList = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select a.*, b.tripId, b.requestId from users a left join requests b on a.userPk = b.reqPk where b.recPk=${userPk}`
        )
      )
    )[0];
    console.log(recList, "recList");
    reqList.forEach(async (e) => {
      let element = {};
      const elements = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select * from trips where tripId = ${e.tripId}`
          )
        )
      )[0];
      elements.forEach((el) => {
        element.userPk = e.userPk;
        element.requestId = e.requestId;
        element.tripId = e.tripId;
        element.nickname = e.nickname;
        element.startDate = el.startDate;
        element.endDate = el.endDate;
        element.region = el.region;
        element.city = el.city;
      });
      received.push(element);
      if (
        received.length == recList.length &&
        requested.length == reqList.length
      ) {
        await connection.commit();
        res.send({ received, requested });
      }
    });
  } catch (err) {
    console.error(err);
    await connection.rollback();
    err.status = 400;
    next(err);
  } finally {
    connection.release();
  }
  // });
});

// 여행 등록하기
router.post("/create_trip", async (req, res, next) => {
  try {
    connection.beginTransaction();
    // const { userPk } = req.params;
    const { userPk } = res.locals.user;

    const { region, city, startDate, endDate, tripInfo } = req.body;
    // let saveMyTrip = `INSERT INTO trips (userPk, region, city, startDate, endDate, tripInfo) VALUES (${userPk},'${region}','${city}','${startDate}','${endDate}','${tripInfo}')`;
    let startNewDate = Date.parse(startDate);
    let endNewDate = Date.parse(endDate);
    let today = new Date();
    today = today.toISOString().slice(0, 10);

    // 끝날이 시작날보다 전 이거나, 오늘 날짜보다 시작날이 작다면 error
    if (startNewDate > endNewDate) {
      throw new Error();
    }
    if (startNewDate < Date.parse(today)) {
      throw new Error();
    }

    // 내가 등록하 여행 날짜 리스트와 나를 파트너로 등록한 여행 날짜 리스트
    const myTripDates = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select left(startDate, 10), left(endDate, 10), tripId from trips where userPk=${userPk} or partner=${userPk}`
        )
      )
    )[0].map((e) => [e["left(startDate, 10)"], e["left(endDate, 10)"]]);

    // 만약 내 여행일정과 겹치면 에러
    let count = 0;
    myTripDates.forEach((e) => {
      let startOld = Date.parse(e[0]);
      let endOld = Date.parse(e[1]);
      if (startNewDate >= startOld && startNewDate <= endOld) {
        throw new Error();
      } else if (endNewDate >= startOld && endNewDate <= endOld) {
        throw new Error();
      } else if (startNewDate <= startOld && endNewDate >= endOld) {
        throw new Error();
      } else {
        count += 1;
      }
    });
    // db에 여행 등록
    if (count === myTripDates.length) {
      await connection.query(
        `INSERT INTO trips (userPk, region, city, startDate, endDate, tripInfo) VALUES (${userPk},'${region}','${city}','${startDate}','${endDate}','${tripInfo}')`
      );
      await connection.commit();

      let newTripId = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select tripId from trips where startDate='${startDate}' and endDate='${endDate}'`
          )
        )
      )[0].map((e) => e["tripId"]);
      res.status(201).send({ newTripId });
    } else {
      throw new Error();
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

// 여행삭제 -> 관련 약속도 함께 삭제 -> db설정 ON DELETE CASCADE
router.delete("/", async (req, res, next) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    const { tripId } = req.body;

    //나의 여행 삭제하기
    const result = await connection.query(
      `DELETE FROM trips WHERE tripId=${tripId} AND userPk=${userPk}`
    );
    if (result[0].affectedRows === 0) {
      throw new Error();
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
});

// 내 가이디 설정 켜기
router.patch("/update_guide", async (req, res, next) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    // const { userPk } = req.body;
    let setGuide;
    let guideState = JSON.parse(
      JSON.stringify(
        await connection.query(`select guide from users where userPk=${userPk}`)
      )
    )[0];
    if (guideState[0]["guide"] === 0) {
      setGuide = 1;
    } else {
      setGuide = 0;
    }
    // 내 가이드 정보 업데이트하기
    const result = await connection.query(
      `UPDATE users set guide=${setGuide} where userPk=${userPk}`
    );
    if (result[0].affectedRows === 0) {
      throw new Error();
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
});

// 내 프로필 수정
router.patch("/", async (req, res, next) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    const { nickname, profileImg, age, region, city, intro } = req.body;

    // 내 프로필 정보 업데이트하기
    const result = await connection.query(
      `UPDATE users set nickname='${nickname}',profileImg='${profileImg}',age='${age}',region='${region}',city='${city}',intro='${intro}' where userPk=${userPk}`
    );
    if (result[0].affectedRows === 0) {
      throw new Error();
    } else {
      await connection.commit();
      res.status(201).send();
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

// 나의 신청한/신청받은 약속 취소 거절
router.patch("/reject_request", async (req, res, next) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    const { requestId } = req.body;

    // 해당 리퀘스트 상태 변경하기
    const result = await connection.query(
      `UPDATE requests set status=0 where requestId=${requestId} and (recPk=${userPk} or reqPk=${userPk})`
    );
    if (result[0].affectedRows === 0) {
      throw new Error();
    } else {
      await connection.commit();
      res.status(201).send();
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

// 나의 확정 약속 취소
router.patch("/reject_confirm", async (req, res, next) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    const { tripId } = req.body;

    // 해당 여행정보에서 파트너 없애기
    const result = await connection.query(
      `UPDATE trips set partner=NULL where tripId=${tripId} and (userPk=${userPk} or partner=${userPk})`
    );
    if (result[0].affectedRows === 0) {
      throw new Error();
    } else {
      await connection.commit();
      res.status(201).send();
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

// 나의 확정 약속 취소
router.post("/make_promise", async (req, res, next) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    const { tripId, requestId } = req.body;
    let setPartner;

    // 해당 여행의 주인 pk
    const ownerPk = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select userPk from trips where tripId=${tripId}`
        )
      )
    )[0][0]["userPk"];
    // 약속 받은, 요청한 pk 찾기
    const getPks = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select recPk, reqPk from requests where requestId=${requestId}`
        )
      )
    )[0][0];
    console.log(ownerPk, getPks.reqPk, getPks.recPk, getPks);

    // 파트너로 등록할 pk 설정
    if (ownerPk === getPks.reqPk) {
      setPartner = getPks.recPk;
    } else if (ownerPk === getPks.recPk) {
      setPartner = getPks.reqPk;
    } else {
      // userPk가 해당 약속과 무관하다면 에러
      throw new Error();
    }

    const result = await connection.query(
      `UPDATE trips a inner join requests b on a.tripId = b.tripId set a.partner=${setPartner},b.status=0 where a.tripId=${tripId} and b.requestId=${requestId}`
    );

    if (result[0].affectedRows === 0) {
      throw new Error();
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
});

export default router;
