import express from "express";
import { getConnection } from "../models/db.js";
import { connection } from "../models/db.js";
// import async from "async";
import { redisClient } from "../index.js";

const router = express.Router();

const checkRedis = async (req, res, next) => {
  const { userPk } = res.locals.user;
  console.log("redisData!!!");
  redisClient.hget(`${userPk}`, "userInfo", function (error, userInfo) {
    if (error) res.status(400).send(error);
    console.log("레디스 데이터", userInfo);

    if (userInfo) {
      redisClient.hget(`${userPk}`, "tripInfo", function (error, tripInfo) {
        console.log("레디스 데이터", tripInfo);
        tripInfo = JSON.parse(tripInfo);
        userInfo = JSON.parse(userInfo)[0];
        res.send({ userInfo, tripInfo });
      });
    } else next();
  });
};

// 내 프로필, 여행 일정, 확정 약속 불러오기
router.get("/", checkRedis, async (req, res, next) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    // const { userPk } = req.params;
    console.log("222222");
    //유저의 프로필 정보 가져오기
    const userInfo = JSON.parse(
      JSON.stringify(
        await connection.query(`select * from userView where userPk=?`, [
          userPk,
        ])
      )
    )[0];
    // 여행정보 가져오기
    const tripInfo = JSON.parse(
      JSON.stringify(
        await connection.query(`select * from trips where userPk =?`, [userPk])
      )
    )[0];
    connection.commit();
    await redisClient.hmset(`${userPk}`, {
      userInfo: JSON.stringify(userInfo),
      tripInfo: JSON.stringify(tripInfo),
    });
    // redisClient.hset(userPk, "tripInfo", JSON.stringify(tripInfo));
    res.send({ userInfo, tripInfo });
  } catch (err) {
    console.log(err);
    connection.rollback();
    err.status = 400;
    next(err);
  } finally {
    connection.release();
  }
});

// 나의 약속 불러오기
router.get("/promise", async (req, res, next) => {
  try {
    connection.beginTransaction();
    // const { userPk } = req.params;
    const { userPk } = res.locals.user;
    let confirmed = [];
    let requested = [];
    let received = [];

    // 나를 파트너로 등록한, 혹은 내가 파트너를 등록한 여행 리스트
    const confirmTripList = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select * from trips where (userPk =${userPk} and partner is not null) or partner=${userPk} `
        )
      )
    )[0];
    // console.log("confirmTripList.length", confirmTripList.length);
    if (confirmTripList.length === 0) {
      confirmed = [];
    } else {
      confirmTripList.forEach(async (e) => {
        // 나를 가이드로 등록한 여행자 (확정 약속)
        if (e.partner === parseInt(userPk)) {
          let element = {};
          const result = JSON.parse(
            JSON.stringify(
              await connection.query(
                `select * from userView where userPk = ${e.userPk} `
              )
            )
          )[0];
          element.userPk = result[0].userPk;
          element.profileImg = result[0].profileImg;
          element.tripId = e.tripId;
          element.guide = false;
          element.nickname = result[0].nickname;
          element.startDate = e.startDate;
          element.endDate = e.endDate;
          element.region = e.region;
          element.city = e.city;
          confirmed.push(element);
        } else {
          // 내가 가이드로 등록한 여행자 (확정 약속)
          let element = {};
          const result = JSON.parse(
            JSON.stringify(
              await connection.query(
                `select * from userView where userPk = ${e.partner} `
              )
            )
          )[0];
          element.userPk = result[0].userPk;
          element.profileImg = result[0].profileImg;
          element.tripId = e.tripId;
          element.guide = true;
          element.nickname = result[0].nickname;
          element.startDate = e.startDate;
          element.endDate = e.endDate;
          element.region = e.region;
          element.city = e.city;
          confirmed.push(element);
        }
      });
    }

    const reqList = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select a.*, b.tripId, b.requestId from userView a left join requests b on a.userPk = b.recPk where b.reqPk=${userPk}`
        )
      )
    )[0];
    // console.log("reqList.length", reqList.length);
    if (reqList.length === 0) {
      requested = [];
    } else {
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
          element.profileImg = e.profileImg;
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
    }

    const recList = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select a.*, b.tripId, b.requestId from userView a left join requests b on a.userPk = b.reqPk where b.recPk=${userPk}`
        )
      )
    )[0];
    // console.log("recList.length", recList.length);

    if (recList.length === 0) {
      received = [];
      if (
        received.length === recList.length &&
        requested.length === reqList.length &&
        confirmed.length === confirmTripList.length
      ) {
        await connection.commit();
        // console.log("sen my promise", confirmed, received, requested);
        res.send({ confirmed, received, requested });
      }
    } else {
      recList.forEach(async (e) => {
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
          element.profileImg = e.profileImg;
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
          received.length === recList.length &&
          requested.length === reqList.length &&
          confirmed.length === confirmTripList.length
        ) {
          await connection.commit();
          // console.log("sen my promise", confirmed, received, requested);
          res.send({ confirmed, received, requested });
        }
      });
    }
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
    const { region, city, startDate, endDate, tripInfo } = req.body;
    // const { userPk } = req.params;
    const { userPk } = res.locals.user;

    let startNewDate = Date.parse(startDate);
    let endNewDate = Date.parse(endDate);
    let today = new Date();
    today = today.toISOString().slice(0, 10);

    // 끝날이 시작날보다 전 이거나, 오늘 날짜보다 시작날이 작다면 error
    if (startNewDate > endNewDate) {
      throw new Error("날짜 선택 오류");
    }
    if (startNewDate < Date.parse(today)) {
      throw new Error("날짜 선택 오류");
    }

    // 내가 등록하 여행 날짜 리스트와 나를 파트너로 등록한 여행 날짜 리스트
    const myTripDates = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select left(startDate, 10), left(endDate, 10), tripId from trips where userPk=? or partner=?`,
          [userPk, userPk]
        )
      )
    )[0];
    //  새 여행 저장하는 함수, 레디스 디비 업데이트
    const saveNewTrip = async (tripInfo) => {
      await connection.query(
        `INSERT INTO trips (userPk, region, city, startDate, endDate, tripInfo) VALUES (?,?,?,?,?,?)`,
        [userPk, region, city, startDate, endDate, tripInfo]
      );
      await connection.commit();

      let NewTripInfo = JSON.parse(
        JSON.stringify(
          await connection.query("select * from trips where userPk=?", [userPk])
        )
      )[0];

      let newTripId = NewTripInfo[NewTripInfo.length - 1].tripId;
      await redisClient.hmset(`${userPk}`, {
        tripInfo: JSON.stringify(newTripId),
      });

      res.status(201).send({ newTripId });
    };

    if (myTripDates.length > 0) {
      let myTripDates2 = myTripDates.map((e) => [
        e["left(startDate, 10)"],
        e["left(endDate, 10)"],
      ]);

      // 만약 내 여행일정과 겹치면 에러
      let count = 0;
      myTripDates2.forEach((e) => {
        let startOld = Date.parse(e[0]);
        let endOld = Date.parse(e[1]);
        // console.log("start, end date", startOld, endOld);
        if (startNewDate > startOld && startNewDate < endOld) {
          throw new Error("날짜 겹침1");
        } else if (endNewDate > startOld && endNewDate < endOld) {
          throw new Error("날짜 겹침2");
        } else if (startNewDate <= startOld && endNewDate >= endOld) {
          throw new Error("날짜 겹침3");
        } else {
          count += 1;
        }
      });
      // db에 여행 등록
      if (count === myTripDates2.length) {
        saveNewTrip(tripInfo);
      } else {
        throw new Error("반복문 돌다가 오류");
      }
    } else {
      saveNewTrip(tripInfo);
    }
    // `select tripId from trips where startDate='${startDate}' and endDate='${endDate}'`
  } catch (err) {
    console.error("에러메시지 확인", err.message);
    await connection.rollback();
    res.status(400).send({ errorMessage: err.message });
  } finally {
    connection.release();
  }
});

