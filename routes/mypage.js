import express from "express";
import { connection } from "../models/db.js";
import { checkMypageRedis } from "../functions/req_look_aside.js";
import redis from "../config/redis.cluster.config.js";
import checkDate from "../functions/checkDatefunc.js";
import xssFilter from "../middleware/xssFilter.js";
import asyncHandle from "../util/async_handler.js";

const router = express.Router();

// 내 프로필, 여행 일정, 확정 약속 불러오기
router.get(
  "/profile/:pagePk",
  checkMypageRedis,
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;
      const { pagePk } = req.params;

      if (userPk === pagePk) {
        console.log(true);
      } else {
        console.log(false);
      }

      //유저의 프로필 정보 가져오기
      const userInfo = JSON.parse(
        JSON.stringify(
          await connection.query(`select * from userView where userPk=?`, [
            pagePk,
          ])
        )
      )[0][0];
      // 여행정보 가져오기
      const tripInfo = JSON.parse(
        JSON.stringify(
          await connection.query(`select * from trips where userPk =?`, [
            pagePk,
          ])
        )
      )[0];
      const findlikes = JSON.parse(
        JSON.stringify(
          await connection.query(`select targetPk from likes where userPk =?`, [
            userPk,
          ])
        )
      )[0].map((e) => parseInt(e.targetPk));
      console.log("findlikes1", findlikes);

      if (parseInt(userPk) === parseInt(pagePk)) {
        await redis.hmset(`mypage-${userPk}`, {
          userInfo: JSON.stringify(userInfo),
          tripInfo: JSON.stringify(tripInfo),
          likes: JSON.stringify(findlikes),
        });
        // 유효기간 1일
        await redis.expire(`mypage-${userPk}`, 86400);
        res.send({ userInfo, tripInfo });
      } else {
        userInfo.like = findlikes.includes(parseInt(pagePk)) ? true : false;
        await redis.hmset(`mypage-${pagePk}`, {
          userInfo: JSON.stringify(userInfo),
          tripInfo: JSON.stringify(tripInfo),
        });
        // 유효기간 1일
        await redis.expire(`mypage-${pagePk}`, 86400);
        res.send({ userInfo, tripInfo });
      }

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

// 나의 약속 불러오기
router.get(
  "/promise",
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;
      let confirmed = [];

      // 나를 파트너로 등록한, 혹은 내가 파트너를 등록한 여행 리스트  / 날짜순으로 가져오기
      const confirmTripList = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select * from trips where (userPk =? and partner is not null) or partner=? ORDER BY startDate`,
            [userPk, userPk]
          )
        )
      )[0];

      // 확정된 약속 여행정보 + 파트너 정보 객체 생성 함수
      async function getElement(e, target, bool) {
        console.log("e", e, target);
        const result = JSON.parse(
          JSON.stringify(
            await connection.query(`select * from userView where userPk=?`, [
              target,
            ])
          )
        )[0];
        let element = {};
        element.userPk = result[0].userPk;
        element.profileImg = result[0].profileImg;
        element.tripId = e.tripId;
        element.guide = bool;
        element.nickname = result[0].nickname;
        element.startDate = e.startDate;
        element.endDate = e.endDate;
        element.region = e.region;
        element.city = e.city;
        console.log("element", element);
        return element;
      }

      if (confirmTripList.length === 0) {
        confirmed = [];
      } else {
        confirmTripList.forEach(async (e) => {
          if (e.partner === parseInt(userPk)) {
            // 나를 가이드로 등록한 여행자 (확정 약속)
            let newElement = await getElement(e, e.userPk, false);
            confirmed.push(newElement);
          } else {
            // 내가 가이드로 등록한 여행자 (확정 약속)
            let newElement = await getElement(e, e.partner, true);
            confirmed.push(newElement);
          }
        });
      }

      // 내가 요청한 리스트 디비 조회 / 약속 신청 최신순으로 가져오기
      const reqList = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select a.*, b.tripId, b.requestId from userView a left join requests b on a.userPk = b.recPk where b.reqPk=? ORDER BY b.requestId DESC`,
            [userPk]
          )
        )
      )[0];

      // 나에게 요청한 리스트 디비 조회
      const recList = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select a.*, b.tripId, b.requestId from userView a left join requests b on a.userPk = b.reqPk where b.recPk=? ORDER BY b.requestId DESC`,
            [userPk]
          )
        )
      )[0];

      // 요청 리스트 관련된 여행, 유저 조회하며 리스트 만드는 함수
      async function getRequests(lists) {
        let resultList = [];
        if (lists.length === 0) {
          return resultList;
        }
        await lists.forEach(async (e) => {
          let element = {};
          const elements = JSON.parse(
            JSON.stringify(
              await connection.query(`select * from trips where tripId =?`, [
                e.tripId,
              ])
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
          resultList.push(element);
        });
        return resultList;
      }
      const requested = await getRequests(reqList);
      const received = await getRequests(recList);

      async function final() {
        await connection.commit();
        res.send({ confirmed, received, requested });
      }
      final();
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

// 여행 등록하기
router.post(
  "/create_trip",
  xssFilter,
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { region, city, startDate, endDate, tripInfo, tags } = req.body;
      const { userPk } = res.locals.user;

      let startNewDate = Date.parse(startDate);
      let endNewDate = Date.parse(endDate);
      let today = new Date();
      today = today.toISOString().slice(0, 10);

      // 끝날이 시작날보다 전 이거나, 오늘 날짜보다 시작날이 작다면 error
      if (startNewDate > endNewDate) {
        return res.status(400).send({ errorMessage: "날짜 선택 오류" });
      }
      if (startNewDate < Date.parse(today)) {
        return res.status(400).send({ errorMessage: "날짜 선택 오류" });
      }

      const saveNewTrip = async (tripInfo) => {
        if (checkDates) {
          await connection.query(
            `INSERT INTO trips (userPk, region, city, startDate, endDate, tripInfo, tags) VALUES (?,?,?,?,?,?,?)`,
            [userPk, region, city, startDate, endDate, tripInfo, tags]
          );
          await connection.commit();

          let NewTripInfo = JSON.parse(
            JSON.stringify(
              await connection.query("select * from trips where userPk=?", [
                userPk,
              ])
            )
          )[0];

          let newTripId = NewTripInfo[NewTripInfo.length - 1].tripId;
          await redis.hmset(`mypage-${userPk}`, {
            tripInfo: JSON.stringify(NewTripInfo),
          });

          res.status(201).send({ newTripId });
        } else return;
      };

      const checkDates = await checkDate(userPk, startNewDate, endNewDate, res);

      saveNewTrip(tripInfo);

      // `select tripId from trips where startDate='${startDate}' and endDate='${endDate}'`
    } catch (err) {
      console.error(err);
      await connection.rollback();
      res.status(400).send({ errorMessage: err.message });
    } finally {
      connection.release();
    }
  })
);

// 여행삭제 -> 관련 약속도 함께 삭제 -> db설정 ON DELETE CASCADE
router.delete(
  "/",
  xssFilter,
  asyncHandle(async (req, res, next) => {
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
            await connection.query("select * from trips where userPk=?", [
              userPk,
            ])
          )
        )[0];
        await redis.hmset(`mypage-${userPk}`, {
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
  })
);

// 내 가이디 설정 켜기
router.patch(
  "/update_guide",
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;

      let setGuide;
      let guideState = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select guide from users where userPk=${userPk}`
          )
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
        )[0][0];
        await redis.hmset(`mypage-${userPk}`, {
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
  })
);

