import express from "express";
import { getConnection } from "../models/db.js";
import searchAndPaginate from '../functions/search_paginate.js';
import asyncHandle from '../util/async_handler.js';

const router = express.Router();

router.get("/", async (req, res) => {
  getConnection(async (conn) => {
    try {
      const { userPk } = res.locals.user;
      let promise = {};
      let guide = [];
      let traveler = [];
      const findTrip = `select * from trips where userPk=${userPk} AND partner is not NULL ORDER BY startDate ASC LIMIT 1`;
      const findUsers = `select region from users where userPk = ${userPk}`;
      conn.beginTransaction();
      // 확정된 내 여행정보 1개 가져오기
      conn.query(findTrip, (err, result) => {
        if (err) {
          console.error(err);
          conn.rollback();
          next(err);
        }
        if (result.length > 0) {
          const { endDate } = result[0];
          const { startDate } = result[0];
          const { partner } = result[0];

          const findUser = `select * from userView where userPk='${partner}'`;
          // 나와 약속된 사람의 프로필 가져오기
          conn.query(findUser, (err, result) => {
            if (err) {
              console.error(err);
              conn.rollback();
              next(err);
            }
            const partnerImg = result[0].profileImg;
            const prtnerNick = result[0].nickname;
            promise.profileImg = partnerImg;
            promise.nickname = prtnerNick;
            promise.startDate = startDate;
            promise.endDate = endDate;
            console.log(promise);
          });
        } else {
          promise = {};
        }
      });

      conn.query(findUsers, (err, result) => {
        if (err) {
          console.error(err);
          conn.rollback();
          next(err);
        }
        const searchRegion = result[0].region;
        const findGuides = `select * from userView where region ='${searchRegion}' and guide=1 and userPk not in (${userPk}) ORDER BY RAND() LIMIT 3`;
        const findTravelers = `select a.* from userView a left join trips b on a.userPk = b.userPk where b.region ='${searchRegion}' and b.partner is NULL Group by userPk ORDER BY RAND() LIMIT 3 `;
        const likeList = `select targetPk from likes where userPk=${userPk} `;
        // 내가 좋아요한 사람 리스트
        conn.query(likeList, (err, result) => {
          if (err) {
            console.error(err);
            conn.rollback();
            next(err);
          }
          const mylikes = Object.values(JSON.parse(JSON.stringify(result))).map(
            (e) => parseInt(e.targetPk)
          );
          console.log("내가 좋아요한 목록", mylikes);

          // 내지역 가이드 찾기
          conn.query(findGuides, (err, result) => {
            if (err) {
              console.error(err);
              conn.rollback();
              next(err);
            }
            guide = Object.values(JSON.parse(JSON.stringify(result)));
            guide.forEach((e) => {
              // 내가 좋아요한 목록에 있으면 true
              if (mylikes.includes(e.userPk)) {
                e.like = true;
              } else {
                e.like = false;
              }
            });
          });
          // 내지역 여행자 찾기
          conn.query(findTravelers, (err, result) => {
            if (err) {
              console.error(err);
              conn.rollback();
              next(err);
            }
            traveler = Object.values(JSON.parse(JSON.stringify(result)));
            traveler.forEach((e) => {
              // 내가 좋아요한 목록에 있으면 true
              if (mylikes.includes(e.userPk)) {
                e.like = true;
              } else {
                e.like = false;
              }
            });
            res.send({ promise, guide, traveler });
          });
        });
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

router.post('/search', asyncHandle(async(req, res, next)=>{
  const { userPk } = res.locals.user;
  const result = await searchAndPaginate(req, userPk, next);
  res.status(200).json({result})
}))

export default router;
// let like = `INSERT INTO likes(targetId, id)VALUES('${targetId}', '${id}')`;
// let find = `SELECT * FROM users LEFT JOIN likes ON users.id = likes.id where users.id='${id}'`;
// let data =
//   "INSERT INTO users (nickname, userId, region, city, age, guide ) VALUES ('말랑', 'sj23', '서초구', '서울','30', 0 )";
// let user = "select id from users where nickname='고수진' or nickname='말랑'";

// let findUser =
// "INSERT INTO users (nickname, userId, region, city, age, gender, guide ) VALUES ('콜라', 'cola', '서면', '부산','10', 2, 0 )";
// let trip =
// "INSERT INTO trips (userPk, region, city, startDate, endDate, tripInfo) VALUES (2,'제주', '서귀포','2021-09-10', '2021-09-15','가자가자' )";
// let request =
// "INSERT INTO requests (tripId, reqPk,recPk) VALUES ( 3, 3, 1)";
// let alarm = "INSERT INTO alarms (requestId) VALUES (1)";

// let trip =
//   "INSERT INTO trips (userPk, region, city, startDate, endDate, tripInfo) VALUES (4,'서초구', '서울','2021-08-12', '2021-08-25','조앙조앙!!')";
//   "INSERT INTO trips (userPk, region, city, startDate, endDate, tripInfo, partner) VALUES (3,'서초구', '서울','2021-08-02', '2021-08-05','기대된당', 1)";
// let finduser =
//   "INSERT INTO users (nickname, userId, region, city, age, guide ) VALUES ('우라232', '우라232', '서초구', '서울','20', 1 )";
// 확정 약속 가져오기