// 여행삭제 -> 관련 약속도 함께 삭제 -> db설정 ON DELETE CASCADE
router.delete("/", async (req, res, next) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    // const { userPk } = req.params;
    const { tripId } = req.body;

    //나의 여행 삭제하기
    const result = await connection.query(
      `DELETE FROM trips WHERE tripId=? AND userPk=?`,
      [tripId, userPk]
    );
    if (result[0].affectedRows === 0) {
      throw new Error();
    } else {
      await connection.commit();
      let tripInfo = JSON.parse(
        JSON.stringify(
          await connection.query("select * from trips where userPk=?", [userPk])
        )
      )[0];
      await redisClient.hmset(`${userPk}`, {
        tripInfo: JSON.stringify(tripInfo),
      });

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
      const userInfo = JSON.parse(
        JSON.stringify(
          await connection.query(`select * from userView where userPk=?`, [
            userPk,
          ])
        )
      )[0];
      await redisClient.hmset(`${userPk}`, {
        userInfo: JSON.stringify(userInfo),
      });
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
    const { nickname, profileImg, region, city, intro } = req.body;

    // 내 프로필 정보 업데이트하기
    const result = await connection.query(
      `UPDATE users set nickname=?,profileImg=?,region=?,city=?,intro=? where userPk=?`,
      [nickname, profileImg, region, city, intro, userPk]
    );
    if (result[0].affectedRows === 0) {
      throw new Error();
    } else {
      await connection.commit();
      const newMyProfile = JSON.parse(
        JSON.stringify(
          await connection.query(`select * from userView where userPk=?`, [
            userPk,
          ])
        )
      )[0];

      await redisClient.hmset(`${userPk}`, {
        userInfo: JSON.stringify(newMyProfile),
      });
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
      `DELETE FROM requests where requestId=${requestId} and (recPk=${userPk} or reqPk=${userPk})`
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

// 나의 약속 확정
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
    // console.log(userPk, ownerPk, getPks.reqPk, getPks.recPk, getPks);
    if (userPk !== getPks.reqPk && userPk !== getPks.recPk) {
      throw new Error("나와 관련된 약속이 아닙니다");
    }

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
      `UPDATE trips set partner=${setPartner} where tripId=${tripId}`
    );
    const result2 = await connection.query(
      `DELETE FROM requests where requestId=${requestId}`
    );

    if (result[0].affectedRows === 0 || result2[0].affectedRows === 0) {
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
