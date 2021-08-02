import express from "express";
const router = express.Router();
import { getConnection } from "../models/db.js";

router.get("/:userPk", async (req, res) => {
  getConnection(async (conn) => {
    conn.beginTransaction();
    try {
      //   const { userPk } = res.locals.user;
      const { userPk } = req.params;
      let userInfo;
      let tripInfo;
      let myPromise = {};
      let myTripLists = [];
      myPromise.confirmed = [];
      myPromise.requested = [];
      myPromise.received = [];
      const finduser = `select * from userView where userPk ='${userPk}'`;
      //유저의 프로필 정보 가져오기
      conn.query(finduser, function (err, result) {
        if (err) {
          console.error(err);
          conn.rollback();
          next(err);
        }
        userInfo = Object.values(JSON.parse(JSON.stringify(result)))[0];
        // 유저의 여행 정보 가져오기
        conn.query(
          `select * from trips a left join users b on b.userPk = a.partner where a.userPk =${userPk}`,
          function (err, result) {
            if (err) {
              console.error(err);
              conn.rollback();
              next(err);
            }
            let tripInfo = Object.values(
              JSON.parse(JSON.stringify(result))
            ).map((e) => myTripLists.push(e.tripId));
            // 내가 가이드로 등록한 여행자 (확정 약속)
            tripInfo.forEach((e) => {
              if (e.partner) {
                let element = {};
                element.userPk = e.userPk;
                element.guide = true;
                element.nickname = e.nickname;
                element.startDate = e.startDate;
                element.endDate = e.endDate;
                element.region = e.region;
                element.city = e.city;
                myPromise.confirmed.push(element);
              }
            });
            // let myTripLists = tripInfo.map((e) => e.tripId);

            // 나를 가이드로 등록한 여행자 (확정 약속)
            conn.query(
              `select * from users a left join trips b on a.userPk = b.userPk where b.partner = ${userPk} `,
              function (err, result) {
                let confirmTraveler = Object.values(
                  JSON.parse(JSON.stringify(result))
                );
                confirmTraveler.forEach((e) => {
                  let element = {};
                  element.userPk = e.userPk;
                  element.traveler = true;
                  element.nickname = e.nickname;
                  element.startDate = e.startDate;
                  element.endDate = e.endDate;
                  element.region = e.region;
                  element.city = e.city;
                  myPromise.confirmed.push(element);
                });
                console.log(myPromise.confirmed);
              }
            );

            conn.query(
              `select * from  requests where recPk=${userPk} or reqPk=${userPk}`,
              function (err, result) {
                let promisList = Object.values(
                  JSON.parse(JSON.stringify(result))
                );
                promisList.forEach((e) => {
                  // 내가 받은 요청
                  if ((e.recPk = userPk)) {
                    // 나에게 누가 가이드가 되어주겠다 신청
                    if (myTripLists.includes(e.tripId)) {
                      conn.query(
                        `select a.*, b.* from users a, trips b where a.userPk=${e.reqPk} and b.tripId=${e.tripId}`,
                        function (err, result) {
                          console.log(result);
                          //   let promisList = Object.values(
                          //     JSON.parse(JSON.stringify(result))
                          //   );
                        }
                      );
                    }
                    // 나에게 가이드를 해달라 신청
                    else {
                    }
                  }
                });
                console.log(promisList);
              }
            );
          }
        );
        // res.send({ userInfo, tripInfo });
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

export default router;
