import express from "express";
import { connection } from "../models/db.js";
import searchAndPaginate from "../functions/search_paginate.js";
import asyncHandle from "../util/async_handler.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    connection.beginTransaction();
    const { userPk } = res.locals.user;
    let myuserPk = userPk;
    let promise = {};
    let guide = [];
    let traveler = [];
    // const findTrip = `select * from trips where (userPk=${userPk} or partner=${userPk}) AND partner is not NULL ORDER BY startDate ASC  LIMIT 1`;
    // const findUsers = `select region from userView where userPk = ${userPk}`;
    // 확정된 내 여행정보 1개 가져오기
    const findTrip = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select * from trips where (userPk=? or partner=?) AND partner is not NULL ORDER BY startDate ASC  LIMIT 1`,
          [userPk, userPk]
        )
      )
    )[0];

    if (findTrip.length > 0) {
      console.log("나의 확정1", result);
      const { endDate, startDate, partner, userPk } = result[0];

      let findUser;
      if (partner !== myuserPk) {
        findUser = `select * from userView where userPk=${partner}`;
      } else {
        findUser = `select * from userView where userPk=${userPk}`;
      }

      const findMyUser = JSON.parse(
        JSON.stringify(await connection.query(findUser))
      )[0][0];
      promise.profileImg = findMyUser.profileImg;
      promise.nickname = findMyUser.nickname;
      promise.startDate = startDate;
      promise.endDate = endDate;
      console.log("메인페이지 나의 확정 약속", promise);
    } else {
      promise = {};
    }

    const findMe = JSON.parse(
      JSON.stringify(
        await connection.query(`select region from userView where userPk =?`, [
          userPk,
        ])
      )
    )[0][0];
    const searchRegion = findMe.region;

    const myLikeList = JSON.parse(
      JSON.stringify(
        await connection.query(`select targetPk from likes where userPk=?`, [
          userPk,
        ])
      )
    )[0].map((e) => parseInt(e.targetPk));

    const findGuides = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select a.* from userView a left join trips b on a.userPk = b.userPk where b.region =? and b.partner is NULL and a.userPk not in (?) Group by userPk ORDER BY RAND() LIMIT 3 `,
          [searchRegion, userPk]
        )
      )
    )[0];

    findGuides.forEach((e) => {
      // 내가 좋아요한 목록에 있으면 true
      if (myLikeList.includes(e.userPk)) {
        e.like = true;
      } else {
        e.like = false;
      }
      console.log("내 지역 가이드!!", guide);
    });

    const findTravelers = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select a.* from userView a left join trips b on a.userPk = b.userPk where b.region =? and b.partner is NULL and a.userPk not in (?) Group by userPk ORDER BY RAND() LIMIT 3 `,
          [searchRegion, userPk]
        )
      )
    )[0];

    findTravelers.forEach((e) => {
      // 내가 좋아요한 목록에 있으면 true
      if (myLikeList.includes(e.userPk)) {
        e.like = true;
      } else {
        e.like = false;
      }
      console.log("내 지역 가이드!!", guide);
    });
    await connection.commit();
    res.send({ promise, guide, traveler });

    // conn.query(findUsers, (err, result) => {
    //   if (err) {
    //     console.error(err);
    //     conn.rollback();
    //     next(err);
    //   }
    //   const searchRegion = result[0].region;
    //   console.log("찾는 지역", searchRegion);
    //   const findGuides = `select * from userView where region ='${searchRegion}' and guide=1 and userPk not in (${userPk}) ORDER BY RAND() LIMIT 3`;
    //   const findTravelers = `select a.* from userView a left join trips b on a.userPk = b.userPk where b.region ='${searchRegion}' and b.partner is NULL and a.userPk not in (${userPk}) Group by userPk ORDER BY RAND() LIMIT 3 `;
    //   const likeList = `select targetPk from likes where userPk=${userPk} `;

    //   // 내가 좋아요한 사람 리스트
    //   conn.query(likeList, (err, result) => {
    //     if (err) {
    //       console.error(err);
    //       conn.rollback();
    //       next(err);
    //     }
    //     const mylikes = Object.values(JSON.parse(JSON.stringify(result))).map(
    //       (e) => parseInt(e.targetPk)
    //     );
    //     console.log("내가 좋아요한 목록", mylikes);

    //     // 내지역 가이드 찾기
    //     conn.query(findGuides, (err, result) => {
    //       if (err) {
    //         console.error(err);
    //         conn.rollback();
    //         next(err);
    //       }
    //       guide = Object.values(JSON.parse(JSON.stringify(result)));
    //       guide.forEach((e) => {
    //         // 내가 좋아요한 목록에 있으면 true
    //         if (mylikes.includes(e.userPk)) {
    //           e.like = true;
    //         } else {
    //           e.like = false;
    //         }
    //         console.log("내 지역 가이드!!", guide);
    //       });
    //     });
    //     // 내지역 여행자 찾기
    //     conn.query(findTravelers, (err, result) => {
    //       if (err) {
    //         console.error(err);
    //         conn.rollback();
    //         next(err);
    //       }
    //       traveler = Object.values(JSON.parse(JSON.stringify(result)));

    //       traveler.forEach((e) => {
    //         // 내가 좋아요한 목록에 있으면 true
    //         if (mylikes.includes(e.userPk)) {
    //           e.like = true;
    //         } else {
    //           e.like = false;
    //         }
    //       });
    //       // console.log("내 지역 여행자!!", traveler);
    //       res.send({ promise, guide, traveler });
    //     });
    //   });
    // });
    // conn.commit();
  } catch (err) {
    console.error(err);
    connection.rollback();
    err.status = 400;
    next(err);
  } finally {
    connection.release();
  }
});

router.post(
  "/search",
  asyncHandle(async (req, res, next) => {
    const { userPk } = res.locals.user;
    const result = await searchAndPaginate(req, userPk, next);
    res.status(200).json({ result });
  })
);

export default router;