// 내 프로필 수정
router.patch(
  "/",
  xssFilter,
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;
      const { nickname, profileImg, region, city, intro, tags } = req.body;

      // 내 프로필 정보 업데이트하기
      const result = await connection.query(
        `UPDATE users set nickname=?,profileImg=?,region=?,city=?,intro=?,tags=? where userPk=?`,
        [nickname, profileImg, region, city, intro, tags, userPk]
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
        )[0][0];

        await redis.hmset(`mypage-${userPk}`, {
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
  })
);

// 나의 신청한/신청받은 약속 취소 거절
router.patch(
  "/reject_request",
  xssFilter,
  asyncHandle(async (req, res, next) => {
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
  })
);

// 나의 확정 약속 취소
router.patch(
  "/reject_confirm",
  xssFilter,
  asyncHandle(async (req, res, next) => {
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
  })
);

// 나의 약속 확정 // 중복수락 안되게
router.post(
  "/make_promise",
  xssFilter,
  asyncHandle(async (req, res, next) => {
    try {
      connection.beginTransaction();
      const { userPk } = res.locals.user;
      const { tripId, requestId } = req.body;
      let setPartner;

      // 해당 여행의 주인 pk
      const tripInfo = JSON.parse(
        JSON.stringify(
          await connection.query(
            `select userPk, startDate, endDate from trips where tripId=${tripId}`
          )
        )
      )[0][0];
      const { startDate, endDate } = tripInfo;
      let ownerPk = tripInfo.userPk;
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
        res.status(400).send({ errorMessage: "나와 관련된 약속이 아닙니다" });
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
  })
);

export default router;
